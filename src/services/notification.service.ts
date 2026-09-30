import fs from 'fs';
import path from 'path';

export interface LeadNotificationPayload {
  customerName?: string;
  companyName?: string;
  contact?: string;
  phone?: string;
  email?: string;
  wechat?: string;
  dailyRfqs?: string;
  productCategory?: string;
  channelSource?: string;
  ref?: string;
  memoCode?: string;
  source?: string;
  remainingDays?: number;
  expiresAt?: string;
  ip?: string;
}

export interface QuoteNotificationPayload {
  quotationNumber: string;
  buyerName?: string;
  totalAmountForeign?: number;
  currency?: string;
  itemCount?: number;
  salesRepEmail?: string;
  salesRepName?: string;
  tenantId?: string;
  reviewUrl?: string;
  tradeTerms?: string;
}

export class NotificationService {
  /**
   * 推送留资与试用激活线索至创始人微信 (支持 PushPlus 与 Server酱)
   */
  static async pushToWeChat(payload: LeadNotificationPayload): Promise<{ pushed: boolean; channel?: string; error?: string }> {
    const pushplusToken = process.env.PUSHPLUS_TOKEN?.trim();
    const serverchanKey = process.env.SERVERCHAN_SENDKEY?.trim();

    const title = `🔥【KelvinFlow】新用户注册开通 7 天试用！`;
    const lines: string[] = [
      `### 👤 试用用户：${payload.phone || '新用户'}`,
      `- **手机号码**：\`${payload.phone || payload.contact || '未提供'}\``,
      `- **业务邮箱**：\`${payload.email || '未提供'}\``,
      `- **得知渠道**：**${payload.channelSource || '未选择'}**`
    ];

    if (payload.ref) {
      lines.push(`- **推荐人/邀请码**：\`${payload.ref}\` (双方各享 +7 天)`);
    }
    if (payload.companyName && payload.companyName !== '外贸个人工作室' && payload.companyName !== '外贸工作室') {
      lines.push(`- **客户企业**：${payload.companyName}`);
    }
    if (payload.customerName && payload.customerName !== '外贸业务员' && payload.customerName !== '外贸同行') {
      lines.push(`- **联系人**：${payload.customerName}`);
    }
    if (payload.wechat) {
      lines.push(`- **微信号**：\`${payload.wechat}\``);
    }
    if (payload.productCategory && payload.productCategory !== '通用外贸' && payload.productCategory !== '通用外贸/工贸') {
      lines.push(`- **主营品类**：${payload.productCategory}`);
    }

    lines.push(`- **开通模式**：7天全功能免费试用 (自动即时激活)`);
    lines.push(`- **到期时间**：${payload.expiresAt ? new Date(payload.expiresAt).toLocaleDateString('zh-CN') : '7天后'}`);
    lines.push(`- **来源标记**：${payload.source || '官网/工作台'}`);
    lines.push(`- **提交时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    lines.push('');
    lines.push('---');
    lines.push('> 💡 **商业建议**：高意向用户已进入系统试用！建议在 15 分钟内通过手机号添加对方微信，主动协助导入底价表，成单率提升 80%！');

    const markdownContent = lines.join('\n');

    // 1. 优先尝试 PushPlus (推加)
    if (pushplusToken) {
      try {
        const resp = await fetch('http://www.pushplus.plus/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: pushplusToken,
            title,
            content: markdownContent,
            template: 'markdown'
          })
        });
        const resJson: any = await resp.json();
        if (resJson.code === 200) {
          console.log(`📲 [微信推送成功] 已通过 PushPlus 成功推送至创始人微信`);
          return { pushed: true, channel: 'PushPlus' };
        }
        console.warn(`⚠️ [PushPlus 推送返回异常]:`, resJson);
      } catch (e: any) {
        console.error(`❌ PushPlus 推送失败:`, e.message);
      }
    }

    // 2. 备用尝试 Server酱 (ServerChan Turbo)
    if (serverchanKey) {
      try {
        const resp = await fetch(`https://sctapi.ftqq.com/${serverchanKey}.send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            desp: markdownContent
          })
        });
        const resJson: any = await resp.json();
        if (resJson.code === 0) {
          console.log(`📲 [微信推送成功] 已通过 Server酱 成功推送至创始人微信`);
          return { pushed: true, channel: 'ServerChan' };
        }
        console.warn(`⚠️ [Server酱 推送返回异常]:`, resJson);
      } catch (e: any) {
        console.error(`❌ Server酱 推送失败:`, e.message);
      }
    }

    return { pushed: false };
  }

  /**
   * 本地持久化留资线索
   */
  static saveLeadLocally(lead: any): void {
    try {
      const leadsDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(leadsDir)) {
        fs.mkdirSync(leadsDir, { recursive: true });
      }
      const leadsFile = path.join(leadsDir, 'inbound_leads.json');
      let list: any[] = [];
      if (fs.existsSync(leadsFile)) {
        try {
          list = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
        } catch {}
      }
      list.unshift({
        ...lead,
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(leadsFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('❌ 保存本地线索失败:', err.message);
    }
  }

  /**
   * 推送出单战报至创始人微信 (实时监控用户询盘与报价活跃度)
   */
  static async pushQuoteCreatedToWeChat(payload: QuoteNotificationPayload): Promise<{ pushed: boolean; channel?: string; error?: string }> {
    // 保护 PushPlus 每日 200 条限额：默认静默不发报价单通知，仅在明确开启 PUSH_QUOTE_CREATED_TO_WECHAT=true 时发送
    // 彻底确保新用户注册 (试用留资) 与付费开通激活通知 100% 畅通送达！
    if (process.env.PUSH_QUOTE_CREATED_TO_WECHAT !== 'true') {
      console.log(`ℹ️ [NotificationService] 报价单 [${payload.quotationNumber}] 已生成，出单微信通知已静音（优先保留 PushPlus 200条/日 额度用于新用户留资与付费激活）`);
      return { pushed: false, channel: 'muted' };
    }

    const pushplusToken = process.env.PUSHPLUS_TOKEN?.trim();
    const serverchanKey = process.env.SERVERCHAN_SENDKEY?.trim();

    const title = `📊【KelvinFlow 战报】用户成功生成一份外贸报价单！`;
    const lines: string[] = [
      `### 🚀 报价单已生成：${payload.quotationNumber}`,
      `- **买家客户**：\`${payload.buyerName || '海外买家'}\``,
      `- **报价总额**：**${payload.currency || 'USD'} ${(payload.totalAmountForeign || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}**`,
      `- **贸易条款**：\`${payload.tradeTerms || 'FOB'}\``,
      `- **包含品项**：\`${payload.itemCount || 1}\` 款 SKU`,
      `- **所属租户**：\`${payload.tenantId || 'default'}\``,
      `- **业务员/邮箱**：${payload.salesRepName ? `${payload.salesRepName} (` : ''}\`${payload.salesRepEmail || '系统'}\`${payload.salesRepName ? ')' : ''}`,
      `- **生成时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
    ];

    if (payload.reviewUrl) {
      lines.push(`- **审单微调链接**：[点击打开审单台](${payload.reviewUrl})`);
    }

    lines.push('');
    lines.push('---');
    lines.push('> 🎯 **创始人视角**：核心业务闭环再次跑通！用户正在真实使用系统生成报价。');

    const markdownContent = lines.join('\n');

    // 1. 优先尝试 PushPlus (推加)
    if (pushplusToken) {
      try {
        const resp = await fetch('http://www.pushplus.plus/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: pushplusToken,
            title,
            content: markdownContent,
            template: 'markdown'
          })
        });
        const resJson: any = await resp.json();
        if (resJson.code === 200) {
          console.log(`📲 [微信战报推送成功] 报价单 [${payload.quotationNumber}] 已通过 PushPlus 成功推送`);
          return { pushed: true, channel: 'PushPlus' };
        }
      } catch (e: any) {
        console.error(`❌ PushPlus 战报推送失败:`, e.message);
      }
    }

    // 2. 备用尝试 Server酱 (ServerChan Turbo)
    if (serverchanKey) {
      try {
        const resp = await fetch(`https://sctapi.ftqq.com/${serverchanKey}.send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            desp: markdownContent
          })
        });
        const resJson: any = await resp.json();
        if (resJson.code === 0) {
          console.log(`📲 [微信战报推送成功] 报价单 [${payload.quotationNumber}] 已通过 Server酱 成功推送`);
          return { pushed: true, channel: 'ServerChan' };
        }
      } catch (e: any) {
        console.error(`❌ Server酱 战报推送失败:`, e.message);
      }
    }

    return { pushed: false };
  }
}
