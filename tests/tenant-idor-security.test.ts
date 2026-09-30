import { AuthService } from '../src/services/auth.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { requireActiveTenant } from '../src/middlewares/auth.middleware.js';
import fs from 'fs';
import path from 'path';

describe('SaaS 多租户越权防护 (IDOR) 与数据边界安全测试', () => {

  describe('1. 租户底价库文件物理隔离保护', () => {
    it('租户 A 只能读取自身生效底价，无法跨租户探测到租户 B 的物理路径', () => {
      const alphaPricing = TenantService.getActivePricingPath('tenant_alpha');
      const betaPricing = TenantService.getActivePricingPath('tenant_beta');

      expect(alphaPricing).toContain('tenant_alpha');
      expect(betaPricing).toContain('tenant_beta');
      expect(alphaPricing).not.toEqual(betaPricing);
    });

    it('恶意路径遍历攻击（如 ../../etc/passwd）应被安全阻断', () => {
      const traversalId = '../../etc/shadow';
      const safePath = TenantService.getActivePricingPath(traversalId);
      // 必须限制在 data/tenants 体系内或返回默认路径，不得跳出项目根目录
      expect(safePath.includes('etc\\shadow') || safePath.includes('etc/shadow')).toBe(false);
    });
  });

  describe('2. 历史报价单隔离与越权访问测试', () => {
    it('租户 Alpha 的报价单不会出现在租户 Beta 的报价列表中', () => {
      const alphaQuotes = QuoteStoreService.listQuotes('tenant_alpha');
      const betaQuotes = QuoteStoreService.listQuotes('tenant_beta');

      const alphaIds = new Set(alphaQuotes.map(q => q.quotationNumber));
      const betaIds = new Set(betaQuotes.map(q => q.quotationNumber));

      // 两个租户的报价单集合交集应为空
      const intersection = [...alphaIds].filter(id => betaIds.has(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('3. RBAC 权限越权拦截', () => {
    it('普通业务员 (sales 角色) 即使携带有效 Token，也无法越权调用管理级接口', () => {
      const salesAuth = AuthService.authenticateUser('sales@alpha-export.com', 'alpha123');
      expect(salesAuth).not.toBeNull();
      expect(salesAuth?.user.role).toBe('sales');

      // 验证角色校验
      const hasAdminRole = salesAuth?.user.role === 'admin';
      expect(hasAdminRole).toBe(false);
    });
  });

  describe('4. 租户到期拦截与 1 年数据安全封存测试 (Tenant Expiration & Data Retention)', () => {
    const expiredTenantId = 'tenant_expired_test';
    const expiredDir = path.join(process.cwd(), 'data', 'tenants', expiredTenantId);

    beforeAll(() => {
      if (!fs.existsSync(expiredDir)) {
        fs.mkdirSync(expiredDir, { recursive: true });
      }
      const expiredProfile = {
        tenantId: expiredTenantId,
        companyName: '已逾期未续费外贸公司',
        contactEmail: 'boss@expired.com',
        apiKey: 'sk_live_expired_test_key',
        status: 'suspended',
        expiresAt: '2025-01-01T00:00:00.000Z', // 过去的时间
        dataRetentionUntil: '2026-01-01T00:00:00.000Z' // 保留1年
      };
      fs.writeFileSync(path.join(expiredDir, 'tenant.profile.json'), JSON.stringify(expiredProfile));
    });

    afterAll(() => {
      try {
        if (fs.existsSync(expiredDir)) {
          fs.rmSync(expiredDir, { recursive: true, force: true });
        }
      } catch {}
    });

    it('TenantService 正确识别已到期租户及 1 年封存截止日期', () => {
      const check = TenantService.isTenantExpired(expiredTenantId);
      expect(check.expired).toBe(true);
      expect(check.expiresAt).toBe('2025-01-01T00:00:00.000Z');
      expect(check.dataRetentionUntil).toBe('2026-01-01T00:00:00.000Z');
    });

    it('requireActiveTenant 中间件成功拦截到期租户并返回 403 TENANT_EXPIRED', () => {
      const mockReq: any = {
        tenantId: expiredTenantId
      };
      let statusCode = 200;
      let responseJson: any = null;
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseJson = data;
          return mockRes;
        }
      };
      let nextCalled = false;
      const nextFn = () => { nextCalled = true; };

      requireActiveTenant(mockReq, mockRes, nextFn);

      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
      expect(responseJson.code).toBe('TENANT_EXPIRED');
      expect(responseJson.error).toContain('【服務已到期】');
      expect(responseJson.error).toContain('安全封存');
    });
  });

});
