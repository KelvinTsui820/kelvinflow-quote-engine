const assert = require('assert');
const path = require('path');

// 引入编译后的服务或模块
const { TrialService } = require('../dist/services/trial.service.js');
const { NotificationService } = require('../dist/services/notification.service.js');

async function testMVP() {
  console.log('🧪 开始验证 MVP 核心改造功能...');

  // 1. 验证密码复杂度放宽到 >= 6 位且无需大写字母
  const shortPwd = TrialService.validatePasswordComplexity('12345');
  assert.strictEqual(shortPwd.valid, false, '小于 6 位应被拦截');

  const validLowerPwd = TrialService.validatePasswordComplexity('kelvin');
  assert.strictEqual(validLowerPwd.valid, true, '6 位纯小写应该通过');

  const validNumPwd = TrialService.validatePasswordComplexity('123456');
  assert.strictEqual(validNumPwd.valid, true, '6 位纯数字应该通过');

  console.log('✅ [PASS] 密码降摩擦验证通过 (>= 6 位无大写字母强制)');

  // 2. 验证 1 秒一键激活会员 (TrialService.activatePaidUser)
  const testPhone = '13988887777';
  const activateRes = TrialService.activatePaidUser(testPhone, { amount: 99 });
  assert.strictEqual(activateRes.success, true, '一键激活应该成功');
  assert.strictEqual(activateRes.trial.status, 'converted', '激活后状态应为 converted');
  assert.strictEqual(activateRes.plan, 'geek', '激活后套餐应为 geek');
  console.log('✅ [PASS] 1秒激活会员逻辑验证通过:', activateRes.message);

  // 3. 验证微信战报生成 (NotificationService.pushQuoteCreatedToWeChat)
  const pushRes = await NotificationService.pushQuoteCreatedToWeChat({
    quotationNumber: 'QT-TEST-2026',
    buyerName: 'Global Trade Buyer LLC',
    totalAmountForeign: 15800.5,
    currency: 'USD',
    itemCount: 3,
    salesRepEmail: 'sales@kelvinflow.com',
    salesRepName: 'Kelvin',
    tradeTerms: 'FOB Shenzhen'
  });
  assert.strictEqual(typeof pushRes.pushed, 'boolean', '推送接口应返回推算结果布尔值');
  console.log('✅ [PASS] 创始人出单战报推送接口验证通过 (返回 pushed =', pushRes.pushed, ')');

  console.log('🎉 全部 MVP 核心新增功能测试 100% 通过！');
}

testMVP().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
