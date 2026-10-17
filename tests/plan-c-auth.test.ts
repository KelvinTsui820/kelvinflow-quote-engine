import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { EmailVerificationService } from '../src/services/email-verification.service.js';
import { TrialService, TrialRecord } from '../src/services/trial.service.js';
import { TenantService } from '../src/services/tenant.service.js';

describe('Plan C: Work Email Authentication & Risk Control Tests', () => {
  beforeEach(() => {
    TenantService.init();
  });

  afterAll(() => {
    TrialService.saveTrials([]);
    const leadsPath = path.resolve('data/inbound_leads.json');
    if (fs.existsSync(leadsPath)) {
      fs.writeFileSync(leadsPath, '[]\n', 'utf-8');
    }
    const tenantsDir = path.resolve('data/tenants');
    if (fs.existsSync(tenantsDir)) {
      const items = fs.readdirSync(tenantsDir);
      for (const item of items) {
        if (item.startsWith('tenant_trial_')) {
          fs.rmSync(path.join(tenantsDir, item), { recursive: true, force: true });
        }
      }
    }
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
      const code = EmailVerificationService.getLatestCodeForTest(email)!;
      expect(code).toBeDefined();
      expect(code.length).toBe(6);

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
  describe('IP Rate Limiting (24 Hours Max 5 Accounts per IP, 6th Rejected - Task 4b §5.2 & B7)', () => {
    it('allows 5 registrations from the same IP, but blocks the 6th registration', async () => {
      const testIp = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`;
      const prefix = Date.now().toString().slice(-6);

      // 注册前 5 个账号
      for (let i = 1; i <= 5; i++) {
        const email = `user_${prefix}_${i}@enterprise-test${i}.com`;
        const res = await TrialService.registerOrLoginTrial({
          email,
          code: '888888',
          password: 'Password123!',
          ip: testIp
        });
        expect(res.success).toBe(true);
      }

      // 第 6 个账号应被严格拦截
      const sixthEmail = `user_${prefix}_6@enterprise-test6.com`;
      const blockedRes = await TrialService.registerOrLoginTrial({
        email: sixthEmail,
        code: '888888',
        password: 'Password123!',
        ip: testIp
      });

      expect(blockedRes.success).toBe(false);
      expect(blockedRes.error).toContain('最多注册5个试用账号');
    });
  });

  // =========================================================================
  // 3.5 服务端 100 封试用额度硬控校验 (Server Quota Hard Control - Task 4b §5.1 & B6)
  // =========================================================================
  describe('Server-Side 100-Quote Trial Quota Hard Control (Task 4b §5.1 & B6)', () => {
    it('starts with 100 quotes quota, decrements on consumption, and blocks when exhausted', async () => {
      const email = `quota_user_${Date.now()}@acme-quota-test.com`;
      const reg = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'Password123!'
      });

      expect(reg.success).toBe(true);
      const tenantId = reg.tenantId!;

      // 初始额度检查
      const initialQuota = TrialService.checkQuota(tenantId);
      expect(initialQuota.allowed).toBe(true);
      expect(initialQuota.used).toBe(0);
      expect(initialQuota.remaining).toBe(100);
      expect(initialQuota.maxQuota).toBe(100);

      // 扣减 50 封
      TrialService.consumeQuota(tenantId, 50);
      const midQuota = TrialService.checkQuota(tenantId);
      expect(midQuota.allowed).toBe(true);
      expect(midQuota.used).toBe(50);
      expect(midQuota.remaining).toBe(50);

      // 扣减至 100 封 (耗尽)
      TrialService.consumeQuota(tenantId, 50);
      const exhaustedQuota = TrialService.checkQuota(tenantId);
      expect(exhaustedQuota.allowed).toBe(false);
      expect(exhaustedQuota.used).toBe(100);
      expect(exhaustedQuota.remaining).toBe(0);
      expect(exhaustedQuota.reason).toContain('试用出单额度已用尽');

      // 额度耗尽后进一步调用必须被拒
      const checkAfter = TrialService.checkQuota(tenantId);
      expect(checkAfter.allowed).toBe(false);
    });

    it('strictly blocks quote generation for expired trials regardless of remaining quota', async () => {
      const email = `expired_quota_${Date.now()}@acme-expired.com`;
      const reg = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'Password123!'
      });

      const tenantId = reg.tenantId!;
      // 模拟试用期已过 7 天
      const trials = TrialService.getAllTrials();
      const trial = trials.find(t => t.tenantId === tenantId);
      expect(trial).toBeDefined();
      trial!.expiresAt = new Date(Date.now() - 3600 * 1000).toISOString();
      TrialService.saveTrials(trials);

      const check = TrialService.checkQuota(tenantId);
      expect(check.allowed).toBe(false);
      expect(check.isExpired).toBe(true);
      expect(check.reason).toContain('到期');
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
      expect(reRegister.message).toContain('底价库与历史单据已为您安全保留 30 天');

      // 2. 登录过期账号：允许成功登入工作台查阅底价与历史单据 (success: true, expired: true, 签发 30 天保留 Token)
      const loginRes = await TrialService.loginTrial({
        account: email,
        password: 'MyPassword123'
      });

      expect(loginRes.success).toBe(true);
      expect(loginRes.expired).toBe(true);
      expect(loginRes.token).toBeDefined();
      expect(loginRes.message).toContain('底价库与历史单据已为您安全保留 30 天');
    });
  });

  // =========================================================================
  // 5. 工作邮箱与密码登录验证 (Pure Work Email + Password Login)
  // =========================================================================
  describe('Pure Work Email + Password Login Flow', () => {
    it('allows logging in with registered work email and password', async () => {
      const email = `login_email_${Date.now()}@gmail.com`;
      const reg = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'SecurePassword123!'
      });
      expect(reg.success).toBe(true);

      const login = await TrialService.loginTrial({
        email,
        password: 'SecurePassword123!'
      });

      expect(login.success).toBe(true);
      expect(login.token).toBeDefined();
      expect(login.user?.email).toBe(email);
    });

    it('rejects login with wrong password', async () => {
      const email = `login_wrong_pwd_${Date.now()}@163.com`;
      await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'CorrectPassword123!'
      });

      const badLogin = await TrialService.loginTrial({
        email,
        password: 'WrongPassword999!'
      });

      expect(badLogin.success).toBe(false);
      expect(badLogin.error).toContain('登录密码错误');
    });

    it('rejects login with unregistered email', async () => {
      const unregistered = `unregistered_${Date.now()}@hot-enterprise.com`;
      const res = await TrialService.loginTrial({
        email: unregistered,
        password: 'AnyPassword123!'
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('未找到该邮箱关联的试用记录');
    });

    it('rejects registration when email is already registered', async () => {
      const email = `dup_register_${Date.now()}@gmail.com`;
      const first = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'ValidPassword123!'
      });
      expect(first.success).toBe(true);

      const second = await TrialService.registerOrLoginTrial({
        email,
        code: '888888',
        password: 'AnotherPassword123!'
      });
      expect(second.success).toBe(false);
      expect(second.canLogin).toBe(true);
      expect(second.error).toContain('已经开通过试用服务');

      // System user reject
      const sysUserCheck = await TrialService.registerOrLoginTrial({
        email: 'admin@foshan-kelvin.com',
        code: '888888',
        password: 'ValidPassword123!'
      });
      expect(sysUserCheck.success).toBe(false);
      expect(sysUserCheck.error).toContain('已是系统注册账号');
    });
  });
});
