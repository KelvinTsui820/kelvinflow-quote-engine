import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import { Server } from 'http';
import { quoteRouter } from '../src/routes/quote.router.js';
import { TrialService } from '../src/services/trial.service.js';
import { EmailVerificationService } from '../src/services/email-verification.service.js';
import { AuthService } from '../src/services/auth.service.js';

describe('🔐 Password Reset Flow API & Service Suite', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  const testEmail = `reset_user_${Date.now()}@acme-global.com`;
  const initialPassword = 'InitialPass123';
  const newPassword = 'NewSecretPass888';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', quoteRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // 注册一个测试试用用户用于密码重置测试
    const regRes = await TrialService.registerOrLoginTrial({
      email: testEmail,
      code: '888888',
      password: initialPassword,
      name: 'Reset Tester',
      company: 'Acme Test Co.'
    });
    expect(regRes.success).toBe(true);

    // 验证初始密码可以登录
    const loginInitial = await TrialService.loginTrial({
      account: testEmail,
      password: initialPassword
    });
    expect(loginInitial.success).toBe(true);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it('1. 发送验证码：非邮箱/空邮箱应当被拦截 (400)', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' })
    });
    expect(res.status).toBe(400);
    const data: any = await res.json();
    expect(data.success).toBe(false);
  });

  it('2. 发送验证码：未注册邮箱应当返回 404', async () => {
    const unregisteredEmail = `not_registered_${Date.now()}@unregistered.com`;
    const res = await fetch(`${baseUrl}/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unregisteredEmail })
    });
    expect(res.status).toBe(404);
    const data: any = await res.json();
    expect(data.notRegistered).toBe(true);
    expect(data.error).toContain('尚未开通账号');
  });

  it('3. 发送验证码：已注册邮箱应当成功生成验证码', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('验证码已发送');

    const generatedCode = EmailVerificationService.getLatestResetCodeForTest(testEmail);
    expect(generatedCode).toBeDefined();
    expect(generatedCode).toMatch(/^\d{6}$/);
  });

  it('4. 发送验证码：60 秒冷却期内再次请求应当被阻断 (400)', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    expect(res.status).toBe(400);
    const data: any = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('发送过于频繁');
  });

  it('5. 核验验证码：错误验证码应当被拒绝 (400)', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: '000000' })
    });
    expect(res.status).toBe(400);
    const data: any = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('验证码错误');
  });

  it('6. 核验验证码：正确验证码应当签发 resetToken (200)', async () => {
    const realCode = EmailVerificationService.getLatestResetCodeForTest(testEmail)!;
    expect(realCode).toBeDefined();

    const res = await fetch(`${baseUrl}/auth/forgot-password/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: realCode })
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);
    expect(data.resetToken).toBeDefined();
  });

  it('7. 重置密码：两次密码不一致或长度小于6位应当被阻断 (400)', async () => {
    const resMismatch = await fetch(`${baseUrl}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '888888',
        newPassword: 'Password123',
        confirmPassword: 'DifferentPassword456'
      })
    });
    expect(resMismatch.status).toBe(400);
    const dataMismatch: any = await resMismatch.json();
    expect(dataMismatch.error).toContain('不一致');

    const resTooShort = await fetch(`${baseUrl}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '888888',
        newPassword: '123',
        confirmPassword: '123'
      })
    });
    expect(resTooShort.status).toBe(400);
    const dataTooShort: any = await resTooShort.json();
    expect(dataTooShort.error).toContain('至少须为 6 位');
  });

  it('8. 重置密码：合法凭证提交新密码应当成功更新 (200)', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '888888',
        newPassword: newPassword,
        confirmPassword: newPassword
      })
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('密码更改成功');

    // 验证新密码登录成功
    const loginNew = await TrialService.loginTrial({
      account: testEmail,
      password: newPassword
    });
    expect(loginNew.success).toBe(true);

    // 验证旧密码已失效，无法登录
    const loginOld = await TrialService.loginTrial({
      account: testEmail,
      password: initialPassword
    });
    expect(loginOld.success).toBe(false);
    expect(loginOld.error).toContain('密码错误');
  });

  it('9. 内置用户重置密码支持：admin 账号可通过流程更新密码', async () => {
    const adminEmail = 'admin@foshan-kelvin.com';
    const newAdminPass = 'AdminNewPass2026';

    const res = await fetch(`${baseUrl}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        code: '888888',
        newPassword: newAdminPass,
        confirmPassword: newAdminPass
      })
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);

    // 验证 AuthService 使用新密码可以认证
    const authNew = AuthService.authenticateUser(adminEmail, newAdminPass);
    expect(authNew).not.toBeNull();
    expect(authNew?.user.role).toBe('admin');

    // 恢复默认密码以便其他单测不受影响
    AuthService.resetDefaultUserPassword(adminEmail, 'admin123');
  });
});
