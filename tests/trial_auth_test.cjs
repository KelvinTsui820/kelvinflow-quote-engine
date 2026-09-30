const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TRIALS_FILE = path.join(__dirname, '..', 'data', 'trials.json');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 开始 7 天免费试用与防薅羊毛机制端到端自动化测试');
  console.log('====================================================');

  const testPhone = '13888889999';
  const testEmail = 'alice_test_trial@kelvinflow.com';
  const testName = 'Alice (外贸五金测试)';

  // 0. 清理历史测试残留
  if (fs.existsSync(TRIALS_FILE)) {
    try {
      let list = JSON.parse(fs.readFileSync(TRIALS_FILE, 'utf-8'));
      list = list.filter(t => t.phone !== testPhone && t.email !== testEmail && t.phone !== '13999990000');
      fs.writeFileSync(TRIALS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch {}
  }

  // 用例 1：全新用户首次输入手机号与邮箱注册开通 7 天免费全功能试用
  console.log('\n[用例 1] 全新用户首次注册开通 7 天免费全功能试用...');
  const regRes = await fetch(`${BASE_URL}/api/v1/auth/trial-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhone,
      email: testEmail,
      name: testName,
      company: '佛山新铝合金外贸',
      category: '五金紧固件',
      wechat: 'alice_wx_2026'
    })
  });

  const regData = await regRes.json();
  console.log('  -> 响应状态码:', regRes.status);
  console.log('  -> 响应结果:', regData.message);
  assert.strictEqual(regRes.status, 200, '首次注册应当成功返回 200');
  assert.strictEqual(regData.success, true);
  assert.strictEqual(regData.isNew, true);
  assert.strictEqual(regData.remainingDays, 7);
  assert.ok(regData.token, '必须签发有效 Token');
  console.log('  ✅ [用例 1 通过] 首次注册成功，获得 7 天有效期与 Token:', regData.token.substring(0, 20) + '...');

  const trialToken = regData.token;

  // 用例 2：使用签发的试用 Token 访问受保护的审单台接口
  console.log('\n[用例 2] 使用试用 Token 查验审单工作台数据 (/api/v1/quotes/QT-20260904-888)...');
  const quoteRes = await fetch(`${BASE_URL}/api/v1/quotes/QT-20260904-888?token=${trialToken}`);
  const quoteData = await quoteRes.json();
  assert.strictEqual(quoteRes.status, 200);
  assert.strictEqual(quoteData.success, true);
  assert.ok(quoteData.quotation);
  console.log('  ✅ [用例 2 通过] 试用 Token 成功鉴权，成功读取单据:', quoteData.quotation.quotationNumber);

  // 用例 3：查验试用状态端点 (/api/v1/auth/trial-status)
  console.log('\n[用例 3] 查验试用状态端点 (/api/v1/auth/trial-status)...');
  const statusRes = await fetch(`${BASE_URL}/api/v1/auth/trial-status?phone=${testPhone}`);
  const statusData = await statusRes.json();
  assert.strictEqual(statusData.success, true);
  assert.strictEqual(statusData.isTrial, true);
  assert.strictEqual(statusData.expired, false);
  assert.strictEqual(statusData.remainingDays, 7);
  console.log('  ✅ [用例 3 通过] 试用状态准确反馈剩余天数: 7 天，未过期');

  // 用例 4：相同手机号在 7 天内再次提交（模拟用户在不同设备重新登录）
  console.log('\n[用例 4] 相同手机号再次提交（7天内回归登录）...');
  const reLoginRes = await fetch(`${BASE_URL}/api/v1/auth/trial-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhone,
      email: testEmail
    })
  });
  const reLoginData = await reLoginRes.json();
  assert.strictEqual(reLoginRes.status, 200);
  assert.strictEqual(reLoginData.success, true);
  assert.strictEqual(reLoginData.isReturning, true);
  assert.ok(reLoginData.token);
  console.log('  ✅ [用例 4 通过] 老用户在有效期内成功免密回归登录！');

  // 用例 5：【防薅羊毛核心测试 1】该手机号已过 7 天试用期，企图再次开通免费试用
  console.log('\n[用例 5] 防薅羊毛测试 1：修改测试记录为已过期，再次尝试开通免费试用...');
  let trialsList = JSON.parse(fs.readFileSync(TRIALS_FILE, 'utf-8'));
  const targetTrial = trialsList.find(t => t.phone === testPhone);
  assert.ok(targetTrial, '应存在测试记录');
  // 模拟过期：将 expiresAt 设为 5 天前
  targetTrial.expiresAt = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
  fs.writeFileSync(TRIALS_FILE, JSON.stringify(trialsList, null, 2), 'utf-8');

  const abuseRes1 = await fetch(`${BASE_URL}/api/v1/auth/trial-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: testPhone,
      email: 'new_random_email@example.com',
      name: '薅羊毛人员'
    })
  });
  const abuseData1 = await abuseRes1.json();
  console.log('  -> 响应状态码:', abuseRes1.status);
  console.log('  -> 拦截原因:', abuseData1.message);
  assert.strictEqual(abuseRes1.status, 403, '防薅羊毛必须严格返回 HTTP 403 阻断');
  assert.strictEqual(abuseData1.success, false);
  assert.strictEqual(abuseData1.expired, true);
  assert.strictEqual(abuseData1.code, 'TRIAL_EXPIRED');
  assert.ok(abuseData1.founderWechat);
  console.log('  ✅ [用例 5 通过] 手机号过期防薅羊毛成功触发并严格拦截！附带创始人微信:', abuseData1.founderWechat);

  // 用例 6：【防薅羊毛核心测试 2】换新手机号但使用相同的已过期邮箱企图白嫖
  console.log('\n[用例 6] 防薅羊毛测试 2：使用新手机号但重复使用已过期的邮箱...');
  const abuseRes2 = await fetch(`${BASE_URL}/api/v1/auth/trial-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '13999990000', // 全新手机号
      email: testEmail,     // 但邮箱已在上面过期
      name: '换手机号继续试用'
    })
  });
  const abuseData2 = await abuseRes2.json();
  console.log('  -> 响应状态码:', abuseRes2.status);
  console.log('  -> 拦截原因:', abuseData2.message);
  assert.strictEqual(abuseRes2.status, 403, '根据邮箱排重防薅羊毛必须严格返回 403');
  assert.strictEqual(abuseData2.expired, true);
  assert.strictEqual(abuseData2.code, 'TRIAL_EXPIRED');
  console.log('  ✅ [用例 6 通过] 邮箱排重防薅羊毛成功触发并严格拦截！');

  // 用例 7：非法手机号码与邮箱防呆格式校验
  console.log('\n[用例 7] 格式防呆校验测试（非法手机号或非法邮箱）...');
  const invalidRes = await fetch(`${BASE_URL}/api/v1/auth/trial-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '12345',
      email: 'not-an-email'
    })
  });
  const invalidData = await invalidRes.json();
  assert.strictEqual(invalidRes.status, 400);
  assert.strictEqual(invalidData.success, false);
  console.log('  ✅ [用例 7 通过] 格式防呆严格校验生效:', invalidData.error);

  // 7. 清理测试数据
  trialsList = JSON.parse(fs.readFileSync(TRIALS_FILE, 'utf-8'));
  trialsList = trialsList.filter(t => t.phone !== testPhone && t.email !== testEmail && t.phone !== '13999990000');
  fs.writeFileSync(TRIALS_FILE, JSON.stringify(trialsList, null, 2), 'utf-8');

  console.log('\n====================================================');
  console.log('🎉 恭喜！所有 7 大端到端试用与防薅羊毛测试用例 100% 全部通过！');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
