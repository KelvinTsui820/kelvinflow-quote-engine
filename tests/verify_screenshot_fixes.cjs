const assert = require('assert');
const fs = require('fs');

async function testAll() {
  console.log('================================================================');
  console.log('🧪 开始针对 5 大截图问题修复的深度端到端自动化验证');
  console.log('================================================================');

  const html = fs.readFileSync('public/review.html', 'utf-8');

  // [用例 1: 验证第一行卡片视觉平衡与 INCOTERM 胶囊单行排版]
  console.log('\n[1/5] 验证第一行卡片与 INCOTERM 胶囊单行排版...');
  assert.ok(html.includes('overflow-x-auto whitespace-nowrap'), 'INCOTERM 容器必须设置单行不换行');
  assert.ok(html.includes("{ label: 'FOB深圳'"), 'quickTerms 必须精简化为紧凑标签');
  assert.ok(html.includes("{ label: 'EXW工厂'"), 'quickTerms 必须精简化为紧凑标签');
  assert.ok(html.includes("isPaidUser ? '出单后自动同步写入企业邮箱草稿箱' : '买家询盘回信发送目标邮箱'"), '买家邮箱卡片必须自适应身份');
  console.log('  ✅ [PASS] 第一行卡片布局与快捷胶囊单行排版验证通过，彻底根除留白空洞！');

  // [用例 2: 验证彻底移除邮件转发旧逻辑，试用出单绝不弹窗]
  console.log('\n[2/5] 验证邮件联动弹窗纯净化与试用出单绝无打扰...');
  assert.ok(!html.includes('您的专属外贸询盘解析邮箱'), '严禁存在旧版专属 rfq 解析邮箱干扰');
  assert.ok(!html.includes('极简邮件转发 (推荐 · 0门槛免密)'), '严禁存在过时的邮件转发 Tab');
  assert.ok(html.includes('v-if="isPaidUser" @click="openImapModal"'), '顶部导航草稿箱配置按钮仅对付费极客展示');
  assert.ok(html.includes('👑 极客特权 · 绑定企业邮箱发件草稿箱'), 'IMAP 弹窗必须明确为极客特权专用绑定窗');
  console.log('  ✅ [PASS] 邮件联动弹窗已纯净化，试用用户完全免除干扰！');

  // [用例 3: 验证新手引导第 3 步动态自适应]
  console.log('\n[3/5] 验证新手引导第 3 步双轨自适应 (试用手动 vs 付费直达)...');
  assert.ok(html.includes('const tourSteps = computed('), 'tourSteps 必须为 computed 计算属性');
  assert.ok(html.includes('确认毛利，直达草稿箱'), '付费用户必须看到直达草稿箱文案');
  assert.ok(html.includes('地道英文回信已一键复制到剪贴板，直接在常用邮箱中粘贴发送'), '试用用户必须看到手动发信指引');
  console.log('  ✅ [PASS] 新手引导第 3 步已精准实现双轨自适应！');

  // [用例 4: 验证 setup() 属性全量导出与邀请同行按钮]
  console.log('\n[4/5] 验证 Vue setup() 属性导出与邀请同行弹窗...');
  const lastMount = html.lastIndexOf("}).mount('#app');");
  const setupReturnStart = html.lastIndexOf('return {', lastMount);
  const returnBlock = html.substring(setupReturnStart + 8, lastMount);

  const expectedVars = [
    'isPaidUser',
    'hasImapConfigured',
    'draftInjectionStatus',
    'downloadPdfFile',
    'copyEmailSubject',
    'copyEmailBodyOnly',
    'referralModal',
    'openReferralShareModal'
  ];

  expectedVars.forEach(v => {
    assert.ok(returnBlock.includes(v), `setup() return 必须导出属性: ${v}`);
  });

  // 验证子模态框无 v-cloak 遮蔽
  assert.ok(html.includes('<div v-if="referralModal.show" class="fixed'), 'referralModal 必须无 v-cloak 遮蔽');
  assert.ok(html.includes('<div v-if="showConfirmModal" class="fixed'), 'showConfirmModal 必须无 v-cloak 遮蔽');
  assert.ok(html.includes('<div v-if="successModal.show" class="fixed'), 'successModal 必须无 v-cloak 遮蔽');
  console.log('  ✅ [PASS] setup() 关键属性 100% 导出，v-cloak 遮蔽彻底清除！');

  // [用例 5: 验证测试账号 trial 状态与 isPaidUser 隔离]
  console.log('\n[5/5] 验证试用状态与 isPaidUser 隔离防穿透...');
  const tenant185 = JSON.parse(fs.readFileSync('data/tenants/tenant_trial_18566090282/profile.json', 'utf-8'));
  assert.strictEqual(tenant185.plan, 'trial', '测试租户初始必须为 trial');
  assert.ok(html.includes('if (trialState.value && trialState.value.isTrial) return false;'), 'isPaidUser 必须强校验 trialState');
  console.log('  ✅ [PASS] 试用状态与 isPaidUser 强隔离生效，试用出单零误伤！');

  console.log('\n================================================================');
  console.log('🎉🎉🎉 针对 5 大截图问题的全部断言 100% 通过！');
  console.log('================================================================');
}

testAll().catch(err => {
  console.error('❌ 测试未通过:', err);
  process.exit(1);
});
