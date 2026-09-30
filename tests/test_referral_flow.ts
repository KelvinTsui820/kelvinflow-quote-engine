import { TrialService } from '../src/services/trial.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('🧪 开始测试【推荐同行裂变 + 租户升级核销全链路】...\n');

  // 1. 用户 A (老用户/推荐人) 注册试用
  console.log('--- 步骤 1: 用户 A (13800000001) 注册 7 天试用 ---');
  const regA = await TrialService.registerOrLoginTrial({
    phone: '13800000001',
    email: 'userA@trade.com',
    name: '张三 (汽配外贸)',
    company: '张三外贸工作室'
  });
  console.log('用户 A 注册结果:', regA.success, regA.message);
  const trialA1 = TrialService.findTrialByPhoneOrEmail('13800000001');
  console.log('用户 A 初始到期时间:', trialA1?.expiresAt);

  // 2. 用户 B 通过用户 A 的邀请链接 (ref: 13800000001) 注册
  console.log('\n--- 步骤 2: 用户 B (13800000002) 通过 A 的邀请码注册 ---');
  const regB = await TrialService.registerOrLoginTrial({
    phone: '13800000002',
    email: 'userB@trade.com',
    name: '李四 (家具外贸)',
    ref: '13800000001'
  });
  console.log('用户 B 注册结果:', regB.success, regB.message);

  const trialA2 = TrialService.findTrialByPhoneOrEmail('13800000001');
  const trialB1 = TrialService.findTrialByPhoneOrEmail('13800000002');
  console.log('用户 A 推荐好友注册后到期时间 (应延长7天):', trialA2?.expiresAt, '奖励累计天数:', trialA2?.rewardDays);
  console.log('用户 B 邀请人记录:', trialB1?.referredBy);

  // 3. 用户 B 微信转账 129 元，管理员执行极速升级核销
  console.log('\n--- 步骤 3: 管理员核销升级用户 B 为【个人极客版】月付 ---');
  const upgradeB = TrialService.upgradeTenantToPaid({
    phoneOrEmail: '13800000002',
    plan: 'geek',
    months: 1,
    amountPaid: 129,
    note: '微信转账129元'
  });
  console.log('用户 B 升级核销结果:', upgradeB.success, upgradeB.message);
  console.log('是否触发推荐人裂变返赠:', upgradeB.referrerReward);

  const trialA3 = TrialService.findTrialByPhoneOrEmail('13800000001');
  console.log('用户 A 最终到期时间 (好友付费后再+30天):', trialA3?.expiresAt, '累计奖励天数:', trialA3?.rewardDays);

  console.log('\n🎉 所有验证完成！');
}

runTest().catch(console.error);
