import fs from 'fs';
import path from 'path';
import { ColumnMappingRules, DEFAULT_COLUMN_RULES } from '../adapters/schema-matcher.js';
import { TenantProfile } from '../types/index.js';

export class TenantService {
  private static BASE_DATA_DIR = path.resolve(process.cwd(), 'data');
  private static TENANTS_DIR = path.resolve(process.cwd(), 'data', 'tenants');

  /**
   * 初始化租戶目錄結構
   */
  static init() {
    if (!fs.existsSync(this.BASE_DATA_DIR)) {
      fs.mkdirSync(this.BASE_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.TENANTS_DIR)) {
      fs.mkdirSync(this.TENANTS_DIR, { recursive: true });
    }
  }

  /**
   * 根據發件人郵箱或顯式 tenant_id 歸一化租戶標識
   */
  static resolveTenantId(tenantIdInput?: string, senderEmail?: string): string {
    if (tenantIdInput && typeof tenantIdInput === 'string' && tenantIdInput.trim()) {
      const clean = tenantIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      // 若为 11 位手机号码格式，直接映射到试用租户ID (如 13800000000 -> tenant_trial_13800000000)
      if (/^1[3-9]\d{9}$/.test(clean)) {
        return `tenant_trial_${clean}`;
      }
      return clean;
    }

    if (senderEmail && typeof senderEmail === 'string') {
      const match = senderEmail.match(/@([a-zA-Z0-9.-]+)/);
      if (match && match[1]) {
        const domain = match[1].toLowerCase().split('.')[0];
        // 排除常用公用郵箱域名，若為公用郵箱則使用全郵箱用戶名前綴
        if (['gmail', 'qq', '163', '126', 'foxmail', 'outlook', 'hotmail'].includes(domain)) {
          const userPrefix = senderEmail.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
          return `tenant_${userPrefix.toLowerCase()}`;
        }
        return domain.replace(/[^a-z0-9_-]/g, '_');
      }
    }

    return 'default';
  }

  /**
   * 獲取租戶專屬數據目錄路徑
   */
  static getTenantDir(tenantId: string): string {
    this.init();
    const cleanId = tenantId.replace(/[^a-z0-9_-]/g, '_');
    const tenantDir = path.join(this.TENANTS_DIR, cleanId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    return tenantDir;
  }

  /**
   * 獲取租戶當前生效的底價表路徑
   */
  static getActivePricingPath(tenantId: string): string {
    const tenantDir = this.getTenantDir(tenantId);
    return path.join(tenantDir, 'active_pricing.xlsx');
  }

  /**
   * 檢查租戶是否有生效的底價表
   */
  static hasActivePricing(tenantId: string): boolean {
    const dualSheetPath = path.join(process.cwd(), '商品底价表', '极简出厂底价表_双表.xlsx');
    if (fs.existsSync(dualSheetPath)) return true;

    const p = this.getActivePricingPath(tenantId);
    if (fs.existsSync(p)) return true;
    
    // 如果租戶專屬底價表不存在，檢查全局默認底價表
    const defaultPath = path.join(this.BASE_DATA_DIR, 'active_pricing.xlsx');
    return fs.existsSync(defaultPath);
  }

  /**
   * 獲取租戶生效底價文件內容（優先用戶指定雙表，再回退租戶專屬與默認）
   */
  static getActivePricingBuffer(tenantId: string): { buffer: Buffer; sourcePath: string } | null {
    // 1. 優先檢查用戶指定的雙表底價庫路徑 (F:\order_workflow\商品底价表\极简出厂底价表_双表.xlsx)
    const dualSheetPath = path.join(process.cwd(), '商品底价表', '极简出厂底价表_双表.xlsx');
    if (fs.existsSync(dualSheetPath)) {
      return { buffer: fs.readFileSync(dualSheetPath), sourcePath: dualSheetPath };
    }

    // 2. 檢查租戶專屬獨立底價表
    const tenantPath = this.getActivePricingPath(tenantId);
    if (fs.existsSync(tenantPath)) {
      return { buffer: fs.readFileSync(tenantPath), sourcePath: tenantPath };
    }

    // 3. 檢查全局默認底價表
    const defaultPath = path.join(this.BASE_DATA_DIR, 'active_pricing.xlsx');
    if (fs.existsSync(defaultPath)) {
      return { buffer: fs.readFileSync(defaultPath), sourcePath: defaultPath };
    }

    return null;
  }

  /**
   * 保存租戶底價表並生成歷史備份（原子性操作）
   */
  static saveActivePricing(tenantId: string, fileBuffer: Buffer): { activePath: string; backupPath: string } {
    const tenantDir = this.getTenantDir(tenantId);
    const activePath = path.join(tenantDir, 'active_pricing.xlsx');

    // 保存當前生效版本
    fs.writeFileSync(activePath, fileBuffer);

    // 同時在全局默認位置維護一份（若為默認租戶）
    if (tenantId === 'default') {
      const defaultPath = path.join(this.BASE_DATA_DIR, 'active_pricing.xlsx');
      fs.writeFileSync(defaultPath, fileBuffer);
    }

    // 保存帶時間戳的歷史備份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(tenantDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `pricing_${timestamp}.xlsx`);
    fs.writeFileSync(backupPath, fileBuffer);

    return { activePath, backupPath };
  }

  /**
   * 獲取租戶自定義 Schema 表頭映射規則（如果存在）
   */
  static getTenantCustomRules(tenantId: string): ColumnMappingRules {
    const tenantDir = this.getTenantDir(tenantId);
    const mappingFile = path.join(tenantDir, 'mapping.json');

    if (fs.existsSync(mappingFile)) {
      try {
        const raw = fs.readFileSync(mappingFile, 'utf-8');
        const customRules = JSON.parse(raw);
        // 合併租戶自定義規則與全局默認規則
        const merged: any = { ...DEFAULT_COLUMN_RULES };
        for (const [k, v] of Object.entries(customRules)) {
          if (Array.isArray(v) && merged[k]) {
            merged[k] = [...v, ...merged[k]];
          }
        }
        return merged;
      } catch (err) {
        console.warn(`⚠️ 租戶 [${tenantId}] 自定義 mapping.json 解析失敗，使用默認規則:`, err);
      }
    }

    return DEFAULT_COLUMN_RULES;
  }

  /**
   * 檢查租戶是否到期與數據保留狀態
   */
  static isTenantExpired(tenantId: string): { expired: boolean; expiresAt?: string; dataRetentionUntil?: string } {
    const profile = this.getTenantProfile(tenantId);
    if (!profile.expiresAt) {
      return { expired: false };
    }
    const expiryDate = new Date(profile.expiresAt);
    const now = new Date();
    const isExpired = now > expiryDate;
    return {
      expired: isExpired,
      expiresAt: profile.expiresAt,
      dataRetentionUntil: profile.dataRetentionUntil
    };
  }

  /**
   * 獲取租戶完整配置檔案 (Profile)
   */
  static getTenantProfile(tenantId: string): TenantProfile {
    const cleanId = this.resolveTenantId(tenantId);
    const tenantDir = this.getTenantDir(cleanId);
    const profilePath = path.join(tenantDir, 'profile.json');
    const tenantProfilePath = path.join(tenantDir, 'tenant.profile.json');
    const targetFile = fs.existsSync(tenantProfilePath) ? tenantProfilePath : profilePath;

    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        return JSON.parse(raw) as TenantProfile;
      } catch (e) {
        console.warn(`⚠️ 讀取租戶 [${cleanId}] profile 失敗，使用默認配置:`, e);
      }
    }

