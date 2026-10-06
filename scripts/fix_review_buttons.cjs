const fs = require('fs');

let content = fs.readFileSync('public/review.html', 'utf8');

// 1. Where button has title="...", inject aria-label="..." if not already present
content = content.replace(/<button([^>]*?)title="([^"]+)"([^>]*?)>/gi, (match, p1, title, p2) => {
  if (/aria-label=/i.test(match)) {
    return match;
  }
  return `<button${p1}title="${title}" aria-label="${title}"${p2}>`;
});

// 2. Specific modal close & utility buttons that didn't have title
const specificReplacements = [
  {
    target: '<button @click="descModal.show = false"',
    replacement: '<button @click="descModal.show = false" aria-label="关闭商品规格详情窗口"'
  },
  {
    target: '<button @click="closeTermsModal"',
    replacement: '<button @click="closeTermsModal" aria-label="关闭条款编辑窗口"'
  },
  {
    target: '<button @click="closeCatalogModal"',
    replacement: '<button @click="closeCatalogModal" aria-label="关闭底价库选型窗口"'
  },
  {
    target: '<button v-if="catalogModal.search" @mousedown.prevent="catalogModal.search = \'\'"',
    replacement: '<button v-if="catalogModal.search" @mousedown.prevent="catalogModal.search = \'\'" aria-label="清空搜索内容"'
  },
  {
    target: '<button @click="newPoModal.show = false"',
    replacement: '<button @click="newPoModal.show = false" aria-label="关闭询盘导入窗口"'
  },
  {
    target: '<button @click="pricingModal.show = false"',
    replacement: '<button @click="pricingModal.show = false" aria-label="关闭底价表更新窗口"'
  },
  {
    target: '<button @click="imapModal.show = false"',
    replacement: '<button @click="imapModal.show = false" aria-label="关闭邮箱守护配置窗口"'
  },
  {
    target: '<button @click="logoutModal.show = false"',
    replacement: '<button @click="logoutModal.show = false" aria-label="关闭退出登录确认窗口"'
  },
  {
    target: '<button @click="upgradeModal.show = false"',
    replacement: '<button @click="upgradeModal.show = false" aria-label="关闭升级方案窗口"'
  },
  {
    target: '<button @click="trialModal.show = false"',
    replacement: '<button @click="trialModal.show = false" aria-label="关闭账号弹窗"'
  },
  {
    target: '<button type="button" @click="trialModal.showPassword = !trialModal.showPassword"',
    replacement: '<button type="button" @click="trialModal.showPassword = !trialModal.showPassword" aria-label="切换密码显示状态"'
  },
  {
    target: '<button @click="closeReferralShareModal"',
    replacement: '<button @click="closeReferralShareModal" aria-label="关闭同行推荐分享窗口"'
  },
  {
    target: '<button @click="logoModal.show = false"',
    replacement: '<button @click="logoModal.show = false" aria-label="关闭企业Logo配置窗口"'
  }
];

specificReplacements.forEach(({ target, replacement }) => {
  if (content.includes(target) && !content.includes(replacement)) {
    content = content.replace(target, replacement);
  }
});

fs.writeFileSync('public/review.html', content, 'utf8');
console.log('review.html updated.');
