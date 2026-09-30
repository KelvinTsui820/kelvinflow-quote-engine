const fs = require('fs');

const file = 'public/review.html';
let content = fs.readFileSync(file, 'utf-8');
const isCrlf = content.includes('\r\n');
if (isCrlf) content = content.replace(/\r\n/g, '\n');

// =========================================================================
// 1. 顶部导航栏「邮件联动」按钮仅付费极客可见，试用用户不展示
// =========================================================================
const oldNavMailBtn = `        <!-- 📬 邮件联动设置 (可选扩展) -->
        <button @click="openImapModal" class="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 active:scale-95 transition cursor-pointer whitespace-nowrap flex-shrink-0 text-xs" title="查看专属询盘接收邮箱或设置日常邮箱草稿箱自动注入">
          <i class="fa-solid fa-envelope text-emerald-400 text-xs"></i>
          <span class="hidden sm:inline">邮件联动</span>
        </button>`;

const newNavMailBtn = `        <!-- 📬 邮件联动设置 (仅付费极客模式展示，试用用户零干扰) -->
        <button v-if="isPaidUser" @click="openImapModal" class="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 active:scale-95 transition cursor-pointer whitespace-nowrap flex-shrink-0 text-xs" title="设置 Foxmail / 企业邮箱发件草稿箱自动直达">
          <i class="fa-solid fa-crown text-amber-400 text-xs"></i>
          <span class="hidden sm:inline">草稿箱配置</span>
        </button>`;

if (content.includes(oldNavMailBtn)) {
  content = content.replace(oldNavMailBtn, newNavMailBtn);
  console.log('✅ [1/8] 成功优化顶部导航草稿箱配置按钮展示逻辑！');
} else {
  console.log('⚠️ [1/8] oldNavMailBtn 未完全匹配，跳过或已修改');
}

// =========================================================================
// 2. 第一行卡片：INCOTERM 快捷胶囊单行化，防止换行拉高导致卡片 1、2 空白
// =========================================================================
const oldTermsHtml = `                <!-- 4大高频外贸常用快捷胶囊，点击一键秒切 (KelvinFlow 官方深海钴蓝) -->
                <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span class="text-[10px] text-slate-400 font-medium mr-0.5">快捷:</span>
                  <button v-for="term in quickTerms" :key="term.val"
                          type="button"
                          @click="quotation.incotermUsed = term.val"
                          class="px-2 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer"
                          :class="quotation.incotermUsed === term.val ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/25' : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-600 border-slate-200'">
                    {{ term.label }}
                  </button>
                </div>`;

const newTermsHtml = `                <!-- 4大高频外贸常用快捷胶囊，点击一键秒切 (单行紧凑排版，彻底杜绝换行拉高) -->
                <div class="flex items-center gap-1 pt-1 overflow-x-auto whitespace-nowrap">
                  <span class="text-[10px] text-slate-400 font-medium mr-0.5 flex-shrink-0">快捷:</span>
                  <button v-for="term in quickTerms" :key="term.val"
                          type="button"
                          @click="quotation.incotermUsed = term.val"
                          class="px-1.5 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer flex-shrink-0"
                          :class="quotation.incotermUsed === term.val ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/25' : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-600 border-slate-200'">
                    {{ term.label }}
                  </button>
                </div>`;

if (content.includes(oldTermsHtml)) {
  content = content.replace(oldTermsHtml, newTermsHtml);
  console.log('✅ [2/8] 成功优化 INCOTERM 快捷胶囊排版，杜绝折行！');
} else {
  console.log('⚠️ [2/8] oldTermsHtml 未匹配');
}

// 优化卡片 5 底部文案，区分试用与付费
const oldCard5Hint = `<span>出单后自动同步写入企业邮箱草稿</span>`;
const newCard5Hint = `<span>{{ isPaidUser ? '出单后自动同步写入企业邮箱草稿箱' : '买家询盘回信发送目标邮箱' }}</span>`;
if (content.includes(oldCard5Hint)) {
  content = content.replace(oldCard5Hint, newCard5Hint);
  console.log('✅ [3/8] 成功优化买家邮箱底部提示文案！');
}

