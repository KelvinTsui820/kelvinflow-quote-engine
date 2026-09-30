/**
 * =========================================================================
 * KelvinFlow 创始人 1 秒一键极速激活 / 续费会员脚本
 * =========================================================================
 * 
 * 使用方式：
 *   node scripts/activate_user.cjs <手机号或邮箱> [金额或套餐: 99 | 890 | monthly | annual] [自定义天数]
 * 
 * 示例：
 *   node scripts/activate_user.cjs 13800138000           # 默认开通月付极客版 (¥99, 31天)
 *   node scripts/activate_user.cjs 13800138000 99        # 开通月付极客版 (¥99, 31天)
 *   node scripts/activate_user.cjs 13800138000 890       # 开通年付创始版 (¥890, 365天)
 *   node scripts/activate_user.cjs 13800138000 annual    # 开通年付创始版 (¥890, 365天)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd.trim()).digest('hex');
}

function printHelp() {
  console.log(`
\x1b[36mKelvinFlow 会员极速激活工具\x1b[0m
--------------------------------------------------
用法: node scripts/activate_user.cjs <手机号/邮箱> [99 | 890 | monthly | annual] [自定义天数]

示例:
  node scripts/activate_user.cjs 13800138000        # 开通月付创始极客版 (¥99)
  node scripts/activate_user.cjs 13800138000 890    # 开通年付创始特权版 (¥890)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    printHelp();
    process.exit(1);
  }

  const targetInput = args[0].trim();
  const optionCycleOrAmount = (args[1] || '99').toLowerCase().trim();
  const customDays = args[2] ? parseInt(args[2], 10) : null;

  const isAnnual = optionCycleOrAmount === '890' || optionCycleOrAmount === 'annual' || optionCycleOrAmount === 'year';
  const durationDays = customDays || (isAnnual ? 365 : 31);
  const planAmount = isAnnual ? 890 : 99;
  const planTitle = isAnnual ? '年付创始特权版 (¥890 / 年)' : '月付创始极客版 (¥99 / 月)';

  const rootDir = path.resolve(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const trialsFile = path.join(dataDir, 'trials.json');
  const tenantsDir = path.join(dataDir, 'tenants');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(tenantsDir)) fs.mkdirSync(tenantsDir, { recursive: true });

  // 1. 读取 trials.json
  let trials = [];
  if (fs.existsSync(trialsFile)) {
    try {
      trials = JSON.parse(fs.readFileSync(trialsFile, 'utf-8'));
    } catch (e) {
      trials = [];
    }
  }

  // 2. 查找用户
  const cleanPhone = targetInput.replace(/\D/g, '');
  const isPhone = cleanPhone.length === 11 && /^1[3-9]\d{9}$/.test(cleanPhone);
  const cleanEmail = targetInput.toLowerCase().trim();

  let trial = trials.find(t => {
    return (isPhone && t.phone === cleanPhone) || (t.email && t.email.toLowerCase() === cleanEmail);
  });

  const now = new Date();
  let baseTime = now.getTime();

  // 若用户已有尚未过期的时长，顺延
  if (trial && trial.expiresAt) {
    const prevExp = new Date(trial.expiresAt).getTime();
    if (prevExp > baseTime) {
      baseTime = prevExp;
    }
  }

  const newExpiresDate = new Date(baseTime + durationDays * 24 * 3600 * 1000);
  const newExpiresAt = newExpiresDate.toISOString();
  const tenantId = trial?.tenantId || (isPhone ? `tenant_trial_${cleanPhone}` : `tenant_${targetInput.replace(/[^a-z0-9_-]/g, '_')}`);

  // 3. 更新或新建 Trial 记录
  if (trial) {
    trial.status = 'converted';
    trial.expiresAt = newExpiresAt;
    trial.paidAmount = (trial.paidAmount || 0) + planAmount;
    trial.lastPaidAt = now.toISOString();
    trial.plan = 'geek';
  } else {
    // 反向开通全新用户
    trial = {
      id: `trial_${isPhone ? cleanPhone : Date.now()}`,
      phone: isPhone ? cleanPhone : '13800000000',
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanPhone}@user.kelvinflow.com`,
      passwordHash: hashPassword('123456'), // 默认初始密码
      name: '创始付费会员',
      company: '外贸工作室',
      category: '通用外贸',
      tenantId,
      userId: `usr_paid_${Date.now()}`,
      createdAt: now.toISOString(),
      expiresAt: newExpiresAt,
      status: 'converted',
      lastLoginAt: now.toISOString(),
      paidAmount: planAmount,
      lastPaidAt: now.toISOString(),
      plan: 'geek'
    };
    trials.unshift(trial);
  }

  // 保存主账本
  fs.writeFileSync(trialsFile, JSON.stringify(trials, null, 2), 'utf-8');

  // 4. 更新租户 Profile
  const tenantDir = path.join(tenantsDir, tenantId);
  if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });

  const profilePath = path.join(tenantDir, 'profile.json');
  let profile = {};
  if (fs.existsSync(profilePath)) {
    try {
      profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    } catch {}
  }

  profile = {
    ...profile,
    tenantId,
    companyName: profile.companyName || trial.company || '外贸工作室',
    contactEmail: trial.email,
    contactPhone: trial.phone,
    plan: 'geek',
    status: 'active',
    expiresAt: newExpiresAt,
    dataRetentionUntil: new Date(newExpiresDate.getTime() + 180 * 24 * 3600 * 1000).toISOString(),
    updatedAt: now.toISOString()
  };
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');

  // 5. 若租户没有底价表，自动同步默认底价表
  const tenantPricing = path.join(tenantDir, 'active_pricing.xlsx');
  const defaultPricing = path.join(dataDir, 'active_pricing.xlsx');
  if (!fs.existsSync(tenantPricing) && fs.existsSync(defaultPricing)) {
    try {
      fs.copyFileSync(defaultPricing, tenantPricing);
    } catch {}
  }

  const expiryDateStr = newExpiresDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // 6. 打印精美战报卡片
  console.log(`
\x1b[32m============================================================\x1b[0m
\x1b[1m\x1b[32m🎉 [1秒激活成功] KelvinFlow 创始付费会员特权已生效！\x1b[0m
\x1b[32m============================================================\x1b[0m
👤 用户主键: \x1b[33m${trial.phone || trial.email}\x1b[0m
🏢 租户标识: \x1b[36m${tenantId}\x1b[0m
💎 会员套餐: \x1b[35m${planTitle}\x1b[0m
💰 累计到账: \x1b[32m¥${trial.paidAmount}\x1b[0m
📅 有效期限: \x1b[32m${expiryDateStr}\x1b[0m (共赠送/延长 ${durationDays} 天)
🔒 账号密码: \x1b[90m(若新开通默认密码为 123456，用户可在工作台微调)\x1b[0m
🌐 访问地址: \x1b[34mhttps://quote.kelvinflow.com/review.html\x1b[0m
------------------------------------------------------------
\x1b[1m\x1b[33m💬 [可直接复制微信回复客户的话术]:\x1b[0m
「您好！已确认收到您的升级款项（¥${planAmount}），您的 KelvinFlow 创始席位已极速开通！
• 登录账号：${trial.phone || trial.email}
• 授权权益：无限制智能核算 + 专属底价表隔离
• 到期时间：${expiryDateStr}
• 工作台直达：https://quote.kelvinflow.com/review.html
（🎁 创始人贴心提示：底价表格式如有任何不习惯或不会配置，随时把 Excel 发给我，15分钟内我免费帮您整理并一键导入！）祝您出海爆单、款如泉涌！🚀」
\x1b[32m============================================================\x1b[0m
`);
}

main().catch(err => {
  console.error('❌ 激活失败:', err);
  process.exit(1);
});
