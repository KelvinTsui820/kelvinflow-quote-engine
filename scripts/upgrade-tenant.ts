import { TrialService } from '../src/services/trial.service.js';
import { TenantService } from '../src/services/tenant.service.js';

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const parts = arg.substring(2).split('=');
      const key = parts[0].trim();
      if (parts.length > 1) {
        args[key] = parts.slice(1).join('=').replace(/^['"]|['"]$/g, '').trim();
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[++i].replace(/^['"]|['"]$/g, '').trim();
      } else {
        args[key] = 'true';
      }
    } else if (!args.phone && /^\d{11}$/.test(arg)) {
      args.phone = arg;
    } else if (!args.email && arg.includes('@')) {
      args.email = arg;
    }
  }
  return args;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return iso;
  }
}

async function main() {
  const args = parseArgs();
  console.log(`\n=============================================================`);
  console.log(`⚡ KelvinFlow · 租户授权/升级/收款核销管理控制台 (CLI)`);
  console.log(`   (支持：一键终身VIP、自定义赠送天数、好友快速建号、同行裂变奖励)`);
  console.log(`=============================================================\n`);

  const phone = args.phone || args.mobile;
  const email = args.email;
  const query = (phone || email || args.user || args.account || '').trim();

  // 1. 无参数时列出当前用户和使用指令帮助
  if (!query) {
    const trials = TrialService.getAllTrials();
    console.log(`📋 当前系统注册与特邀用户清单 (共 ${trials.length} 位)：`);
    if (trials.length === 0) {
      console.log(`  (暂无注册用户)`);
    } else {
      const recent = trials.slice(0, 10);
      recent.forEach((t, i) => {
        const expStr = formatDate(t.expiresAt);
        const daysLeft = Math.ceil((new Date(t.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
        let statusBadge = '🟢 试用中';
        if (daysLeft > 3650) {
          statusBadge = '🌟 终身VIP';
        } else if (t.status === 'converted') {
          statusBadge = '👑 已付费';
        } else if (daysLeft <= 0) {
          statusBadge = '🔴 已过期';
        }
        console.log(`  [${i + 1}] 手机: ${t.phone} | 邮箱: ${t.email} | 姓名: ${t.name || '特邀体验官'} | 套餐: ${t.paidPlan || '试用'} | 状态: ${statusBadge} (${daysLeft > 3650 ? '永久' : `${daysLeft}天`}) | 到期: ${expStr}`);
      });
    }

    console.log(`\n💡 创始人快捷开通与授权指令范例：`);
    console.log(`  1. 一键赠送好友终身免费 VIP 特权（账号不存在自动秒建）：`);
    console.log(`     npm run activate -- --phone 13912345678 --name "王总" --vip`);
    console.log(`  2. 自定义赠送天数（例如朋友互助测试赠送 60 天 / 90 天）：`);
    console.log(`     npm run activate -- --phone 13800000000 --days 60 --name "李总"`);
    console.log(`  3. 微信收款核销月付极客版 (¥129/月)：`);
    console.log(`     npm run activate -- --phone 13800000000 --months 1`);
    console.log(`  4. 微信收款核销年付极客版 (¥1,290/年 · 送2个月)：`);
    console.log(`     npm run activate -- --phone 13800000000 --annual`);
    console.log(`\n可选参数详解：`);
    console.log(`  --phone / --email   : 客户手机号或邮箱（若不存在将自动开户）`);
    console.log(`  --vip / --permanent : 终身永久授权标记 (9999 天 / 27+ 年，自动免收费)`);
    console.log(`  --days / --grant    : 自定义赠送天数 (如 30, 60, 90, 180 等)`);
    console.log(`  --name              : 客户或好友姓名/称谓 (如 "王总"、"张经理")`);
    console.log(`  --company           : 公司名称 (默认: [姓名]外贸工作室)`);
    console.log(`  --password          : 指定初始密码 (若为空自动分配符合安全标准的初始密码)`);
    console.log(`  --months            : 购买月数 (默认 1，若指定 --annual 则为 12)`);
    console.log(`  --annual            : 年付标记 (12 个月金额 1290，赠送 2 个月)`);
    console.log(`  --amount            : 实收金额 (元，VIP 默认 0)`);
    console.log(`  --note              : 内部备注 (如 "朋友帮忙内测"、"微信转账单号")`);
    console.log(`  --no-create         : 仅更新已有账号，禁止自动新建`);
    process.exit(0);
  }

  // 2. 解析参数
  const isVip = args.vip === 'true' || args.lifetime === 'true' || args.permanent === 'true' || args.forever === 'true';
  const customDays = args.days || args.grant || args['extend-days'];
  const extendDays = isVip ? 9999 : (customDays ? parseInt(customDays, 10) : undefined);
  const isAnnual = !isVip && !customDays && (args.annual === 'true' || args.plan === 'annual' || args.months === '12');
  const months = isAnnual ? 12 : (parseInt(args.months || '1', 10) || 1);
  const plan = (args.plan && args.plan !== 'annual' ? args.plan : 'geek') as any;
  const name = args.name;
  const company = args.company;
  const initialPassword = args.password;
  const autoCreate = args['no-create'] !== 'true';

  let defaultAmount = 0;
  if (!isVip && !customDays) {
    defaultAmount = isAnnual ? 1290 : (months * 129);
  }
  const amountPaid = args.amount ? parseFloat(args.amount) : defaultAmount;

  let note = args.note;
  if (!note) {
    if (isVip) note = '特邀好友终身VIP测试官 (永久免收费)';
    else if (customDays) note = `特邀测试赠送 ${customDays} 天`;
    else if (isAnnual) note = '年付个人极客版 (赠送2个月)';
    else note = `月付个人极客版 (${months}个月)`;
  }

  console.log(`🔍 正在检索或初始化租户信息: [${query}] ...`);

  const result = TrialService.upgradeTenantToPaid({
    phoneOrEmail: query,
    plan,
    months,
    extendDays,
    amountPaid,
    note,
    autoCreate,
    name,
    company,
    initialPassword,
    isVip
  });

  if (!result.success || !result.trial) {
    console.error(`\n❌ 授权失败: ${result.message}`);
    process.exit(1);
  }

  const trial = result.trial;
  const expiryFormatted = isVip ? '终身永久有效 (9999天+)' : formatDate(trial.expiresAt);

  console.log(`\n=============================================================`);
  console.log(`✅ 【租户授权与配置成功】`);
  console.log(`=============================================================`);
  console.log(`  👤 客户姓名:   ${trial.name}`);
  console.log(`  🏢 关联企业:   ${trial.company}`);
  console.log(`  📱 登录账号:   ${trial.phone}`);
  console.log(`  📧 业务邮箱:   ${trial.email}`);
  if (result.isNewAccount && result.initialPassword) {
    console.log(`  🔐 初始密码:   ${result.initialPassword}  (新开户专属安全初始密码)`);
  }
  console.log(`  📦 授权套餐:   ${isVip ? '🌟 终身特权VIP测试官 (永久)' : `${plan === 'geek' ? '个人极客版' : plan} (${isAnnual ? '年付 ¥1,290' : (customDays ? `特邀赠送 ${customDays} 天` : `¥${amountPaid}`)})`}`);
  console.log(`  ⏳ 最新有效期: ${trial.expiresAt} (${expiryFormatted})`);
  console.log(`  🔑 租户ID:     ${trial.tenantId}`);
  if (trial.referredBy) {
    console.log(`  🤝 推荐人信息: 注册自同行推荐 [${trial.referredBy}]`);
  }

  if (result.referrerReward) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`🎁 【同行裂变奖励已自动到账】`);
    console.log(`  检测到该用户由同行 [${result.referrerReward.name || result.referrerReward.phone}] 推荐！`);
    console.log(`  已向推荐人账户自动奖励: +${result.referrerReward.addedDays} 天服务时长！`);
    console.log(`  推荐人最新到期时间:     ${formatDate(result.referrerReward.newExpiresAt)}`);
    console.log(`-------------------------------------------------------------`);
  }

  console.log(`\n=============================================================`);
  console.log(`💬 【一键复制回复客户/好友微信消息模板】：`);
  console.log(`=============================================================`);

  let replyTemplate = '';
  if (isVip) {
    replyTemplate = `${trial.name}您好！已为您专属开通 KelvinFlow【终身 VIP 特权体验官】账号！🎉

【登录网址】: https://quote.kelvinflow.com
【登录账号】: ${trial.phone}
${result.isNewAccount && result.initialPassword ? `【初始密码】: ${result.initialPassword} (首次登录后可自由修改)\n` : ''}【特权类型】: 终身特权测试官 (永久有效 / 无限次出单)
【专属权益】: 私有底价库加密保护、AI 询盘秒级精准核算、全自动生成国际标准格式 PDF 报价单与邮件草稿箱。

感谢老朋友鼎力支持与试用测试！使用过程中有任何操作建议或特殊需求，随时微信沟通！祝业务蒸蒸日上，天天爆大单！🚀`;
  } else if (customDays) {
    replyTemplate = `${trial.name}您好！已为您专属增加 KelvinFlow ${customDays} 天全功能服务体验时长！🎉

【登录网址】: https://quote.kelvinflow.com
【登录账号】: ${trial.phone}
${result.isNewAccount && result.initialPassword ? `【初始密码】: ${result.initialPassword} (首次登录后可自由修改)\n` : ''}【有效期限】: 至 ${expiryFormatted} (已延长 +${customDays} 天)
【服务版本】: 个人极客版 (包含独立底价表私有化解析、AI精准核价与自动出单)

感谢支持与测试！使用中有任何底价表导入或格式疑问，随时微信交流！祝业绩长虹！🚀`;
  } else {
    replyTemplate = `您好 ${trial.name}！您的 KelvinFlow 个人极客版已成功开通！🎉

【服务账号】: ${trial.phone}
${result.isNewAccount && result.initialPassword ? `【初始密码】: ${result.initialPassword} (首次登录后可自由修改)\n` : ''}【开通套餐】: 个人极客版 (${isAnnual ? '年付专属 ¥1,290/年 · 赠送2个月' : `首月早鸟价 ¥${amountPaid}/月`})
【有效期至】: ${expiryFormatted}
【极速登录】: https://quote.kelvinflow.com

🎁 您的同行推荐特权已同步激活：
专属邀请链接：https://quote.kelvinflow.com/?ref=${trial.phone}
• 每推荐 1 位外贸同行注册体验：您与好友各享 +7 天服务时长
• 推荐好友转为正式付费版：您立享 +30 天 (整月) 免费顺延，上不封顶！

使用中有任何底价表导入或格式疑问，随时微信发我！祝业绩长虹，天天爆单！🚀`;
  }

  console.log(replyTemplate);
  console.log(`=============================================================\n`);
}

main().catch(err => {
  console.error('执行异常:', err);
  process.exit(1);
});
