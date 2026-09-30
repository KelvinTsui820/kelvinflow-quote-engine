import { TrialService } from '../src/services/trial.service';

async function testLegacyFlow() {
  const testPhone = '13800009999';
  console.log(`--- 测试 1: 构造未设密码的存量特邀账号 ${testPhone} ---`);
  const allTrials = TrialService.getAllTrials().filter(t => t.phone !== testPhone);
  allTrials.push({
    id: `trial_${testPhone}`,
    phone: testPhone,
    email: `${testPhone}@factory.com`,
    name: '测试老用户',
    company: '测试老外贸工作室',
    category: '机械五金',
    tenantId: `tenant_trial_${testPhone}`,
    userId: `usr_${testPhone}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    lastLoginAt: new Date().toISOString(),
    channelSource: '官网',
    referralCount: 0,
    rewardDays: 365
    // passwordHash 故意留空，模拟早期免密账号
  });
  TrialService.saveTrials(allTrials);

  const statusBefore = TrialService.checkAccountStatus(testPhone);
  console.log('Status before:', statusBefore);
  if (!statusBefore.exists || statusBefore.hasPassword) {
    throw new Error(`预期 ${testPhone} 存在且尚未绑定密码！`);
  }
  console.log('✅ 成功识别为无密码的老账号！');

  console.log('\n--- 测试 2: 首次登录使用弱密码 (应被拦截) ---');
  const weakResult = await TrialService.loginTrial({
    phone: testPhone,
    password: 'short'
  });
  console.log('Weak password result:', weakResult.error);
  if (weakResult.success) {
    throw new Error('弱密码应该被拒绝！');
  }
  console.log('✅ 弱密码被成功拦截！');

  console.log('\n--- 测试 3: 首次登录使用缺少大写字母密码 (应被拦截) ---');
  const noUpperResult = await TrialService.loginTrial({
    phone: testPhone,
    password: 'lowercase12345'
  });
  console.log('No uppercase result:', noUpperResult.error);
  if (noUpperResult.success) {
    throw new Error('缺少大写字母应该被拒绝！');
  }
  console.log('✅ 缺少大写字母被成功拦截！');

  console.log('\n--- 测试 4: 首次登录使用合规新密码 (应成功绑定并登入) ---');
  const bindResult = await TrialService.loginTrial({
    phone: testPhone,
    password: 'Password2026!'
  });
  console.log('Bind result:', bindResult.message, 'Token exists:', !!bindResult.token, 'isLegacyBound:', bindResult.isLegacyBound);
  if (!bindResult.success || !bindResult.isLegacyBound) {
    throw new Error('首次登录应当绑定成功！');
  }
  console.log('✅ 首次登录自动绑定成功！');

  console.log('\n--- 测试 5: 检查账号状态 (此时应标记为 hasPassword: true) ---');
  const statusAfter = TrialService.checkAccountStatus(testPhone);
  console.log('Status after:', statusAfter);
  if (!statusAfter.exists || !statusAfter.hasPassword) {
    throw new Error('绑定后应当标记为 hasPassword: true！');
  }
  console.log('✅ 状态已成功更新为 hasPassword: true！');

  console.log('\n--- 测试 6: 再次登录使用错误密码 (应被拒绝) ---');
  const wrongLogin = await TrialService.loginTrial({
    phone: testPhone,
    password: 'WrongPassword2026'
  });
  if (wrongLogin.success) {
    throw new Error('错误密码应当被拒绝！');
  }
  console.log('✅ 错误密码被正确拒绝！');

  console.log('\n--- 测试 7: 再次登录使用已绑定的密码 (应成功登入) ---');
  const normalLogin = await TrialService.loginTrial({
    phone: testPhone,
    password: 'Password2026!'
  });
  if (!normalLogin.success || normalLogin.isLegacyBound) {
    throw new Error('正式登录应当成功且不再是首次绑定！');
  }
  console.log('✅ 正式登录成功！');

  // 清理测试账号
  const cleanTrials = TrialService.getAllTrials().filter(t => t.phone !== testPhone);
  TrialService.saveTrials(cleanTrials);
  console.log(`🧹 测试完成，已清理临时测试账号 ${testPhone}！`);

  console.log('\n🎉 所有存量老账号初次登录绑定密码与鉴权测试 100% 通过！');
}

testLegacyFlow().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
