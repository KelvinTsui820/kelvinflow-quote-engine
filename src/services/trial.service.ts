import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthService } from './auth.service.js';
import { TenantService } from './tenant.service.js';
import { NotificationService } from './notification.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { AuthUser, TenantProfile } from '../types/index.js';

export interface TrialRecord {
  id: string;
  phone: string;
  email: string;
  name: string;
  company: string;
  category: string;
  wechat?: string;
  tenantId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'converted';
  lastLoginAt?: string;
  ip?: string;
  passwordHash?: string;
  channelSource?: string;
  referredBy?: string;
  referralCount?: number;
  rewardDays?: number;
  paidPlan?: 'geek' | 'pro' | 'enterprise';
  amountPaid?: number;
  paidAt?: string;
}

export interface TrialRegisterResult {
  success: boolean;
  isNew?: boolean;
  isReturning?: boolean;
  expired?: boolean;
  code?: string;
  message?: string;
  token?: string;
  tenantId?: string;
  remainingDays?: number;
  expiresAt?: string;
  user?: AuthUser;
  tenant?: TenantProfile;
  error?: string;
  founderWechat?: string;
  referredBy?: string;
  canLogin?: boolean;
  isLegacyBound?: boolean;
  isPaid?: boolean;
  plan?: string;
  formattedExpiresAt?: string;
  monthlyQuota?: number;
}

export class TrialService {
  private static DATA_DIR = path.resolve(process.cwd(), 'data');
  private static TRIALS_FILE = path.resolve(process.cwd(), 'data', 'trials.json');

