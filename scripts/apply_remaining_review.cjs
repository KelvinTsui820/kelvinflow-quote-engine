const fs = require('fs');

const reviewHtmlPath = 'public/review.html';
let content = fs.readFileSync(reviewHtmlPath, 'utf-8').replace(/\r\n/g, '\n');

// 1. 检查邮件主题和正文的一键复制按钮
if (!content.includes('copyEmailSubject')) {
  console.log('Replacing subject/body section...');
  const oldSubjectSection = `                <div>
                  <label class="block text-[11px] text-slate-500 font-bold mb-1">邮件主题 (Subject):</label>
                  <input v-model="editableEmailSubject" class="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 font-mono transition outline-none">
                </div>

                <div>
                  <label class="block text-[11px] text-slate-500 font-bold mb-1">邮件正文 (可直接修改、个性化定制):</label>
                  <textarea v-model="editableEmailBody" rows="10" class="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl p-3 text-xs text-slate-800 font-mono leading-relaxed transition resize-y shadow-inner outline-none"></textarea>
                </div>`;

  const newSubjectSection = `                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-[11px] text-slate-500 font-bold">邮件主题 (Subject):</label>
                    <button type="button" @click="copyEmailSubject" class="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition active:scale-95 cursor-pointer border border-blue-200" title="一键复制邮件主题">
                      <i class="fa-regular fa-copy"></i>
                      <span>复制主题</span>
                    </button>
                  </div>
                  <input v-model="editableEmailSubject" class="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 font-mono transition outline-none">
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-[11px] text-slate-500 font-bold">邮件正文 (可直接修改、个性化定制):</label>
                    <button type="button" @click="copyEmailBodyOnly" class="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition active:scale-95 cursor-pointer border border-blue-200" title="一键复制纯英文邮件正文">
                      <i class="fa-regular fa-copy"></i>
                      <span>复制正文</span>
                    </button>
                  </div>
                  <textarea v-model="editableEmailBody" rows="10" class="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl p-3 text-xs text-slate-800 font-mono leading-relaxed transition resize-y shadow-inner outline-none"></textarea>
                </div>`;

  if (content.includes(oldSubjectSection)) {
    content = content.replace(oldSubjectSection, newSubjectSection);
    console.log('✅ 成功加入主题与正文的一键复制小按钮！');
  } else {
    console.warn('⚠️ oldSubjectSection 未匹配，正在通过正则替换...');
    content = content.replace(
      /<label class="block text-\[11px\] text-slate-500 font-bold mb-1">邮件主题 \(Subject\):<\/label>/,
      `<div class="flex items-center justify-between mb-1">
                    <label class="block text-[11px] text-slate-500 font-bold">邮件主题 (Subject):</label>
                    <button type="button" @click="copyEmailSubject" class="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition active:scale-95 cursor-pointer border border-blue-200" title="一键复制邮件主题">
                      <i class="fa-regular fa-copy"></i>
                      <span>复制主题</span>
                    </button>
                  </div>`
    );
    content = content.replace(
      /<label class="block text-\[11px\] text-slate-500 font-bold mb-1">邮件正文 \(可直接修改、个性化定制\):<\/label>/,
      `<div class="flex items-center justify-between mb-1">
                    <label class="block text-[11px] text-slate-500 font-bold">邮件正文 (可直接修改、个性化定制):</label>
                    <button type="button" @click="copyEmailBodyOnly" class="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition active:scale-95 cursor-pointer border border-blue-200" title="一键复制纯英文邮件正文">
                      <i class="fa-regular fa-copy"></i>
                      <span>复制正文</span>
                    </button>
                  </div>`
    );
    console.log('✅ 正则替换主题与正文小按钮成功！');
  }
}

// 2. 检查底部主按钮
if (!content.includes('直达邮件草稿箱')) {
  console.log('Replacing bottom button...');
  const oldBottomButton = `          <!-- 触发二次确认弹窗的按钮 (第 3 步引导目标，统一采用 Logo 深海钴蓝) -->
          <button id="tour-step-3" @click="openConfirmModal" :disabled="saving" class="flex-2 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-95 transition disabled:opacity-50 whitespace-nowrap cursor-pointer">
            <i class="fa-solid fa-bolt mr-1.5 sm:mr-2 text-xs sm:text-sm text-blue-200"></i>
            <span class="hidden sm:inline">⚡ 确认无误，一键出单 (生成 PDF 与邮件)</span>
            <span class="sm:hidden">⚡ 一键出单</span>
          </button>`;

  const newBottomButton = `          <!-- 触发二次确认弹窗的按钮 (区分试用版下载复制 vs 付费版直达草稿箱) -->
          <button id="tour-step-3" @click="openConfirmModal" :disabled="saving" 
                  class="flex-2 sm:flex-none inline-flex items-center justify-center px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg active:scale-95 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  :class="isPaidUser ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-600/30 ring-2 ring-amber-400/40' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'">
            <template v-if="isPaidUser">
              <i class="fa-solid fa-paper-plane mr-1.5 sm:mr-2 text-xs sm:text-sm text-amber-300"></i>
              <span class="hidden sm:inline">🚀 确认无误，直达邮件草稿箱 (Foxmail/企业邮)</span>
              <span class="sm:hidden">🚀 直达草稿箱</span>
            </template>
            <template v-else>
              <i class="fa-solid fa-bolt mr-1.5 sm:mr-2 text-xs sm:text-sm text-blue-200"></i>
              <span class="hidden sm:inline">⚡ 确认无误，一键出单 (下载 PDF 与复制英文邮件)</span>
              <span class="sm:hidden">⚡ 下载PDF/复制邮件</span>
            </template>
          </button>`;

  if (content.includes(oldBottomButton)) {
    content = content.replace(oldBottomButton, newBottomButton);
    console.log('✅ 成功替换底部浮动栏出单主按钮！');
  } else {
    console.warn('⚠️ oldBottomButton 未匹配，正在通过正则替换...');
    content = content.replace(
      /<button id="tour-step-3" @click="openConfirmModal"[\s\S]*?<\/button>/,
      newBottomButton.trim()
    );
    console.log('✅ 正则替换底部主按钮成功！');
  }
}

// 3. 检查 IMAP 弹窗中的安全指引
if (!content.includes('微信安全提示与防风控指引')) {
  console.log('Inserting WeChat safety tip in IMAP modal...');
  const tipHtml = `\n          <!-- 💡 首次绑定防风控与微信信任设备安全提示 -->
          <div class="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 text-xs text-slate-800 space-y-1.5 shadow-xs">
            <div class="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
              <i class="fa-solid fa-shield-halved text-blue-600"></i>
              <span>微信安全提示与防风控指引 (极客必看)：</span>
            </div>
            <div class="text-[11px] text-slate-600 leading-relaxed">
              首次绑定成功后，您的企业微信或个人微信可能会收到企业邮箱的安全提醒（如：检测到新客户端在海外登录）。<strong>请在手机上点击【是本人操作 / 信任此设备】</strong>，后续即可永久开启全自动静默草稿同步，绝无封号风险！
            </div>
          </div>`;

  content = content.replace(
    /v-model="imapModal\.authCode"[\s\S]*?<\/div>/,
    match => match + tipHtml
  );
  console.log('✅ 成功插入微信安全防风控指引卡片！');
}

fs.writeFileSync(reviewHtmlPath, content, 'utf-8');
console.log('🎉 review.html 补充更新完毕！');
