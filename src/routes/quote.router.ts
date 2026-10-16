import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ExcelAdapter } from '../adapters/excel.adapter.js';
import { GoogleSheetsAdapter } from '../adapters/sheets.adapter.js';
import { GeminiAIService } from '../services/gemini.service.js';
import { PricingService } from '../services/pricing.service.js';
import { PDFService } from '../services/pdf.service.js';
import { QuoteStoreService } from '../services/quote-store.service.js';
import { TenantService } from '../services/tenant.service.js';
import { AuthService } from '../services/auth.service.js';
import { TrialService } from '../services/trial.service.js';
import { DraftService } from '../services/draft.service.js';
import { NotificationService } from '../services/notification.service.js';
import { EmailVerificationService } from '../services/email-verification.service.js';
import { ExchangeRateService } from '../services/exchangeRate.service.js';
import { InquiryService } from '../services/inquiry.service.js';
import { authMiddleware, requireRole, requireActiveTenant } from '../middlewares/auth.middleware.js';
import { ProcessQuoteResponse, StandardPriceItem, StandardExchangeRate, QuotationResult, TenantProfile } from '../types/index.js';

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB 上限
export const quoteRouter = Router();

// 全局掛載多租戶與身份認證中間件
quoteRouter.use(authMiddleware);

const aiService = new GeminiAIService();
TenantService.init();

/**
 * 輔助函數：從發件人字符串中提取純郵箱地址
 */
function extractCleanEmail(senderInput?: string): string {
  if (!senderInput || typeof senderInput !== 'string') return '';
  const match = senderInput.match(/<([^>]+)>/) || senderInput.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase().trim() : senderInput.toLowerCase().trim();
}

/**
 * 輔助函數：校驗發件人是否在白名單內
 */
function isAuthorizedAdmin(senderInput?: string): { authorized: boolean; cleanEmail: string } {
  const cleanEmail = extractCleanEmail(senderInput);
  const whitelistStr = process.env.AUTHORIZED_ADMIN_EMAILS?.trim();

  // 如果未配置白名單，默認允許
  if (!whitelistStr) {
    return { authorized: true, cleanEmail };
  }

  const whitelist = whitelistStr
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (whitelist.length === 0) {
    return { authorized: true, cleanEmail };
  }

  if (!cleanEmail) {
    return { authorized: true, cleanEmail: 'unknown_caller' };
  }

  const isMatch = whitelist.some(adminEmail => cleanEmail.includes(adminEmail) || adminEmail.includes(cleanEmail));
  return { authorized: isMatch, cleanEmail };
}

/**
 * 輔助函數：從 Google 表格 URL 或 ID 中精準提取 Spreadsheet ID
 */
function extractSpreadsheetId(input?: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  if (trimmed.length > 15 && !trimmed.includes('/') && !trimmed.includes(' ')) {
    return trimmed;
  }

  return null;
}

// 登录防爆破与防撞库限频缓存
interface LoginAttemptRecord {
  failures: number;
  lockedUntil: number;
  lastAttemptAt: number;
}
const loginAttemptMap = new Map<string, LoginAttemptRecord>();

/**
 * 寫入刪除操作審計日誌 (操作人、單號/SKU、時間、IP、租戶ID)
 */
function writeAuditLog(event: {
  action: 'DELETE_QUOTE' | 'DELETE_CATALOG_ITEM';
  operator: string;
  tenantId: string;
  targetId: string;
  ip: string;
  status: 'SUCCESS' | 'FORBIDDEN' | 'FAILED';
  details?: string;
}) {
  const timestamp = new Date().toISOString();
  const logLine = `[AUDIT] ${timestamp} | ${event.action} | Operator: ${event.operator} | Tenant: ${event.tenantId} | Target: ${event.targetId} | IP: ${event.ip} | Status: ${event.status}${event.details ? ` | ${event.details}` : ''}`;
  console.log(logLine);

  try {
    const auditDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
    const auditFile = path.join(auditDir, 'audit.log');
    fs.appendFileSync(auditFile, `${logLine}\n`, 'utf-8');
  } catch (err) {
    console.warn('⚠️ 写入审计日志文件失败:', err);
  }
}


// =========================================================================
// 0. 【SaaS 多租戶身份認證、權限與企業配置接口】
// =========================================================================

/**
 * 发送 6 位工作邮箱试用验证码 (Plan C 核心防刷风控)
 * POST /api/v1/auth/send-verification-code
 * POST /api/v1/auth/send-code (别名兼容)
 */
const handleSendVerificationCode = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    const clientIp = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '请提供接收验证码的外贸工作邮箱'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 校验邮箱是否已注册 (若已注册则直接阻断发信，提示直接登录，节约发信额度并防止混淆)
    const existingTrial = TrialService.findTrialByEmail(cleanEmail);
    const existingUser = AuthService.findUserByEmail(cleanEmail);
    if (existingTrial || existingUser) {
      return res.status(200).json({
        success: false,
        alreadyRegistered: true,
        error: '该工作邮箱已注册账号，请直接使用密码登录'
      });
    }

    const result = await EmailVerificationService.sendCode(cleanEmail, clientIp);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('❌ 发送邮箱验证码异常:', error);
    return res.status(500).json({ success: false, error: error.message || '发送失败，请稍后再试' });
  }
};

quoteRouter.post('/auth/send-verification-code', handleSendVerificationCode);
quoteRouter.post('/auth/send-code', handleSendVerificationCode);

/**
 * 7 天免費全功能試用註冊 (Plan C: 工作邮箱为主 + 6位验证码真验证 + 30天数据保留)
 * POST /api/v1/auth/trial-register
 */
quoteRouter.post('/auth/trial-register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, code, phone, password, channelSource, name, company, category, wechat, ref } = req.body;
    const refCode = ref || (req.query.ref as string);
    const clientIp = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '请提供外贸业务工作邮箱'
      });
    }

    const result = await TrialService.registerOrLoginTrial({
      email,
      code,
      phone,
      password,
      channelSource,
      name,
      company,
      category,
      wechat,
      ip: clientIp,
      ref: refCode
    });

    if (!result.success) {
      if (result.expired) {
        return res.status(403).json(result);
      }
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('❌ 試用註冊異常:', error);
    return res.status(500).json({ success: false, error: error.message || '系統繁忙，請稍後再試' });
  }
});

/**
 * POST /api/v1/auth/login
 * 支持工作邮箱或手机号 + 密码安全登录 (兼容试用用户与企业租户管理员)
 */
quoteRouter.post('/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { account, phone, email, password } = req.body;
    const clientIp = ((req.headers['x-forwarded-for'] as string) || (req.headers['cf-connecting-ip'] as string) || '').split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    const accountIdentifier = (email || account || phone || '').trim();
    if (!accountIdentifier) {
      return res.status(400).json({ success: false, error: '请提供工作邮箱' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: '请输入登录密码' });
    }

    // 登录防爆破与防撞库：同一账号或 IP 在 5 分钟内连续失败 10 次，锁定 3 分钟
    const lockKey = `${accountIdentifier.toLowerCase()}_${clientIp}`;
    const attempt = loginAttemptMap.get(lockKey);
    const now = Date.now();
    if (attempt && attempt.lockedUntil > now) {
      const waitMin = Math.ceil((attempt.lockedUntil - now) / 60000);
      return res.status(429).json({
        success: false,
        error: `登录失败次数过多，该账户已被临时锁定安全保护，请在 ${waitMin} 分钟后再试！`
      });
    }

    const recordFailure = () => {
      const current = loginAttemptMap.get(lockKey) || { failures: 0, lockedUntil: 0, lastAttemptAt: now };
      current.failures += 1;
      current.lastAttemptAt = now;
      if (current.failures >= 10) {
        current.lockedUntil = now + 3 * 60 * 1000; // 锁定 3 分钟
      }
      loginAttemptMap.set(lockKey, current);
    };

    // 1. 若为企业内置管理员/业务员邮箱，先走 AuthService 验证
    if (accountIdentifier.includes('@')) {
      const authResult = AuthService.authenticateUser(accountIdentifier, password);
      if (authResult) {
        loginAttemptMap.delete(lockKey);
        const tenantProfile = TenantService.getTenantProfile(authResult.user.tenantId);
        const isPaidAdmin = Boolean((tenantProfile?.plan && tenantProfile.plan !== 'trial') || authResult.user.role === 'admin');
        return res.json({
          success: true,
          message: '登录成功',
          token: authResult.token,
          user: authResult.user,
          tenant: tenantProfile,
          isPaid: isPaidAdmin,
          plan: tenantProfile?.plan || 'geek'
        });
      }
    }

    // 2. 走 TrialService 试用账本验证 (支持邮箱或手机号)
    const result = await TrialService.loginTrial({
      account: accountIdentifier,
      password,
      ip: clientIp
    });

    if (!result.success) {
      recordFailure();
      if (result.expired) {
        return res.status(403).json(result);
      }
      return res.status(400).json(result);
    }

    // 登录成功，重置失败计数
    loginAttemptMap.delete(lockKey);

    return res.json(result);
  } catch (error: any) {
    console.error('❌ 账号登录异常:', error);
    return res.status(500).json({ success: false, error: error.message || '系统繁忙，请稍后再试' });
  }
});

/**
 * POST /api/v1/auth/unlock
 * 解除登录保护锁定
 */
