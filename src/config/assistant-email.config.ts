/**
 * 租户专属助理邮箱与 Catch-all 映射配置常量 (Task 4b §5.5 & 红线 14)
 * 真实助理邮箱地址与 MX 记录待确认后替换常量，严禁在业务代码中硬编码任何示例地址
 */

export interface AssistantEmailConfig {
  domain: string;
  prefix: string;
  catchAllPattern: RegExp;
  formatAssistantEmail: (tenantId: string) => string;
  extractTenantId: (toAddress: string) => string | null;
}

export const ASSISTANT_EMAIL_CONFIG: AssistantEmailConfig = {
  domain: process.env.ASSISTANT_EMAIL_DOMAIN || 'ai.kelvinflow.com',
  prefix: process.env.ASSISTANT_EMAIL_PREFIX || 'assistant',
  catchAllPattern: /^(?:assistant|rfq)[+-]([a-zA-Z0-9_-]+)@/i,

  /**
   * 根据租户 ID 格式化租户专属助理邮箱地址
   * 例如: tenant_trial_13800000000 -> assistant+trial_13800000000@ai.kelvinflow.com
   */
  formatAssistantEmail(tenantId: string): string {
    const cleanId = (tenantId || 'default').replace(/^tenant_/, '').replace(/[^a-zA-Z0-9_-]/g, '');
    return `${this.prefix}+${cleanId}@${this.domain}`;
  },

  /**
   * 从入站邮件收件人地址中解析租户 ID
   * 支持 assistant+<tenantId>@domain 或 rfq+<tenantId>@domain
   */
  extractTenantId(toAddress: string): string | null {
    if (!toAddress || typeof toAddress !== 'string') return null;
    const match = toAddress.trim().match(this.catchAllPattern);
    if (match && match[1]) {
      const id = match[1];
      if (id.startsWith('tenant_')) return id;
      if (id.startsWith('trial_')) return `tenant_${id}`;
      return `tenant_trial_${id}`;
    }
    return null;
  }
};
