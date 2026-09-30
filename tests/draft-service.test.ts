import { DraftService } from '../src/services/draft.service.js';
import { inboundRouter } from '../src/routes/inbound.router.js';
import { TenantService } from '../src/services/tenant.service.js';

describe('DraftService & 轨道 B IMAP 草稿自动注入测试', () => {

  describe('1. 邮箱 IMAP 主机智能推断', () => {
    it('应根据邮箱后缀精准推断网易、腾讯、阿里、微软与谷歌企业邮箱主机', () => {
      expect(DraftService.resolveImapHost('sales@qiye.163.com')).toBe('imap.qiye.163.com');
      expect(DraftService.resolveImapHost('export@foshan.netease.com')).toBe('imap.qiye.163.com');
      expect(DraftService.resolveImapHost('tom@exmail.qq.com')).toBe('imap.exmail.qq.com');
      expect(DraftService.resolveImapHost('alice@aliyun.com')).toBe('imap.aliyun.com');
      expect(DraftService.resolveImapHost('service@qiye.aliyun.com')).toBe('imap.qiye.aliyun.com');
      expect(DraftService.resolveImapHost('bob@company.partner.onmschina.cn', 'custom.imap.com')).toBe('custom.imap.com');
      expect(DraftService.resolveImapHost('sarah@outlook.com')).toBe('outlook.office365.com');
      expect(DraftService.resolveImapHost('buyer@gmail.com')).toBe('imap.gmail.com');
    });
  });

  describe('2. RFC 822 MIME 邮件报文与 PDF 挂载构造测试', () => {
    it('能将正文与 PDF 附件合成为标准的 RFC 822 MIME Buffer', async () => {
      const mockPdfBuffer = Buffer.from('%PDF-1.4 Mock Quotation Content');
      const mimeBuffer = await DraftService.buildMimeBuffer({
        userEmail: 'sales@foshan-metal.com',
        authCode: 'testAuthCode123',
        to: 'buyer@german-tools.de',
        subject: 'Quotation QT-2026-TEST for LED Bracket',
        text: 'Dear Mr. Schmidt, please find the quotation attached.',
        html: '<p>Dear Mr. Schmidt, please find the quotation attached.</p>',
        attachments: [{
          filename: 'Quotation_QT-2026-TEST.pdf',
          content: mockPdfBuffer,
          contentType: 'application/pdf'
        }]
      });

      expect(mimeBuffer).toBeDefined();
      expect(Buffer.isBuffer(mimeBuffer)).toBe(true);
      const mimeStr = mimeBuffer.toString('utf-8');
      expect(mimeStr).toContain('Subject: Quotation QT-2026-TEST for LED Bracket');
      expect(mimeStr).toContain('sales@foshan-metal.com');
      expect(mimeStr).toContain('buyer@german-tools.de');
      expect(mimeStr).toContain('Quotation_QT-2026-TEST.pdf');
    });
  });

  describe('3. IMAP 路由接口健全性测试 (/api/inbound)', () => {
    it('POST /api/inbound/test-imap 缺少参数时拦截 400', async () => {
      const postTestImap = (inboundRouter.stack || []).find(
        (l: any) => l.route && l.route.path === '/test-imap' && l.route.methods.post
      );
      expect(postTestImap).toBeDefined();

      let statusCode = 200;
      let responseData: any = null;
      const mockRes: any = {
        status: (code: number) => { statusCode = code; return mockRes; },
        json: (data: any) => { responseData = data; return mockRes; }
      };

      await (postTestImap as any).route.stack[0].handle({ body: { email: '' } }, mockRes, () => {});
      expect(statusCode).toBe(400);
      expect(responseData.error).toContain('缺少邮箱地址或客户端授权码');
    });

    it('POST /api/inbound/save-imap 成功保存租户 IMAP 配置', async () => {
      const postSaveImap = (inboundRouter.stack || []).find(
        (l: any) => l.route && l.route.path === '/save-imap' && l.route.methods.post
      );
      expect(postSaveImap).toBeDefined();

      let statusCode = 200;
      let responseData: any = null;
      const mockRes: any = {
        status: (code: number) => { statusCode = code; return mockRes; },
        json: (data: any) => { responseData = data; return mockRes; }
      };

      await (postSaveImap as any).route.stack[0].handle({
        body: {
          tenantId: 'default',
          email: 'tom@foshan-metal.com',
          authCode: 'mock_auth_code_2026',
          host: 'imap.exmail.qq.com',
          port: 993,
          enabled: true
        }
      }, mockRes, () => {});

      expect(statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.imapConfig.email).toBe('tom@foshan-metal.com');

      // 验证落盘 profile
      const profile = TenantService.getTenantProfile('default');
      expect(profile.imapConfig).toBeDefined();
      expect(profile.imapConfig?.email).toBe('tom@foshan-metal.com');
      expect(profile.imapConfig?.authCode).toBe('mock_auth_code_2026');
    });

    it('POST /api/inbound/quick-quote 空询盘内容拦截 400', async () => {
      const postQuick = (inboundRouter.stack || []).find(
        (l: any) => l.route && l.route.path === '/quick-quote' && l.route.methods.post
      );
      expect(postQuick).toBeDefined();

      let statusCode = 200;
      let responseData: any = null;
      const mockRes: any = {
        status: (code: number) => { statusCode = code; return mockRes; },
        json: (data: any) => { responseData = data; return mockRes; }
      };

      await (postQuick as any).route.stack[0].handle({ body: { inquiryText: '' } }, mockRes, () => {});
      expect(statusCode).toBe(400);
      expect(responseData.error).toContain('请粘贴或输入询盘正文内容');
    });
  });

});
