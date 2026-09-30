import fs from 'fs';
import path from 'path';
import { simpleParser } from 'mailparser';
import { TenantService } from './tenant.service.js';
import { DraftService } from './draft.service.js';
import { InboundProcessorService } from './inbound-processor.service.js';
import { TenantProfile } from '../types/index.js';

let cachedImapFlow: any = null;
async function getImapFlowClass(): Promise<any> {
  if (cachedImapFlow) return cachedImapFlow;
  try {
    const mod: any = await import('imapflow');
    cachedImapFlow = mod.ImapFlow || mod.default?.ImapFlow || mod.default;
    return cachedImapFlow;
  } catch (err) {
    console.warn('⚠️ [Email Poller] imapflow 组件加载失败:', err);
    return null;
  }
}

export class EmailPollerService {
  private static pollTimer: NodeJS.Timeout | null = null;
  private static isPolling = false;
  // 默认每 2 分钟轮询一次付费用户的收件箱
  private static DEFAULT_INTERVAL_MS = Number(process.env.EMAIL_POLL_INTERVAL_MS) || 120_000;

  /**
   * 启动多租户邮箱自动监听服务
   */
  static start() {
    if (this.pollTimer) return;
    console.log(`📬 [Email Poller] 付费用户收件箱自动轮询守护服务已启动，扫描周期: ${this.DEFAULT_INTERVAL_MS / 1000} 秒`);

    // 启动 8 秒后执行首次扫描
    setTimeout(() => {
      this.pollAllTenants().catch(err => console.error('⚠️ [Email Poller] 首次轮询执行异常:', err));
    }, 8000);

    // 周期性定时轮询
    this.pollTimer = setInterval(() => {
      this.pollAllTenants().catch(err => console.error('⚠️ [Email Poller] 定时轮询执行异常:', err));
    }, this.DEFAULT_INTERVAL_MS);
  }