// =========================================================================
// 3. 彻底重构 IMAP 弹窗：剔除「模式A: 极简邮件转发/专属 rfq-xxx 邮箱」所有内容
// =========================================================================
const oldImapModalStart = `    <!-- 3. 📬 个人草稿箱静默写入与企业邮箱自动转发配置 (IMAP Modal - Track B 进阶极客版) -->
    <div v-if="imapModal.show" v-cloak class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-lg shadow-xs">
              <i class="fa-solid fa-envelope-circle-check"></i>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base font-black text-slate-900">日常邮箱与出单联动 (可选设置)</h3>
                <span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="imapModal.savedConfig?.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'">
                  <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="imapModal.savedConfig?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></span>
                  {{ imapModal.savedConfig?.enabled ? '已激活自动注入' : '免密转发即用' }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">平时怎么收发邮件现在就怎么用。支持【极简邮件转发】与【进阶草稿箱直写】</p>
            </div>
          </div>
          <button @click="imapModal.show = false" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- 核心 Tab 切换栏 (类似 newPoModal，直观分明，极低认知负荷) -->
        <div class="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
          <button type="button" @click="imapModal.tab = 'forward'"
                  class="py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  :class="imapModal.tab === 'forward' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
            <i class="fa-solid fa-bolt text-amber-500 text-xs"></i>
            <span>极简邮件转发 (推荐 · 0门槛免密)</span>
          </button>
          <button type="button" @click="imapModal.tab = 'draft'"
                  class="py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  :class="imapModal.tab === 'draft' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
            <i class="fa-solid fa-inbox text-emerald-500 text-xs"></i>
            <span>进阶草稿直写 (可选 · 需授权码)</span>
          </button>
        </div>

        <!-- TAB 1: 极简邮件转发模式 (官方推荐 · 0门槛 · 免密免配) -->
        <div v-if="imapModal.tab === 'forward'" class="space-y-4">
          <!-- 专属转发地址卡片 -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 flex items-center">
                <i class="fa-solid fa-paper-plane mr-1.5 text-blue-600"></i>您的专属外贸询盘解析邮箱 (直接转发即可)
              </span>
              <span class="text-[10px] text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                7×24h 自动接收
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <input readonly :value="inboundForwardEmail" class="header-input bg-white font-mono text-xs sm:text-sm font-bold text-blue-700 flex-1 cursor-default select-all py-2">
              <button @click="copyForwardEmail" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shadow-blue-500/25 cursor-pointer">
                <i class="fa-regular fa-copy"></i>
                <span>复制邮箱</span>
              </button>
            </div>
          </div>

          <!-- 3 步极简使用流程 -->
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
            <div class="font-bold text-slate-900 flex items-center space-x-1.5">
              <i class="fa-solid fa-wand-magic-sparkles text-blue-600"></i>
              <span>极简转发使用步骤（平时怎么收发邮件就怎么用）：</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div class="font-mono text-blue-600 font-bold text-xs">01. 收到询盘</div>
                <div class="text-[11px] text-slate-500">客户发来带 PDF / Excel 附件或邮件正文询盘</div>
              </div>
              <div class="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div class="font-mono text-blue-600 font-bold text-xs">02. 一键转发</div>
                <div class="text-[11px] text-slate-500">在 Foxmail/邮箱中将该信转发至上方专属地址</div>
              </div>
              <div class="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div class="font-mono text-emerald-600 font-bold text-xs">03. 90秒核端</div>
                <div class="text-[11px] text-slate-500">系统自动折算底价与排柜，在审单台秒级出单</div>
              </div>
            </div>
          </div>

          <!-- 零门槛安全承诺 -->
          <div class="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed">
            <strong>零门槛安全保障：</strong>此模式完全无需输入任何邮箱密码或授权码，系统仅解析您主动转发的询盘附件与明细，不触碰您的日常软件隐私，最简单、最安全！
          </div>
        </div>

        <!-- TAB 2: 进阶草稿箱直写模式 (需授权码) -->
        <div v-else class="space-y-4">`;

const newImapModalStart = `    <!-- 3. 📬 极客专属特权 · 绑定 Foxmail / 企业邮箱发件草稿箱 (IMAP Modal) -->
    <div v-if="imapModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-lg shadow-xs">
              <i class="fa-solid fa-crown"></i>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base font-black text-slate-900">👑 极客特权 · 绑定企业邮箱发件草稿箱</h3>
                <span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="imapModal.savedConfig?.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'">
                  <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="imapModal.savedConfig?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'"></span>
                  {{ imapModal.savedConfig?.enabled ? '已激活草稿直达' : '待绑定授权码' }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">绑定客户端专用授权码，老外询盘出单自动将买家地址、回信与 PDF 写入 Foxmail 草稿箱，点开即发！</p>
            </div>
          </div>
          <button @click="imapModal.show = false" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- 纯净草稿直写表单 (无需切换 Tab，专注配置授权码) -->
        <div class="space-y-4">`;

