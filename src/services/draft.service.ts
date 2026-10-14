import nodemailer from 'nodemailer';
import { QuoteStoreService } from './quote-store.service.js';

let cachedImapFlow: any = null;
async function getImapFlowClass(): Promise<any> {
  if (cachedImapFlow) return cachedImapFlow;
  try {
    const mod: any = await import('imapflow');
    cachedImapFlow = mod.ImapFlow || mod.default?.ImapFlow || mod.default;
    return cachedImapFlow;
  } catch (err) {
    console.warn('⚠️ [IMAP Service] imapflow package is not installed or failed to load');
    return null;
  }
}

export interface DraftOptions {
  userEmail: string;
  authCode: string;
  imapHost?: string;
  imapPort?: number;
  secure?: boolean;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  quotationNumber?: string;
  tenantId?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface ReviewEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  quotationNumber?: string;
  tenantId?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface AppendDraftResult {
  success: boolean;
  mailbox?: string;
  messageId?: string;
  error?: string;
}

export class DraftService {
  /**
   * 根据邮箱后缀自动推断主流企业邮箱 IMAP 主机
   */
  static resolveImapHost(email: string, userHost?: string): string {
    if (userHost && userHost.trim()) {
      return userHost.trim();
    }
    const domain = (email.split('@')[1] || '').toLowerCase().trim();
    
    // 1. 腾讯系：区分 QQ 个人邮箱与腾讯企业邮 (Exmail)
    if (domain === 'qq.com' || domain === 'vip.qq.com') {
      return 'imap.qq.com';
    }
    if (domain === 'foxmail.com') {
      return 'imap.qq.com';
    }
    if (domain.includes('exmail') || domain.includes('tencent')) {
      return 'imap.exmail.qq.com';
    }

    // 2. 网易系：区分 163/126/yeah 个人邮箱与网易企业邮
    if (domain === '163.com') {
      return 'imap.163.com';
    }
    if (domain === '126.com') {
      return 'imap.126.com';
    }
    if (domain === 'yeah.net') {
      return 'imap.yeah.net';
    }
    if (domain.includes('qiye.163') || domain.includes('netease') || domain.includes('ym.163')) {
      return 'imap.qiye.163.com';
    }

    // 3. 阿里系：区分阿里云个人邮箱与阿里企业邮箱 / 钉钉企业邮
    if (domain === 'aliyun.com') {
      return 'imap.aliyun.com';
    }
    if (domain.includes('qiye.aliyun') || domain.includes('dingtalk') || domain.includes('alibaba')) {
      return 'imap.qiye.aliyun.com';
    }

    // 4. 微软系：Office 365 / Outlook / Hotmail / Live
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live.com') || domain.includes('office365')) {
      return 'outlook.office365.com';
    }

    // 5. Google Gmail
    if (domain.includes('gmail')) {
      return 'imap.gmail.com';
    }

    // 6. 其它国内主流运营商与门户个人邮箱
    if (domain.includes('sina')) {
      return 'imap.sina.com';
    }
    if (domain.includes('sohu')) {
      return 'imap.sohu.com';
    }
    if (domain === '139.com') {
      return 'imap.139.com';
    }
    if (domain === '189.cn') {
      return 'imap.189.cn';
    }

    // 7. 自定义独立域名企业邮：优先推断 imap.域名 或 exmail (很多外贸企业使用腾讯企邮自建域名)
    return `imap.${domain}`;
  }