  /**
   * 停止轮询服务
   */
  static stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('🛑 [Email Poller] 付费用户收件箱轮询守护服务已停止');
    }
  }

  /**
   * 扫描所有已激活 IMAP 授权码的租户
   */
  static async pollAllTenants(): Promise<void> {
    if (this.isPolling) {
      console.log('⏳ [Email Poller] 上一轮扫描仍在进行中，跳过本次轮询');
      return;
    }

    this.isPolling = true;
    try {
      const allTenants = TenantService.listAllTenants();
      const eligibleTenants = allTenants.filter(t => 
        t.imapConfig?.enabled && 
        Boolean(t.imapConfig.email) && 
        Boolean(t.imapConfig.authCode)
      );

      if (eligibleTenants.length === 0) {
        return;
      }

      console.log(`🔍 [Email Poller] 开始扫描 ${eligibleTenants.length} 位已配置授权码的付费租户收件箱...`);

      for (const tenant of eligibleTenants) {
        try {
          await this.pollTenant(tenant);
        } catch (err: any) {
          console.warn(`⚠️ [Email Poller] 扫描租户 [${tenant.tenantId}] 时出错:`, err.message);
        }
      }
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * 扫描指定租户的收件箱
   */
  static async pollTenant(tenant: TenantProfile): Promise<{ processedCount: number; error?: string }> {
    const tenantId = tenant.tenantId;
    const imapConfig = tenant.imapConfig;

    if (!imapConfig || !imapConfig.enabled || !imapConfig.email || !imapConfig.authCode) {
      return { processedCount: 0, error: '租户未配置或未启用 IMAP 授权码' };
    }

    const host = DraftService.resolveImapHost(imapConfig.email, imapConfig.host);
    const port = imapConfig.port || 993;
    const secure = imapConfig.secure !== false;

    const ImapFlowConstructor = await getImapFlowClass();
    if (!ImapFlowConstructor) {
      return { processedCount: 0, error: 'imapflow 未安装' };
    }

    const client = new ImapFlowConstructor({
      host,
      port,
      secure,
      auth: {
        user: imapConfig.email,
        pass: imapConfig.authCode
      },
      logger: false,
      emitLogs: false
    });

    let processedCount = 0;
    const processedStore = this.getProcessedInquiries(tenantId);

    try {
      await client.connect();

      const lock = await client.getMailboxLock('INBOX');
      try {
        // 搜索近 3 天的未读邮件
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
        const searchCriteria: any = {
          unseen: true,
          since: threeDaysAgo
        };

        const messageList = await client.search(searchCriteria);

        if (messageList && messageList.length > 0) {
          console.log(`📥 [Email Poller] 租户 [${tenantId}] (${imapConfig.email}) 发现 ${messageList.length} 封未读邮件，正在筛选买家询盘...`);

          for (const uid of messageList) {
            try {
              const downloadResult = await client.download(uid, ['source']);
              if (!downloadResult || !downloadResult.content) continue;

              // 解析完整 MIME 邮件
              const parsed = await simpleParser(downloadResult.content);
              const messageId = parsed.messageId || `${tenantId}_${uid}_${parsed.date?.getTime() || Date.now()}`;

              // 去重判断
              if (processedStore.has(messageId)) {
                continue;
              }

              const fromAddress = parsed.from?.value?.[0]?.address || '';
              const fromName = parsed.from?.value?.[0]?.name || fromAddress;
              const subject = parsed.subject || '(无主题询盘)';
              const emailText = (parsed.text || parsed.html || subject || '').trim();

              // 过滤垃圾邮件与自动化退信/通知
              if (this.isSpamOrNotification(fromAddress, subject)) {
                processedStore.add(messageId);
                continue;
              }

              // 过滤自己发给自己的邮件
              if (fromAddress.toLowerCase() === imapConfig.email.toLowerCase()) {
                processedStore.add(messageId);
                continue;
              }

              console.log(`🎯 [Email Poller] 租户 [${tenantId}] 捕获到买家询盘: 来自 [${fromName} <${fromAddress}>], 主题: "${subject}"`);

              // 1. 若配置了全局 n8n Webhook，可异步抄送给 n8n 触发可视化大屏
              const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
              if (n8nWebhookUrl) {
                fetch(n8nWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tenantId,
                    userEmail: imapConfig.email,
                    subject,
                    from: fromAddress,
                    fromName,
                    content: emailText,
                    messageId
                  })
                }).catch(e => console.warn('⚠️ [Email Poller] 异步通知 n8n Webhook 异常:', e.message));
              }

              // 2. 调用核心询盘处理引擎 (Gemini 大模型提取 + 自动算价 + PDF 渲染 + 注入草稿箱)
              const processResult = await InboundProcessorService.processInboundInquiry({
                tenantId,
                from: fromAddress,
                to: imapConfig.email,
                subject,
                text: emailText
              });

              if (processResult.success) {
                processedCount++;
                processedStore.add(messageId);

                // 标记该邮件为已读 (Seen)
                try {
                  await client.messageFlagsAdd(uid, ['\\Seen']);
                } catch (_) {}

                console.log(`🎉 [Email Poller] 询盘全自动闭环成功: 报价单 [${processResult.quotationNumber}] 已注入 [${imapConfig.email}] 草稿箱！`);
              }
            } catch (msgErr: any) {
              console.warn(`⚠️ [Email Poller] 处理单封邮件 UID ${uid} 失败:`, msgErr.message);
            }
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();

      // 保存已处理去重记录
      this.saveProcessedInquiries(tenantId, processedStore);

      // 更新租户状态
      TenantService.updateTenantProfile(tenantId, {
        imapConfig: {
          ...imapConfig,
          lastPollAt: new Date().toISOString(),
          lastPollStatus: `监听运行正常 · 刚刚扫描完成${processedCount > 0 ? ` (成功出单 ${processedCount} 封)` : ''}`,
          inquiriesAutoProcessed: (imapConfig.inquiriesAutoProcessed || 0) + processedCount
        }
      });

      return { processedCount };
    } catch (err: any) {
      try { await client.logout(); } catch (_) {}
      console.error(`❌ [Email Poller] 轮询租户 [${tenantId}] 邮箱异常:`, err.message);

      let statusMsg = '连接失败: ' + err.message;
      if (err.message?.includes('AUTHENTICATIONFAILED') || err.message?.includes('login failed')) {
        statusMsg = '授权码错误或失效，请检查客户端专属授权码';
      }

      TenantService.updateTenantProfile(tenantId, {
        imapConfig: {
          ...imapConfig,
          lastPollAt: new Date().toISOString(),
          lastPollStatus: statusMsg
        }
      });

      return { processedCount: 0, error: err.message };
    }
  }

  /**
   * 过滤常见的退信、系统通知与免打扰邮件
   */
  private static isSpamOrNotification(from: string, subject: string): boolean {
    const f = from.toLowerCase();
    const s = subject.toLowerCase();

    const ignoredSenders = [
      'mailer-daemon', 'postmaster', 'no-reply', 'noreply', 'donotreply',
      'notifications', 'newsletter', 'verify', 'account-security', 'admin@'
    ];
    if (ignoredSenders.some(k => f.includes(k))) return true;

    const ignoredSubjects = [
      'automatic reply', 'out of office', 'auto-reply', 'delivery status notification',
      'failure notice', 'undelivered mail', 'mail delivery failed', '系统退信', '自动回复'
    ];
    if (ignoredSubjects.some(k => s.includes(k))) return true;

    return false;
  }

  /**
   * 获取租户已处理询盘的 messageId 集合 (防止重复发单)
   */
  private static getProcessedInquiries(tenantId: string): Set<string> {
    const tenantDir = TenantService.getTenantDir(tenantId);
    const filePath = path.join(tenantDir, 'processed_inquiries.json');
    if (!fs.existsSync(filePath)) return new Set();

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return new Set(Array.isArray(data) ? data : []);
    } catch (e) {
      return new Set();
    }
  }

  /**
   * 保存租户已处理询盘记录 (LRU 保留最近 2000 封)
   */
  private static saveProcessedInquiries(tenantId: string, set: Set<string>): void {
    const tenantDir = TenantService.getTenantDir(tenantId);
    const filePath = path.join(tenantDir, 'processed_inquiries.json');
    const arr = Array.from(set).slice(-2000);
    try {
      fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {
      console.warn('保存 processed_inquiries 失败:', e);
    }
  }
}
