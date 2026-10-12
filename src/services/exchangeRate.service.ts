import fs from 'fs';
import path from 'path';

export interface CurrencyRateInfo {
  currency: string;
  name: string;
  symbol: string;
  buyingRate: number;   // 银行现汇买入价 (外贸结汇基准)
  sellingRate: number;  // 银行现汇卖出价 (购汇参考)
  midRate: number;      // 市场中间价
  date: string;         // 报价日期
  time: string;         // 报价时间
}

export interface LiveRatesResult {
  success: boolean;
  source: 'sina_finance' | 'open_er_api' | 'local_cache';
  updatedAt: string;
  rates: Record<string, CurrencyRateInfo>;
}

const CURRENCY_META: Record<string, { name: string; symbol: string }> = {
  USD: { name: '美元', symbol: '$' },
  EUR: { name: '欧元', symbol: '€' },
  GBP: { name: '英镑', symbol: '£' },
  AUD: { name: '澳元', symbol: 'A$' },
  CAD: { name: '加元', symbol: 'C$' },
  JPY: { name: '日元', symbol: '¥' },
  HKD: { name: '港币', symbol: 'HK$' },
};

const DEFAULT_FALLBACK_RATES: Record<string, CurrencyRateInfo> = {
  USD: { currency: 'USD', name: '美元', symbol: '$', buyingRate: 7.2000, sellingRate: 7.2400, midRate: 7.2200, date: '2026-10-10', time: '00:00:00' },
  EUR: { currency: 'EUR', name: '欧元', symbol: '€', buyingRate: 7.8200, sellingRate: 7.8800, midRate: 7.8500, date: '2026-10-10', time: '00:00:00' },
  GBP: { currency: 'GBP', name: '英镑', symbol: '£', buyingRate: 9.0800, sellingRate: 9.1600, midRate: 9.1200, date: '2026-10-10', time: '00:00:00' },
  AUD: { currency: 'AUD', name: '澳元', symbol: 'A$', buyingRate: 4.7500, sellingRate: 4.8100, midRate: 4.7800, date: '2026-10-10', time: '00:00:00' },
  CAD: { currency: 'CAD', name: '加元', symbol: 'C$', buyingRate: 5.2500, sellingRate: 5.3100, midRate: 5.2800, date: '2026-10-10', time: '00:00:00' },
  JPY: { currency: 'JPY', name: '日元', symbol: '¥', buyingRate: 0.0465, sellingRate: 0.0475, midRate: 0.0470, date: '2026-10-10', time: '00:00:00' },
  HKD: { currency: 'HKD', name: '港币', symbol: 'HK$', buyingRate: 0.9200, sellingRate: 0.9260, midRate: 0.9230, date: '2026-10-10', time: '00:00:00' },
};

export class ExchangeRateService {
  private static inMemoryCache: LiveRatesResult | null = null;
  private static inMemoryCachedAt: number = 0;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟动态高敏缓存 (288次/天，兼顾极高行情敏锐度与零风控)
  private static readonly DISK_CACHE_PATH = path.join(process.cwd(), 'data', 'exchange_rates_cache.json');

  /**
   * 获取实时结算汇率 (三级高可用保底: Sina Finance -> Open Exchange Rates -> 本地持久化缓存/基准常数)
   */
  static async getLatestRates(forceRefresh: boolean = false): Promise<LiveRatesResult> {
    const now = Date.now();

    // 1. 优先内存缓存 (未过期且非强制刷新)
    if (!forceRefresh && this.inMemoryCache && (now - this.inMemoryCachedAt < this.CACHE_TTL_MS)) {
      return this.inMemoryCache;
    }

    // 2. 尝试从新浪财经抓取第一手实时银行结汇牌价 (Tier 1)
    try {
      const sinaRates = await this.fetchSinaRates();
      if (sinaRates && Object.keys(sinaRates).length >= 5) {
        const result: LiveRatesResult = {
          success: true,
          source: 'sina_finance',
          updatedAt: new Date().toISOString(),
          rates: sinaRates
        };
        this.updateCache(result);
        return result;
      }
    } catch (err: any) {
      console.warn('[ExchangeRateService] Sina Finance rate fetch failed, falling back to secondary tier:', err?.message || err);
    }

    // 3. 降级备用：Open Exchange Rates (Tier 2)
    try {
      const openRates = await this.fetchOpenErRates();
      if (openRates && Object.keys(openRates).length >= 5) {
        const result: LiveRatesResult = {
          success: true,
          source: 'open_er_api',
          updatedAt: new Date().toISOString(),
          rates: openRates
        };
        this.updateCache(result);
        return result;
      }
    } catch (err: any) {
      console.warn('[ExchangeRateService] Open ER API rate fetch failed, falling back to disk cache/constants:', err?.message || err);
    }

    // 4. 降级备用：本地磁盘持久化缓存 (Tier 3a)
    const diskCache = this.readDiskCache();
    if (diskCache && Object.keys(diskCache.rates).length > 0) {
      this.inMemoryCache = diskCache;
      this.inMemoryCachedAt = now;
      return diskCache;
    }

    // 5. 最终托底：内置常数 (Tier 3b)
    const fallbackResult: LiveRatesResult = {
      success: true,
      source: 'local_cache',
      updatedAt: new Date().toISOString(),
      rates: { ...DEFAULT_FALLBACK_RATES }
    };
    this.inMemoryCache = fallbackResult;
    this.inMemoryCachedAt = now;
    return fallbackResult;
  }

