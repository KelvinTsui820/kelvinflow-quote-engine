import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PricingNormalizerService } from '../src/services/pricing-normalizer.service.js';
import { ExcelAdapter } from '../src/adapters/excel.adapter.js';

interface TenantProfile {
  tenantId: string;
  companyName: string;
  contactEmail: string;
  apiKey: string;
  plan: 'monthly' | 'annual';
  defaultProfitMargin: number;
  status: 'active' | 'suspended';
  createdAt: string;
  expiresAt: string;
  allowedDomains: string[];
}

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const parts = arg.substring(2).split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').replace(/^['"]|['"]$/g, '').trim();
      args[key] = val || 'true';
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  console.log(`\n=============================================================`);
  console.log(`⚡ KelvinFlow · 一人公司专属 5 分钟极速租户开户交付工具`);
  console.log(`=============================================================\n`);

  const companyName = args.name || args.company || 'Demo Foreign Trade Ltd.';
  const contactEmail = args.email || 'sales@example.com';
  const rawFile = args.file || args.excel;
  const plan = (args.plan === 'monthly' ? 'monthly' : 'annual') as 'monthly' | 'annual';
  const margin = parseFloat(args.margin || '0.3') || 0.3;

  // 1. 生成唯一租户 ID 与 API Key
  const suffix = crypto.randomBytes(3).toString('hex');
  const tenantId = `tenant_${suffix}`;
  const apiKey = `sk_live_${crypto.randomBytes(16).toString('hex')}`;

  const tenantDir = path.join(process.cwd(), 'data', 'tenants', tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const targetPricingPath = path.join(tenantDir, 'active_pricing.xlsx');

  // 2. 清洗并导入底价表
  let itemCount = 0;
  let detectedHeaders: any = {};
  if (rawFile && fs.existsSync(rawFile)) {
    console.log(`📁 正在清洗并转换客户原始底价表: ${rawFile}...`);
    const normResult = await PricingNormalizerService.normalizeCustomerExcel(rawFile, targetPricingPath, {
      defaultProfitMargin: margin
    });
    if (!normResult.success) {
      console.error(`❌ 底价表清洗失败: ${normResult.error}`);
      process.exit(1);
    }
    itemCount = normResult.itemCount;
    detectedHeaders = normResult.detectedHeaders;
    console.log(`✅ AI 清洗完成！成功提取 ${itemCount} 款有效商品底价`);
  } else {
    console.log(`ℹ️ 未指定客户原始文件，自动载入 KelvinFlow 标准 7-Sheet 模板底价库...`);
    const defaultTemplate = path.join(process.cwd(), 'data', 'active_pricing.xlsx');
    if (fs.existsSync(defaultTemplate)) {
      fs.copyFileSync(defaultTemplate, targetPricingPath);
      const parsed = ExcelAdapter.parse(targetPricingPath);
      itemCount = parsed.priceItems.length;
    }
  }

  // 3. 计算有效期与数据保留期 (到期后安全封存 30 天)
  const now = new Date();
  const expires = new Date(now);
  if (plan === 'annual') {
    expires.setDate(expires.getDate() + 365);
  } else {
    expires.setDate(expires.getDate() + 31);
  }

  const retentionUntil = new Date(expires);
  retentionUntil.setDate(retentionUntil.getDate() + 30); // 到期后安全封存保留 30 天

  // 4. 保存租户 Profile
  const profile: any = {
    tenantId,
    companyName,
    contactEmail,
    apiKey,
    apiKeys: [apiKey],
    plan,
    defaultProfitMargin: margin,
    status: 'active',
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    dataRetentionUntil: retentionUntil.toISOString(),
    allowedDomains: [contactEmail.split('@')[1] || 'example.com']
  };

  const profilePath = path.join(tenantDir, 'profile.json');
  const tenantProfilePath = path.join(tenantDir, 'tenant.profile.json');
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
  fs.writeFileSync(tenantProfilePath, JSON.stringify(profile, null, 2), 'utf-8');

  // 5. 模拟一次 Dry Run 自测
  console.log(`🧪 正在对新租户底价库与计算引擎进行 Dry-Run 校验...`);
  const dryRunParsed = ExcelAdapter.parse(targetPricingPath);
  if (dryRunParsed.priceItems.length === 0) {
    console.warn(`⚠️ [警告] 租户底价库解析结果为 0 件，请复核文件！`);
  } else {
    const firstItem = dryRunParsed.priceItems[0];
    const displaySku = firstItem.rawSku || firstItem.normalizedSku || 'ITEM-1';
    console.log(`🎉 [自测通过] 租户引擎就绪，首款商品 [${displaySku}], 出厂价 ¥${firstItem.basePrice}`);
  }

  // 6. 生成交付凭证单
  const reviewWorkbenchUrl = `https://quote.kelvinflow.com/review/latest?tenant=${tenantId}`;
  const deliveryDoc = `
# 尊享客户专属接入凭证 · KelvinFlow 外贸智能报价系统

尊敬的 **${companyName}** 团队：
感谢您选用 KelvinFlow 外贸智能报价与风控中枢！您的企业专属独立租户环境已由创始人亲自配置并校验完毕。

---

### 🔑 您的专属接入凭证
- **企业租户 ID (Tenant ID)**：\`${tenantId}\`
- **专属安全 API 密钥 (API Key)**：\`${apiKey}\`
- **订阅版本**：${plan === 'annual' ? '👑 年度尊享版 (¥18,800/年)' : '⚡ 月度专业版 (¥2,299/月)'}
- **服务有效期**：至 ${expires.toLocaleDateString('zh-CN')}
- **在线核对工作台**：[${reviewWorkbenchUrl}](${reviewWorkbenchUrl})
- **生效底价库规格**：共导入 \`${itemCount}\` 款商品标准出厂底价

---

### 🚀 3 分钟快速上手步骤
1. **核对与审单**：
   收到海外询盘时，系统将在 90 秒内自动生成报价并在草稿箱生成邮件。
   如需临时调价、修改付款条款或调整海运术语，打开上方【在线核对工作台】即可 10 秒微调。
2. **全邮箱自动化对接 (腾讯企业邮 / 阿里邮箱 / 网易 / Foxmail / Gmail)**：
   系统已全面适配国内及海外全主流邮箱协议（IMAP/SMTP 与 Gmail OAuth2）。创始人将协助或由贵司 IT 导入一体化工作流模板，填入企业邮箱授权与专属 API 密钥，即可实现 7×24h 自动出单与草稿箱实时排入。
3. **底价更新**：
   后续如有产品出厂底价调整，直接在工作台上传新 Excel，或发送一封主题为「底价表更新」的邮件附带表格即可全自动清洗并无缝生效。

---
技术支持：创始人 Kelvin 直联微信
KelvinFlow · 国际外贸人机协同操作系统
`.trim();

  const deliveryPath = path.join(tenantDir, 'DELIVERY_CREDENTIALS.md');
  fs.writeFileSync(deliveryPath, deliveryDoc, 'utf-8');

  // 7. 终端输出
  console.log(`\n=============================================================`);
  console.log(`🏆 租户开户与环境初始化成功！`);
  console.log(`=============================================================`);
  console.log(`🏢 企业名称:   ${companyName}`);
  console.log(`🆔 租户 ID:     ${tenantId}`);
  console.log(`🔑 专属 API Key: ${apiKey}`);
  console.log(`📦 商品底价数: ${itemCount} 款`);
  console.log(`📅 服务到期日: ${expires.toLocaleDateString('zh-CN')}`);
  console.log(`🌐 专属工作台: ${reviewWorkbenchUrl}`);
  console.log(`📄 交付凭证单: ${deliveryPath}`);
  console.log(`=============================================================\n`);
  console.log(`💡 提示：你可以直接将上面生成的 DELIVERY_CREDENTIALS.md 复制发给客户微信！\n`);
}

main().catch(err => {
  console.error('开户过程异常终止:', err);
  process.exit(1);
});
