import fs from 'fs';
import path from 'path';
import { QuotationResult } from '../types/index.js';
import { TenantService } from './tenant.service.js';

export class QuoteStoreService {
  private static legacyStorageDir = path.join(process.cwd(), 'data', 'quotes');

  /**
   * 獲取指定租戶專屬的報價單目錄
   */
  private static getTenantQuotesDir(tenantId: string): string {
    const cleanId = TenantService.resolveTenantId(tenantId);
    const tenantDir = TenantService.getTenantDir(cleanId);
    const quotesDir = path.join(tenantDir, 'quotes');
    if (!fs.existsSync(quotesDir)) {
      fs.mkdirSync(quotesDir, { recursive: true });
    }
    return quotesDir;
  }

  private static ensureLegacyDir() {
    if (!fs.existsSync(this.legacyStorageDir)) {
      fs.mkdirSync(this.legacyStorageDir, { recursive: true });
    }
  }

  /**
   * 保存報價單數據與生成的 PDF (支持租戶物理隔離)
   */
  static saveQuote(quotation: QuotationResult, pdfBuffer?: Buffer, explicitTenantId?: string): void {
    const tenantId = TenantService.resolveTenantId(explicitTenantId || quotation.tenantId || 'default');
    quotation.tenantId = tenantId;

    const id = quotation.quotationNumber;
    const tenantQuotesDir = this.getTenantQuotesDir(tenantId);
    const jsonPath = path.join(tenantQuotesDir, `${id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(quotation, null, 2), 'utf-8');

    if (pdfBuffer) {
      const pdfPath = path.join(tenantQuotesDir, `${id}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);
    }