  private static init() {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.TRIALS_FILE)) {
      fs.writeFileSync(this.TRIALS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  /**
   * 获取所有试用记录
   */
  static getAllTrials(): TrialRecord[] {
    this.init();
    try {
      const content = fs.readFileSync(this.TRIALS_FILE, 'utf-8');
      return JSON.parse(content) as TrialRecord[];
    } catch (e) {
      console.warn('⚠️ 读取 trials.json 失败，返回空数组:', e);
      return [];
    }
  }

  /**
   * 保存试用记录
   */
  static saveTrials(records: TrialRecord[]): void {
    this.init();
    fs.writeFileSync(this.TRIALS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  }

  /**
   * 根据邮箱精确匹配试用记录 (核心检索)
   */
  static findTrialByEmail(email?: string): TrialRecord | null {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    const trials = this.getAllTrials();
    return trials.find(t => t.email.toLowerCase() === clean) || null;
  }

  /**
   * 根据手机号或邮箱匹配试用记录 (兼顾多条件查询与智能单标识符查询)
   */
  static findTrialByPhoneOrEmail(phoneOrEmail?: string, emailArg?: string): TrialRecord | null {
    if (emailArg) {
      const match = this.findTrialByEmail(emailArg);
      if (match) return match;
    }
    const query = (phoneOrEmail || '').trim();
    if (query.includes('@')) {
      const match = this.findTrialByEmail(query);
      if (match) return match;
    }
    const trials = this.getAllTrials();
    const cleanPhone = query.replace(/\D/g, '');
    const cleanEmail = (emailArg || (query.includes('@') ? query : '')).toLowerCase().trim();

    return trials.find(t => {
      const matchPhone = cleanPhone && cleanPhone.length >= 7 && t.phone === cleanPhone;
      const matchEmail = cleanEmail && t.email.toLowerCase() === cleanEmail;
      return Boolean(matchPhone || matchEmail);
    }) || null;
  }

  /**
   * 根据 Tenant ID 查询试用状态
   */
  static getTrialByTenantId(tenantId: string): TrialRecord | null {
    const trials = this.getAllTrials();
    const cleanId = tenantId.toLowerCase().trim();
    return trials.find(t => t.tenantId.toLowerCase() === cleanId) || null;
  }

  /**
   * 格式化到期时间为年月日与时分 (如: 2026年10月30日 18:00)
   * 确保用户看到的到期时间与开通时刻精确对齐，杜绝少算一天的错觉
   */
  static formatExpiryDateTime(expiresAt: string | Date | number): string {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) return '已到期';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  }

  /**
   * 计算试用期剩余自然天数
   * 精确时间算法：基于 24 小时满时窗向上取整 (Math.ceil)。
   * 确保用户在任意时间点开通（如晚上 18:00），到期时间严格为 7 天后的 18:00，绝不因跨过半夜被提前扣减一天。
   */
  static calculateRemainingDays(expiresAt: string | Date | number, now: Date = new Date()): number {
    const exp = new Date(expiresAt);
    if (isNaN(exp.getTime()) || now.getTime() >= exp.getTime()) {
      return 0;
    }
    const diffMs = exp.getTime() - now.getTime();
    return Math.max(1, Math.ceil(diffMs / (24 * 3600 * 1000)));
  }

  /**
   * 密码安全加盐哈希算法 (SHA-256)
   */
  static hashPassword(password: string): string {
    const salt = 'kelvinflow_saas_salt_2026';
    return crypto.createHash('sha256').update(password.trim() + salt).digest('hex');
  }

  /**
   * 密码安全校验 (MVP 降摩擦)：
   * 1. 长度至少 6 位，保护私有底价机密
   */
  static validatePasswordComplexity(password: string): { valid: boolean; error?: string } {
    const pwd = (password || '').trim();
    if (!pwd || pwd.length < 6) {
      return { valid: false, error: '登录密码长度至少须为 6 位字符' };
    }
    return { valid: true };
  }

  /**
   * 注册开通 7 天免费全功能试用
   * 严格执行密码安全保护：杜绝仅凭手机号盗取底价商业机密
   * 严格执行防薅羊毛规则：手机号或邮箱仅限享受 1 次 7 天全功能试用
   * 支持同行推荐奖励机制：推荐好友注册，双方各获奖励天数
   */
  static async registerOrLoginTrial(params: {
    email: string;
    code?: string;
    phone?: string;
    password?: string;
    channelSource?: string;
    name?: string;
    company?: string;
    category?: string;
    wechat?: string;
    ip?: string;
    ref?: string;
  }): Promise<TrialRegisterResult> {
    const cleanEmail = (params.email || '').toLowerCase().trim();
    const cleanPhone = (params.phone || '').replace(/\D/g, '');
    const code = (params.code || '').trim();
    const rawPassword = (params.password || '').trim();
    const channelSource = (params.channelSource || '').trim() || '未选择';
    const name = (params.name || '').trim() || '外贸同行';
    const company = (params.company || '').trim() || '';
    const category = (params.category || '').trim() || '';
    const wechat = (params.wechat || '').trim();
    const ip = params.ip || '127.0.0.1';
    const rawRef = (params.ref || '').trim();

    // 1. 邮箱基础校验与域名风控 (拦截临时一次性匿名邮箱，支持常见公用邮箱与企业域名邮箱)
    const emailCheck = EmailVerificationService.validateEmailRisk(cleanEmail);
    if (!emailCheck.valid) {
      return {
        success: false,
        error: emailCheck.error || '请输入合法的企业工作邮箱或常用公用邮箱（Gmail/QQ/163/Hotmail等）'
      };
    }

    // 2. IP 频控防薅羊毛：同一个 IP 地址 7 天内最多注册 3 个试用账号
    if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const recentTrialsFromSameIp = this.getAllTrials().filter(t => {
        if (!t.ip || t.ip !== ip) return false;
        const regTime = new Date(t.createdAt).getTime();
        return !isNaN(regTime) && regTime >= sevenDaysAgo;
      });

      if (recentTrialsFromSameIp.length >= 3) {
        return {
          success: false,
          error: '当前网络环境试用申请次数已达上限 (同一个IP地址7天内最多注册3个试用账号)。如需为团队增加席位，请联系创始人微信！'
        };
      }
    }

    // 2.5 优先检索历史试用记录 (按邮箱严格防薅羊毛与拦截重复注册)
    const existing = this.findTrialByEmail(cleanEmail) || (cleanPhone ? this.findTrialByPhoneOrEmail(cleanPhone) : null);
    const now = new Date();

    if (existing) {
      const expiryDate = new Date(existing.expiresAt);
      const isExpired = now > expiryDate;

      if (isExpired) {
        // 🚨【防薅羊毛拦截】：该邮箱已体验过 7 天试用且已到期！
        console.warn(`🚨 [防薅羊毛拦截] 邮箱 [${cleanEmail}] 已于 ${expiryDate.toISOString()} 到期，拒绝二次免费试用`);
        if (existing.status !== 'converted') {
          existing.status = 'expired';
        }
        const all = this.getAllTrials().map(t => t.id === existing.id ? existing : t);
        this.saveTrials(all);

        const expiryStr = this.formatExpiryDateTime(existing.expiresAt);
        return {
          success: false,
          expired: true,
          code: 'TRIAL_EXPIRED',
          message: `该邮箱（${existing.email}）的 7 天免费全功能试用已于 ${expiryStr} 到期。底价库与历史单据已为您安全保留 30 天。☕ 少喝一杯星巴克，首月特惠仅 ¥39 即可解锁整月无限次私人出单！试用到期后，每月仍享有 10 笔免费出单额度。如需解锁无限次极速出单与企业 Logo 上传，请升级个人专业版！`,
          expiresAt: existing.expiresAt,
          founderWechat: 'kt_data'
        };
      } else {
        // 🚨 账号已存在且在有效期内：阻断重复注册，提示输入密码登录
        return {
          success: false,
          canLogin: true,
          error: `该邮箱 (${cleanEmail}) 已经开通过试用服务，请切换至「已有账号登录」输入密码登录工作台！`
        };
      }
    }

    if (AuthService.findUserByEmail(cleanEmail)) {
      return {
        success: false,
        canLogin: true,
        error: `该邮箱 (${cleanEmail}) 已是系统注册账号，请直接使用密码登录！`
      };
    }

    // 3. 邮箱 6 位验证码校验
    const codeCheck = EmailVerificationService.verifyCode(cleanEmail, code);
    if (!codeCheck.valid) {
      return {
        success: false,
        error: codeCheck.error || '验证码错误或已失效，请重新获取'
      };
    }

    // 4. 密码安全与复杂度校验
    const pwdCheck = this.validatePasswordComplexity(rawPassword);
    if (!pwdCheck.valid) {
      return {
        success: false,
        error: pwdCheck.error || '请设置至少 6 位的安全密码'
      };
    }

    // 6. 全新用户开通试用：纯邮箱驱动租户标识
    const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    const domainPrefix = (cleanEmail.split('@')[1] || '').split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    const tenantId = `tenant_trial_${emailPrefix}_${domainPrefix}`;
    const userId = `usr_trial_${emailPrefix}`;

    // 新注册用户标准免费试用期为 7 天
    const trialDays = 7;
    const expiresAtDate = new Date(Date.now() + trialDays * 24 * 3600 * 1000);
    const expiresAt = expiresAtDate.toISOString();


    // 7.2 初始化租户目录并同步种子底价表
    const tenantDir = TenantService.getTenantDir(tenantId);
    const tenantPricingPath = path.join(tenantDir, 'active_pricing.xlsx');
    const defaultPricingPath = path.join(this.DATA_DIR, 'active_pricing.xlsx');
    if (!fs.existsSync(tenantPricingPath) && fs.existsSync(defaultPricingPath)) {
      try {
        fs.copyFileSync(defaultPricingPath, tenantPricingPath);
        console.log(`📋 已为试用租户 [${tenantId}] 自动同步全套标准底价表！`);
      } catch (e) {
        console.warn(`⚠️ 为租户同步底价表失败:`, e);
      }
    }

    // 7.3 创建租户配置档案 (底价与数据安全保留 30 天)
    const tenant = TenantService.updateTenantProfile(tenantId, {
      companyName: company || `${name} Global Trading Co., Ltd.`,
      managerName: name,
      contactEmail: cleanEmail,
      contactPhone: cleanPhone,
      plan: 'trial' as any,
      status: 'active',
      expiresAt,
      // 试用期结束后提供整整 30 天安全保留缓冲期：以【试用期到期日 expiresAtDate】为起点计算
      dataRetentionUntil: new Date(expiresAtDate.getTime() + 30 * 24 * 3600 * 1000).toISOString(),
      hideCostFromSales: false,
      defaultProfitMargin: 0.30,
      defaultCurrency: 'USD'
    });

    // 7.4 登记试用主账本
    const newRecord: TrialRecord = {
      id: `trial_${emailPrefix}_${domainPrefix}`,
      phone: cleanPhone || '',
      email: cleanEmail,
      passwordHash: this.hashPassword(rawPassword),
      channelSource,
      name,
      company: company || '外贸个人工作室',
      category: category || '通用外贸',
      wechat,
      tenantId,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
      status: 'active',
      ip
    };

    const allTrials = this.getAllTrials();
    allTrials.unshift(newRecord);
    this.saveTrials(allTrials);


    // 7.5 签发安全 Token
    const user: AuthUser = {
      id: userId,
      email: cleanEmail,
      name,
      role: 'admin',
      tenantId
    };
    const token = AuthService.generateToken(user, trialDays * 24 * 3600);

    // 7.6 留资真实字段持久化与实时推送至创始人微信
    const leadPayload = {
      customerName: name !== '外贸同行' ? name : '',
      companyName: company,
      phone: cleanPhone,
      contact: cleanEmail,
      email: cleanEmail,
      wechat,
      channelSource,
      productCategory: category,
      source: `官网/工作台开通${trialDays}天全功能试用 (邮箱真验证)`,
      expiresAt,
      ip
    };
    NotificationService.saveLeadLocally(leadPayload);
    NotificationService.pushToWeChat(leadPayload).catch(err => console.error('异步微信通知出错:', err));

    console.log(`🎉 [试用开通成功] 邮箱 [${cleanEmail}], 手机 [${cleanPhone || '未填'}], 渠道 [${channelSource}], 租户 [${tenantId}], 试用期 [${trialDays}天]`);

    const welcomeMsg = `🎉 7 天全功能免费试用开通成功！已为您的专属私有底价库加密保护，底价表与历史单据将安全保留 30 天。正在为您跳转至外贸智能审单工作台...`;

    return {
      success: true,
      isNew: true,
      message: welcomeMsg,
      token,
      tenantId: tenant.tenantId,
      remainingDays: trialDays,
      expiresAt,
      user,
      tenant
    };
  }

  /**
   * 工作邮箱 + 密码安全登录
   */
  static async loginTrial(params: {
    email?: string;
    account?: string;
    phone?: string;
    password?: string;
    ip?: string;
  }): Promise<TrialRegisterResult> {
    const rawAccount = (params.email || params.account || params.phone || '').trim();
    const rawPassword = (params.password || '').trim();
    const ip = params.ip || '127.0.0.1';

    if (!rawAccount) {
      return {
        success: false,
        error: '请输入工作邮箱'
      };
    }

    if (!rawPassword) {
      return {
        success: false,
        error: '请输入账户登录密码'
      };
    }

    const cleanEmail = rawAccount.toLowerCase();
    const existing = this.findTrialByEmail(cleanEmail) || this.findTrialByPhoneOrEmail(rawAccount);
    if (!existing) {
      return {
        success: false,
        error: rawAccount.includes('@')
          ? '未找到该邮箱关联的试用记录，请先完成免费注册！'
          : '未找到该账号关联的试用记录，请先完成免费注册！'
      };
    }

    // 密码校验 (支持老存量免密账号首次登录无缝绑定新密码，或已有密码哈希比对)
    let isLegacyBound = false;
    if (!existing.passwordHash) {
      const pwdCheck = this.validatePasswordComplexity(rawPassword);
      if (!pwdCheck.valid) {
        return {
          success: false,
          error: pwdCheck.error || '登录密码长度至少须为 6 位字符'
        };
      }
      existing.passwordHash = this.hashPassword(rawPassword);
      isLegacyBound = true;
      console.log(`🔐 [存量账号自动绑定密码] 账号 [${rawAccount}] 已自动设置并绑定新密码！`);
    } else {
      const inputHash = this.hashPassword(rawPassword);
      if (existing.passwordHash !== inputHash) {
        return {
          success: false,
          error: '登录密码错误，请重新核对后输入（如忘记密码，可点击"忘记密码？"自助重置）'
        };
      }
    }

    const now = new Date();
    const expiryDate = new Date(existing.expiresAt);
    const isExpired = now > expiryDate;

    if (isExpired) {
      if (existing.status !== 'converted') {
        existing.status = 'expired';
      }
      existing.lastLoginAt = now.toISOString();
      if (ip) existing.ip = ip;
      const all = this.getAllTrials().map(t => t.id === existing.id ? existing : t);
      this.saveTrials(all);

      const expiryStr = this.formatExpiryDateTime(existing.expiresAt);
      const expiredText = `您的 7 天全功能免费试用已于 ${expiryStr} 到期。底价库与历史单据已为您安全保留 30 天。☕ 少喝一杯星巴克，首月特惠仅 ¥39 即可解锁整月无限次私人出单！试用到期后，每月仍享有 10 笔免费出单额度。如需解锁无限次极速出单与公司 Logo 上传，请升级个人专业版！`;

      const user: AuthUser = {
        id: existing.userId,
        email: existing.email,
        name: existing.name,
        role: 'admin',
        tenantId: existing.tenantId
      };

      // 允许7天到期用户正常登录工作台管理数据，Token 有效期为 30 天安全保留期
      const token = AuthService.generateToken(user, 30 * 24 * 3600);
      const tenant = TenantService.getTenantProfile(existing.tenantId);

      console.log(`🔑 [到期用户登录成功] 工作邮箱 [${existing.email}] 租户 [${existing.tenantId}] 允许进入工作台管理底价与单据 (数据安全保留30天)`);

      return {
        success: true,
        expired: true,
        code: 'TRIAL_EXPIRED',
        token,
        tenantId: existing.tenantId,
        remainingDays: 0,
        expiresAt: existing.expiresAt,
        formattedExpiresAt: expiryStr,
        user,
        tenant,
        isPaid: false,
        plan: 'free',
        message: expiredText,
        error: expiredText,
        monthlyQuota: 10,
        founderWechat: 'kt_data'
      };
    }

    const remainingDays = this.calculateRemainingDays(existing.expiresAt, now);
    existing.lastLoginAt = now.toISOString();
    if (ip) existing.ip = ip;
    const all = this.getAllTrials().map(t => t.id === existing.id ? existing : t);
    this.saveTrials(all);

    const user: AuthUser = {
      id: existing.userId,
      email: existing.email,
      name: existing.name,
      role: 'admin',
      tenantId: existing.tenantId
    };

    const token = AuthService.generateToken(user, remainingDays * 24 * 3600);
    const tenant = TenantService.getTenantProfile(existing.tenantId);

    console.log(`🔑 [密码登录成功] 工作邮箱 [${existing.email}] 租户 [${existing.tenantId}] 剩余有效期: ${remainingDays} 天`);

    const isPaid = Boolean((tenant?.plan && tenant.plan !== 'trial') || existing.status === 'converted');
    return {
      success: true,
      message: `登录成功！欢迎回来，您的全功能试用尚在有效期内（剩余 ${remainingDays} 天）`,
      token,
      tenantId: existing.tenantId,
      remainingDays,
      expiresAt: existing.expiresAt,
      user,
      tenant,
      isLegacyBound: isLegacyBound || undefined,
      isPaid,
      plan: tenant?.plan || (isPaid ? 'geek' : 'trial')
    };
  }

  /**
   * 查询账户当前状态 (以邮箱为主)
   */
  static checkAccountStatus(identifier: string): {
    exists: boolean;
    hasPassword?: boolean;
    isExpired?: boolean;
    remainingDays?: number;
    name?: string;
    email?: string;
  } {
    const raw = (identifier || '').trim();
    if (!raw) return { exists: false };
    const cleanEmail = raw.toLowerCase();
    const trial = this.findTrialByEmail(cleanEmail) || this.findTrialByPhoneOrEmail(raw);
    if (!trial) return { exists: false };
    const now = new Date();
    const expiryDate = new Date(trial.expiresAt);
    const isExpired = now > expiryDate;
    const remainingDays = isExpired ? 0 : this.calculateRemainingDays(trial.expiresAt, now);
    return {
      exists: true,
      hasPassword: !!trial.passwordHash,
      isExpired,
      remainingDays,
      name: trial.name,
      email: trial.email
    };
  }

  /**
   * 重置账户密码 (支持试用/付费租户与内置系统用户)
   */
  static resetPassword(accountOrEmail: string, newPassword: string): { success: boolean; error?: string } {
    const raw = (accountOrEmail || '').trim();
    if (!raw) {
      return { success: false, error: '请提供待重置密码的邮箱或账号' };
    }
    const pwdCheck = this.validatePasswordComplexity(newPassword);
    if (!pwdCheck.valid) {
      return { success: false, error: pwdCheck.error || '新密码长度至少须为 6 位字符' };
    }

    const cleanEmail = raw.toLowerCase();
    const trial = this.findTrialByEmail(cleanEmail) || this.findTrialByPhoneOrEmail(raw);

    if (trial) {
      trial.passwordHash = this.hashPassword(newPassword);
      const all = this.getAllTrials().map(t => t.id === trial.id ? trial : t);
      this.saveTrials(all);
      console.log(`🔐 [密码重置成功] 试用账号 [${trial.email}] 密码已成功更新！`);
      return { success: true };
    }

    // 检查是否为内置用户
    const defaultUserUpdated = AuthService.resetDefaultUserPassword(cleanEmail, newPassword);
    if (defaultUserUpdated) {
      console.log(`🔐 [密码重置成功] 内置管理员账号 [${cleanEmail}] 密码已成功更新！`);
      return { success: true };
    }

    return { success: false, error: '未找到该邮箱关联的账户记录，请核对邮箱或先开通试用' };
  }

  /**
   * 管理员手动或支付回调升级租户为正式付费版 (个人版 / 团队版)
   * 自动化核心闭环：
   * 1. 顺延有效期（在当前未过期天数基础上累加，保障用户权益）
   * 2. 更新 profile.json 的 plan 为 'geek' / 'pro'，解除配额限制
   * 3. 裂变激励：若该用户是被推荐人，自动给推荐人派发 +30 天（整整 1 个月）个人版奖励！
   */
  static upgradeTenantToPaid(params: {
    phoneOrEmail: string;
    plan?: 'geek' | 'pro' | 'enterprise';
    months?: number;
    extendDays?: number;
    amountPaid?: number;
    note?: string;
    autoCreate?: boolean;
    name?: string;
    company?: string;
    initialPassword?: string;
    isVip?: boolean;
  }): {
    success: boolean;
    message: string;
    trial?: TrialRecord;
    tenant?: TenantProfile;
    referrerReward?: { phone: string; name: string; addedDays: number; newExpiresAt: string };
    token?: string;
    isNewAccount?: boolean;
    initialPassword?: string;
  } {
    this.init();
    const query = (params.phoneOrEmail || '').trim();
    if (!query) {
      return { success: false, message: '请提供待升级的手机号码或邮箱' };
    }

    let addDays = 30;
    if (params.isVip) {
      addDays = 9999; // 终身永久授权 (约 27 年+)
    } else if (params.extendDays && params.extendDays > 0) {
      addDays = params.extendDays;
    } else {
      const months = params.months || 1;
      addDays = months === 12 ? 365 : months * 30;
    }

    let trial = this.findTrialByPhoneOrEmail(query, query);
    let isNewAccount = false;
    let initialPasswordUsed = '';

    if (!trial) {
      if (!params.autoCreate) {
        return { success: false, message: `未找到手机号或邮箱为 [${query}] 的租户记录。如需直接为主管/朋友新建账号，请使用 --auto-create 参数（CLI 已默认开启自动建号）` };
      }

      // 🌟 支持创始人一键为好友/特邀测试官直接建号与授权
      const cleanPhone = /^1[3-9]\d{9}$/.test(query) ? query : (query.replace(/\D/g, '') || '13800000000');
      const cleanEmail = query.includes('@') ? query : `${cleanPhone}@friend.kelvinflow.com`;
      const name = params.name || '特邀体验官';
      const company = params.company || `${name} Global Trading Co., Ltd.`;
      initialPasswordUsed = params.initialPassword || `Vip${cleanPhone.slice(-4)}@2026`;
      const tenantId = `tenant_trial_${cleanPhone}`;
      const userId = `usr_trial_${cleanPhone}`;

      // 初始化租户目录与底价表
      const tenantDir = TenantService.getTenantDir(tenantId);
      const tenantPricingPath = path.join(tenantDir, 'active_pricing.xlsx');
      const defaultPricingPath = path.join(this.DATA_DIR, 'active_pricing.xlsx');
      if (!fs.existsSync(tenantPricingPath) && fs.existsSync(defaultPricingPath)) {
        try {
          fs.copyFileSync(defaultPricingPath, tenantPricingPath);
          console.log(`📋 已为新特邀租户 [${tenantId}] 同步全套标准底价表！`);
        } catch (e) {
          console.warn(`⚠️ 为新租户同步底价表异常:`, e);
        }
      }

      const plan = params.plan || 'geek';
      const initialExpiresAt = new Date(Date.now() + addDays * 24 * 3600 * 1000).toISOString();

      TenantService.updateTenantProfile(tenantId, {
        companyName: company,
        managerName: name,
        contactEmail: cleanEmail,
        contactPhone: cleanPhone,
        plan,
        status: 'active',
        expiresAt: initialExpiresAt,
        dataRetentionUntil: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString(),
        hideCostFromSales: false,
        defaultProfitMargin: 0.30,
        defaultCurrency: 'USD'
      });

      trial = {
        id: `trial_${cleanPhone}`,
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash: this.hashPassword(initialPasswordUsed),
        channelSource: '创始人特邀',
        name,
        company,
        category: '通用外贸',
        tenantId,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: initialExpiresAt,
        status: 'converted',
        paidPlan: plan,
        amountPaid: params.amountPaid || 0,
        paidAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        ip: '127.0.0.1',
        referralCount: 0,
        rewardDays: 0
      };

      const allTrials = this.getAllTrials();
      allTrials.unshift(trial);
      this.saveTrials(allTrials);
      isNewAccount = true;
      console.log(`✨ [特邀账号一键生成] 手机: ${cleanPhone}, 姓名: ${name}, 初始密码: ${initialPasswordUsed}, 有效期: +${addDays}天`);
    }

    if (!trial) {
      return { success: false, message: `未找到或未能成功初始化租户记录: [${query}]` };
    }

    const currentTrial: TrialRecord = trial;
    const now = Date.now();
    const currentExp = new Date(currentTrial.expiresAt).getTime();
    // 如果当前尚未到期，以当前到期时间为基准累加；如果已过期，以当前时间为基准累加
    const baseTime = (currentExp > now && !isNewAccount) ? currentExp : now;
    const newExpiresAt = isNewAccount ? currentTrial.expiresAt : new Date(baseTime + addDays * 24 * 3600 * 1000).toISOString();
    const plan = params.plan || 'pro';
    const amount = params.amountPaid !== undefined ? params.amountPaid : (params.isVip ? 0 : (params.months === 12 ? 599 : 69));

    trial.expiresAt = newExpiresAt;
    trial.status = 'converted';
    trial.paidPlan = plan;
    trial.amountPaid = (trial.amountPaid || 0) + amount;
    trial.paidAt = new Date().toISOString();

    // 更新租户 profile
    const tenant = TenantService.updateTenantProfile(trial.tenantId, {
      plan,
      status: 'active',
      expiresAt: newExpiresAt,
      dataRetentionUntil: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString()
    });

    // 保存主账本
    const all = this.getAllTrials().map(t => {
      if (t.id === trial.id) return trial;
      return t;
    });
    this.saveTrials(all);


    // 签发正式付费 Token
    const user: AuthUser = {
      id: trial.userId,
      email: trial.email,
      name: trial.name,
      role: 'sales',
      tenantId: trial.tenantId
    };
    const remainingSeconds = Math.max(3600, Math.floor((new Date(newExpiresAt).getTime() - now) / 1000));
    const token = AuthService.generateToken(user, remainingSeconds);

    // 异步推送创始人微信
    const msg = {
      customerName: trial.name,
      companyName: trial.company,
      phone: trial.phone,
      contact: `${trial.phone} (${trial.email})`,
      email: trial.email,
      productCategory: trial.category,
      source: `【用户付费升级】套餐: ${plan} (¥${amount}) · 顺延 ${addDays} 天`,
      expiresAt: newExpiresAt
    };
    NotificationService.pushToWeChat(msg).catch(() => {});

    console.log(`🎉 [租户升级成功] 手机 [${trial.phone}], 套餐 [${plan}], 有效期至 [${newExpiresAt}]`);

    return {
      success: true,
      message: `🎉 租户 [${trial.phone}] 成功升级为 [${plan}]！已顺延 ${addDays} 天，有效期至 ${this.formatExpiryDateTime(newExpiresAt)}`,
      trial,
      tenant,
      token,
      isNewAccount,
      initialPassword: initialPasswordUsed || undefined
    };
  }


  /**
   * 创始人 1 秒一键极速激活/升级付费会员 (支持 CLI 脚本与微信转账人工开通)
   */
  static activatePaidUser(
    phoneOrEmail: string,
    options: {
      plan?: 'pro' | 'geek' | 'annual';
      durationDays?: number;
      amount?: number;
      note?: string;
    } = {}
  ): {
    success: boolean;
    error?: string;
    trial?: TrialRecord;
    tenantId?: string;
    plan?: string;
    expiresAt?: string;
    message?: string;
  } {
    this.init();
    const clean = phoneOrEmail.trim();
    let trial = this.findTrialByPhoneOrEmail(clean, clean);

    const isAnnual = options.plan === 'annual' || options.amount === 599 || (options.durationDays && options.durationDays >= 360);
    const planName = isAnnual ? 'annual' : (options.plan || 'pro');
    const durationDays = options.durationDays || (isAnnual ? 365 : 31);

    const now = new Date();
    let baseTime = now.getTime();
    if (trial && trial.expiresAt) {
      const existingExp = new Date(trial.expiresAt).getTime();
      if (existingExp > baseTime) {
        baseTime = existingExp; // 在现有有效期上顺延
      }
    }

    const newExpiresAt = new Date(baseTime + durationDays * 24 * 3600 * 1000).toISOString();

    if (!trial) {
      // 若该用户尚未自主注册，支持反向自动开通
      const phoneDigits = clean.replace(/\D/g, '');
      const phone = phoneDigits.length === 11 ? phoneDigits : (clean.includes('@') ? '' : clean);
      const email = clean.includes('@') ? clean : (phone ? `${phone}@user.kelvinflow.com` : 'user@kelvinflow.com');
      const tenantId = phone ? `tenant_trial_${phone}` : `tenant_${clean.replace(/[^a-z0-9_-]/g, '_')}`;
      const userId = `usr_paid_${Date.now()}`;

      trial = {
        id: `trial_${phone || Date.now()}`,
        phone: phone || '13800000000',
        email,
        passwordHash: this.hashPassword('123456'), // 初始安全密码
        name: '创始付费会员',
        company: '外贸工作室',
        category: '通用外贸',
        tenantId,
        userId,
        createdAt: now.toISOString(),
        expiresAt: newExpiresAt,
        status: 'converted',
        lastLoginAt: now.toISOString()
      };
      const allTrials = this.getAllTrials();
      allTrials.unshift(trial);
      this.saveTrials(allTrials);
    } else {
      trial.status = 'converted';
      trial.expiresAt = newExpiresAt;
      const allTrials = this.getAllTrials().map(t => t.id === trial!.id ? trial! : t);
      this.saveTrials(allTrials);
    }

    // 同步更新租户配置
    TenantService.updateTenantProfile(trial.tenantId, {
      plan: 'pro' as any,
      status: 'active',
      expiresAt: newExpiresAt,
      dataRetentionUntil: new Date(new Date(newExpiresAt).getTime() + 180 * 24 * 3600 * 1000).toISOString()
    });

    console.log(`💎 [1秒开通付费会员] 用户 [${clean}] 已成功升级为【${isAnnual ? '年付个人专业版(¥599)' : '月付个人专业版(¥69)'}】，到期时间：${newExpiresAt}`);

    return {
      success: true,
      trial,
      tenantId: trial.tenantId,
      plan: planName,
      expiresAt: newExpiresAt,
      message: `成功激活！用户 ${clean} 已锁定个人专业版特权，有效期至 ${this.formatExpiryDateTime(newExpiresAt)}`
    };
  }
}