quoteRouter.post('/auth/unlock', (req: Request, res: Response): any => {
  const { account, email } = req.body || {};
  const target = (account || email || '').toLowerCase().trim();
  if (target) {
    for (const key of loginAttemptMap.keys()) {
      if (key.includes(target)) {
        loginAttemptMap.delete(key);
      }
    }
  } else {
    loginAttemptMap.clear();
  }
  return res.json({ success: true, message: '登录锁定限制已成功解除！' });
});

/**
 * GET /api/v1/auth/check-account
 * 智能探知账户状态 (支持工作邮箱或手机号查询：是否已注册、是否为早期未设密码老账号、是否已过期)
 */
quoteRouter.get('/auth/check-account', async (req: Request, res: Response): Promise<any> => {
  try {
    const identifier = (req.query.email || req.query.account || req.query.phone || '').toString().trim();
    if (!identifier) {
      return res.status(400).json({ success: false, error: '请提供查询邮箱' });
    }
    const status = TrialService.checkAccountStatus(identifier);
    return res.json({ success: true, ...status });
  } catch (error: any) {
    console.error('❌ 账号状态查询异常:', error);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
});

/**
 * 忘记密码 - 发送 6 位安全重置验证码
 * POST /api/v1/auth/forgot-password/send-code
 */
quoteRouter.post('/auth/forgot-password/send-code', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    const clientIp = ((req.headers['x-forwarded-for'] as string) || (req.headers['cf-connecting-ip'] as string) || '').split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!email) {
      return res.status(400).json({ success: false, error: '请提供接收重置验证码的工作邮箱' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 校验邮箱是否在系统存在
    const existingTrial = TrialService.findTrialByEmail(cleanEmail) || TrialService.findTrialByPhoneOrEmail(cleanEmail);
    const existingUser = AuthService.findUserByEmail(cleanEmail);
    if (!existingTrial && !existingUser) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        error: '该工作邮箱尚未开通账号，请核对邮箱或先免费注册试用！'
      });
    }

    const result = await EmailVerificationService.sendResetPasswordCode(cleanEmail, clientIp);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    console.error('❌ 发送密码重置验证码异常:', error);
    return res.status(500).json({ success: false, error: error.message || '发送失败，请稍后再试' });
  }
});

/**
 * 忘记密码 - 核验 6 位验证码并签发重置凭证
 * POST /api/v1/auth/forgot-password/verify-code
 */
quoteRouter.post('/auth/forgot-password/verify-code', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, code } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: '请提供工作邮箱' });
    }
    if (!code) {
      return res.status(400).json({ success: false, error: '请输入 6 位邮箱验证码' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const result = EmailVerificationService.verifyResetCode(cleanEmail, code);
    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error || '验证码错误' });
    }

    return res.json({
      success: true,
      message: '验证码核验成功，请设置新密码',
      resetToken: result.resetToken
    });
  } catch (error: any) {
    console.error('❌ 核验密码重置验证码异常:', error);
    return res.status(500).json({ success: false, error: error.message || '核验失败，请稍后再试' });
  }
});

/**
 * 忘记密码 - 提交新密码并完成重置
 * POST /api/v1/auth/forgot-password/reset
 */
quoteRouter.post('/auth/forgot-password/reset', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, resetToken, code, newPassword, confirmPassword } = req.body;
    const clientIp = ((req.headers['x-forwarded-for'] as string) || (req.headers['cf-connecting-ip'] as string) || '').split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!email) {
      return res.status(400).json({ success: false, error: '请提供工作邮箱' });
    }
    if (!newPassword) {
      return res.status(400).json({ success: false, error: '请输入重置的新密码' });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: '两次输入的密码不一致，请重新输入' });
    }
    if (newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, error: '新密码长度至少须为 6 位字符' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const tokenOrCode = (resetToken || code || '').toString().trim();
    if (!tokenOrCode) {
      return res.status(400).json({ success: false, error: '缺少有效的重置凭证或验证码' });
    }

    const checkToken = EmailVerificationService.validateResetTokenOrCode(cleanEmail, tokenOrCode);
    if (!checkToken.valid) {
      return res.status(400).json({ success: false, error: checkToken.error || '重置会话无效或已过期' });
    }

    const updateRes = TrialService.resetPassword(cleanEmail, newPassword);
    if (!updateRes.success) {
      return res.status(400).json({ success: false, error: updateRes.error || '密码更新失败' });
    }

    // 成功后消费掉重置凭证
    EmailVerificationService.consumeResetToken(cleanEmail);

    // 解除该账号在登录防爆破锁中的限制
    const lockKey = `${cleanEmail}_${clientIp}`;
    loginAttemptMap.delete(lockKey);

    return res.json({
      success: true,
      message: '密码更改成功！请使用新密码登录'
    });
  } catch (error: any) {
    console.error('❌ 重置密码异常:', error);
    return res.status(500).json({ success: false, error: error.message || '系统繁忙，请稍后再试' });
  }
});



/**
 * 查詢當前訪客/租戶的 7 天試用剩餘狀態
 * GET /api/v1/auth/trial-status
 */