    // 針對不同租戶的默認配置種子數據
    const defaultProfiles: Record<string, Partial<TenantProfile>> = {
      default: {
        companyName: 'KelvinFlow Global Technology Co., Ltd.',
        companySubtitle: 'AI-Powered International Trade & Smart Supply Chain Systems',
        companyAddress: 'International High-Tech Innovation Center, Foshan, Guangdong, China (528000)',
        contactEmail: 'sales@kelvinflow.com',
        contactPhone: '+86-757-8888-9999',
        website: 'www.kelvinflow.com',
        hideCostFromSales: true,
        defaultProfitMargin: 0.30,
        defaultCurrency: 'USD',
        apiKeys: ['key_default_admin_2026']
      },
      tenant_alpha: {
        companyName: 'Alpha Global Hardware & Fasteners Ltd.',
        companySubtitle: 'Heavy Industrial Fasteners & Precision Metal Solutions',
        companyAddress: 'Building 5, International High-Tech Industrial Zone, Shenzhen, China (518000)',
        contactEmail: 'orders@alpha-export.com',
        contactPhone: '+86-755-8888-6666',
        website: 'www.alpha-export.com',
        hideCostFromSales: true,
        defaultProfitMargin: 0.25,
        defaultCurrency: 'USD',
        apiKeys: ['key_alpha_admin_2026']
      },
      tenant_beta: {
        companyName: 'Beta Consumer Electronics (HK) Co., Limited',
        companySubtitle: 'Smart Home & Audio Innovation Worldwide',
        companyAddress: 'Unit 16, 22/F, Millennium Trade Tower, Kowloon, Hong Kong',
        contactEmail: 'sales@beta-global.com',
        contactPhone: '+852-3112-9988',
        website: 'www.beta-global.com',
        hideCostFromSales: true,
        defaultProfitMargin: 0.35,
        defaultCurrency: 'EUR',
        apiKeys: ['key_beta_admin_2026']
      }
    };

    const preset = defaultProfiles[cleanId] || {
      companyName: `${cleanId.toUpperCase()} Trading Co., Ltd.`,
      companySubtitle: 'Professional International B2B Solutions',
      companyAddress: 'Global Trade Center, Export Logistics Park',
      contactEmail: `sales@${cleanId}.com`,
      contactPhone: '+86-000-0000-0000',
      website: `www.${cleanId}.com`,
      hideCostFromSales: true,
      defaultProfitMargin: 0.30,
      defaultCurrency: 'USD',
      apiKeys: [`key_${cleanId}_admin_2026`]
    };

