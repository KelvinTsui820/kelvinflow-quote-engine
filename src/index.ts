import 'dotenv/config'; // 務必在最頂部加載環境變量
import express from 'express';
import cors from 'cors';
import { quoteRouter } from './routes/quote.router.js';
import { inboundRouter } from './routes/inbound.router.js';

const app = express();
const port = process.env.PORT || 3000;

// 安全加固：禁用 Express 默认技术栈指纹响应头 (OWASP A05: Security Misconfiguration)
app.disable('x-powered-by');

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// 全局安全加固响应头 (OWASP 安全基准防御)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// 註冊 API 路由
app.use('/api/v1', quoteRouter);
app.use('/api/inbound', inboundRouter);
import path from 'path';

// 根據邀請參數、子域名智能路由根路徑：
// 1. 若攜帶邀請參數 (?ref=, ?code=, ?invite=) 或訪問官網，始終呈現首頁 index.html (自動帶入邀請碼並拉起開通彈窗)
// 2. 若直接訪問 /review 或 /review/:id 或 /QT-xxxxxx，呈現外貿審單台 review.html
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const hasRef = !!(req.query.ref || req.query.code || req.query.invite);
  const wantsLanding = req.query.landing === '1' || req.query.portal === '1';
  if (hasRef || wantsLanding) {
    return res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  }

  const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toString().toLowerCase();
  if ((host.startsWith('quote.') || host.includes('quote')) && (req.query.review === '1' || req.query.id)) {
    return res.sendFile(path.join(process.cwd(), 'public', 'review.html'));
  }

  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// 審單工作台直達路由
app.get('/review', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(process.cwd(), 'public', 'review.html'));
});

// 支持直接通過 /QT-xxxxxx 訪問特定報價單
app.get('/:id', (req, res, next) => {
  const id = req.params.id;
  if (id.startsWith('QT-') || id === 'latest') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(path.join(process.cwd(), 'public', 'review.html'));
  }
  next();
});

app.get('/review/:id', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(process.cwd(), 'public', 'review.html'));
});

// 靜態資源（禁用默認 index.html 攔截，配置性能優化緩存與 HTML 即時更新策略）
app.use(express.static(path.join(process.cwd(), 'public'), {
  index: false,
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    }
  }
}));


import { ModelDiscoveryService } from './services/model-discovery.service.js';

// 健康檢查
app.get('/api/v1/health', async (req, res) => {
  const activeModels = await ModelDiscoveryService.getActiveModels();
  res.json({
    status: 'ok',
    service: 'Quotation Core Engine',
    timestamp: new Date().toISOString(),
    aiModels: {
      tier1: activeModels.flashModel,
      tier2: activeModels.proModel,
      source: activeModels.source,
      lastChecked: activeModels.lastChecked,
      confidenceThreshold: process.env.AI_CONFIDENCE_THRESHOLD || 80
    }
  });
});

app.listen(port, async () => {
  const activeModels = await ModelDiscoveryService.getActiveModels();
  console.log(`===================================================`);
  console.log(`⚡ KelvinFlow · Enterprise AI Core Engine v5.0`);
  console.log(`🚀 自动化报价风控中枢已启动: http://localhost:${port}`);
  console.log(`📡 健康检查端点: http://localhost:${port}/api/v1/health`);
  console.log(`🔑 密钥前缀: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : '未检测到'}`);
  console.log(`⚡ Tier 1 极速模型 (Flash): ${activeModels.flashModel} (${activeModels.source})`);
  console.log(`🛡️ Tier 2 兜底模型 (Pro):   ${activeModels.proModel} (${activeModels.source})`);
  console.log(`📧 询盘入站架构: 100% 自动邮件直投 + 内置自主守护 (零 n8n 依赖)`);
  console.log(`===================================================`);

  // 若启用了内置自主轮询守护 (无需 Cloudflare，单机极简跑通全链路)
  if (process.env.ENABLE_EMAIL_POLLER === 'true') {
    try {
      const { EmailPollerService } = await import('./services/email-poller.service.js');
      EmailPollerService.start();
    } catch (err: any) {
      console.warn('⚠️ 启动收件箱自动守护轮询失败:', err.message);
    }
  }
});
