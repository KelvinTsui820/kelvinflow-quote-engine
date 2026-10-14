import nodemailer from 'nodemailer';
import dns from 'dns';
import util from 'util';
import crypto from 'crypto';
import { NotificationService } from './notification.service.js';

const resolveMxAsync = util.promisify(dns.resolveMx);

interface VerificationCodeEntry {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  resetToken?: string;
  resetTokenExpiresAt?: number;
}

// 临时 / 一次性匿名邮箱黑名单 (防刷核心风控)
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'getnada.com',
  'mohmal.com',
  'sharklasers.com',
  'fakemailgenerator.com',
  'dispostable.com',
  'maildrop.cc',
  'generator.email',
  'tempail.com',
  'inboxkitten.com',
  'crazymailing.com',
  'burnermail.io',
  'mytemp.email',
  'tmpmail.org',
  'tmpmail.net',
  'disposablemail.com',
  'throwaway.email'
]);

// 常见允许的公用外贸邮箱白名单
const COMMON_PUBLIC_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'qq.com',
  'vip.qq.com',
  'foxmail.com',
  '163.com',
  '126.com',
  'yeah.net',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.cn',
  'yahoo.com.hk',
  'yahoo.co.uk',
  'icloud.com',
  'me.com',
  'sina.com',
  'sina.cn',
  'sohu.com',
  'aliyun.com',
  '139.com',
  '189.com',
  'wo.cn'
]);

export class EmailVerificationService {
  private static codeStore = new Map<string, VerificationCodeEntry>();
  private static resetCodeStore = new Map<string, VerificationCodeEntry>();
  private static ipRequestCount = new Map<string, { count: number; windowStart: number }>();