if (content.includes(oldImapModalStart)) {
  content = content.replace(oldImapModalStart, newImapModalStart);
  console.log('✅ [4/8] 成功移除「极简邮件转发」旧逻辑，将 IMAP 弹窗纯净化为极客草稿箱直达！');
} else {
  console.log('⚠️ [4/8] oldImapModalStart 未匹配');
}

// 移除 v-cloak 从 child modals: referralModal, imapModal, showConfirmModal, successModal
content = content.replace('<div v-if="referralModal.show" v-cloak', '<div v-if="referralModal.show"');
content = content.replace('<div v-if="showConfirmModal" v-cloak', '<div v-if="showConfirmModal"');
content = content.replace('<div v-if="successModal.show" v-cloak', '<div v-if="successModal.show"');
console.log('✅ [5/8] 成功清除子模态框上的多余 v-cloak 属性，杜绝遮蔽！');

// =========================================================================
// 4. 新手引导第 3 步：改为 computed 动态响应 isPaidUser
// =========================================================================
const oldTourStepsDef = `        const tourSteps = [
          {
            step: 1,
            targetId: 'tour-step-1',
            badge: '步骤 1/3 · 基础配置',
            title: '配置产品底价库',
            description: '上传你的 Excel 底价表。底价加密保存在你的专属私有空间，自动联动算价防错保提成，安全不外泄。',
            tip: '💡 系统已内置演示底价，无需配置即可直接体验。',
            placement: 'bottom'
          },
          {
            step: 2,
            targetId: 'tour-step-2',
            badge: '步骤 2/3 · 智能建单',
            title: '上传客户询盘建单',
            description: '拖入买家真实 PDF、Excel 或询盘正文，AI 秒级智能识别型号与数量，自动联动底价库精准核算。当前工作台展示的是 Acme 买家询盘演示样例，您可以随时点击上方「上传新询盘」测试您自家的真实单据！',
            tip: '💡 当前页面为预置的免配置演示单据，支持随意修改单价与利润体验。',
            placement: 'bottom'
          },
          {
            step: 3,
            targetId: 'tour-step-3',
            badge: '步骤 3/3 · 一键出单',
            title: '确认毛利，一键出单',
            description: '确认目标利润率与汇率后，一键生成外贸标准商业 PDF 报价单，并同步写入企业邮箱英文回复草稿。',
            tip: '🎉 引导完成！点击按钮即可体验一键出单。',
            placement: 'top'
          }
        ];`;

const newTourStepsDef = `        const tourSteps = computed(() => [
          {
            step: 1,
            targetId: 'tour-step-1',
            badge: '步骤 1/3 · 基础配置',
            title: '配置产品底价库',
            description: '上传你的 Excel 底价表。底价加密保存在你的专属私有空间，自动联动算价防错保提成，安全不外泄。',
            tip: '💡 系统已内置演示底价，无需配置即可直接体验。',
            placement: 'bottom'
          },
          {
            step: 2,
            targetId: 'tour-step-2',
            badge: '步骤 2/3 · 智能建单',
            title: '上传客户询盘建单',
            description: '拖入买家真实 PDF、Excel 或询盘正文，AI 秒级智能识别型号与数量，自动联动底价库精准核算。当前工作台展示的是 Acme 买家询盘演示样例，您可以随时点击上方「上传新询盘」测试您自家的真实单据！',
            tip: '💡 当前页面为预置的免配置演示单据，支持随意修改单价与利润体验。',
            placement: 'bottom'
          },
          {
            step: 3,
            targetId: 'tour-step-3',
            badge: '步骤 3/3 · 一键出单',
            title: isPaidUser.value ? '确认毛利，直达草稿箱' : '确认毛利，一键出单',
            description: isPaidUser.value
              ? '确认目标利润率与汇率后，一键生成正式商业 PDF 报价单，并全自动静默直达 Foxmail/企业邮箱【发件草稿箱】，点开直接发送！'
              : '确认目标利润率与汇率后，一键生成外贸标准商业 PDF 报价单并自动下载，地道英文回信已一键复制到剪贴板，直接在常用邮箱中粘贴发送，零门槛出单。',
            tip: isPaidUser.value
              ? '👑 极客专属特权已就绪！点击按钮即可将报价单与英文回复存入草稿箱。'
              : '🎉 引导完成！点击按钮即可立即下载最新 PDF 报价单并复制英文回信。',
            placement: 'top'
          }
        ]);`;