  /**
   * 将邮件及附件构造成符合 RFC 822 标准的原始 MIME Buffer
   */
  static async buildMimeBuffer(options: DraftOptions): Promise<Buffer> {
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows'
    });

    const mailOptions: any = {
      from: options.userEmail,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || undefined,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf'
      }))
    };

    const info = await transporter.sendMail(mailOptions);
    const chunks: Buffer[] = [];
    for await (const chunk of info.message as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * 通过 IMAP 协议将待发邮件静默存入业务员邮箱的“草稿箱 (Drafts)”
   * 采用 12 秒严格超时防挂起机制
   */
  static async appendDraft(options: DraftOptions): Promise<AppendDraftResult> {
    // 🛡️ 防御性门禁拦截：若指定了单号，严格核验单据在存储中存在且有效，杜绝幽灵草稿
    if (options.quotationNumber) {
      const verifyQuote = QuoteStoreService.getQuote(options.quotationNumber, options.tenantId);
      if (!verifyQuote) {
        const errorMsg = `🚨 [幽灵草稿防范阻断] 待注入草稿关联的单据 [${options.quotationNumber}] 在存储中未找到或无法解析，已紧急阻断草稿注入！`;
        console.error(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    }

    const host = this.resolveImapHost(options.userEmail, options.imapHost);
    const port = options.imapPort || 993;
    const secure = options.secure !== false;

    console.log(`📡 [IMAP 草稿注入] 正在连接邮箱 [${options.userEmail}] @ ${host}:${port}...`);

    const ImapFlowConstructor = await getImapFlowClass();
    if (!ImapFlowConstructor) {
      return {
        success: false,
        error: '服务器端尚未安装 imapflow 组件，请在服务器执行 npm install imapflow'
      };
    }

    const client = new ImapFlowConstructor({
      host,
      port,
      secure,
      auth: {
        user: options.userEmail,
        pass: options.authCode
      },
      logger: false,
      emitLogs: false,
      connectionTimeout: 10000,
      greetingTimeout: 8000
    });

    const runAppend = async (): Promise<AppendDraftResult> => {
      try {
        await client.connect();

        // 获取邮箱目录，利用 RFC 6154 SPECIAL-USE 自动精确定位草稿箱
        const mailboxList = await client.list();
        let draftsBox = mailboxList.find((b: any) => b.specialUse === '\\Drafts');
        
        if (!draftsBox) {
          // 兼容中文企业邮 MUTF-7 命名（草稿箱 / Drafts / &g0l6P3ux-）
          draftsBox = mailboxList.find((b: any) => 
            /draft/i.test(b.name) || 
            b.name.includes('草稿') || 
            b.path.includes('草稿') ||
            b.name === '&g0l6P3ux-'
          );
        }

        const targetPath = draftsBox ? draftsBox.path : 'Drafts';

        // 构造 RFC 822 MIME 报文
        const mimeBuffer = await this.buildMimeBuffer(options);

        // 写入草稿箱并打上 \Draft 标记
        const appendResult = await client.append(targetPath, mimeBuffer, ['\\Draft', '\\Seen']);

        console.log(`✅ [IMAP 草稿注入成功] 成功写入 [${options.userEmail}] 的目录 [${targetPath}]！`);

        await client.logout();

        return {
          success: true,
          mailbox: targetPath,
          messageId: appendResult ? String(appendResult.uid) : undefined
        };
      } catch (err: any) {
        console.error(`❌ [IMAP 草稿注入失败] 邮箱 [${options.userEmail}]:`, err.message || err);
        try {
          await client.logout();
        } catch (_) {}

        let userFriendlyError = err.message || '未知连接错误';
        if (userFriendlyError.includes('AUTHENTICATIONFAILED') || userFriendlyError.includes('login failed')) {
          userFriendlyError = '邮箱授权码错误或已失效，请检查是否填入了正确的“客户端专属授权码”（非邮箱登录密码）';
        } else if (userFriendlyError.includes('ETIMEDOUT') || userFriendlyError.includes('ENOTFOUND')) {
          userFriendlyError = `无法连接至 IMAP 服务器 (${host}:${port})，请确认企业邮箱服务器地址`;
        }

        return {
          success: false,
          error: userFriendlyError
        };
      }
    };

    // 12 秒严格超时赛马，防止 IMAP 握手被网络策略阻断而导致进程挂起
    const timeoutPromise = new Promise<AppendDraftResult>((resolve) => {
      setTimeout(() => {
        try { client.close(); } catch (_) {}
        resolve({
          success: false,
          error: `连接 IMAP 服务器超时 (${host}:${port})，网络或端口不通`
        });
      }, 12000);
    });

    return Promise.race([runAppend(), timeoutPromise]);
  }

  /**
   * 模式 1：将生成的待审报价与 PDF 附件发送至业务员工作邮箱 (收件箱)
   * 零配置兜底交付，业务员在收件箱查阅后一键转发买家
   */
  static async sendReviewEmail(options: ReviewEmailOptions): Promise<{ sent: boolean; method: 'smtp' | 'resend' | 'workbench_store' | 'blocked_ghost_quote'; messageId?: string; error?: string }> {
    // 🛡️ 防御性门禁拦截：若指定了单号，严格核验单据在存储中存在且有效，杜绝幽灵邮件外发
    if (options.quotationNumber) {
      const verifyQuote = QuoteStoreService.getQuote(options.quotationNumber, options.tenantId);
      if (!verifyQuote) {
        const errorMsg = `🚨 [幽灵邮件防范阻断] 待发审单邮件关联的单据 [${options.quotationNumber}] 在存储中未找到或已删除，已紧急阻断邮件投递！`;
        console.error(errorMsg);
        return {
          sent: false,
          method: 'blocked_ghost_quote',
          error: errorMsg
        };
      }
    }
    // 1. 优先尝试 Resend API 官方事务发信通道 (无需 SMTP 握手，海外 VPS 极速投递，已绑定 kelvinflow.com)
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      try {
        const fromEmail = process.env.FROM_EMAIL?.trim() || process.env.SMTP_FROM?.trim() || 'KelvinFlow AI 报价中枢 <auth@kelvinflow.com>';
        const payload: any = {
          from: fromEmail,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html || undefined
        };

        if (options.attachments && options.attachments.length > 0) {
          payload.attachments = options.attachments.map(att => ({
            filename: att.filename,
            content: att.content.toString('base64')
          }));
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const resData = await res.json() as any;
        if (res.ok && resData?.id) {
          console.log(`📧 [Mode 1 待审邮件已投递 (Resend API)] 成功投递至业务员邮箱 [${options.to}], 邮件 ID: ${resData.id}`);
          return { sent: true, method: 'resend', messageId: resData.id };
        } else {
          console.warn(`⚠️ [Mode 1 Resend API 响应异常]: HTTP ${res.status} - ${JSON.stringify(resData)}`);
        }
      } catch (resendErr: any) {
        console.warn(`⚠️ [Mode 1 Resend API 发信异常]: ${resendErr.message}`);
      }
    }

    // 2. 尝试标准 SMTP 配置发送真实邮件
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpFrom = process.env.SMTP_FROM?.trim() || smtpUser || 'quote-notify@kelvinflow.com';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          connectionTimeout: 8000
        });

        const info = await transporter.sendMail({
          from: `"KelvinFlow AI 报价中枢" <${smtpFrom}>`,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html || undefined,
          attachments: options.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || 'application/pdf'
          }))
        });

        console.log(`📧 [Mode 1 待审邮件已投递 (SMTP)] 成功投递至业务员邮箱 [${options.to}], ID: ${info.messageId}`);
        return { sent: true, method: 'smtp', messageId: info.messageId };
      } catch (err: any) {
        console.warn(`⚠️ [Mode 1 SMTP 发送失败] 回退至审单台在线存储:`, err.message);
        return { sent: false, method: 'workbench_store', error: err.message };
      }
    }

    console.log(`ℹ️ [Mode 1 待审出单就绪] 未配置外部发信服务，单据已在审单台中枢就绪，业务员可直接在线查阅或转发`);
    return { sent: false, method: 'workbench_store' };
  }

  /**
   * 测试 IMAP 连接与凭据有效性
   */
  static async testConnection(userEmail: string, authCode: string, imapHost?: string, imapPort?: number): Promise<{ success: boolean; draftsBoxName?: string; error?: string }> {
    const host = this.resolveImapHost(userEmail, imapHost);
    const port = imapPort || 993;

    const ImapFlowConstructor = await getImapFlowClass();
    if (!ImapFlowConstructor) {
      return {
        success: false,
        error: '服务器端尚未安装 imapflow 组件，请在服务器执行 npm install imapflow'
      };
    }

    const client = new ImapFlowConstructor({
      host,
      port,
      secure: true,
      auth: {
        user: userEmail,
        pass: authCode
      },
      logger: false,
      emitLogs: false
    });

    try {
      await client.connect();
      const mailboxList = await client.list();
      const draftsBox = mailboxList.find((b: any) => b.specialUse === '\\Drafts') || 
                        mailboxList.find((b: any) => /draft|草稿/i.test(b.name)) || 
                        { path: 'Drafts' };
      await client.logout();
      return {
        success: true,
        draftsBoxName: draftsBox.path
      };
    } catch (err: any) {
      try { await client.logout(); } catch (_) {}
      return {
        success: false,
        error: err.message || '连接失败'
      };
    }
  }
}