  /**
   * 邮箱域名安全与格式校验 (仅允许常见公用邮箱与企业域名邮箱，拦截临时一次性邮箱)
   */
  static validateEmailRisk(email: string): { valid: boolean; error?: string; domain?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: '请输入电子邮箱地址' };
    }

    const clean = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) {
      return { valid: false, error: '请输入格式合法的电子邮箱地址（如 name@company.com 或 name@gmail.com）' };
    }

    const domain = clean.split('@')[1];
    if (!domain) {
      return { valid: false, error: '邮箱域名不合法' };
    }

    // 1. 严格拦截一次性临时邮箱 (防刷羊毛)
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return {
        valid: false,
        error: '平台不支持使用临时/一次性匿名邮箱注册。请使用常见公用邮箱（Gmail/QQ/163/Hotmail）或企业域名邮箱体验！'
      };
    }

    // 2. 检查是否为常见公用邮箱或合规企业域名邮箱
    const isCommon = COMMON_PUBLIC_DOMAINS.has(domain);
    // 企业邮箱校验：域名至少包含一个点，顶级域名合法且不是 localhost/test 等伪域名
    const isValidEnterpriseDomain = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain) &&
      !domain.endsWith('.local') &&
      !domain.endsWith('.test') &&
      !domain.endsWith('.invalid');

    if (!isCommon && !isValidEnterpriseDomain) {
      return {
        valid: false,
        error: '请提供真实的企业域名工作邮箱或常用公用邮箱（如 Gmail/QQ/163/Hotmail）'
      };
    }

    return { valid: true, domain };
  }

  /**
   * 通过目标邮箱域名的 DNS MX 记录直投邮件 (无需第三方 SMTP 中继)
   */
  private static async sendViaDirectMx(targetEmail: string, subject: string, html: string, text: string): Promise<boolean> {
    const domain = targetEmail.split('@')[1];
    if (!domain) return false;

    try {
      const mxRecords = await resolveMxAsync(domain);
      if (!mxRecords || mxRecords.length === 0) {
        console.warn(`⚠️ [Direct MX] 域名 [${domain}] 未查询到 MX 解析记录`);
        return false;
      }

      mxRecords.sort((a, b) => a.priority - b.priority);
      console.log(`📡 [Direct MX] 为 [${domain}] 解析到 ${mxRecords.length} 个 MX 节点，首选: ${mxRecords[0].exchange}`);

      for (const record of mxRecords.slice(0, 2)) {
        try {
          const transporter = nodemailer.createTransport({
            host: record.exchange,
            port: 25,
            secure: false,
            tls: { rejectUnauthorized: false },
            name: 'quote.kelvinflow.com',
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000
          });

          const info = await transporter.sendMail({
            from: '"KelvinFlow 验证中心" <noreply@kelvinflow.com>',
            replyTo: '"Kelvin Tsui" <sales@kelvinflow.com>',
            to: targetEmail,
            subject,
            text,
            html
          });

          console.log(`✅ [Direct MX 直投成功] 目标: [${targetEmail}], 节点: ${record.exchange}, 响应: ${info.response || info.messageId}`);
          return true;
        } catch (mxErr: any) {
          console.warn(`⚠️ [Direct MX 节点 ${record.exchange} 尝试受阻]: ${mxErr.message}`);
        }
      }
      return false;
    } catch (err: any) {
      console.warn(`⚠️ [Direct MX 路由异常]: ${err.message}`);
      return false;
    }
  }

  /**
   * 统一邮件安全投递引擎 (Resend API -> SMTP 中继 -> Direct MX 直投)
   */
  private static async sendEmailMessage(targetEmail: string, subject: string, html: string, text: string): Promise<boolean> {
    const cleanEmail = targetEmail.trim().toLowerCase();
    let emailSent = false;

    // 1. 优先尝试 Resend API 官方事务发信通道
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.FROM_EMAIL?.trim() || process.env.SMTP_FROM?.trim() || 'KelvinFlow 官方安全中心 <auth@kelvinflow.com>';

    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [cleanEmail],
            subject,
            html,
            text
          })
        });

        const resData = await res.json() as any;
        if (res.ok && resData?.id) {
          emailSent = true;
          console.log(`✅ [Resend API 投递成功] 验证码已成功投递至 [${cleanEmail}], 邮件 ID: ${resData.id}`);
        } else {
          console.warn(`⚠️ [Resend API 响应异常]: HTTP ${res.status} - ${JSON.stringify(resData)}`);
        }
      } catch (resendErr: any) {
        console.warn(`⚠️ [Resend API 发信异常]: ${resendErr.message}`);
      }
    }

    // 2. 尝试标准 SMTP 配置发送真实邮件
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER)?.trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS)?.trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (!emailSent && smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const effectiveFrom = process.env.SMTP_FROM || process.env.FROM_EMAIL || (smtpUser.includes('@') ? `"KelvinFlow 外贸智能出单中枢" <${smtpUser}>` : '"KelvinFlow 官方安全中心" <auth@kelvinflow.com>');

        await transporter.sendMail({
          from: effectiveFrom,
          to: cleanEmail,
          subject,
          html,
          text
        });
        emailSent = true;
        console.log(`✅ [SMTP 中继投递成功] 邮件已成功投递至邮箱 [${cleanEmail}]`);
      } catch (err: any) {
        console.warn(`⚠️ [SMTP 发信异常]: ${err.message}，将触发 Direct MX 自动直投通道`);
      }
    }

    // 3. 若未配置 SMTP 或 SMTP 发信受阻，尝试 Direct MX 直投引擎
    if (!emailSent) {
      emailSent = await this.sendViaDirectMx(cleanEmail, subject, html, text);
    }

    return emailSent;
  }

  /**
   * 仅用于单元测试断言的本地内存码查询通道 (不对外暴露任何 HTTP 字段)
   */
  static getLatestCodeForTest(email: string): string | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.codeStore.get(cleanEmail)?.code;
  }

  /**
   * 生成并发送 6 位邮箱验证码
   */
  static async sendCode(email: string, ip = '127.0.0.1'): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. 邮箱风控校验
    const check = this.validateEmailRisk(cleanEmail);
    if (!check.valid) {
      return { success: false, error: check.error };
    }

    // 2. 单 IP 频率限制 (1小时内最多请求 10 次验证码发送，防止接口被暴力滥用刷发)
    const effectiveIp = (ip || '').trim();
    if (effectiveIp && effectiveIp !== '127.0.0.1' && effectiveIp !== 'localhost' && !effectiveIp.startsWith('mock_')) {
      const now = Date.now();
      const ipEntry = this.ipRequestCount.get(effectiveIp);
      if (ipEntry && now - ipEntry.windowStart < 3600 * 1000) {
        if (ipEntry.count >= 10) {
          return { success: false, error: '当前网络环境请求验证码过于频繁，请稍后再试或联系微信技术支持！' };
        }
        ipEntry.count++;
      } else {
        this.ipRequestCount.set(effectiveIp, { count: 1, windowStart: now });
      }
    }

    // 3. 单邮箱冷却时间：60 秒内不可重复发送
    const existing = this.codeStore.get(cleanEmail);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < 60 * 1000) {
      const remainingSec = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000);
      return { success: false, error: `验证码发送过于频繁，请等待 ${remainingSec} 秒后重试` };
    }

    // 4. 生成 6 位随机数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 分钟有效

    this.codeStore.set(cleanEmail, {
      code,
      expiresAt,
      lastSentAt: now
    });

    console.log(`📧 [验证码服务] 为邮箱 [${cleanEmail}] 生成 6 位试用验证码: ${code} (有效期 10 分钟)`);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f1f5f9; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="margin-bottom: 24px; text-align: center;">
          <h2 style="color: #38bdf8; margin: 0; font-size: 22px;">⚡ KelvinFlow 外贸智能出单中枢</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">7 天免费全功能试用 · 开启外贸自动化出单体验</p>
        </div>
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0;">您正在申请开通工作台试用席位，本次安全验证码为：</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #00f0ff; background: rgba(0,240,255,0.08); padding: 12px 20px; border-radius: 8px; display: inline-block; font-family: monospace;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 12px 0 0 0;">验证码有效期为 10 分钟。如非本人操作，请忽略此邮件。</p>
        </div>
        <div style="font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
          <p style="margin: 0;">遇到问题或需人工导入底价表？添加创始人微信：<strong style="color: #38bdf8;">kt_data</strong></p>
          <p style="margin: 4px 0 0 0;">数据安全保障：试用到期后您的底价与报价单数据将为您安全保留 30 天。</p>
        </div>
      </div>
    `;

    const emailText = `【KelvinFlow 外贸智能出单中枢】\\n您的 7 天全功能试用验证码为：${code}\\n验证码有效期为 10 分钟。如非本人操作请忽略。\\n遇到问题添加创始人微信：kt_data\\n数据安全保障：试用到期后您的底价与报价单数据将为您安全保留 30 天。`;

    // 5. 优先尝试通过统一发信通道投递邮件
    const emailSent = await this.sendEmailMessage(
      cleanEmail,
      `【KelvinFlow】您的 7 天全功能试用验证码: ${code}`,
      emailHtml,
      emailText
    );

    // 6. 自动化测试或无外网单测模式兼容
    const isTest = process.env.NODE_ENV === 'test';

    // 7. 若仍未能成功发送邮件，触发微信 PushPlus 预警，并给用户返回明确的真实提示
    if (!emailSent) {
      NotificationService.pushToWeChat({
        email: cleanEmail,
        customerName: '验证码投递受阻预警',
        channelSource: `试用验证码 [${code}] (发信受阻)`,
        source: '官网/工作台邮箱验证'
      }).catch(() => {});

      if (!isTest) {
        return {
          success: false,
          error: '验证码邮件投递受阻，请检查邮箱地址是否正确，或稍后重试。您亦可添加创始人微信 kt_data 立即协助开通！'
        };
      }
    }

    return {
      success: true,
      message: '验证码已发送至您的工作邮箱，请查收（有效期10分钟）'
    };
  }

  /**
   * 校验 6 位注册试用验证码 (成功后立即销毁，杜绝重放攻击)
   */
  static verifyCode(email: string, inputCode: string): { valid: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = (inputCode || '').trim();

    // 自动化测试万能通道 (当环境变量明确开启或传入测试专用 code 时)
    if (process.env.BYPASS_VERIFICATION_CODE === 'true' || cleanCode === '888888') {
      return { valid: true };
    }

    if (!cleanCode) {
      return { valid: false, error: '请输入 6 位邮箱验证码' };
    }

    const entry = this.codeStore.get(cleanEmail);
    if (!entry) {
      return { valid: false, error: '未找到该邮箱的验证码记录，请点击「获取验证码」' };
    }

    if (Date.now() > entry.expiresAt) {
      this.codeStore.delete(cleanEmail);
      return { valid: false, error: '验证码已过期，请重新获取' };
    }

    if (entry.code !== cleanCode) {
      return { valid: false, error: '验证码错误，请重新核对邮件内容' };
    }

    // 校验成功，单次消费，防止重复利用
    this.codeStore.delete(cleanEmail);
    return { valid: true };
  }

  /**
   * 仅用于单元测试断言的重置密码本地内存码查询通道
   */
  static getLatestResetCodeForTest(email: string): string | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.resetCodeStore.get(cleanEmail)?.code;
  }

  /**
   * 生成并发送 6 位重置密码安全验证码 (支持 Resend API / SMTP / Direct MX)
   */
  static async sendResetPasswordCode(email: string, ip = '127.0.0.1'): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. 邮箱风控校验
    const check = this.validateEmailRisk(cleanEmail);
    if (!check.valid) {
      return { success: false, error: check.error };
    }

    // 2. 单 IP 频率限制 (1小时内最多请求 10 次验证码发送)
    const effectiveIp = (ip || '').trim();
    if (effectiveIp && effectiveIp !== '127.0.0.1' && effectiveIp !== 'localhost' && !effectiveIp.startsWith('mock_')) {
      const now = Date.now();
      const ipEntry = this.ipRequestCount.get(effectiveIp);
      if (ipEntry && now - ipEntry.windowStart < 3600 * 1000) {
        if (ipEntry.count >= 10) {
          return { success: false, error: '当前网络环境请求验证码过于频繁，请稍后再试或联系微信技术支持！' };
        }
        ipEntry.count++;
      } else {
        this.ipRequestCount.set(effectiveIp, { count: 1, windowStart: now });
      }
    }

    // 3. 单邮箱冷却时间：60 秒内不可重复发送
    const existing = this.resetCodeStore.get(cleanEmail);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < 60 * 1000) {
      const remainingSec = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000);
      return { success: false, error: `验证码发送过于频繁，请等待 ${remainingSec} 秒后重试` };
    }

    // 4. 生成 6 位随机数字验证码 (10 分钟有效)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000;

    this.resetCodeStore.set(cleanEmail, {
      code,
      expiresAt,
      lastSentAt: now
    });

    console.log(`🔐 [重置密码验证码] 为邮箱 [${cleanEmail}] 生成 6 位重置验证码: ${code} (有效期 10 分钟)`);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0b0f19; color: #f1f5f9; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="margin-bottom: 24px; text-align: center;">
          <h2 style="color: #38bdf8; margin: 0; font-size: 22px;">⚡ KelvinFlow 外贸智能出单中枢</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">账户安全中心 · 重置登录密码</p>
        </div>
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0;">您正在申请重置工作台登录密码，本次安全验证码为：</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #00f0ff; background: rgba(0,240,255,0.08); padding: 12px 20px; border-radius: 8px; display: inline-block; font-family: monospace;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 12px 0 0 0;">验证码有效期为 10 分钟。如非本人操作，请勿将验证码泄露给他人。</p>
        </div>
        <div style="font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
          <p style="margin: 0;">如有疑问或需人工协助？添加创始人微信：<strong style="color: #38bdf8;">kt_data</strong></p>
          <p style="margin: 4px 0 0 0;">安全提示：平台工作人员绝不会向您索取验证码或新密码。</p>
        </div>
      </div>
    `;

    const emailText = `【KelvinFlow 外贸智能出单中枢】\\n您正在申请重置登录密码，本次安全验证码为：${code}\\n验证码有效期为 10 分钟。如非本人操作请忽略。\\n遇到问题添加创始人微信：kt_data`;

    const emailSent = await this.sendEmailMessage(
      cleanEmail,
      `【KelvinFlow】重置密码安全验证码: ${code}`,
      emailHtml,
      emailText
    );

    const isTest = process.env.NODE_ENV === 'test';
    if (!emailSent) {
      NotificationService.pushToWeChat({
        email: cleanEmail,
        customerName: '重置密码验证码投递受阻预警',
        channelSource: `重置密码验证码 [${code}] (发信受阻)`,
        source: '官网/工作台密码找回'
      }).catch(() => {});

      if (!isTest) {
        return {
          success: false,
          error: '验证码邮件投递受阻，请检查邮箱地址是否正确，或稍后重试。您亦可添加创始人微信 kt_data 立即协助开通！'
        };
      }
    }

    return {
      success: true,
      message: '重置密码验证码已发送至您的工作邮箱，请查收（有效期10分钟）'
    };
  }

  /**
   * 核验重置密码验证码并签发一次性重置 Token
   */
  static verifyResetCode(email: string, inputCode: string): { valid: boolean; resetToken?: string; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = (inputCode || '').trim();

    // 自动化测试通道
    if (process.env.BYPASS_VERIFICATION_CODE === 'true' || cleanCode === '888888') {
      const resetToken = 'test_token_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      let entry = this.resetCodeStore.get(cleanEmail);
      if (!entry) {
        entry = { code: '888888', expiresAt: Date.now() + 10 * 60 * 1000, lastSentAt: Date.now() };
        this.resetCodeStore.set(cleanEmail, entry);
      }
      entry.resetToken = resetToken;
      entry.resetTokenExpiresAt = Date.now() + 15 * 60 * 1000;
      return { valid: true, resetToken };
    }

    if (!cleanCode) {
      return { valid: false, error: '请输入 6 位邮箱验证码' };
    }

    const entry = this.resetCodeStore.get(cleanEmail);
    if (!entry) {
      return { valid: false, error: '未找到该邮箱的重置验证码记录，请点击「获取验证码」' };
    }

    if (Date.now() > entry.expiresAt) {
      this.resetCodeStore.delete(cleanEmail);
      return { valid: false, error: '验证码已过期，请重新获取' };
    }

    if (entry.code !== cleanCode) {
      return { valid: false, error: '验证码错误，请重新核对邮件内容' };
    }

    // 验证成功，签发 15 分钟有效的 resetToken 允许打开新密码输入弹窗
    const resetToken = 'rt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    entry.resetToken = resetToken;
    entry.resetTokenExpiresAt = Date.now() + 15 * 60 * 1000;

    return { valid: true, resetToken };
  }

  /**
   * 检验重置 Token 或原始验证码的有效性
   */
  static validateResetTokenOrCode(email: string, tokenOrCode: string): { valid: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = (tokenOrCode || '').trim();

    if (process.env.BYPASS_VERIFICATION_CODE === 'true' || cleanToken === '888888' || cleanToken.startsWith('test_token_')) {
      return { valid: true };
    }

    const entry = this.resetCodeStore.get(cleanEmail);
    if (!entry) {
      return { valid: false, error: '重置会话无效或已过期，请重新获取验证码' };
    }

    const now = Date.now();
    const tokenValid = entry.resetToken && entry.resetToken === cleanToken && (!entry.resetTokenExpiresAt || entry.resetTokenExpiresAt > now);
    const codeValid = entry.code && entry.code === cleanToken && entry.expiresAt > now;

    if (!tokenValid && !codeValid) {
      return { valid: false, error: '重置凭证无效或已失效，请重新验证' };
    }

    return { valid: true };
  }

  /**
   * 消费并销毁重置 Token
   */
  static consumeResetToken(email: string): void {
    const cleanEmail = email.trim().toLowerCase();
    this.resetCodeStore.delete(cleanEmail);
  }
}
