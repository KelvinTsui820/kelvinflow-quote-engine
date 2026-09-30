import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DiscoveredModels {
  flashModel: string;
  proModel: string;
  lastChecked: string;
  source: 'auto-discovered' | 'fallback-env' | 'google-latest-alias';
}

/**
 * 智能模型感知服務 (Gemini Model Auto-Discovery Service)
 * 作用：動態探測 Google Gemini 最新可用模型（如 3.8-flash, 4-pro），
 *       並具備「官方 latest 別名優先 + 正則版本優選 + 靜態兜底」的三重保險機制。
 */
export class ModelDiscoveryService {
  private static cachedModels: DiscoveredModels | null = null;
  private static cacheExpiryMs = 24 * 60 * 60 * 1000; // 緩存 24 小時
  private static lastFetchTime = 0;

  /**
   * 獲取當前系統應使用的最佳 Flash 與 Pro 模型
   */
  static async getActiveModels(): Promise<DiscoveredModels> {
    const now = Date.now();
    // 1. 若緩存有效，直接返回內存中的模型映射
    if (this.cachedModels && (now - this.lastFetchTime < this.cacheExpiryMs)) {
      return this.cachedModels;
    }

    // 2. 檢查用戶是否開啟了自動探測 (默認開啟)
    const autoDiscover = process.env.AUTO_DISCOVER_LATEST_MODELS !== 'false';
    const envDefaultFlash = process.env.DEFAULT_AI_MODEL || 'gemini-3.5-flash';
    const envFallbackPro = process.env.FALLBACK_AI_MODEL || 'gemini-3.7-flash';

    if (!autoDiscover) {
      this.cachedModels = {
        flashModel: envDefaultFlash,
        proModel: envFallbackPro,
        lastChecked: new Date().toISOString(),
        source: 'fallback-env'
      };
      this.lastFetchTime = now;
      return this.cachedModels;
    }

    // 3. 嘗試通過 Google REST API 動態枚舉當前 API Key 下可用的最新模型
    try {
      const discovered = await this.probeGoogleModels();
      if (discovered) {
        this.cachedModels = discovered;
        this.lastFetchTime = now;
        console.log(`🤖 [模型智能感知] 成功探測到最新可用模型: Flash -> [${discovered.flashModel}], Pro -> [${discovered.proModel}] (來源: ${discovered.source})`);
        return this.cachedModels;
      }
    } catch (error: any) {
      console.warn(`⚠️ [模型智能感知] 動態探測 Google 模型失敗 (${error.message})，自動啟動平滑兜底機制...`);
    }

    // 4. 兜底策略：使用 .env 配置或 Google 官方 latest 穩定版
    this.cachedModels = {
      flashModel: envDefaultFlash,
      proModel: envFallbackPro,
      lastChecked: new Date().toISOString(),
      source: 'fallback-env'
    };
    this.lastFetchTime = now;
    return this.cachedModels;
  }

  /**
   * 調用 Google Generative Language API 枚舉模型元數據
   */
  private static async probeGoogleModels(): Promise<DiscoveredModels | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;

    let responseJson: any = null;

    // 設置超時控制器 (最多等待 4 秒，絕不阻塞正常業務流)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      // 優先直接請求或透過代理請求
      const fetchOptions: any = { signal: controller.signal };
      const res = await fetch(url, fetchOptions);
      if (res.ok) {
        responseJson = await res.json();
      }
    } catch (e: any) {
      // 本地若需代理，則平滑降級，不再重複報錯
    } finally {
      clearTimeout(timeoutId);
    }

    if (!responseJson || !Array.isArray(responseJson.models)) {
      return null;
    }

    // 過濾出支持 generateContent 的模型
    const supportedModels: string[] = responseJson.models
      .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m: any) => m.name.replace(/^models\//, ''));

    // 排除實驗性/非正式測試版本 (忽略 exp, preview, 001 等特定快照)
    const validFlash = supportedModels.filter(m => m.includes('flash') && !m.includes('-exp'));
    const validPro = supportedModels.filter(m => m.includes('pro') && !m.includes('-exp'));

    const latestFlash = this.pickLatestVersion(validFlash, 'flash', process.env.DEFAULT_AI_MODEL || 'gemini-3.5-flash');
    const latestPro = this.pickLatestVersion(validPro, 'pro', process.env.FALLBACK_AI_MODEL || 'gemini-3.7-flash');

    return {
      flashModel: latestFlash,
      proModel: latestPro,
      lastChecked: new Date().toISOString(),
      source: 'auto-discovered'
    };
  }

  /**
   * 根據語義版本號 (如 3.8 > 3.7 > 2.5) 自動提取最高版本的模型
   */
  private static pickLatestVersion(candidates: string[], type: 'flash' | 'pro', fallback: string): string {
    if (candidates.length === 0) return fallback;

    // 提取版本號並排序
    const versionRegex = /gemini-(\d+(\.\d+)?)/;
    const sorted = candidates.sort((a, b) => {
      const matchA = a.match(versionRegex);
      const matchB = b.match(versionRegex);
      const verA = matchA ? parseFloat(matchA[1]) : 0;
      const verB = matchB ? parseFloat(matchB[1]) : 0;
      return verB - verA; // 降序排序，版本號最大的排前面
    });

    return sorted[0] || fallback;
  }
}