    const profile: TenantProfile = {
      tenantId: cleanId,
      companyName: preset.companyName || `${cleanId.toUpperCase()} Co., Ltd.`,
      companySubtitle: preset.companySubtitle,
      companyAddress: preset.companyAddress,
      contactEmail: preset.contactEmail,
      contactPhone: preset.contactPhone,
      website: preset.website,
      hideCostFromSales: preset.hideCostFromSales ?? true,
      defaultProfitMargin: preset.defaultProfitMargin ?? 0.30,
      defaultCurrency: preset.defaultCurrency ?? 'USD',
      apiKeys: preset.apiKeys || [`key_${cleanId}_admin_2026`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 自動保存種子配置
    try {
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`⚠️ 無法寫入租戶種子 profile.json:`, err);
    }

    return profile;
  }

  /**
   * 更新租戶配置
   */
  static updateTenantProfile(tenantId: string, profileUpdate: Partial<TenantProfile>): TenantProfile {
    const current = this.getTenantProfile(tenantId);
    const updated: TenantProfile = {
      ...current,
      ...profileUpdate,
      tenantId: current.tenantId, // 禁止篡改 tenantId
      updatedAt: new Date().toISOString()
    };

    const tenantDir = this.getTenantDir(current.tenantId);
    const profilePath = path.join(tenantDir, 'profile.json');
    fs.writeFileSync(profilePath, JSON.stringify(updated, null, 2), 'utf-8');

    return updated;
  }

  /**
   * 獲取所有已註冊租戶列表
   */
  static listAllTenants(): TenantProfile[] {
    this.init();
    if (!fs.existsSync(this.TENANTS_DIR)) return [];
    const entries = fs.readdirSync(this.TENANTS_DIR, { withFileTypes: true });
    const tenants: TenantProfile[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const profile = this.getTenantProfile(entry.name);
          tenants.push(profile);
        } catch (e) {
          // 忽略損壞目錄
        }
      }
    }
    return tenants;
  }

  /**
   * 獲取租戶自定義 Logo 本地文件路徑（若不存在則返回 null）
   */
  static getTenantLogoPath(tenantId: string): string | null {
    const cleanId = this.resolveTenantId(tenantId);
    const profile = this.getTenantProfile(cleanId);
    if (profile.logoPath && fs.existsSync(profile.logoPath)) {
      return profile.logoPath;
    }

    // 檢查常見上傳位置
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    for (const ext of extensions) {
      const candidate = path.join(uploadsDir, `${cleanId}${ext}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // 若租户未上传自定义 Logo，则无缝 fallback 到内置 KelvinFlow 官方透明 Logo
    const defaultLogo = path.join(process.cwd(), 'public', 'kelvinflow_logo_transparent.png');
    if (fs.existsSync(defaultLogo)) {
      return defaultLogo;
    }

    return null;
  }

  /**
   * 獲取租戶自定義 Logo 的前端訪問 URL
   */
  static getTenantLogoUrl(tenantId: string): string | null {
    const cleanId = this.resolveTenantId(tenantId);
    const profile = this.getTenantProfile(cleanId);
    if (profile.logoUrl) {
      const localPath = path.join(process.cwd(), 'public', profile.logoUrl.replace(/^\//, ''));
      if (fs.existsSync(localPath)) return profile.logoUrl;
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    for (const ext of extensions) {
      const candidate = path.join(uploadsDir, `${cleanId}${ext}`);
      if (fs.existsSync(candidate)) {
        return `/uploads/logos/${cleanId}${ext}`;
      }
    }

    // 若租户未上传自定义 Logo，则无缝 fallback 到内置 KelvinFlow 官方透明 Logo URL
    const defaultLogo = path.join(process.cwd(), 'public', 'kelvinflow_logo_transparent.png');
    if (fs.existsSync(defaultLogo)) {
      return '/kelvinflow_logo_transparent.png';
    }

    return null;
  }

  /**
   * 保存租戶自定義 Logo
   */
  static saveTenantLogo(tenantId: string, fileBuffer: Buffer, originalName = 'logo.png'): { logoUrl: string; logoPath: string } {
    const cleanId = this.resolveTenantId(tenantId);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const rawExt = path.extname(originalName).toLowerCase();
    const ext = ['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(rawExt) ? rawExt : '.png';
    const filename = `${cleanId}${ext}`;
    const targetPath = path.join(uploadsDir, filename);

    fs.writeFileSync(targetPath, fileBuffer);
    const logoUrl = `/uploads/logos/${filename}`;

    this.updateTenantProfile(cleanId, {
      logoUrl,
      logoPath: targetPath
    });

    return { logoUrl, logoPath: targetPath };
  }

  /**
   * 刪除或重置租戶自定義 Logo
   */
  static deleteTenantLogo(tenantId: string): boolean {
    const cleanId = this.resolveTenantId(tenantId);
    const logoPath = this.getTenantLogoPath(cleanId);
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        fs.unlinkSync(logoPath);
      } catch (e) {
        console.warn('Failed to delete logo file:', e);
      }
    }
    this.updateTenantProfile(cleanId, {
      logoUrl: undefined,
      logoPath: undefined
    });
    return true;
  }
}