quoteRouter.get('/auth/trial-status', async (req: Request, res: Response): Promise<any> => {
  try {
    const tenantId = req.tenantId || (req.query.tenant_id as string);
    const phone = req.query.phone as string;
    const email = (req.query.email as string) || (req.user && req.user.email);

    if (phone || email) {
      const trial = TrialService.findTrialByPhoneOrEmail(phone, email);
      if (!trial) {
        return res.json({ 
          success: true, 
          exists: false, 
          isTrial: false,
          email: req.user?.email,
          name: req.user?.name
        });
      }
      const expiryDate = new Date(trial.expiresAt);
      const isExpired = new Date() > expiryDate;
      const remainingDays = isExpired ? 0 : TrialService.calculateRemainingDays(trial.expiresAt);
      const profile = TenantService.getTenantProfile(trial.tenantId);
      const isPaidUser = Boolean((profile && profile.plan && profile.plan !== 'trial') || trial.status === 'converted');
      return res.json({
        success: true,
        exists: true,
        isTrial: !isPaidUser,
        isPaid: isPaidUser,
        plan: (profile && profile.plan) || (isPaidUser ? 'pro' : 'trial'),
        expired: isExpired,
        remainingDays,
        expiresAt: trial.expiresAt,
        formattedExpiresAt: TrialService.formatExpiryDateTime(trial.expiresAt),
        tenantId: trial.tenantId,
        phone: trial.phone,
        email: trial.email,
        name: trial.name,
        companyName: trial.company,
        user: {
          id: trial.userId,
          email: trial.email,
          name: trial.name,
          role: 'admin',
          tenantId: trial.tenantId
        }
      });
    }

    if (tenantId && tenantId.startsWith('tenant_trial_')) {
      const trial = TrialService.getTrialByTenantId(tenantId);
      if (trial) {
        const expiryDate = new Date(trial.expiresAt);
        const isExpired = new Date() > expiryDate;
        const remainingDays = isExpired ? 0 : TrialService.calculateRemainingDays(trial.expiresAt);
        const profile = TenantService.getTenantProfile(trial.tenantId);
        const isPaidUser = Boolean((profile && profile.plan && profile.plan !== 'trial') || trial.status === 'converted');
        return res.json({
          success: true,
          exists: true,
          isTrial: !isPaidUser,
          isPaid: isPaidUser,
          plan: (profile && profile.plan) || (isPaidUser ? 'pro' : 'trial'),
          expired: isExpired,
          remainingDays,
          expiresAt: trial.expiresAt,
          formattedExpiresAt: TrialService.formatExpiryDateTime(trial.expiresAt),
          tenantId: trial.tenantId,
          phone: trial.phone,
          email: trial.email,
          name: trial.name,
          companyName: trial.company
        });
      }
    }

    if (tenantId && tenantId !== 'default') {
      const profile = TenantService.getTenantProfile(tenantId);
      if (profile.plan === 'trial' || profile.expiresAt) {
        const { expired, expiresAt } = TenantService.isTenantExpired(tenantId);
        const remainingDays = expired ? 0 : (expiresAt ? TrialService.calculateRemainingDays(expiresAt) : 7);
        const isPaid = Boolean(profile.plan && profile.plan !== 'trial');
        return res.json({
          success: true,
          exists: true,
          isTrial: !isPaid,
          isPaid,
          plan: profile.plan || (isPaid ? 'pro' : 'trial'),
          expired,
          remainingDays,
          expiresAt,
          formattedExpiresAt: expiresAt ? TrialService.formatExpiryDateTime(expiresAt) : null,
          tenantId,
          email: req.user?.email || profile.contactEmail,
          name: req.user?.name || profile.managerName || profile.companyName,
          companyName: profile.companyName
        });
      }
    }

    return res.json({
      success: true,
      exists: true,
      isTrial: false,
      plan: req.tenant?.plan || 'geek',
      status: 'active',
      email: req.user?.email,
      name: req.user?.name,
      tenantId
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * 獲取當前登錄用戶與所屬租戶信息
 */
quoteRouter.get('/auth/me', async (req: Request, res: Response): Promise<any> => {
  return res.json({
    success: true,
    user: req.user,
    tenant: req.tenant
  });
});

/**
 * 獲取當前租戶企業資料 (PDF 抬頭、品牌信息、防洩密配置)
 */
quoteRouter.get('/tenant/profile', async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.tenantId || 'default';
  const profile = TenantService.getTenantProfile(tenantId);
  const logoUrl = TenantService.getTenantLogoUrl(tenantId);
  return res.json({ success: true, profile: { ...profile, logoUrl } });
});

/**
 * 更新企業租戶資料 (支持管理員與業務員編輯，即時生效)
 */
quoteRouter.put('/tenant/profile', requireRole(['admin', 'sales']), async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.tenantId || 'default';
  const {
    companyName,
    managerName,
    contactEmail,
    contactPhone,
    companyAddress,
    companySubtitle,
    website,
    noLogo
  } = req.body;

  const updatePayload: Partial<TenantProfile> = {};
  if (companyName !== undefined) updatePayload.companyName = String(companyName).trim();
  if (managerName !== undefined) updatePayload.managerName = String(managerName).trim();
  if (contactEmail !== undefined) updatePayload.contactEmail = String(contactEmail).trim();
  if (contactPhone !== undefined) updatePayload.contactPhone = String(contactPhone).trim();
  if (companyAddress !== undefined) updatePayload.companyAddress = String(companyAddress).trim();
  if (companySubtitle !== undefined) updatePayload.companySubtitle = String(companySubtitle).trim();
  if (website !== undefined) updatePayload.website = String(website).trim();
  if (noLogo !== undefined) updatePayload.noLogo = Boolean(noLogo);

  const updated = TenantService.updateTenantProfile(tenantId, updatePayload);

  // 同步更新 trials.json 中该租户的企业名称与负责人姓名
  try {
    const trials = TrialService.getAllTrials();
    let changed = false;
    const cleanId = tenantId.toLowerCase().trim();
    for (const t of trials) {
      if (t.tenantId.toLowerCase() === cleanId) {
        if (updatePayload.companyName) t.company = updatePayload.companyName;
        if (updatePayload.managerName) t.name = updatePayload.managerName;
        changed = true;
      }
    }
    if (changed) {
      TrialService.saveTrials(trials);
    }
  } catch (err) {
    console.warn('同步 trials.json 异常:', err);
  }

  const logoUrl = TenantService.getTenantLogoUrl(tenantId);
  return res.json({ success: true, message: '企业租户资料已更新', profile: { ...updated, logoUrl } });
});

/**
 * 查詢當前租戶名下的所有歷史報價單列表 (帶租戶數據隔離)
 */
quoteRouter.get('/quotes', async (req: Request, res: Response): Promise<any> => {
  const quotes = QuoteStoreService.listQuotes(req.tenantId || 'default');
  return res.json({
    success: true,
    tenantId: req.tenantId || 'default',
    total: quotes.length,
    quotes
  });
});

/**
 * 查询当前租户名下的所有询盘一等实体列表 (Task §2.5 / D-12 租户物理隔离 / 纯只读不写)
 * GET /api/v1/inquiries
 */
quoteRouter.get('/inquiries', async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.tenantId || 'default';
  const inquiries = InquiryService.listInquiries(tenantId);
  return res.json({
    success: true,
    tenantId,
    total: inquiries.length,
    inquiries
  });
});

/**
 * 查询指定询盘实体详情 (Task §2.5 / D-12 严格防跨租户越权窥探 / 纯只读不写)
 * GET /api/v1/inquiries/:id
 */
quoteRouter.get('/inquiries/:id', async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.tenantId || 'default';
  const inquiryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const inquiry = InquiryService.getInquiry(inquiryId, tenantId);
  if (!inquiry) {
    return res.status(404).json({
      success: false,
      error: `【未找到或无权访问】询盘 [${inquiryId}] 不存在或不属于当前租户`
    });
  }
  return res.json({
    success: true,
    tenantId,
    inquiry
  });
});
/**
 * 獲取當前租戶底價表生效狀態與摘要
 */
quoteRouter.get('/pricing/status', async (req: Request, res: Response): Promise<any> => {
  const tenantId = req.tenantId || 'default';
  const tenantPath = TenantService.getActivePricingPath(tenantId);
  const defaultPath = path.join(process.cwd(), 'data', 'active_pricing.xlsx');
  const hasCustom = fs.existsSync(tenantPath);
  const activeFile = hasCustom ? tenantPath : defaultPath;
  const exists = fs.existsSync(activeFile);

  let itemCount = 0;
  let parsedSheets: string[] = [];
  let incotermRules: any[] = [];
  let updatedAt = '';

  if (exists) {
    try {
      const stats = fs.statSync(activeFile);
      updatedAt = stats.mtime.toISOString();
      const parsed = ExcelAdapter.parse(activeFile);
      itemCount = parsed.priceItems.length;
      parsedSheets = parsed.parsedSheets;
      incotermRules = parsed.incotermRules || [];
    } catch {}
  }

  return res.json({
    success: true,
    tenantId,
    hasCustomPricing: hasCustom,
    isDefaultTemplate: !hasCustom,
    itemCount,
    parsedSheets,
    incotermRules,
    updatedAt
  });
});

/**
 * 获取实时外贸银行结汇买入汇率 (支持新浪财经、Open ER 与本地高可用缓存三级保障)
 */
quoteRouter.get('/rates/latest', async (req: Request, res: Response): Promise<any> => {
  try {
    const force = req.query.refresh === 'true' || req.query.refresh === '1';
    const data = await ExchangeRateService.getLatestRates(force);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve exchange rates',
      error: err?.message || String(err)
    });
  }
});

/**
 * 下载出厂底价表 Excel 模板 (标准模板: public/templates/kelvinflow-pricing-template.xlsx)
 */
