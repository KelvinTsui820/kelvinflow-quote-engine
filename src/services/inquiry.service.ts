import fs from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { InquiryRecord } from '../types/index.js';
import { TenantService } from './tenant.service.js';

export class InquiryService {
  /**
   * 获取指定租户专属的询盘存储目录 (data/tenants/<tenantId>/inquiries)
   */
  private static getTenantInquiriesDir(tenantId: string): string {
    const cleanId = TenantService.resolveTenantId(tenantId);
    const tenantDir = TenantService.getTenantDir(cleanId);
    const inquiriesDir = path.join(tenantDir, 'inquiries');
    if (!fs.existsSync(inquiriesDir)) {
      fs.mkdirSync(inquiriesDir, { recursive: true });
    }
    return inquiriesDir;
  }

  /**
   * 生成规范且唯一的询盘编号 (如 INQ-20261014-a1b2)
   */
  static generateInquiryId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = randomBytes(2).toString('hex').toLowerCase();
    return `INQ-${dateStr}-${randomHex}`;
  }

  /**
   * 计算正文/原始文本的 SHA-256 Hash
   */
  static computeTextHash(text: string): string {
    return createHash('sha256').update(text || '').digest('hex');
  }

  /**
   * 持久化询盘实体至租户隔离目录 (落盘为 INQ-*.json，严格 D-12 单一真实数据源)
   */
  static saveInquiry(inquiry: InquiryRecord): InquiryRecord {
    const cleanTenantId = TenantService.resolveTenantId(inquiry.tenantId || 'default');
    inquiry.tenantId = cleanTenantId;

    if (!inquiry.inquiryId) {
      inquiry.inquiryId = this.generateInquiryId();
    }
    if (!inquiry.receivedAt) {
      inquiry.receivedAt = new Date().toISOString();
    }
    if (!inquiry.createdAt) {
      inquiry.createdAt = new Date().toISOString();
    }
    inquiry.updatedAt = new Date().toISOString();

    const inquiriesDir = this.getTenantInquiriesDir(cleanTenantId);
    const filePath = path.join(inquiriesDir, `${inquiry.inquiryId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(inquiry, null, 2), 'utf-8');

    return inquiry;
  }

  /**
   * 获取单笔询盘实体 (严格执行 D-12 租户物理隔离校验)
   */
  static getInquiry(inquiryId: string, requestTenantId?: string): InquiryRecord | null {
    if (!inquiryId || typeof inquiryId !== 'string') return null;
    const cleanId = inquiryId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) return null;

    if (requestTenantId) {
      const cleanTenantId = TenantService.resolveTenantId(requestTenantId);
      const inquiriesDir = this.getTenantInquiriesDir(cleanTenantId);
      const filePath = path.join(inquiriesDir, `${cleanId}.json`);

      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const record = JSON.parse(raw) as InquiryRecord;
          if (!record.tenantId || record.tenantId === cleanTenantId) {
            record.tenantId = cleanTenantId;
            return record;
          }
        } catch (e) {
          console.error(`读取租户 [${cleanTenantId}] 询盘 [${cleanId}] 失败:`, e);
          return null;
        }
      }

      // 跨租户越权访问直接返回 null，杜绝 IDOR
      return null;
    }

    return null;
  }

  /**
   * 获取指定租户的名下全部询盘实体列表 (按入站时间倒序排列，纯只读)
   */
  static listInquiries(requestTenantId: string): InquiryRecord[] {
    const cleanTenantId = TenantService.resolveTenantId(requestTenantId || 'default');
    const inquiriesDir = this.getTenantInquiriesDir(cleanTenantId);

    const results: InquiryRecord[] = [];
    if (fs.existsSync(inquiriesDir)) {
      try {
        const files = fs.readdirSync(inquiriesDir).filter(f => f.endsWith('.json') && f.startsWith('INQ-'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(inquiriesDir, file), 'utf-8');
            const record = JSON.parse(raw) as InquiryRecord;
            if (!record.tenantId || record.tenantId === cleanTenantId) {
              record.tenantId = cleanTenantId;
              results.push(record);
            }
          } catch {}
        }
      } catch (err: any) {
        console.warn(`读取租户 [${cleanTenantId}] 询盘目录异常:`, err.message);
      }
    }

    // 按 receivedAt 降序排列 (最新在前)
    results.sort((a, b) => {
      const timeA = new Date(a.receivedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.receivedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return results;
  }

  /**
   * 清理指定租户的询盘数据 (供测试或注销重置时使用)
   */
  static cleanupTenantInquiries(tenantId: string): void {
    const cleanTenantId = TenantService.resolveTenantId(tenantId || 'default');
    const tenantDir = TenantService.getTenantDir(cleanTenantId);
    const inquiriesDir = path.join(tenantDir, 'inquiries');
    if (fs.existsSync(inquiriesDir)) {
      try {
        fs.rmSync(inquiriesDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * 根据原始 Message-ID 查找询盘 (用于幂等去重与跨协议关联)
   */
  static findInquiryByMessageId(tenantId: string, messageId: string): InquiryRecord | null {
    if (!messageId) return null;
    const cleanMsgId = messageId.replace(/[<>]/g, '').trim().toLowerCase();
    const list = this.listInquiries(tenantId);
    return list.find(inq => (inq.inquiryMessageId || '').replace(/[<>]/g, '').trim().toLowerCase() === cleanMsgId) || null;
  }

  /**
   * 根据生成的报价单号查找询盘
   */
  static findInquiryByQuotationNumber(tenantId: string, quotationNumber: string): InquiryRecord | null {
    if (!quotationNumber) return null;
    const cleanQ = quotationNumber.trim().toUpperCase();
    const list = this.listInquiries(tenantId);
    return list.find(inq => (inq.quotationNumber || '').trim().toUpperCase() === cleanQ) || null;
  }

  /**
   * 从入站载荷快捷构建并持久化询盘实体
   */
  static createInquiryFromInbound(params: {
    tenantId: string;
    from: string;
    to?: string;
    subject: string;
    content: string;
    quotationNumber?: string;
    inquiryMessageId?: string;
    parseStatus?: 'parsed' | 'pending' | 'failed';
    buyerName?: string;
    itemsSummary?: Array<{ sku: string; description?: string; quantity?: number; unit?: string }>;
    attachments?: Array<{ filename: string; contentType?: string; size?: number }>;
    manualProcessingReason?: string;
  }): InquiryRecord {
    const rawHash = this.computeTextHash(params.content);
    const inquiry: InquiryRecord = {
      inquiryId: this.generateInquiryId(),
      tenantId: params.tenantId,
      receivedAt: new Date().toISOString(),
      from: params.from || 'anonymous@inquiry.com',
      to: params.to,
      subject: params.subject || 'RFQ Inquiry',
      rawTextHash: rawHash,
      content: params.content,
      parseStatus: params.parseStatus || 'parsed',
      quotationNumber: params.quotationNumber,
      inquiryMessageId: params.inquiryMessageId,
      buyerName: params.buyerName,
      itemsSummary: params.itemsSummary,
      attachments: params.attachments,
      manualProcessingReason: params.manualProcessingReason
    };

    return this.saveInquiry(inquiry);
  }
}
