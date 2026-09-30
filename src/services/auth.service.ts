import crypto from 'crypto';
import { AuthUser, UserRole } from '../types/index.js';
import { TenantService } from './tenant.service.js';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  exp: number; // Unix timestamp in seconds
}

export class AuthService {
  private static SECRET = process.env.AUTH_SECRET || 'ai-quotation-saas-master-key-2026';
  private static TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600; // 7 天有效

  // 默認內置賬戶數據庫（生產環境可平滑對接 SQLite / Postgres）
  private static DEFAULT_USERS: Array<AuthUser & { passwordHash: string }> = [
    {
      id: 'usr_default_admin',
      email: 'admin@foshan-kelvin.com',
      name: 'Kelvin Tsui (Admin)',
      role: 'admin',
      tenantId: 'default',
      passwordHash: 'admin123'
    },
    {
      id: 'usr_default_sales',
      email: 'sales@foshan-kelvin.com',
      name: 'Marcus Sales Rep',
      role: 'sales',
      tenantId: 'default',
      passwordHash: 'sales123'
    },
    {
      id: 'usr_alpha_admin',
      email: 'admin@alpha-export.com',
      name: 'Alpha Chief Admin',
      role: 'admin',
      tenantId: 'tenant_alpha',
      passwordHash: 'alpha123'
    },
    {
      id: 'usr_alpha_sales',
      email: 'sales@alpha-export.com',
      name: 'Alpha Sales Specialist',
      role: 'sales',
      tenantId: 'tenant_alpha',
      passwordHash: 'alpha123'
    },
    {
      id: 'usr_beta_admin',
      email: 'admin@beta-global.com',
      name: 'Beta Global Director',
      role: 'admin',
      tenantId: 'tenant_beta',
      passwordHash: 'beta123'
    }
  ];

  /**
   * Base64URL 編碼輔助函數
   */
  private static base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Base64URL 解碼輔助函數
   */
  private static base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf-8');
  }

  /**
   * 簽發安全 HMAC-SHA256 Token
   */
  static generateToken(user: AuthUser, expiresInSeconds?: number): string {
    const exp = Math.floor(Date.now() / 1000) + (expiresInSeconds || this.TOKEN_EXPIRY_SECONDS);
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      exp
    };

    const headerStr = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadStr = this.base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${headerStr}.${payloadStr}`;

    const signature = crypto
      .createHmac('sha256', this.SECRET)
      .update(dataToSign)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${dataToSign}.${signature}`;
  }

  /**
   * 校驗 Token 簽名與有效期
   */
  static verifyToken(token: string): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    const [headerStr, payloadStr, signature] = parts;
    const dataToSign = `${headerStr}.${payloadStr}`;

    const expectedSig = crypto
      .createHmac('sha256', this.SECRET)
      .update(dataToSign)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSig) {
      return null;
    }

    try {
      const payload: TokenPayload = JSON.parse(this.base64UrlDecode(payloadStr));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Token 已過期
      }
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * 賬號密碼認證登錄
   */
  static authenticateUser(email: string, passwordInput: string): { user: AuthUser; token: string } | null {
    const cleanEmail = email.toLowerCase().trim();
    const found = this.DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) return null;
    if (found.passwordHash !== passwordInput.trim()) {
      return null;
    }

    const user: AuthUser = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      tenantId: found.tenantId
    };

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * 通過 API Key 認證外部請求 (如 Webhook, n8n, 腳本)
   */
  static authenticateApiKey(apiKey: string): { user: AuthUser; tenantId: string } | null {
    if (!apiKey || typeof apiKey !== 'string') return null;
    const cleanKey = apiKey.trim();

    // 檢查固定管理員 Key 或各租戶自定義配置
    if (cleanKey === (process.env.MASTER_API_KEY || 'master-key-admin-2026')) {
      return {
        tenantId: 'default',
        user: {
          id: 'usr_master',
          email: 'master@admin.local',
          name: 'Master SuperAdmin',
          role: 'admin',
          tenantId: 'default'
        }
      };
    }

    // 格式支持: key_{tenantId}_{role}_...
    const match = cleanKey.match(/^key_([a-zA-Z0-9_-]+)_(admin|sales)/);
    if (match) {
      const tenantId = match[1];
      const role = match[2] as UserRole;
      return {
        tenantId,
        user: {
          id: `usr_${tenantId}_api`,
          email: `api@${tenantId}.local`,
          name: `${tenantId.toUpperCase()} API Bot`,
          role,
          tenantId
        }
      };
    }

    // 檢索租戶 profile.json 中的 apiKeys
    const allTenants = ['default', 'tenant_alpha', 'tenant_beta'];
    for (const tId of allTenants) {
      const profile = TenantService.getTenantProfile(tId);
      if (profile.apiKeys && profile.apiKeys.includes(cleanKey)) {
        return {
          tenantId: tId,
          user: {
            id: `usr_${tId}_api`,
            email: `api@${tId}.local`,
            name: `${profile.companyName} Integration`,
            role: 'admin',
            tenantId: tId
          }
        };
      }
    }

    return null;
  }
}