quoteRouter.get('/template/pricing-sheet', (req: Request, res: Response) => {
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'kelvinflow-pricing-template.xlsx');
  const commodityPricing = TenantService.getCommodityPricingFile();
  const directPath = path.join(process.cwd(), '商品底价表', '外贸出厂底价表与智能核价模板.xlsx');

  let fileToSend = '';
  if (fs.existsSync(templatePath)) {
    fileToSend = templatePath;
  } else if (commodityPricing && fs.existsSync(commodityPricing.sourcePath)) {
    fileToSend = commodityPricing.sourcePath;
  } else if (fs.existsSync(directPath)) {
    fileToSend = directPath;
  }

  if (!fileToSend || !fs.existsSync(fileToSend)) {
    return res.status(404).json({ success: false, error: '底价表模板未就绪' });
  }

  const encodedFilename = encodeURIComponent('外贸出厂底价表与智能核价模板.xlsx');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="kelvinflow-pricing-template.xlsx"; filename*=UTF-8''${encodedFilename}`
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.sendFile(fileToSend);
});

/**
 * 下載或預覽買家採購詢盤樣例 PDF (Acme Global PO)
 */
quoteRouter.get('/template/sample-po', (req: Request, res: Response) => {
  const samplePath = path.join(process.cwd(), 'public', 'templates', 'sample_po.pdf');
  if (!fs.existsSync(samplePath)) {
    return res.status(404).json({ success: false, error: '樣例採購單未就緒' });
  }
  res.setHeader('Content-Disposition', 'inline; filename="Sample_Buyer_Inquiry_PO.pdf"');
  res.setHeader('Content-Type', 'application/pdf');
  return res.sendFile(samplePath);
});

// =========================================================================
// 1. 【底價更新接口 (多租戶隔離 + RBAC 管理員權限 + 智能防呆 + 原子回滾)】: POST /api/v1/update-pricing
// =========================================================================
quoteRouter.post(
  '/update-pricing',
  requireRole(['admin']),
  requireActiveTenant,
  upload.single('pricing_file'),
  async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '缺少必填參數: pricing_file (Excel 底價表附件)'
        });
      }

      const senderEmailInput = req.user?.email || req.body?.sender_email || req.body?.from;
      const { authorized, cleanEmail } = req.user?.role === 'admin'
        ? { authorized: true, cleanEmail: req.user.email }
        : isAuthorizedAdmin(senderEmailInput);

      if (!authorized) {
        console.warn(`🚨 [安全攔截] 非授權郵箱 [${cleanEmail}] 企圖更新底價庫！已被系統拒絕。`);
        return res.status(403).json({
          success: false,
          error: `【安全攔截】發件人郵箱 [${cleanEmail}] 未在管理員授權白名單內，底價庫更新被拒絕！`
        });
      }

      // 1. 識別並綁定租戶 ID (支持顯式傳參或從已認證的上下文/郵箱獲取)
      const explicitTenant = req.body?.tenant_id || req.body?.tenantId || (req.query?.tenant_id as string) || (req.headers['x-tenant-id'] as string);
      const tenantId = (req.user?.role === 'admin' && explicitTenant)
        ? TenantService.resolveTenantId(explicitTenant)
        : (req.tenantId || TenantService.resolveTenantId(explicitTenant, cleanEmail));

      // 解决 Multer 在某些平台默认使用 latin1 解码导致中文文件名乱码的问题
      let fileName = req.file.originalname;
      try {
        const decoded = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        if (decoded && !decoded.includes('\uFFFD') && decoded !== req.file.originalname) {
          fileName = decoded;
        }
      } catch {}

      console.log(`📥 租戶 [${tenantId}] 授權管理員 [${cleanEmail}] 請求更新底價表: 文件名 [${fileName}], 大小 [${req.file.size} bytes]`);

      // 2. 加載該租戶專屬自定義映射規則並進行「智能體檢」
      const tenantRules = TenantService.getTenantCustomRules(tenantId);
      const parsed = ExcelAdapter.parse(req.file.buffer, { customRules: tenantRules });

      // 3. 【原子性防呆校驗與自動回滾】：若解析失敗，絕不覆蓋舊庫！
      if (!parsed.success || parsed.priceItems.length === 0) {
        console.warn(`⚠️ [防呆攔截] 租戶 [${tenantId}] 上傳的表格體檢未通過: ${parsed.errorReason}`);

        const diagnosticSubject = `❌ 底價表更新未通過驗證 (已自動保留上期正常價格) - AI 報價大腦`;
        const diagnosticBody = `您好！

您發送的底價表文件 [${fileName}] 在解析時未通過數據健康體檢，系統已自動攔截並為您保留了上一次正常生效的底價庫。

⚠️ 診斷原因：
• ${parsed.errorReason}
• 檢測到的工作表：${parsed.parsedSheets.join(', ') || '無有效商品工作表'}

💡 快速修復指南：
1. 請確認表格前 10 行內包含「型號/SKU」和「底價/出廠價」關鍵列。
2. 請確保底價列為大於 0 的有效數字。
3. 修改完成後，直接將 Excel 重新發送至本郵箱即可！

（系統當前繼續使用歷史正常價格為買家生成報價，請放心）

Best regards,
AI Foreign Trade Engine Data Governance Team`;

        return res.status(422).json({
          success: false,
          error: parsed.errorReason,
          diagnostic: {
            detectedHeaders: parsed.detectedHeaders,
            parsedSheets: parsed.parsedSheets
          },
          replyEmail: {
            subject: diagnosticSubject,
            body: diagnosticBody
          }
        });
      }

      // 4. 體檢通過：原子性持久化存儲至租戶專屬目錄
      const { activePath, backupPath } = TenantService.saveActivePricing(tenantId, req.file.buffer);

      console.log(`💾 租戶 [${tenantId}] 底價表已持久化存儲至: ${activePath}`);
      console.log(`📊 共加載商品底價: ${parsed.priceItems.length} 個, 匯率規則: ${parsed.exchangeRates.length} 條, 工作表: ${parsed.parsedSheets.join(', ')}`);

      // 5. 構造成功的確認郵件內容
      const sampleSkus = parsed.priceItems.slice(0, 5).map(item => `${item.rawSku} (¥${item.basePrice})`).join(', ');
      const rateSummary = parsed.exchangeRates.length > 0
        ? parsed.exchangeRates.map(r => `${r.currency}: ${r.rateToRMB}`).join(', ')
        : '默認匯率 USD: 7.2';

      const marginSummary = parsed.defaultProfitMargin !== undefined ? `${parsed.defaultProfitMargin * 100}%` : '未指定 (默認 30%)';
      const incotermSummary = parsed.defaultIncoterm || 'FOB Shenzhen Port';
      const validitySummary = parsed.priceValidity || '30 Days';
      const leadTimeSummary = parsed.leadTime || '25-30 Days after deposit';
      const sampleSummary = parsed.samplePolicy || 'Double price, refundable upon bulk order';

      const replySubject = `✅ 底價表已更新生效 [共 ${parsed.priceItems.length} 款商品] - AI 報價大腦`;
      const replyBody = `您好！

您發送的最新底價表文件 [${fileName}] 已成功解析並在系統中全面生效！

📊 數據與商務條款同步摘要：
• 所屬租戶/企業：${tenantId}
• 總在冊商品數：${parsed.priceItems.length} 款
• 解析工作表：${parsed.parsedSheets.join(', ')}
• 全廠生效匯率：${rateSummary}
• 全廠默認毛利：${marginSummary}
• 默認交貨條款：${incotermSummary}
• 報價有效期：${validitySummary}
• 默認生產交期：${leadTimeSummary}
• 樣品打樣政策：${sampleSummary}
• 部分樣例商品：${sampleSkus}${parsed.priceItems.length > 5 ? ' 等...' : ''}
• 授權操作人：${cleanEmail}
• 生效時間：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

⚡ 即刻起，所有買家發送的詢盤郵件將自動按照此最新價格體系生成報價！

Best regards,
AI Foreign Trade Engine
FoShan Kelvin Foreign Trade Co., Ltd.`;

      return res.json({
        success: true,
        message: '底價表更新成功',
        summary: {
          tenantId,
          fileName: fileName,
          itemCount: parsed.priceItems.length,
          rateCount: parsed.exchangeRates.length,
          parsedSheets: parsed.parsedSheets,
          sampleItems: parsed.priceItems.slice(0, 5).map(i => i.rawSku),
          exchangeRates: parsed.exchangeRates,
          operator: cleanEmail,
          updatedAt: new Date().toISOString()
        },
        replyEmail: {
          subject: replySubject,
          body: replyBody
        }
      });
    } catch (error: any) {
      console.error('❌ 更新底價表失敗:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '底價表解析與更新失敗'
      });
    }
  }
);

// =========================================================================
// 2. 【主報價接口 (多租戶隔離 + 階梯價 + 風控條款)】: POST /api/v1/process-quote
// =========================================================================
quoteRouter.post(
  '/process-quote',
  upload.fields([
    { name: 'po_file', maxCount: 1 },
    { name: 'pricing_file', maxCount: 1 }
  ]),
  (req: Request, res: Response, next: NextFunction): any => {
    const useSamplePo = req.body?.use_sample_po === 'true' || req.body?.use_sample_po === true || req.query?.useSamplePo === 'true' || req.query?.use_sample_po === 'true';
    if (useSamplePo) {
      // 允许公共沙盒体验：如果未登录，自动模拟 guest 访客身份并放行
      if (!req.user) {
        req.user = {
          id: 'guest_sandbox_user',
          email: 'demo@kelvinflow.com',
          name: 'Demo Visitor',
          role: 'sales',
          tenantId: 'default'
        };
      }
      return next();
    }
    return requireRole(['admin', 'sales'])(req, res, () => {
      requireActiveTenant(req, res, next);
    });
  },
  async (req: Request, res: Response): Promise<any> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let poFile = files?.['po_file']?.[0];
      const pricingFile = files?.['pricing_file']?.[0];
      
      const rawSheetInput = req.body?.spreadsheet_id || req.body?.google_sheet_url;
      const spreadsheetId = extractSpreadsheetId(rawSheetInput);
      const salesRepEmail = req.user?.email || req.body?.sales_rep_email || req.body?.from || 'sales@foshan-kelvin.com';
      const salesRepName = req.user?.name || req.body?.sales_rep_name || 'Kelvin Tsui';
      let poText = req.body?.po_text || req.body?.email_body || req.body?.text;

      // 識別租戶 ID (優先從認證上下文獲取，若為管理員且顯式指定則採用指定租戶)
      const explicitTenant = req.body?.tenant_id || req.body?.tenantId || (req.query?.tenant_id as string) || (req.headers['x-tenant-id'] as string);
      const tenantId = (req.user?.role === 'admin' && explicitTenant)
        ? TenantService.resolveTenantId(explicitTenant)
        : (req.tenantId || TenantService.resolveTenantId(explicitTenant, salesRepEmail));

      // 支持一鍵載入測試單或無文件時使用內置樣例 PO (附帶結構化文本，保障多模態與離線引擎 100% 精準無亂碼)
      const useSamplePo = req.body?.use_sample_po === 'true' || req.body?.use_sample_po === true || req.query?.useSamplePo === 'true' || req.query?.use_sample_po === 'true';
      if (!poFile && !poText && useSamplePo) {
        const samplePath = path.join(process.cwd(), 'public', 'templates', 'sample_po.pdf');
        if (fs.existsSync(samplePath)) {
          const buffer = fs.readFileSync(samplePath);
          poFile = {
            fieldname: 'po_file',
            originalname: 'Sample_Buyer_Inquiry_PO.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            buffer,
            size: buffer.length
          } as Express.Multer.File;
        }
        poText = `PURCHASE ORDER: PO-2026-EU-9812
Buyer: Acme Global Sourcing GmbH
Contact: Marcus Weber (m.weber@acmeglobal.de)
Trade Terms: FOB Shenzhen
Payment: 30% Deposit, 70% Balance T/T
Lead Time: 25-30 Days

Items to Quote:
1. SKU: ACME-991 (Aluminum Alloy Precision Heavy Bracket / Stand Pro), Finish: Matte Black Coating, Quantity: 2000 PCS
2. SKU: ERG-PRO-V2 (Ergonomic Mesh Office Chair / Executive Chair), Specification: BS5852 UK Fireproof Sponge, Quantity: 500 PCS
3. SKU: FAST-SCREW (Stainless Steel Hex Fastener Screws, Hex Bolt 8820 Series Grade 304), Quantity: 10000 PCS`;
      }

      if (!poFile && !poText) {
        return res.status(400).json({ 
          success: false, 
          error: '缺少必填參數: 請上傳買家採購單文件 (po_file: PDF/圖片) 或提供郵件正文 (po_text)' 
        });
      }

      // 1. 智能解析底價與匯率數據（優先租戶隔離存儲）
      let priceItems: StandardPriceItem[] = [];
      let exchangeRates: StandardExchangeRate[] = [];
      let addons: any[] = [];
      let incotermRules: any[] = [];
      let paymentTerms: any[] = [];
      let priceSourceInfo = '';
      let excelDefaultMargin: number | undefined = undefined;
      let excelDefaultIncoterm: string | undefined = undefined;
      let excelPriceValidity: string | undefined = undefined;
      let excelLeadTime: string | undefined = undefined;
      let excelSamplePolicy: string | undefined = undefined;
      let excelPaymentTerm: string | undefined = undefined;

      if (pricingFile) {
        console.log(`📁 [底價源] 租戶 [${tenantId}] 檢測到即時上傳的 Excel 文件，正在解析...`);
        const parsed = ExcelAdapter.parse(pricingFile.buffer);
        priceItems = parsed.priceItems;
        exchangeRates = parsed.exchangeRates;
        addons = parsed.addons;
        incotermRules = parsed.incotermRules;
        paymentTerms = parsed.paymentTerms;
        excelDefaultMargin = parsed.defaultProfitMargin;
        excelDefaultIncoterm = parsed.defaultIncoterm;
        excelPriceValidity = parsed.priceValidity;
        excelLeadTime = parsed.leadTime;
        excelSamplePolicy = parsed.samplePolicy;
        if (parsed.paymentTerms && parsed.paymentTerms.length > 0) {
          excelPaymentTerm = parsed.paymentTerms[0].term;
        }
        priceSourceInfo = `即時上傳文件 (${pricingFile.originalname})`;
      } else if (spreadsheetId) {
        console.log(`🌐 [底價源] 檢測到 Google Sheets: ${spreadsheetId}，正在同步...`);
        try {
          const parsed = await GoogleSheetsAdapter.parse(spreadsheetId, {
            apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
          });
          priceItems = parsed.priceItems;
          exchangeRates = parsed.exchangeRates;
          priceSourceInfo = `Google Sheets (${spreadsheetId})`;
        } catch (sheetError: any) {
          console.warn(`⚠️ Google Sheets 讀取失敗: ${sheetError.message}，自動切換至租戶持久化底價庫...`);
        }
      }

      if (priceItems.length === 0) {
        // 從多租戶存儲中加載
        let tenantPricing = TenantService.getActivePricingBuffer(tenantId);
        // 仅当用户明确启用官方样例 PO (useSamplePo) 体验模式时，才自动回退加载官方标准底价库
        if (!tenantPricing && useSamplePo) {
          console.log(`📁 [底價源] 租戶 [${tenantId}] 暫未配置專屬底價表，樣例體驗模式下自動加載官方標準底價庫...`);
          tenantPricing = TenantService.getActivePricingBuffer('default');
        }
        if (tenantPricing) {
          console.log(`📁 [底價源] 已加載生效底價庫: ${tenantPricing.sourcePath}`);
          const parsed = ExcelAdapter.parse(tenantPricing.buffer);
          priceItems = parsed.priceItems;
          exchangeRates = parsed.exchangeRates;
          addons = parsed.addons;
          incotermRules = parsed.incotermRules;
          paymentTerms = parsed.paymentTerms;
          excelDefaultMargin = parsed.defaultProfitMargin;
          excelDefaultIncoterm = parsed.defaultIncoterm;
          excelPriceValidity = parsed.priceValidity;
          excelLeadTime = parsed.leadTime;
          excelSamplePolicy = parsed.samplePolicy;
          if (parsed.paymentTerms && parsed.paymentTerms.length > 0) {
            excelPaymentTerm = parsed.paymentTerms[0].term;
          }
          priceSourceInfo = `生效底價庫 (${path.basename(tenantPricing.sourcePath)})`;
        }
      }

      if (priceItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: `租戶 [${tenantId}] 尚未配置出廠底價庫！請先在工作台或審單台自定義上傳您的專屬 Excel 出廠底價表。`
        });
      }

      // 2. AI 多模態提取 PO 數據 (支持 PDF/圖片文件 或 純文本詢盤正文)
      let extractionResult: { data: any; modelUsed: string };
      if (poFile) {
        const mimeType = poFile.mimetype || (poFile.originalname?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');
        console.log(`🤖 [多模態提取] 正在解析附件 [${poFile.originalname || 'attachment'}], 類型: ${mimeType}...`);
        extractionResult = await aiService.extractPO({ buffer: poFile.buffer, mimeType, text: poText ? String(poText) : undefined });
      } else {
        console.log(`📝 [純文本詢盤] 正在對郵件正文進行 AI 語意提取...`);
        extractionResult = await aiService.extractPOFromText(String(poText));
      }
      const { data: poData, modelUsed } = extractionResult;

      // 3. 防呆報價計算（含別名映射、選配工藝加價、貿易術語、紅線底價保護、階梯價、MOQ、匯率波動保護）
      const tenantProfile = req.tenant || TenantService.getTenantProfile(tenantId);
      const quotation = PricingService.calculate(poData, priceItems, exchangeRates, {
        tenantId,
        createdBy: salesRepEmail,
        salesRepName,
        defaultProfitMargin: excelDefaultMargin ?? tenantProfile.defaultProfitMargin ?? Number(process.env.DEFAULT_PROFIT_MARGIN || 0.3),
        defaultIncoterm: excelDefaultIncoterm,
        priceValidity: excelPriceValidity,
        leadTime: excelLeadTime,
        samplePolicy: excelSamplePolicy,
        defaultFobCost: Number(process.env.DEFAULT_FOB_COST || 0),
        fallbackExchangeRate: Number(process.env.DEFAULT_FALLBACK_RATE || 7.2),
        rateFluctuationPercent: Number(process.env.RATE_FLUCTUATION_THRESHOLD_PERCENT || 3),
        criticalConfidenceThreshold: Number(process.env.CRITICAL_CONFIDENCE_THRESHOLD || 70),
        incotermRules,
        paymentTerms
      });
      quotation.tenantId = tenantId;
      quotation.aiModelUsed = modelUsed;

      const pdfBuffer = await PDFService.generateQuotationPDF(quotation);
      const safeCustomer = (quotation.customerName || quotation.buyerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeQuoteNum = quotation.quotationNumber || 'DRAFT';
      const pdfFileName = `${safeCustomer}_Quotation_${safeQuoteNum}.pdf`;

      // 5. 構造專業郵件草稿內容
      let emailBodyPrefix = '';
      if (quotation.hasWarnings) {
        emailBodyPrefix = `[⚠️ INTERNAL NOTICE: PENDING ITEMS OR AUDIT ALERTS]\n` + quotation.warnings.map(w => `• ${w}`).join('\n') + `\n\n--------------------\n\n`;
      }

      const tenantCompany = tenantProfile.companyName || process.env.COMPANY_NAME || 'FoShan Kelvin';
      const emailSubject = `Quotation ${quotation.quotationNumber} for PO ${poData.PONumber || ''} - ${tenantCompany}`;
      const safeCurrency = (!quotation.currency || quotation.currency === 'N/A') ? 'USD' : quotation.currency;
      const emailBody = `${emailBodyPrefix}Dear ${quotation.buyerName},

Thank you for your inquiry. Please find attached our formal quotation (${quotation.quotationNumber}) based on your requested items.

Quotation Summary:
- Total Amount: ${safeCurrency} ${quotation.totalAmountForeign.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Trade Terms: ${quotation.incotermUsed}
- Payment Terms: ${excelPaymentTerm || '30% T/T Deposit, 70% Balance before shipment'}
- Production Lead Time: ${excelLeadTime || '25-30 Days after deposit'}
- Price Validity: ${excelPriceValidity || '30 Days'} (Subject to exchange rate protection clause in attached PDF)${excelSamplePolicy ? `\n- Sample Policy: ${excelSamplePolicy}` : ''}

Please let us know if you need any adjustments or technical clarifications.

Best regards,
${salesRepName}
${tenantCompany}`;

      // 4.1 保存報價單至持久化存儲以支持在線微調 (按租戶物理隔離)
      QuoteStoreService.saveQuote(quotation, pdfBuffer, tenantId);

      const reqHost = req.get('host') || 'localhost:3000';
      const reqProtocol = req.protocol || 'http';
      const isLocalHost = reqHost.includes('localhost') || reqHost.includes('127.0.0.1');
      const baseUrl = isLocalHost ? `${reqProtocol}://${reqHost}` : (process.env.PUBLIC_APP_URL?.replace(/\/+$/, '') || `${reqProtocol}://${reqHost}`);
      const tokenParam = req.user ? `?token=${AuthService.generateToken(req.user)}` : '';
      const reviewUrl = `${baseUrl}/review/${quotation.quotationNumber}${tokenParam}`;

      // 在郵件草稿頭部附加微調入口
      const emailWithReviewLink = `[📌 業務員在線核對與微調入口]: ${reviewUrl}\n(如需微調單價、折扣或交期，點擊上方鏈接即可 10 秒在線修改，系統將自動重新渲染 PDF 並更新草稿)\n\n` + emailBody;

      // 5.1 構造富文本 HTML 郵件草稿 (適配騰訊企郵、阿里、網易、Foxmail、Outlook 等通用 IMAP/SMTP 客戶端)
      const emailHtmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; max-width: 680px;">
  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
    <div style="font-weight: bold; color: #166534; font-size: 14px; margin-bottom: 4px;">📌 業務員在線核對與微調入口 (10 秒極速修改)</div>
    <div style="font-size: 12px; color: #15803d; margin-bottom: 10px;">如需微調單價、折扣或交期，點擊下方按鈕即可在線修改，系統將自動重新生成正式 PDF 報價單並同步更新：</div>
    <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; font-size: 13px;">點擊前往在線核單 ➔</a>
  </div>
  ${emailBodyPrefix ? `<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #92400e; white-space: pre-wrap;">${emailBodyPrefix}</div>` : ''}
  <p style="margin: 0 0 14px 0;">Dear ${quotation.buyerName},</p>
  <p style="margin: 0 0 14px 0;">Thank you for your inquiry. Please find attached our formal quotation (<strong>${quotation.quotationNumber}</strong>) based on your requested items.</p>
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
    <div style="font-weight: bold; color: #0f172a; margin-bottom: 8px; font-size: 13px;">Quotation Summary:</div>
    <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px;">
      <li style="margin-bottom: 4px;"><strong>Total Amount:</strong> ${safeCurrency} ${quotation.totalAmountForeign.toLocaleString('en-US', { minimumFractionDigits: 2 })}</li>
      <li style="margin-bottom: 4px;"><strong>Trade Terms:</strong> ${quotation.incotermUsed}</li>
      <li style="margin-bottom: 4px;"><strong>Payment Terms:</strong> ${excelPaymentTerm || '30% T/T Deposit, 70% Balance before shipment'}</li>
      <li style="margin-bottom: 4px;"><strong>Production Lead Time:</strong> ${excelLeadTime || '25-30 Days after deposit'}</li>
      <li style="margin-bottom: 4px;"><strong>Price Validity:</strong> ${excelPriceValidity || '30 Days'} (Subject to exchange rate protection clause in attached PDF)</li>
      ${excelSamplePolicy ? `<li style="margin-bottom: 4px;"><strong>Sample Policy:</strong> ${excelSamplePolicy}</li>` : ''}
    </ul>
  </div>
  <p style="margin: 0 0 14px 0;">Please let us know if you need any adjustments or technical clarifications.</p>
  <p style="margin: 20px 0 0 0; color: #475569;">Best regards,<br><strong style="color: #0f172a;">${salesRepName}</strong><br>${tenantCompany}</p>
</div>`.trim();

      const responsePayload: any = {
        reviewUrl,
        success: true,
        quotation,
        data: quotation,
        draftEmail: {
          subject: emailSubject,
          body: emailWithReviewLink,
          htmlBody: emailHtmlBody,
          emailProvider: req.body.emailProvider || 'imap',
          pdfFileName
        },
        pdfBase64: pdfBuffer.toString('base64')
      };

      // 创始人微信实时战报：默认静音（严格保护 PushPlus 每日 200 条限额优先供新用户注册留资与付费激活使用）
      if (process.env.PUSH_QUOTE_CREATED_TO_WECHAT === 'true') {
        NotificationService.pushQuoteCreatedToWeChat({
          quotationNumber: quotation.quotationNumber,
          buyerName: quotation.buyerName,
          totalAmountForeign: quotation.totalAmountForeign,
          currency: quotation.currency,
          itemCount: quotation.items?.length || 0,
          salesRepEmail,
          salesRepName,
          tenantId,
          reviewUrl,
          tradeTerms: quotation.incotermUsed
        }).catch(err => {
          console.warn('⚠️ [微信战报推送失败 (非阻塞)]:', err.message);
        });
      } else {
        console.log(`ℹ️ [Quote] 报价单 [${quotation.quotationNumber}] 已生成，出单微信通知已静音（优先保留 PushPlus 每日限额用于新用户注册留资）`);
      }

      return res.json(responsePayload);
    } catch (error: any) {
      console.error('❌ 處理報價請求失敗:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '內部服務器錯誤'
      });
    }
  }
);

// =========================================================================
// 3. 【在線微調單據詳情查詢 (多租戶隔離 + 底價安全脫敏)】: GET /api/v1/quotes/:id
// =========================================================================

quoteRouter.get('/quotes/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    let id = String(req.params.id || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!id) {
      return res.status(400).json({ success: false, error: '无效的报价单号' });
    }
    const tenantId = req.tenantId || 'default';

    // 容錯機制：如果請求的是 review.html、latest 或默認占位符，自動定位當前租戶下最新的報價單
    if (id === 'review.html' || id === 'latest' || id === 'default') {
      const allQuotes = QuoteStoreService.listQuotes(tenantId);
      if (allQuotes.length > 0) {
        id = allQuotes[0].quotationNumber;
      } else {
        id = 'QT-20260904-888';
      }
    }

    // 優先查詢當前租戶下的報價單
    let quotation = QuoteStoreService.getQuote(id, tenantId);

    // 官方公共樣例單據白名單 (允許新註冊試用用戶與所有租戶體驗與安全克隆)
    const isSampleOrDemoQuote = 
      id === 'QT-20260904-888' || 
      id === 'QT-388788' ||
      id === 'QT-PO-2026-EU-9812' || 
      id.startsWith('QT-DEMO') || 
      id.startsWith('QT-PO-2026-EU-') || 
      id.toUpperCase().includes('SAMPLE') || 
      id.toUpperCase().includes('TEST');

    // 如果當前租戶下未找到，檢查是否為官方樣例單，允許新註冊試用用戶與所有租戶體驗
    if (!quotation && isSampleOrDemoQuote) {
      const defaultQuote = QuoteStoreService.getQuote(id, 'default') || QuoteStoreService.getQuote(id);
      if (defaultQuote) {
        quotation = {
          ...defaultQuote,
          tenantId
        };
        // 為該租戶專屬克隆存儲，供其獨立微調
        QuoteStoreService.saveQuote(quotation, undefined, tenantId);
      }
    }

    // 如果當前租戶下未找到，檢查是否屬於其他租戶 (防越權防窺探)
    if (!quotation) {
      const anyQuote = QuoteStoreService.getQuote(id);
      if (anyQuote && anyQuote.tenantId && anyQuote.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: `【越權攔截】您無權查閱其他企業租戶 [${anyQuote.tenantId}] 的商業報價單！`
        });
      }
      return res.status(404).json({ success: false, error: `未找到報價單 [${id}]` });
    }

    const profile = req.tenant || TenantService.getTenantProfile(tenantId);
    const isPaid = profile.plan === 'geek' || profile.plan === 'monthly' || profile.plan === 'annual' || profile.plan === 'starter' || profile.plan === 'pro' || profile.plan === 'enterprise';
    const hasImapConfig = !!(profile.imapConfig?.enabled && profile.imapConfig?.authCode && profile.imapConfig?.email);

    // 智能防泄密隔离：若为海外买家/外部无 Token 访客访问真实私有报价单，自动对出厂底价与内部利润率执行安全脱敏
    // 关键修复：官方公共样例/演示单据 (isSampleOrDemoQuote) 面向访客提供可交互的算价与调利体验，跳过脱敏置零
    const isOwnerOrStaff = Boolean(req.user && (req.user.tenantId === quotation.tenantId || req.user.role === 'admin'));
    let safeQuotation = quotation;
    if (!isOwnerOrStaff && !isSampleOrDemoQuote) {
      safeQuotation = {
        ...quotation,
        items: (quotation.items || []).map(it => ({
          ...it,
          basePriceRMB: 0,
          profitMargin: 0,
          fobCostRMB: 0,
          itemConfidenceScore: it.itemConfidenceScore,
          confidenceRemark: it.confidenceRemark
        }))
      };
    }

    // 币种警告文案标准化：若单据币种缺失或为 N/A，警告转换为标准一致表述，杜绝 [N/A] 困惑
    if (safeQuotation) {
      if (Array.isArray(safeQuotation.warnings)) {
        safeQuotation.warnings = safeQuotation.warnings.map(w =>
          w.replace(/Currency \[(?:N\/A|undefined|)\] not found in exchange rate list\./gi, 'Currency not specified, defaulted to USD.')
           .replace(/Currency \[N\/A\] not found in exchange rate list/gi, 'Currency not specified, defaulted to USD')
        );
      }
      if (Array.isArray(safeQuotation.riskDisclaimers)) {
        safeQuotation.riskDisclaimers = safeQuotation.riskDisclaimers.map(r =>
          r.replace(/\(1\s+N\/A\s*=/gi, '(1 USD =')
        );
      }
    }

    // 加载租户底价商品库与全局动态配置，赋能前端智能选型器与防呆核对
    let catalogItems: any[] = [];
    let pricingConfig: any = null;
    try {
      const pricingBuffer = TenantService.getActivePricingBuffer(tenantId);
      if (pricingBuffer) {
        const tenantRules = TenantService.getTenantCustomRules(tenantId);
        const parsed = ExcelAdapter.parse(pricingBuffer.buffer, { customRules: tenantRules });
        if (parsed.success) {
          if (parsed.priceItems) {
            catalogItems = parsed.priceItems.map(p => ({
              sku: p.rawSku,
              name: p.productName,
              basePrice: isOwnerOrStaff ? p.basePrice : 0,
              moq: p.moq ?? 1,
              leadTime: p.leadTime,
              profitMargin: isOwnerOrStaff ? p.profitMargin : 0,
              pcsPerCtn: p.pcsPerCtn,
              cbmPerCtn: p.cbmPerCtn,
              gwPerCtn: p.gwPerCtn,
              aliases: p.aliases,
              hsCode: p.hsCode
            }));
          }

          pricingConfig = {
            currencies: (parsed.exchangeRates && parsed.exchangeRates.length > 0) ? parsed.exchangeRates : [
              { currency: 'USD', rateToRMB: 7.20, symbol: '$' },
              { currency: 'EUR', rateToRMB: 7.85, symbol: '€' },
              { currency: 'GBP', rateToRMB: 9.10, symbol: '£' },
              { currency: 'AUD', rateToRMB: 4.80, symbol: 'A$' },
              { currency: 'CAD', rateToRMB: 5.30, symbol: 'C$' }
            ],
            defaultCurrency: parsed.defaultCurrency || 'USD',
            defaultMargin: parsed.defaultProfitMargin ?? 0.15,
            floorMargin: parsed.floorMargin ?? 0.08,
            sampleMultiplier: parsed.sampleMultiplier ?? 2.5,
            priceValidity: parsed.priceValidity || '30 Days',
            leadTime: parsed.leadTime || '25-30 days upon receipt of deposit',
            samplePolicy: parsed.samplePolicy || (parsed.sampleMultiplier ? `Sample fee ${parsed.sampleMultiplier}x, 100% refundable upon official bulk order MOQ` : 'Double unit price (2.5x), 100% refundable upon bulk order'),
            incoterms: (parsed.incotermRules && parsed.incotermRules.length > 0) ? parsed.incotermRules.map(r => {
              const portClean = r.port ? r.port.split(/[\s(（]/)[0].replace(/[港/]/g, '') : '';
              let label = r.incoterm;
              let val = r.incoterm;
              if (r.incoterm === 'EXW') {
                label = 'EXW 工厂自提';
                val = 'EXW Factory';
              } else if (r.incoterm === 'FOB') {
                label = `FOB ${portClean ? portClean + '港' : '深圳港'}`;
                val = `FOB ${portClean || 'Shenzhen'} Port`;
              } else if (r.incoterm === 'CIF') {
                label = 'CIF 目的港';
                val = 'CIF Destination Port';
              }
              return {
                incoterm: r.incoterm,
                port: r.port || '',
                label,
                val,
                unitFeeRMB: r.unitFeeRMB ?? 0,
                fixedFeeRMB: r.fixedFeeRMB ?? 0
              };
            }) : [
              { incoterm: 'EXW', port: '车间自提', label: 'EXW 工厂自提', val: 'EXW Factory', unitFeeRMB: 0, fixedFeeRMB: 0 },
              { incoterm: 'FOB', port: '深圳港', label: 'FOB 深圳港', val: 'FOB Shenzhen Port', unitFeeRMB: 0.2, fixedFeeRMB: 1500 },
              { incoterm: 'CIF', port: '目的港', label: 'CIF 目的港', val: 'CIF Destination Port', unitFeeRMB: 0, fixedFeeRMB: 0 }
            ],
            paymentTerms: (parsed.paymentTerms && parsed.paymentTerms.length > 0) ? parsed.paymentTerms.map(p => {
              let name = p.term;
              if (p.term.includes('全款') || p.term.includes('Advance')) name = '前100% TT';
              else if (p.term.includes('30%') || p.term.includes('Deposit')) name = '30/70 TT';
              else if (p.term.includes('L/C') || p.term.includes('信用证')) name = '即期L/C';
              else name = p.term.split(/[\s(（]/)[0];

              const adj = p.adjustmentPercent ?? 0;
              const suffix = adj < 0 ? ` (${(adj * 100).toFixed(0)}%)` : (adj > 0 ? ` (+${(adj * 100).toFixed(1)}%)` : ' (基准)');
              return {
                term: p.term,
                val: p.term.includes('(') ? (p.term.split(/[\(（]/)[0].trim()) : p.term,
                label: `${name}${suffix}`,
                adjustmentPercent: adj
              };
            }) : [
              { term: '100% T/T Advance (全款预付)', val: '100% T/T in advance before production', label: '前100% TT (-2%)', adjustmentPercent: -0.02 },
              { term: '30% Deposit + 70% Balance (标准前T/T)', val: '30% T/T Deposit, 70% Balance before shipment', label: '30/70 TT (基准)', adjustmentPercent: 0 },
              { term: 'L/C at Sight (即期不可撤销信用证)', val: '100% Irrevocable L/C at sight', label: '即期L/C (+1.5%)', adjustmentPercent: 0.015 }
            ],
            containerSpecs: (parsed.containerSpecs && parsed.containerSpecs.length > 0) ? parsed.containerSpecs : [
              { type: '20GP', safeCBM: 28, maxKG: 21800, label: '20GP (20尺小柜)' },
              { type: '40GP', safeCBM: 58, maxKG: 26000, label: '40GP (40尺平柜)' },
              { type: '40HQ', safeCBM: 68, maxKG: 26000, label: '40HQ (40尺高柜)' }
            ]
          };
        }
      }
    } catch (catErr) {
      console.warn('Failed to load catalog items for tenant:', tenantId, catErr);
    }

    return res.json({
      success: true,
      quotation: safeQuotation,
      catalogItems,
      pricingConfig,
      isGuestMode: !isOwnerOrStaff,
      tenant: {
        tenantId: profile.tenantId,
        companyName: profile.companyName,
        companySubtitle: profile.companySubtitle,
        logoUrl: TenantService.getTenantLogoUrl(tenantId),
        plan: profile.plan || 'trial',
        isPaid,
        hasImapConfig,
        imapConfig: profile.imapConfig ? {
          enabled: profile.imapConfig.enabled,
          email: profile.imapConfig.email,
          host: profile.imapConfig.host,
          port: profile.imapConfig.port,
          hasAuthCode: !!profile.imapConfig.authCode
        } : undefined,
        hideCostFromSales: !isOwnerOrStaff
      },
      currentUser: req.user
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// 4. 【在線微調並重新生成 PDF (多租戶隔離 + 底價防篡改)】: POST /api/v1/quotes/:id 及 /quotes/:id/update
// =========================================================================
quoteRouter.post(['/quotes/:id', '/quotes/:id/update'], async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!id) {
      return res.status(400).json({ success: false, error: '无效的报价单号' });
    }
    const tenantId = req.tenantId || 'default';

    let existing = QuoteStoreService.getQuote(id, tenantId);
    const isSampleOrDemoQuote = 
      id === 'QT-20260904-888' || 
      id === 'QT-388788' ||
      id === 'QT-PO-2026-EU-9812' || 
      id.startsWith('QT-DEMO') || 
      id.startsWith('QT-PO-2026-EU-') || 
      id.toUpperCase().includes('SAMPLE') || 
      id.toUpperCase().includes('TEST');
    if (!existing && isSampleOrDemoQuote) {
      existing = QuoteStoreService.getQuote(id, 'default') || QuoteStoreService.getQuote(id);
    }
    if (!existing) {
      const anyQuote = QuoteStoreService.getQuote(id);
      if (anyQuote && anyQuote.tenantId && anyQuote.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: `【越權攔截】禁止修改其他企業租戶 [${anyQuote.tenantId}] 的報價單！`
        });
      }
      return res.status(404).json({ success: false, error: `未找到報價單 [${id}]` });
    }

    const updatedData = req.body?.quotation || req.body;
    const terms = req.body?.terms;
    const customEmailSubject = req.body?.customEmailSubject;
    const customEmailBody = req.body?.customEmailBody;
    if (!updatedData || (!updatedData.items && !Array.isArray(updatedData))) {
      return res.status(400).json({ success: false, error: '缺少更新數據' });
    }

    // 重新計算明细与總計外幣金額 (防脱敏字段丢失与毛利率变动联动折算)
    let totalForeign = 0;
    if (Array.isArray(updatedData.items)) {
      const rateUsed = Number(Number(updatedData.rateUsed ?? existing.rateUsed ?? 7.2).toFixed(4));
      updatedData.items = updatedData.items.map((item: any, idx: number) => {
        // 关键修复：优先按 SKU 精准对齐匹配，防止删除、插入或重排序时按索引串位
        const existingItem = (item.sku ? existing.items?.find((it: any) => it.sku === item.sku) : undefined)
          || (item.matchedSku ? existing.items?.find((it: any) => it.matchedSku === item.matchedSku) : undefined)
          || (existing.items?.[idx]?.sku === item.sku ? existing.items[idx] : undefined);

        const basePriceRMB = (item.basePriceRMB && item.basePriceRMB > 0) ? Number(item.basePriceRMB) : (existingItem?.basePriceRMB || 0);
        const fobCostRMB = item.fobCostRMB !== undefined ? Number(item.fobCostRMB) : (existingItem?.fobCostRMB ?? 0);
        const profitMargin = (typeof item.profitMargin === 'number' && !isNaN(item.profitMargin)) 
          ? item.profitMargin 
          : (typeof existingItem?.profitMargin === 'number' && !isNaN(existingItem.profitMargin) ? existingItem.profitMargin : 0.15);
        
        let unitPriceForeign = item.unitPriceForeign;
        // 若用户明确提供了数字单价，则严格保留用户手工设定的单价；若未提供单价或单价为 NaN，才通过底价和毛利折算
        if (typeof unitPriceForeign !== 'number' || isNaN(unitPriceForeign)) {
          if (basePriceRMB > 0) {
            const unitRMB = basePriceRMB * (1 + profitMargin) + fobCostRMB;
            unitPriceForeign = Number((unitRMB / rateUsed).toFixed(2));
          } else {
            unitPriceForeign = existingItem?.unitPriceForeign ?? 0;
          }
        }

        const quantity = Number(item.quantity ?? existingItem?.quantity ?? 1);
        const subTotalForeign = Number((quantity * unitPriceForeign).toFixed(2));
        totalForeign = Number((totalForeign + subTotalForeign).toFixed(2));

        return {
          ...existingItem,
          ...item,
          quantity,
          basePriceRMB,
          fobCostRMB,
          profitMargin,
          unitPriceForeign,
          subTotalForeign
        };
      });
    }

    const finalQuotation: any = {
      ...existing,
      ...updatedData,
      tenantId,
      customEmailSubject: customEmailSubject || (existing as any).customEmailSubject,
      customEmailBody: customEmailBody || (existing as any).customEmailBody,
      totalAmountForeign: Number(totalForeign.toFixed(2)),
      processedAt: new Date().toISOString()
    };

    // 重新渲染高清晰 PDF (攜帶當前租戶企業抬頭與 Logo)
    const profile = req.tenant || TenantService.getTenantProfile(tenantId);
    const newPdfBuffer = await PDFService.generateQuotationPDF(finalQuotation, {
      companyName: profile.companyName,
      salesRepName: finalQuotation.salesRepName || profile.managerName,
      salesRepEmail: profile.contactEmail,
      logoPath: TenantService.getTenantLogoPath(tenantId) || undefined
    });

    // 持久化更新至租戶隔離存儲 (保護官方演示單據種子數據，防止非管理員直接覆蓋全局種子的只讀鎖)
    const isMasterSeedQuote = id === 'QT-20260904-888';
    const isAdmin = Boolean(req.user && req.user.role === 'admin');
    if (!isMasterSeedQuote || isAdmin || tenantId !== 'default') {
      QuoteStoreService.updateQuote(id, finalQuotation, newPdfBuffer, tenantId);
    } else {
      console.log(`🛡️ [演示單只讀保護] 訪客微調了公共演示單據 [${id}]，僅返回實時重繪 PDF，已保護底層靜態種子文件不被覆蓋！`);
    }

    console.log(`✅ 租戶 [${tenantId}] 報價單 [${id}] 已成功微調並重新生成 PDF！最新總額: ${finalQuotation.currency} ${finalQuotation.totalAmountForeign}`);

    const safeFinalCustomer = (finalQuotation.customerName || finalQuotation.buyerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFinalQuoteNum = finalQuotation.quotationNumber || id;
    const pdfFileName = `${safeFinalCustomer}_Quotation_${safeFinalQuoteNum}.pdf`;

    // 针对付费用户或显式要求注入草稿箱的请求，静默调用 IMAP 写入
    let draftInjectionResult: any = null;
    const isPaid = profile.plan === 'geek' || profile.plan === 'monthly' || profile.plan === 'annual' || profile.plan === 'starter' || profile.plan === 'pro' || profile.plan === 'enterprise';
    const shouldInjectDraft = req.body.injectDraft === true || (isPaid && profile.imapConfig?.enabled && profile.imapConfig?.authCode && profile.imapConfig?.email && req.body.injectDraft !== false);

    if (shouldInjectDraft && profile.imapConfig?.enabled && profile.imapConfig?.email && profile.imapConfig?.authCode) {
      console.log(`🚀 [工作台直达草稿箱] 租户 [${tenantId}] 触发 IMAP 草稿自动注入，正在写入 [${profile.imapConfig.email}] 草稿箱...`);
      try {
        draftInjectionResult = await DraftService.appendDraft({
          userEmail: profile.imapConfig.email,
          authCode: profile.imapConfig.authCode,
          imapHost: profile.imapConfig.host,
          imapPort: profile.imapConfig.port,
          secure: profile.imapConfig.secure,
          to: finalQuotation.customerEmail || finalQuotation.buyerEmail || '',
          subject: customEmailSubject || `Quotation ${finalQuotation.quotationNumber} for RFQ - ${profile.companyName || 'FoShan Kelvin'}`,
          text: customEmailBody || '',
          attachments: [{
            filename: pdfFileName,
            content: newPdfBuffer,
            contentType: 'application/pdf'
          }]
        });
      } catch (imapErr: any) {
        console.warn('⚠️ IMAP 草稿注入异常:', imapErr.message);
        draftInjectionResult = { success: false, error: imapErr.message };
      }
    }

    return res.json({
      success: true,
      message: '微調保存成功，已重新生成 PDF 並更新草稿',
      quotation: finalQuotation,
      draftEmail: {
        subject: customEmailSubject || `Quotation ${finalQuotation.quotationNumber} for PO - ${profile.companyName || 'FoShan Kelvin'}`,
        body: customEmailBody || '',
        htmlBody: customEmailBody ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${customEmailBody}</div>` : undefined,
        pdfFileName
      },
      pdfBase64: newPdfBuffer.toString('base64'),
      draftInjection: draftInjectionResult
    });
  } catch (error: any) {
    console.error(`❌ 微調報價單 [${req.params.id}] 失敗:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// 4.5 【報價單整單刪除 (多租戶隔離 D-12 紅線防越權 + 審計日誌)】: DELETE /api/v1/quotes/:id
// =========================================================================
const handleQuoteDelete = async (req: Request, res: Response): Promise<any> => {
  try {
    let id = String(req.params.id || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!id) {
      return res.status(400).json({ success: false, error: '无效的报价单号' });
    }

    const tenantId = req.tenantId || 'default';
    const clientIp = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const operator = req.user?.email || (req.user as any)?.username || 'anonymous_user';

    // D-12 租戶隔離紅線：嚴格校驗租戶歸屬權
    // 1. 先確認該單據在當前請求租戶下是否存在
    const existingQuote = QuoteStoreService.getQuote(id, tenantId);

    if (!existingQuote) {
      // 在當前租戶下未找到，查詢是否屬於其他租戶 (防越權窺探與跨租戶刪除)
      const anyQuote = QuoteStoreService.getQuote(id);
      if (anyQuote && anyQuote.tenantId && anyQuote.tenantId !== tenantId) {
        writeAuditLog({
          action: 'DELETE_QUOTE',
          operator,
          tenantId,
          targetId: id,
          ip: clientIp,
          status: 'FORBIDDEN',
          details: `Attempted cross-tenant delete of quote belonging to [${anyQuote.tenantId}]`
        });
        return res.status(403).json({
          success: false,
          error: `【越权拦截】您无权删除其他企业租户 [${anyQuote.tenantId}] 的商业报价单！`
        });
      }

      return res.status(404).json({
        success: false,
        error: `未找到报价单 [${id}] 或已被删除`
      });
    }

    // 2. 執行物理刪除
    const deleteResult = QuoteStoreService.deleteQuote(id, tenantId);
    if (!deleteResult.success) {
      if (deleteResult.forbidden) {
        return res.status(403).json({
          success: false,
          error: `【越权拦截】您无权删除其他企业租户 [${deleteResult.ownerTenantId}] 的商业报价单！`
        });
      }
      return res.status(404).json({
        success: false,
        error: `未找到报价单 [${id}]`
      });
    }

    writeAuditLog({
      action: 'DELETE_QUOTE',
      operator,
      tenantId,
      targetId: id,
      ip: clientIp,
      status: 'SUCCESS'
    });

    return res.json({
      success: true,
      message: `报价单 [${id}] 已成功删除`
    });
  } catch (error: any) {
    console.error(`❌ 删除报价单 [${req.params.id}] 异常:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
quoteRouter.delete('/quotes/:id', handleQuoteDelete);
quoteRouter.post('/quotes/:id/delete', handleQuoteDelete);

// =========================================================================
// 5. 【PDF 在線預覽與下載 (多租戶隔離防窺探)】: GET /api/v1/quotes/:id/pdf
// =========================================================================

quoteRouter.get('/quotes/:id/pdf', async (req: Request, res: Response): Promise<any> => {
  try {
    let id = String(req.params.id || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!id) {
      return res.status(400).json({ success: false, error: '无效的报价单号' });
    }
    const tenantId = req.tenantId || 'default';

    if (id === 'review.html' || id === 'latest' || id === 'default') {
      const allQuotes = QuoteStoreService.listQuotes(tenantId);
      if (allQuotes.length > 0) {
        id = allQuotes[0].quotationNumber;
      } else {
        id = 'QT-20260904-888';
      }
    }

    const isSampleOrDemoQuote = 
      id === 'QT-20260904-888' || 
      id === 'QT-388788' ||
      id === 'QT-PO-2026-EU-9812' || 
      id.startsWith('QT-DEMO') || 
      id.startsWith('QT-PO-2026-EU-') || 
      id.toUpperCase().includes('SAMPLE') || 
      id.toUpperCase().includes('TEST');

    // 优先实时重新渲染生成最新的 PDF (确保上传 Logo、更改汇率与最新版式 100% 实时反映)
    const quoteData = QuoteStoreService.getQuote(id, tenantId) || 
      (isSampleOrDemoQuote ? (QuoteStoreService.getQuote(id, 'default') || QuoteStoreService.getQuote(id)) : null);

    let pdfBuffer: Buffer | null = null;
    if (quoteData) {
      try {
        const profile = TenantService.getTenantProfile(tenantId);
        pdfBuffer = await PDFService.generateQuotationPDF(quoteData, {
          companyName: profile.companyName,
          salesRepName: quoteData.salesRepName || profile.managerName,
          salesRepEmail: profile.contactEmail,
          logoPath: TenantService.getTenantLogoPath(tenantId) || undefined
        });
        QuoteStoreService.saveQuote(quoteData, pdfBuffer, tenantId);
      } catch (genErr) {
        console.warn('PDF dynamic generation failed, fallback to cache:', genErr);
      }
    }

    if (!pdfBuffer) {
      pdfBuffer = QuoteStoreService.getQuotePDF(id, tenantId);
      if (!pdfBuffer && isSampleOrDemoQuote) {
        pdfBuffer = QuoteStoreService.getQuotePDF(id, 'default') || QuoteStoreService.getQuotePDF(id);
      }
    }

    if (!pdfBuffer) {
      const anyQuote = QuoteStoreService.getQuote(id);
      if (anyQuote && anyQuote.tenantId && anyQuote.tenantId !== tenantId) {
        return res.status(403).send('【越權攔截】您無權查閱其他企業租戶的商業 PDF 報價單！');
      }
      return res.status(404).send('PDF 不存在或未生成');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    return res.status(500).send('讀取 PDF 失敗');
  }
});