if (content.includes(oldTourStepsDef)) {
  content = content.replace(oldTourStepsDef, newTourStepsDef);
  console.log('✅ [6/8] 成功将新手引导升级为 computed 动态区分试用与付费！');
} else {
  console.log('⚠️ [6/8] oldTourStepsDef 未匹配');
}

// 修正 quickTerms 数组标签，确保紧凑单行
const oldQuickTermsArr = `        const quickTerms = [
          { label: 'FOB 深圳', val: 'FOB Shenzhen Port' },
          { label: 'FOB 广州', val: 'FOB Guangzhou Nansha' },
          { label: 'EXW 工厂出厂', val: 'EXW Factory' },
          { label: 'CIF 目的港', val: 'CIF Destination Port' }
        ];`;

const newQuickTermsArr = `        const quickTerms = [
          { label: 'FOB深圳', val: 'FOB Shenzhen Port' },
          { label: 'FOB广州', val: 'FOB Guangzhou Nansha' },
          { label: 'EXW工厂', val: 'EXW Factory' },
          { label: 'CIF到港', val: 'CIF Destination Port' }
        ];`;

if (content.includes(oldQuickTermsArr)) {
  content = content.replace(oldQuickTermsArr, newQuickTermsArr);
  console.log('✅ [7/8] 成功精简 quickTerms 文本标签！');
}

// =========================================================================
// 5. 修正 isPaidUser 判定（试用期内强效判定为 false，免除弹窗误伤）
// =========================================================================
const oldIsPaidUserDef = `        const isPaidUser = computed(() => {
          if (!currentTenant.value) return false;
          const p = currentTenant.value.plan;
          const isPaidPlan = p === 'geek' || p === 'monthly' || p === 'annual' || p === 'starter' || p === 'pro' || p === 'enterprise';
          return Boolean(isPaidPlan || currentTenant.value.isPaid);
        });`;

const newIsPaidUserDef = `        const isPaidUser = computed(() => {
          if (!currentTenant.value) return false;
          // 试用状态用户（正在试用中且未转正）坚决锁定为试用模式，绝不弹草稿箱授权码打扰！
          if (trialState.value && trialState.value.isTrial) return false;
          const p = currentTenant.value.plan;
          const isPaidPlan = p === 'geek' || p === 'monthly' || p === 'annual' || p === 'starter' || p === 'pro' || p === 'enterprise';
          return Boolean((isPaidPlan || currentTenant.value.isPaid) && p !== 'trial');
        });`;

if (content.includes(oldIsPaidUserDef)) {
  content = content.replace(oldIsPaidUserDef, newIsPaidUserDef);
  console.log('✅ [8/8] 成功加固 isPaidUser 计算逻辑，试用用户坚决不触发草稿弹窗！');
}

// =========================================================================
// 6. 补齐 setup() return 对象中的关键缺失属性
// =========================================================================
const targetReturnTail = `          channelDropdownOpen,
          channelList,
          getChannelDisplay,
          selectReviewChannel
        };
      }
    }).mount('#app');`;

const newReturnTail = `          channelDropdownOpen,
          channelList,
          getChannelDisplay,
          selectReviewChannel,
          // 补齐核心响应式属性与出单方法
          isPaidUser,
          hasImapConfigured,
          draftInjectionStatus,
          downloadPdfFile,
          copyEmailSubject,
          copyEmailBodyOnly
        };
      }
    }).mount('#app');`;

if (content.includes(targetReturnTail)) {
  content = content.replace(targetReturnTail, newReturnTail);
  console.log('🎉 成功将 isPaidUser, downloadPdfFile 等 6 大属性全量导出至 Vue 实例！');
} else {
  console.error('❌ 未找到 targetReturnTail，检查 setup() 结尾！');
}

if (isCrlf) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(file, content, 'utf-8');
console.log('✨ public/review.html 深度全量修复完毕！');