    // 若為默認租戶，同步向後兼容維護一份 legacy 文件
    if (tenantId === 'default') {
      this.ensureLegacyDir();
      const legacyJson = path.join(this.legacyStorageDir, `${id}.json`);
      fs.writeFileSync(legacyJson, JSON.stringify(quotation, null, 2), 'utf-8');
      if (pdfBuffer) {
        const legacyPdf = path.join(this.legacyStorageDir, `${id}.pdf`);
        fs.writeFileSync(legacyPdf, pdfBuffer);
      }
    }
  }

  /**
   * 獲取指定的報價單數據 (嚴格校驗租戶隔離權限)
   */
  static getQuote(id: string, requestTenantId?: string): QuotationResult | null {
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. 如果指定了租戶，優先從該租戶目錄讀取
    if (requestTenantId) {
      const tenantId = TenantService.resolveTenantId(requestTenantId);
      const tenantQuotesDir = this.getTenantQuotesDir(tenantId);
      const jsonPath = path.join(tenantQuotesDir, `${cleanId}.json`);

      if (fs.existsSync(jsonPath)) {
        try {
          const raw = fs.readFileSync(jsonPath, 'utf-8');
          const quote = JSON.parse(raw) as QuotationResult;
          // 雙重校驗租戶標識
          if (!quote.tenantId || quote.tenantId === tenantId) {
            quote.tenantId = tenantId;
            return quote;
          }
        } catch (e) {
          console.error(`讀取租戶 [${tenantId}] 報價單 [${cleanId}] 失敗:`, e);
          return null;
        }
      }

      // 若為 default 租戶，平滑回退讀取 legacy 根目錄
      if (tenantId === 'default') {
        const legacyJson = path.join(this.legacyStorageDir, `${cleanId}.json`);
        if (fs.existsSync(legacyJson)) {
          try {
            const raw = fs.readFileSync(legacyJson, 'utf-8');
            const quote = JSON.parse(raw) as QuotationResult;
            quote.tenantId = 'default';
            return quote;
          } catch {}
        }
      }

      // 指定了租戶但該租戶名下未找到，直接返回 null，嚴禁越權跨租戶窺探
      return null;
    }

    // 2. 未指定租戶時 (兼容老接口)，全局搜索
    const legacyJson = path.join(this.legacyStorageDir, `${cleanId}.json`);
    if (fs.existsSync(legacyJson)) {
      try {
        const raw = fs.readFileSync(legacyJson, 'utf-8');
        return JSON.parse(raw) as QuotationResult;
      } catch {}
    }

    // 遍歷所有已知租戶目錄
    const tenantsDir = path.join(process.cwd(), 'data', 'tenants');
    if (fs.existsSync(tenantsDir)) {
      const tenantFolders = fs.readdirSync(tenantsDir);
      for (const tFolder of tenantFolders) {
        const p = path.join(tenantsDir, tFolder, 'quotes', `${cleanId}.json`);
        if (fs.existsSync(p)) {
          try {
            const raw = fs.readFileSync(p, 'utf-8');
            return JSON.parse(raw) as QuotationResult;
          } catch {}
        }
      }
    }

    return null;
  }

  /**
   * 獲取指定的 PDF 緩存 (嚴格校驗租戶隔離權限)
   */
  static getQuotePDF(id: string, requestTenantId?: string): Buffer | null {
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');

    if (requestTenantId) {
      const tenantId = TenantService.resolveTenantId(requestTenantId);
      const tenantQuotesDir = this.getTenantQuotesDir(tenantId);
      const pdfPath = path.join(tenantQuotesDir, `${cleanId}.pdf`);

      if (fs.existsSync(pdfPath)) {
        return fs.readFileSync(pdfPath);
      }

      if (tenantId === 'default') {
        const legacyPdf = path.join(this.legacyStorageDir, `${cleanId}.pdf`);
        if (fs.existsSync(legacyPdf)) {
          return fs.readFileSync(legacyPdf);
        }
      }

      return null;
    }

    // 未指定租戶的兜底
    const legacyPdf = path.join(this.legacyStorageDir, `${cleanId}.pdf`);
    if (fs.existsSync(legacyPdf)) {
      return fs.readFileSync(legacyPdf);
    }

    const tenantsDir = path.join(process.cwd(), 'data', 'tenants');
    if (fs.existsSync(tenantsDir)) {
      const tenantFolders = fs.readdirSync(tenantsDir);
      for (const tFolder of tenantFolders) {
        const p = path.join(tenantsDir, tFolder, 'quotes', `${cleanId}.pdf`);
        if (fs.existsSync(p)) {
          return fs.readFileSync(p);
        }
      }
    }

    return null;
  }

  /**
   * 更新報價單數據
   */
  static updateQuote(
    id: string,
    updatedQuotation: QuotationResult,
    newPdfBuffer?: Buffer,
    requestTenantId?: string
  ): boolean {
    const tenantId = TenantService.resolveTenantId(
      requestTenantId || updatedQuotation.tenantId || 'default'
    );
    updatedQuotation.tenantId = tenantId;

    const tenantQuotesDir = this.getTenantQuotesDir(tenantId);
    const jsonPath = path.join(tenantQuotesDir, `${id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(updatedQuotation, null, 2), 'utf-8');

    if (newPdfBuffer) {
      const pdfPath = path.join(tenantQuotesDir, `${id}.pdf`);
      fs.writeFileSync(pdfPath, newPdfBuffer);
    }

    // 同步更新 default 租戶的 legacy
    if (tenantId === 'default') {
      this.ensureLegacyDir();
      const legacyJson = path.join(this.legacyStorageDir, `${id}.json`);
      fs.writeFileSync(legacyJson, JSON.stringify(updatedQuotation, null, 2), 'utf-8');
      if (newPdfBuffer) {
        const legacyPdf = path.join(this.legacyStorageDir, `${id}.pdf`);
        fs.writeFileSync(legacyPdf, newPdfBuffer);
      }
    }

    return true;
  }

  /**
   * 列出指定租戶的所有歷史報價單列表
   */
  static listQuotes(tenantId: string): QuotationResult[] {
    const cleanTenantId = TenantService.resolveTenantId(tenantId);
    const tenantQuotesDir = this.getTenantQuotesDir(cleanTenantId);
    const results: QuotationResult[] = [];

    if (fs.existsSync(tenantQuotesDir)) {
      const files = fs.readdirSync(tenantQuotesDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(tenantQuotesDir, f), 'utf-8');
          const q = JSON.parse(raw) as QuotationResult;
          results.push(q);
        } catch {}
      }
    }

    // 若為默認租戶且 legacy 目錄存在其他文件，合併去重
    if (cleanTenantId === 'default' && fs.existsSync(this.legacyStorageDir)) {
      const legacyFiles = fs.readdirSync(this.legacyStorageDir).filter(f => f.endsWith('.json'));
      for (const f of legacyFiles) {
        try {
          const raw = fs.readFileSync(path.join(this.legacyStorageDir, f), 'utf-8');
          const q = JSON.parse(raw) as QuotationResult;
          if (!results.some(existing => existing.quotationNumber === q.quotationNumber)) {
            q.tenantId = 'default';
            results.push(q);
          }
        } catch {}
      }
    }

    // 按處理時間倒序排列
    return results.sort((a, b) => {
      const timeA = new Date(a.processedAt || 0).getTime();
      const timeB = new Date(b.processedAt || 0).getTime();
      return timeB - timeA;
    });
  }
}
