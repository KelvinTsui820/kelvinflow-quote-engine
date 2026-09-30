const fs = require('fs');

const file = 'public/review.html';
let content = fs.readFileSync(file, 'utf-8');
const isCrlf = content.includes('\r\n');
if (isCrlf) content = content.replace(/\r\n/g, '\n');

// 1. 更新顶部导航按钮
const oldNav = `          <!-- 📬 邮件联动设置 (可选扩展) -->
          <button @click="openImapModal" class="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 active:scale-95 transition cursor-pointer whitespace-nowrap flex-shrink-0 text-xs" title="查看专属询盘接收邮箱或设置日常邮箱草稿箱自动注入">
            <i class="fa-solid fa-envelope text-emerald-400 text-xs"></i>
            <span class="hidden sm:inline">邮件联动</span>
            <span class="sm:hidden text-xs">邮件</span>
          </button>`;

const newNav = `          <!-- 📬 邮件草稿箱设置 (仅付费极客模式展示，试用用户零配置不展示) -->
          <button v-if="isPaidUser" @click="openImapModal" class="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 active:scale-95 transition cursor-pointer whitespace-nowrap flex-shrink-0 text-xs" title="设置 Foxmail / 企业邮箱发件草稿箱自动直达">
            <i class="fa-solid fa-crown text-amber-400 text-xs"></i>
            <span class="hidden sm:inline">草稿箱配置</span>
            <span class="sm:hidden text-xs">草稿箱</span>
          </button>`;

if (content.includes(oldNav)) {
  content = content.replace(oldNav, newNav);
  console.log('✅ 成功将顶部导航草稿箱按钮限制为仅付费极客可见！');
} else {
  console.error('❌ 未找到 oldNav');
}

// 2. 找到整个 imapModal 的头部到 TAB 2 的过渡，替换为纯净的草稿箱直达表单头部
const imapModalOldSection = `    <!-- 3. 📬 个人草稿箱静默写入与企业邮箱自动转发配置 (IMAP Modal - Track B 进阶极客版) -->
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
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div class="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div class="font-bold text-blue-600 mb-1">01. 收到询盘</div>
                <div class="text-slate-500 leading-relaxed">客户发来带 PDF / Excel 附件或邮件正文询盘</div>
              </div>
              <div class="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div class="font-bold text-blue-600 mb-1">02. 一键转发</div>
                <div class="text-slate-500 leading-relaxed">在 Foxmail/邮箱中将该信转发至上方专属地址</div>
              </div>
              <div class="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div class="font-bold text-emerald-600 mb-1">03. 90秒就绪</div>
                <div class="text-slate-500 leading-relaxed">系统自动折算底价与排柜，在审单台秒级出单</div>
              </div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-800 flex items-start space-x-2">
            <i class="fa-solid fa-shield-check text-emerald-600 text-sm mt-0.5 flex-shrink-0"></i>
            <div class="leading-relaxed text-[11px]">
              <strong>零门槛安全保障：</strong>此模式<strong>完全无需输入任何邮箱密码或授权码</strong>，系统仅解析您主动转发的询盘附件与明细，不触碰您的日常收件箱隐私，最简单、最安全！
            </div>
          </div>
        </div>

        <!-- TAB 2: 进阶草稿箱直写模式 (极客可选 · 需填写授权码) -->
        <div v-else class="space-y-3.5">`;

const imapModalNewSection = `    <!-- 3. 📬 极客专属特权 · 绑定 Foxmail / 企业邮箱发件草稿箱 (IMAP Modal) -->
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
              <p class="text-xs text-slate-500 mt-0.5">配置企业邮箱客户端专用授权码，自动将买家地址、英文回信与 PDF 写入 Foxmail 草稿箱，点开即发！</p>
            </div>
          </div>
          <button @click="imapModal.show = false" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- 纯净草稿直写表单 (彻底移除极简邮件转发 Tab 与 rfq-xxx 干扰) -->
        <div class="space-y-3.5">`;

if (content.includes(imapModalOldSection)) {
  content = content.replace(imapModalOldSection, imapModalNewSection);
  console.log('✅ 成功将 IMAP 弹窗纯净化为极客草稿箱直达！');
} else {
  console.error('❌ 未找到 imapModalOldSection');
}

if (isCrlf) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(file, content, 'utf-8');
console.log('🎉 补丁脚本执行完成！');
