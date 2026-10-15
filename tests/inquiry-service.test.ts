import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { InquiryService } from '../src/services/inquiry.service.js';
import { quoteRouter } from '../src/routes/quote.router.js';
import { inboundRouter } from '../src/routes/inbound.router.js';
import { TenantService } from '../src/services/tenant.service.js';
import { AuthService } from '../src/services/auth.service.js';

describe('Step 3: 工作流精简与询盘一等实体落盘与只读API验收 (§2.5 & D-12)', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  const tenantA = 'tenant_test_inq_a';
  const tenantB = 'tenant_test_inq_b';
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    TenantService.init();
    app = express();
    app.use(express.json());
    app.use('/api/v1', quoteRouter);
    app.use('/api/inbound', inboundRouter);

    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // 生成测试租户 Token
    tokenA = AuthService.generateToken({
      id: 'usr_inq_a',
      email: 'sales@tenant-a.com',
      name: 'Sales Rep A',
      role: 'sales',
      tenantId: tenantA
    });

    tokenB = AuthService.generateToken({
      id: 'usr_inq_b',
      email: 'sales@tenant-b.com',
      name: 'Sales Rep B',
      role: 'sales',
      tenantId: tenantB
    });
  });

  afterAll((done) => {
    // 清理测试租户数据与临时询盘
    InquiryService.cleanupTenantInquiries(tenantA);
    InquiryService.cleanupTenantInquiries(tenantB);
    InquiryService.cleanupTenantInquiries('default');

    const dirA = path.join(process.cwd(), 'data', 'tenants', tenantA);
    const dirB = path.join(process.cwd(), 'data', 'tenants', tenantB);
    if (fs.existsSync(dirA)) fs.rmSync(dirA, { recursive: true, force: true });
    if (fs.existsSync(dirB)) fs.rmSync(dirB, { recursive: true, force: true });

    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('1. n8n 工作流目录精简验收', () => {
    it('workflows/ 根目录应仅保留 1 个活跃工作流 JSON (n8n-gmail-quote-draft.json)', () => {
      const workflowsDir = path.join(process.cwd(), 'workflows');
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(1);
      expect(files[0]).toBe('n8n-gmail-quote-draft.json');
    });

    it('workflows/archive/ 目录应包含其余 4 个归档工作流', () => {
      const archiveDir = path.join(process.cwd(), 'workflows', 'archive');
      expect(fs.existsSync(archiveDir)).toBe(true);
      const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(4);
      expect(files).toContain('n8n-outlook-quote-draft.json');
      expect(files).toContain('n8n-scheme2-draft-injection.json');
      expect(files).toContain('n8n-universal-all-in-one-quote-workflow.json');
      expect(files.some(f => f.includes('KelvinFlow'))).toBe(true);
    });
  });

  describe('2. InquiryService 实体生成、字段规范与落盘持久化', () => {
    it('能够成功生成 INQ-*.json 实体，且包含全部任务书 §2.5 要求字段', () => {
      const sampleText = 'Hello, please quote 500 pcs of MODEL-X1 at FOB Shenzhen.';
      const inquiry = InquiryService.createInquiryFromInbound({
        tenantId: tenantA,
        from: 'buyer-marcus@acme-hardware.de',
        to: 'rfq-a@quote.kelvinflow.com',
        subject: 'Urgent RFQ for Model X1',
        content: sampleText,
        quotationNumber: 'QT-TEST-20261014-001',
        inquiryMessageId: 'msg-rfc822-test-001@acme.de',
        parseStatus: 'parsed',
        buyerName: 'Marcus Weber',
        itemsSummary: [{ sku: 'MODEL-X1', quantity: 500 }]
      });

      expect(inquiry.inquiryId).toMatch(/^INQ-\d{8}-[a-f0-9]{4}$/);
      expect(inquiry.tenantId).toBe(tenantA);
      expect(inquiry.from).toBe('buyer-marcus@acme-hardware.de');
      expect(inquiry.subject).toBe('Urgent RFQ for Model X1');
      expect(inquiry.quotationNumber).toBe('QT-TEST-20261014-001');
      expect(inquiry.inquiryMessageId).toBe('msg-rfc822-test-001@acme.de');
      expect(inquiry.parseStatus).toBe('parsed');
      expect(inquiry.rawTextHash).toBe(InquiryService.computeTextHash(sampleText));

      // 验证磁盘物理落盘文件
      const tenantInqDir = path.join(process.cwd(), 'data', 'tenants', tenantA, 'inquiries');
      const savedFilePath = path.join(tenantInqDir, `${inquiry.inquiryId}.json`);
      expect(fs.existsSync(savedFilePath)).toBe(true);

      const diskRaw = fs.readFileSync(savedFilePath, 'utf-8');
      const diskObj = JSON.parse(diskRaw);
      expect(diskObj.inquiryId).toBe(inquiry.inquiryId);
      expect(diskObj.tenantId).toBe(tenantA);
      expect(diskObj.rawTextHash).toBe(inquiry.rawTextHash);
    });

    it('通过 inquiryMessageId 与 quotationNumber 能够精确反查询盘', () => {
      const foundByMsg = InquiryService.findInquiryByMessageId(tenantA, 'msg-rfc822-test-001@acme.de');
      expect(foundByMsg).not.toBeNull();
      expect(foundByMsg?.from).toBe('buyer-marcus@acme-hardware.de');

      const foundByQuote = InquiryService.findInquiryByQuotationNumber(tenantA, 'QT-TEST-20261014-001');
      expect(foundByQuote).not.toBeNull();
      expect(foundByQuote?.inquiryId).toBe(foundByMsg?.inquiryId);
    });
  });

  describe('3. D-12 租户物理隔离与防越权校验 (API 与 Service 双重防护)', () => {
    let inqAId: string;
    let inqBId: string;

    beforeAll(() => {
      const inqA = InquiryService.createInquiryFromInbound({
        tenantId: tenantA,
        from: 'buyer-a@client-a.com',
        subject: 'RFQ A from Client A',
        content: 'Content A for Tenant A',
        quotationNumber: 'QT-TENANT-A-01'
      });
      inqAId = inqA.inquiryId;

      const inqB = InquiryService.createInquiryFromInbound({
        tenantId: tenantB,
        from: 'buyer-b@client-b.com',
        subject: 'RFQ B from Client B',
        content: 'Content B for Tenant B',
        quotationNumber: 'QT-TENANT-B-01'
      });
      inqBId = inqB.inquiryId;
    });

    it('Service 层隔离：租户 B 跨租户读取租户 A 的询盘严格返回 null', () => {
      const crossRead = InquiryService.getInquiry(inqAId, tenantB);
      expect(crossRead).toBeNull();
    });

    it('API 层隔离：租户 A 只能查询到本租户名下的询盘列表', async () => {
      const res = await fetch(`${baseUrl}/inquiries`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.tenantId).toBe(tenantA);
      expect(data.inquiries.length).toBeGreaterThanOrEqual(1);

      // 绝不包含租户 B 的询盘
      const ids = data.inquiries.map((i: any) => i.inquiryId);
      expect(ids).toContain(inqAId);
      expect(ids).not.toContain(inqBId);
    });

    it('API 层越权防护：租户 B 尝试获取租户 A 的询盘实体严格返回 404 (防 IDOR 泄露)', async () => {
      const res = await fetch(`${baseUrl}/inquiries/${inqAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain('未找到或无权访问');
    });

    it('API 层合法访问：租户 A 读取本租户询盘实体返回 200', async () => {
      const res = await fetch(`${baseUrl}/inquiries/${inqAId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.inquiry.inquiryId).toBe(inqAId);
      expect(data.inquiry.tenantId).toBe(tenantA);
    });
  });

  describe('4. 严格【只读不写】约束验收', () => {
    it('向 /api/v1/inquiries 发送 POST 请求应返回 404 (Route Not Found)', async () => {
      const res = await fetch(`${baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ inquiryId: 'INQ-FAKE-001' })
      });

      expect(res.status).toBe(404);
    });

    it('向 /api/v1/inquiries/:id 发送 PUT 请求应返回 404 (Route Not Found)', async () => {
      const res = await fetch(`${baseUrl}/inquiries/INQ-FAKE-001`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ parseStatus: 'failed' })
      });

      expect(res.status).toBe(404);
    });

    it('向 /api/v1/inquiries/:id 发送 DELETE 请求应返回 404 (Route Not Found)', async () => {
      const res = await fetch(`${baseUrl}/inquiries/INQ-FAKE-001`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      });

      expect(res.status).toBe(404);
    });
  });
});