  /**
   * 获取指定币种的结汇参考汇率信息
   */
  static async getRateForCurrency(currency: string): Promise<CurrencyRateInfo | null> {
    const code = (currency || 'USD').toUpperCase().trim();
    const all = await this.getLatestRates();
    return all.rates[code] || null;
  }

  /**
   * Tier 1: 新浪财经实时行情源 (Sina Finance)
   */
  private static async fetchSinaRates(): Promise<Record<string, CurrencyRateInfo> | null> {
    const listCodes = 'fx_susdcny,fx_seurcny,fx_sgbpcny,fx_saudcny,fx_scadcny,fx_shkdcny,fx_sjpycny';
    const url = `https://hq.sinajs.cn/list=${listCodes}`;

    const res = await fetch(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) {
      throw new Error(`Sina HTTP response ${res.status}`);
    }

    const text = await res.text();
    const regex = /var hq_str_fx_s([a-zA-Z]+)cny="([^"]+)"/g;
    const rates: Record<string, CurrencyRateInfo> = {};
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const currency = match[1].toUpperCase();
      const parts = match[2].split(',');
      if (parts.length >= 4) {
        const rawTime = parts[0] || '';
        const rawDate = parts[parts.length - 1] || '';
        const { date: dateStr, time: timeStr } = this.formatChinaTime(rawTime, rawDate);
        const buyingRateRaw = parseFloat(parts[1]) || 0;
        const sellingRateRaw = parseFloat(parts[2]) || 0;
        const midRateRaw = parseFloat(parts[3]) || 0;

        // 稳健校验：买入价必须为正数
        const buyingRate = buyingRateRaw > 0 ? Number(buyingRateRaw.toFixed(4)) : Number(midRateRaw.toFixed(4));
        const sellingRate = sellingRateRaw > 0 ? Number(sellingRateRaw.toFixed(4)) : Number((buyingRate * 1.004).toFixed(4));
        const midRate = midRateRaw > 0 ? Number(midRateRaw.toFixed(4)) : Number(((buyingRate + sellingRate) / 2).toFixed(4));

        if (buyingRate > 0) {
          const meta = CURRENCY_META[currency] || { name: currency, symbol: '$' };
          rates[currency] = {
            currency,
            name: meta.name,
            symbol: meta.symbol,
            buyingRate,
            sellingRate,
            midRate,
            date: dateStr,
            time: timeStr
          };
        }
      }
    }

    return Object.keys(rates).length > 0 ? rates : null;
  }

  /**
   * 格式化行情时间 (新浪财经接口返回的时间原生即为中国北京时间 Asia/Shanghai, UTC+8)
   */
  private static formatChinaTime(rawTime?: string, rawDate?: string): { date: string; time: string } {
    const now = new Date();
    const defaultDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const defaultTime = now.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

    const cleanDate = (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim()))
      ? rawDate.trim()
      : defaultDate;

    if (!rawTime || !rawTime.includes(':')) {
      return { date: cleanDate, time: defaultTime };
    }

    const trimmedTime = rawTime.trim();
    const match = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      const s = match[3] || '00';
      return { date: cleanDate, time: `${h}:${m}:${s}` };
    }

    return { date: cleanDate, time: defaultTime };
  }

  /**
   * Tier 2: Open Exchange Rates 备用源
   */
  private static async fetchOpenErRates(): Promise<Record<string, CurrencyRateInfo> | null> {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) {
      throw new Error(`Open ER API HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    if (!json?.rates?.CNY) {
      throw new Error('Invalid Open ER API response schema');
    }

    const cnyRate = Number(json.rates.CNY);
    const { date: currentDate, time: currentTime } = this.formatChinaTime();
    const rates: Record<string, CurrencyRateInfo> = {};

    // 估算银行现汇买入价（结汇买入价通常比市场中间价贴现约 0.3%~0.4%）
    const WIRE_BUY_FACTOR = 0.9965;
    const WIRE_SELL_FACTOR = 1.0035;

    for (const [curr, meta] of Object.entries(CURRENCY_META)) {
      let mid = 0;
      if (curr === 'USD') {
        mid = cnyRate;
      } else if (json.rates[curr] && Number(json.rates[curr]) > 0) {
        mid = cnyRate / Number(json.rates[curr]);
      }

      if (mid > 0) {
        rates[curr] = {
          currency: curr,
          name: meta.name,
          symbol: meta.symbol,
          buyingRate: Number((mid * WIRE_BUY_FACTOR).toFixed(4)),
          sellingRate: Number((mid * WIRE_SELL_FACTOR).toFixed(4)),
          midRate: Number(mid.toFixed(4)),
          date: currentDate,
          time: currentTime
        };
      }
    }

    return Object.keys(rates).length > 0 ? rates : null;
  }

  private static updateCache(result: LiveRatesResult): void {
    this.inMemoryCache = result;
    this.inMemoryCachedAt = Date.now();
    this.saveDiskCache(result);
  }

  private static readDiskCache(): LiveRatesResult | null {
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        const raw = fs.readFileSync(this.DISK_CACHE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.rates) {
          return {
            ...parsed,
            source: 'local_cache'
          };
        }
      }
    } catch (err: any) {
      console.warn('[ExchangeRateService] Failed to read disk cache:', err?.message || err);
    }
    return null;
  }

  private static saveDiskCache(result: LiveRatesResult): void {
    try {
      const dir = path.dirname(this.DISK_CACHE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.DISK_CACHE_PATH, JSON.stringify(result, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[ExchangeRateService] Failed to save disk cache:', err?.message || err);
    }
  }
}
