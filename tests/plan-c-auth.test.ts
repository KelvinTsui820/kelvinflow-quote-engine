import { describe, it, expect, beforeEach } from '@jest/globals';
import { EmailVerificationService } from '../src/services/email-verification.service.js';
import { TrialService, TrialRecord } from '../src/services/trial.service.js';
import { TenantService } from '../src/services/tenant.service.js';

describe('Plan C: Work Email Authentication & Risk Control Tests', () => {
  beforeEach(() => {
    TenantService.init();
  });

  // =========================================================================
  // 1. 邮箱域名风控与有效性校验 (Email Domain Risk Control)
  // =========================================================================
  describe('Email Domain Risk Control', () => {
    it('accepts common public email domains (Gmail, QQ, 163, Hotmail, Outlook, Foxmail)', () => {
      const publicEmails = [
        'trader@gmail.com',
        'sales@qq.com',
        'export@163.com',
        'buyer@126.com',
        'alice@hotmail.com',
        'bob@outlook.com',
        'carol@foxmail.com'
      ];

      for (const email of publicEmails) {
        const result = EmailVerificationService.validateEmailRisk(email);
        expect(result.valid).toBe(true);
        expect(result.domain).toBeDefined();
      }
    });

    it('accepts legitimate corporate/enterprise domain emails', () => {
      const enterpriseEmails = [
        'order@acme-furniture.com',
        'buyer@globalsourcing.de',
        'kelvin@shunde-hardware.cn',
        'sales@vietnam-trading.co.uk'
      ];

      for (const email of enterpriseEmails) {
        const result = EmailVerificationService.validateEmailRisk(email);
        expect(result.valid).toBe(true);
      }
    });

    it('strictly blocks disposable / temporary anonymous mailboxes to prevent abuse', () => {
      const disposableEmails = [
        'free_user@10minutemail.com',
        'scammer@mailinator.com',
        'hacker@tempmail.com',
        'bot@guerrillamail.com',
        'throwaway@yopmail.com',
        'anon@trashmail.com',
        'spammer@burnermail.io',
        'fake@getnada.com'
      ];

      for (const email of disposableEmails) {
        const result = EmailVerificationService.validateEmailRisk(email);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('临时/一次性匿名邮箱');
      }
    });

    it('rejects malformed email addresses', () => {
      const invalidEmails = [
        '',
        'notanemail',
        '@gmail.com',
        'user@',
        'user@localhost',
        'user@domain.test'
      ];

      for (const email of invalidEmails) {
        const result = EmailVerificationService.validateEmailRisk(email);
        expect(result.valid).toBe(false);
      }
    });
  });

  // =========================================================================
  // 2. 验证码发送与单次核销校验 (Code Verification Flow)
  // =========================================================================
  describe('Verification Code Send & Validation Flow', () => {
    it('generates 6-digit code and enforces single-use consumption', async () => {
      const email = `test_verify_${Date.now()}@gmail.com`;
      const sendResult = await EmailVerificationService.sendCode(email);

      expect(sendResult.success).toBe(true);
      expect(sendResult.debugCode).toBeDefined();
      expect(sendResult.debugCode?.length).toBe(6);

      const code = sendResult.debugCode!;

      // 1. Wrong code fails
      const wrongCheck = EmailVerificationService.verifyCode(email, '000000');
      expect(wrongCheck.valid).toBe(false);
      expect(wrongCheck.error).toContain('验证码错误');

      // 2. Correct code succeeds
      const validCheck = EmailVerificationService.verifyCode(email, code);
      expect(validCheck.valid).toBe(true);

      // 3. Single-use: Reusing the same code immediately fails (anti-replay)
      const reuseCheck = EmailVerificationService.verifyCode(email, code);
      expect(reuseCheck.valid).toBe(false);
      expect(reuseCheck.error).toContain('未找到该邮箱的验证码记录');
    });

    it('enforces 60-second cooldown per email to prevent spamming', async () => {
      const email = `test_cooldown_${Date.now()}@163.com`;
      const first = await EmailVerificationService.sendCode(email);
      expect(first.success).toBe(true);

      const second = await EmailVerificationService.sendCode(email);
      expect(second.success).toBe(false);
      expect(second.error).toContain('请等待');
    });

    it('supports test bypass verification code 888888', () => {
      const testEmail = 'any_qa_tester@company.com';
      const check = EmailVerificationService.verifyCode(testEmail, '888888');
      expect(check.valid).toBe(true);
    });
  });

  // =========================================================================
  // 3. 同一 IP 7 天内最多注册 3 个试用账号频控 (IP Rate Limit)
  // =========================================================================
  describe('IP Rate Limiting (7 Days Max 3 Accounts per IP)', () => {
    it('allows 3 registrations from the same IP, but blocks the 4th registration', async () => {
      const testIp = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`;
      const prefix = Date.now().toString().slice(-6);

      // 注册前 3 个账号
      for (let i = 1; i <= 3; i++) {
        const email = `user_${prefix}_${i}@enterprise-test${i}.com`;
        const res = await TrialService.registerOrLoginTrial({
          email,
          code: '888888',
          password: 'Password123!',
          ip: testIp
        });
        expect(res.success).toBe(true);
      }

      // 第 4 个账号应被严格拦截
      const fourthEmail = `user_${prefix}_4@enterprise-test4.com`;
      const blockedRes = await TrialService.registerOrLoginTrial({
        email: fourthEmail,
        code: '888888',
        password: 'Password123!',
        ip: testIp
      });

      expect(blockedRes.success).toBe(false);
      expect(blockedRes.error).toContain('同一个IP地址7天内最多注册3个试用账号');
    });
  });

  // =========================================================================
  // 4. 数据安全保留 30 天逻辑校验 (30 Days Data Retention Policy)
  // =========================================================================
  describe('30 Days Data Retention Policy', () => {
    it('sets tenant dataRetentionUntil to precisely 30 days after trial expiration', async () => {
      const email = `retention_user_${Date.now()}@acme-hardware.com`;
      const res = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'Password123!'
      });

      expect(res.success).toBe(true);
      expect(res.tenantId).toBeDefined();

      const profile = TenantService.getTenantProfile(res.tenantId!);
      expect(profile).toBeDefined();
      expect(profile?.dataRetentionUntil).toBeDefined();

      const expiresAt = new Date(profile!.expiresAt!).getTime();
      const retentionUntil = new Date(profile!.dataRetentionUntil!).getTime();
      const diffDays = Math.round((retentionUntil - expiresAt) / (24 * 3600 * 1000));

      expect(diffDays).toBe(30);
    });

    it('returns 30-day retention guarantee in trial expired notices', async () => {
      const email = `expired_user_${Date.now()}@trade-test.com`;
      // 创建一条已过期的试用记录
      const pastDate = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
      const trials = TrialService.getAllTrials();
      const testRecord: TrialRecord = {
        id: `trial_${Date.now()}`,
        phone: '',
        email,
        passwordHash: TrialService.hashPassword('MyPassword123'),
        name: '过期测试用户',
        company: '测试公司',
        category: '汽配',
        tenantId: `tenant_exp_${Date.now()}`,
        userId: `usr_exp_${Date.now()}`,
        createdAt: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
        expiresAt: pastDate,
        status: 'expired'
      };
      trials.unshift(testRecord);
      TrialService.saveTrials(trials);

      // 1. 尝试再次注册试用，拦截提示中需包含 30 天安全保留
      const reRegister = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'MyPassword123'
      });

      expect(reRegister.success).toBe(false);
      expect(reRegister.expired).toBe(true);
      expect(reRegister.message).toContain('您的底价表与历史报价数据将为您安全保留 30 天');

      // 2. 登录过期账号，提示中亦需包含 30 天安全保留
      const loginRes = await TrialService.loginTrial({
        account: email,
        password: 'MyPassword123'
      });

      expect(loginRes.success).toBe(false);
      expect(loginRes.expired).toBe(true);
      expect(loginRes.message).toContain('您的底价表与历史报价数据将为您安全保留 30 天');
    });
  });

  // =========================================================================
  // 5. 账号密码登录灵活性 (Login by Email or Phone)
  // =========================================================================
  describe('Login Flexibility (Email or Phone + Password)', () => {
    it('allows logging in with registered email and password', async () => {
      const email = `login_email_${Date.now()}@gmail.com`;
      const reg = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'SecurePassword123!'
      });
      expect(reg.success).toBe(true);

      const login = await TrialService.loginTrial({
        account: email,
        password: 'SecurePassword123!'
      });

      expect(login.success).toBe(true);
      expect(login.token).toBeDefined();
      expect(login.user?.email).toBe(email);
    });

    it('allows logging in with optional phone number if provided at registration', async () => {
      const email = `login_phone_${Date.now()}@163.com`;
      const phone = '13888' + Math.floor(100000 + Math.random() * 900000).toString();

      const reg = await TrialService.registerOrLoginTrial({
        email,
        phone,
        code: '888888',
        password: 'SecurePassword123!'
      });
      expect(reg.success).toBe(true);

      const loginByPhone = await TrialService.loginTrial({
        account: phone,
        password: 'SecurePassword123!'
      });

      expect(loginByPhone.success).toBe(true);
      expect(loginByPhone.token).toBeDefined();
      expect(loginByPhone.user?.email).toBe(email);
    });
  });
});
