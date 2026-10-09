import { TrialService } from '../src/services/trial.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { NotificationService } from '../src/services/notification.service.js';
import fs from 'fs';
import path from 'path';

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🧪 开始执行 KelvinFlow 认证安全、渠道归因与核销全链路端到端自动化测试');
  console.log('================================================================\n');

  const trialsBackupPath = path.resolve(process.cwd(), 'data', 'trials.json.bak');
  const trialsPath = path.resolve(process.cwd(), 'data', 'trials.json');

  if (fs.existsSync(trialsPath)) {
    fs.copyFileSync(trialsPath, trialsBackupPath);
  }

  TrialService.saveTrials([]);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log('  ✅ [PASS] ' + testName);
    } else {
      console.error('  ❌ [FAIL] ' + testName + ' - ' + (detail || 'Assertion failed'));
    }
  }

  process.env.BYPASS_VERIFICATION_CODE = 'true';
  try {
    console.log('--- 测试集 1: 注册参数与高强度密码复杂度强制校验 ---');
    
    const resNoPwd = await TrialService.registerOrLoginTrial({
      phone: '13811110001',
      email: 'test1@acme.com',
      channelSource: '小红书'
    });
    assert(!resNoPwd.success && (resNoPwd.error?.includes('密码') ?? false), '禁止无密码免密注册 (防止手机号泄露即被盗号)');

    // 1.1 长度少于 6 位
    const resShortPwd = await TrialService.registerOrLoginTrial({
      phone: '13811110001',
      email: 'test1@acme.com',
      password: 'Aa1!',
      channelSource: '小红书'
    });
    assert(!resShortPwd.success && (resShortPwd.error?.includes('6') ?? false), '禁止 6 位以下弱密码注册 (必须 >= 6 位)');

    // 1.2 边界测试：5 位弱密码拒绝
    const res5CharPwd = await TrialService.registerOrLoginTrial({
      phone: '13811110001',
      email: 'test1@acme.com',
      password: '12345',
      channelSource: '小红书'
    });
    assert(!res5CharPwd.success && (res5CharPwd.error?.includes('6') ?? false), '5 位弱密码必须严格拒绝');

    // 1.3 灵活组合验证：只要长度 >= 6 位即可通过
    const resUpperNoLower = TrialService.validatePasswordComplexity('PASSWORD123!');
    assert(resUpperNoLower.valid === true, '密码允许全大写+数字+符号 (不强行要求小写字母)');

    const resUpperNoDigit = TrialService.validatePasswordComplexity('PasswordLetters');
    assert(resUpperNoDigit.valid === true, '密码允许纯英文字母 (不强行要求数字与符号)');

    const resUpperNoSymbol = TrialService.validatePasswordComplexity('Password12345');
    assert(resUpperNoSymbol.valid === true, '密码允许字母+数字 (不强行要求特殊符号)');

    const resInvalidEmail = await TrialService.registerOrLoginTrial({
      phone: '13811110001',
      email: 'invalid-email',
      password: 'Password123!',
      channelSource: '小红书'
    });
    assert(!resInvalidEmail.success && (resInvalidEmail.error?.includes('邮箱') ?? false), '禁止非法邮箱格式注册');

    console.log('\n--- 测试集 2: 新用户自主注册与渠道归因 ---');
    const resRegA = await TrialService.registerOrLoginTrial({
      phone: '13811110001',
      email: 'founderA@factory.com',
      password: 'SecurePassword2026!',
      channelSource: '小红书',
      name: '张总 (汽配外贸)',
      company: '佛山新动力汽配'
    });

    assert(resRegA.success === true, '新用户自主注册成功');
    assert(!!resRegA.token, '注册成功自动颁发安全 JWT Token');
    assert(resRegA.remainingDays === 7, '初始试用期为 7 天');

    const trialA = TrialService.findTrialByPhoneOrEmail('13811110001');
    assert(!!trialA, '注册记录已持久化到账本');
    assert(trialA?.channelSource === '小红书', '得知渠道精确归因为【小红书】');
    assert(trialA?.passwordHash !== 'SecurePassword2026!', '密码绝不以明文存储');
    assert(trialA?.passwordHash === TrialService.hashPassword('SecurePassword2026!'), '密码严格采用 SHA-256 加盐哈希');

    console.log('\n--- 测试集 3: 防冒领拦截 - 已存在账号阻断二次注册 ---');
    const resDupReg = await TrialService.registerOrLoginTrial({
      phone: '13811110001',
      email: 'hacker@steal.com',
      password: 'AttackerNewPassword2026!',
      channelSource: '抖音'
    });

    assert(resDupReg.success === false, '阻断相同手机号重复注册覆盖');
    assert(resDupReg.canLogin === true, '友好引导切换至已有账号密码登录');

    const trialAAfterDup = TrialService.findTrialByPhoneOrEmail('13811110001');
    assert(trialAAfterDup?.passwordHash === TrialService.hashPassword('SecurePassword2026!'), '原账户密码与数据未被覆盖篡改');

    console.log('\n--- 测试集 4: 密码登录鉴权测试 ---');
    
    const resLoginWrong = await TrialService.loginTrial({
      phone: '13811110001',
      password: 'WrongPassword!'
    });
    assert(!resLoginWrong.success && (resLoginWrong.error?.includes('密码错误') ?? false), '错误密码登录被严密拒绝');

    const resLoginCorrect = await TrialService.loginTrial({
      phone: '13811110001',
      password: 'SecurePassword2026!'
    });
    assert(resLoginCorrect.success === true, '正确密码成功登入');
    assert(!!resLoginCorrect.token, '登录成功返回有效 Token');
    assert(resLoginCorrect.remainingDays === 7, '返回当前账户正确剩余有效天数');

    console.log('\n--- 测试集 5: 同行推荐裂变与双向激励 ---');
    const resRegB = await TrialService.registerOrLoginTrial({
      phone: '13822220002',
      email: 'peerB@furniture.com',
      password: 'PeerPassword888!',
      channelSource: '同行/朋友推荐',
      name: '李总 (家具外贸)',
      ref: '13811110001'
    });

    assert(resRegB.success === true, '受邀同行用户 B 注册成功');
    assert(resRegB.remainingDays === 7, '受邀用户 B 享受标准 7 天免费试用');

    const trialB = TrialService.findTrialByPhoneOrEmail('13822220002');
    assert(trialB?.referredBy === '13811110001', '推荐人关系已绑定');

    const trialAAfterRef = TrialService.findTrialByPhoneOrEmail('13811110001');
    const aExpectedDays = Math.ceil((new Date(trialAAfterRef!.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    assert(trialAAfterRef?.rewardDays === 7, '推荐人用户 A 成功累加 7 天推荐奖励');
    assert(aExpectedDays >= 13, '推荐人用户 A 有效期顺延 +7 天');

    console.log('\n--- 测试集 6: 创始人一键核销与付费升级 (+30天转正激励) ---');
    const upgradeRes = TrialService.upgradeTenantToPaid({
      phoneOrEmail: '13822220002',
      plan: 'geek',
      months: 12,
      amountPaid: 1290,
      note: '年付极客版微信收款1290元'
    });

    assert(upgradeRes.success === true, '创始人成功核销升级用户 B 为极客版');
    assert(upgradeRes.trial?.paidPlan === 'geek', '用户 B 套餐标记为 geek');
    assert(upgradeRes.trial?.status === 'converted', '用户 B 状态流转为 converted 付费用户');

    assert(!!upgradeRes.referrerReward, '系统成功侦测并触发推荐人付费转正激励');
    assert(upgradeRes.referrerReward?.addedDays === 30, '推荐人获赠整整 30 天极客版服务');

    const trialAFinal = TrialService.findTrialByPhoneOrEmail('13811110001');
    assert(trialAFinal?.rewardDays === 37, '推荐人累计获得 7+30=37 天免费奖励');

    console.log('\n--- 测试集 7: 防薅羊毛拦截机制 ---');
    const userCRecord = {
      id: 'trial_wool_puller',
      phone: '13899990000',
      email: 'wool@free.com',
      passwordHash: TrialService.hashPassword('Wool123456!'),
      name: '薅羊毛测试',
      company: '羊毛工作室',
      category: '通用外贸',
      tenantId: 'tenant_trial_13899990000',
      userId: 'usr_trial_13899990000',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      status: 'expired' as const
    };
    const trialsList = TrialService.getAllTrials();
    trialsList.push(userCRecord);
    TrialService.saveTrials(trialsList);

    const resWoolReg = await TrialService.registerOrLoginTrial({
      phone: '13899990000',
      email: 'wool@free.com',
      password: 'WoolNewPassword2026!',
      channelSource: '小红书'
    });
    assert(resWoolReg.success === false, '阻断过期用户再次申请免费试用');
    assert(resWoolReg.expired === true, '明确标记为 TRIAL_EXPIRED 状态');

    const resWoolLogin = await TrialService.loginTrial({
      phone: '13899990000',
      password: 'Wool123456!'
    });
    assert(resWoolLogin.success === false && resWoolLogin.expired === true, '过期用户登录阻断出单，引导升级极客版');

    console.log('\n--- 测试集 8: 留资与微信通知字段真实性审计 ---');
    const mockLead = {
      customerName: '张总',
      companyName: '佛山新动力汽配',
      phone: '13811110001',
      email: 'founderA@factory.com',
      channelSource: '小红书',
      ref: '13800000000'
    };
    NotificationService.saveLeadLocally(mockLead);
    const leadsFile = path.resolve(process.cwd(), 'data', 'inbound_leads.json');
    const leadsList = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
    const latestLeads = leadsList.slice(0, 3);
    const latestStr = JSON.stringify(latestLeads);
    assert(latestStr.includes('小红书'), '留资记录完整记录得知渠道');
    assert(!latestStr.includes('外贸业务员') && !latestStr.includes('外贸工作室'), '新增留资记录彻底剔除假写死字段');

    console.log('\n--- 测试集 9: 创始人特权账号一键开通 (终身VIP与自定义赠送天数) ---');
    // 9.1 一键开通好友终身 VIP
    const vipRes = TrialService.upgradeTenantToPaid({
      phoneOrEmail: '13988889999',
      name: '特邀王总',
      company: '佛山宏达进出口',
      isVip: true,
      autoCreate: true
    });
    assert(vipRes.success === true, '创始人一键开通好友终身 VIP 成功');
    assert(vipRes.isNewAccount === true, '自动为未注册好友完成开户');
    assert(vipRes.trial?.paidPlan === 'geek', '特权 VIP 享受个人极客版全套功能');
    const vipDays = Math.ceil((new Date(vipRes.trial!.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    assert(vipDays > 9900, '终身 VIP 有效期大于 9900 天 (约 27+ 年)');
    assert(!!vipRes.initialPassword, '系统自动分配符合安全标准的初始密码');

    // 9.2 验证该好友能使用初始密码直接登录
    const vipLoginRes = await TrialService.loginTrial({
      phone: '13988889999',
      password: vipRes.initialPassword!
    });
    assert(vipLoginRes.success === true, '特邀好友可凭初始密码直接登入系统');
    assert(vipLoginRes.remainingDays! > 9900, '登录返回的剩余天数为终身 VIP');

    // 9.3 自定义天数赠送 (如赠送 60 天互助测试)
    const customDaysRes = TrialService.upgradeTenantToPaid({
      phoneOrEmail: '13877776666',
      name: '测试李总',
      extendDays: 60,
      autoCreate: true
    });
    assert(customDaysRes.success === true, '自定义赠送天数开户成功');
    const grantedDays = Math.ceil((new Date(customDaysRes.trial!.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    assert(grantedDays >= 59 && grantedDays <= 61, '自定义赠送天数严格为 60 天');

    console.log('\n================================================================');
    console.log('📊 测试完成：共执行 ' + totalTests + ' 个断言，通过 ' + passedTests + ' 个，失败 ' + (totalTests - passedTests) + ' 个');
    console.log('================================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 恭喜！所有业务安全与出单闭环用例 100% PASS！');
    }

  } finally {
    if (fs.existsSync(trialsBackupPath)) {
      fs.copyFileSync(trialsBackupPath, trialsPath);
      fs.unlinkSync(trialsBackupPath);
    }
  }
}

runComprehensiveTests().catch(err => {
  console.error('测试运行异常:', err);
  process.exit(1);
});
