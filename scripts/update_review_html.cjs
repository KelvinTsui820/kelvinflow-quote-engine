const fs = require('fs');

const reviewHtmlPath = 'F:\\order_workflow\\public\\review.html';
let content = fs.readFileSync(reviewHtmlPath, 'utf-8');
const isCrlf = content.includes('\r\n');
if (isCrlf) {
  content = content.replace(/\r\n/g, '\n');
}

// 4. 改造 showConfirmModal 二次确认弹窗内容
const oldConfirmModalHeader = `        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg shadow-sm">
            <i class="fa-solid fa-clipboard-check"></i>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">确认生成最终报价单？</h3>
            <p class="text-xs text-slate-500">请核对以下调整后的单据关键摘要</p>
          </div>
        </div>`;

const newConfirmModalHeader = `        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
               :class="isPaidUser ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'">
            <i :class="isPaidUser ? 'fa-solid fa-crown' : 'fa-solid fa-clipboard-check'"></i>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">
              {{ isPaidUser ? '👑 极客出单 · 确认存入邮箱草稿箱？' : '⚡ 试用出单 · 确认生成并下载报价单？' }}
            </h3>
            <p class="text-xs text-slate-500">请核对以下调整后的单据关键摘要与出单指引</p>
          </div>
        </div>`;

const oldConfirmModalBody = `        <p class="text-[11px] text-slate-500 leading-relaxed">
          确认后，系统将使用你最新微调的数据即时重新渲染 PDF 报价单，并将修改后的英文邮件同步写回你的邮箱草稿箱。
        </p>

        <div class="flex items-center justify-end space-x-3 pt-2">
          <button @click="showConfirmModal = false" :disabled="saving" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            取消返回
          </button>
          <button @click="executeSaveAndRegenerate" :disabled="saving" class="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition flex items-center space-x-2 disabled:opacity-50">
            <i v-if="saving" class="fa-solid fa-spinner animate-spin"></i>
            <i v-else class="fa-solid fa-check text-blue-200"></i>
            <span>{{ saving ? '正在同步渲染...' : '确认并立即生成' }}</span>
          </button>
        </div>`;

const newConfirmModalBody = `        <!-- 试用出单指引 -->
        <div v-if="!isPaidUser" class="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed flex items-start space-x-2">
          <i class="fa-solid fa-circle-info text-blue-600 mt-0.5 flex-shrink-0"></i>
          <div>
            <strong>试用出单指引：</strong>确认后，系统将即时渲染并<strong>自动下载最新正式 PDF 报价单</strong>，同时将地道英文回复复制到剪贴板。您只需在自己的 Foxmail/日常邮箱中回复买家并附上 PDF 即可发出。
          </div>
        </div>

        <!-- 付费极客直达草稿箱指引 (已配授权码) -->
        <div v-else-if="hasImapConfigured" class="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 leading-relaxed flex items-start space-x-2">
          <i class="fa-solid fa-crown text-emerald-600 mt-0.5 flex-shrink-0"></i>
          <div>
            <strong>极客直达特权：</strong>系统将生成最新正式 PDF 报价单，并将买家收件地址、英文回信与 PDF 附件<strong>静默存入您的 Foxmail/企业邮【发件草稿箱】</strong>！打开邮箱点击发送即可秒速出单。
          </div>
        </div>

        <!-- 付费极客未配置授权码指引 -->
        <div v-else class="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed flex items-start space-x-2">
          <i class="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 flex-shrink-0"></i>
          <div>
            <strong>您享有极客草稿箱直达特权：</strong>检测到您尚未绑定企业邮箱授权码。点击下方按钮将为您唤起极速配置窗口（2分钟即可完成），绑定后即可享受全自动静默直达草稿箱！
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 pt-2">
          <button @click="showConfirmModal = false" :disabled="saving" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            取消返回
          </button>
          <button @click="executeSaveAndRegenerate" :disabled="saving" class="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  :class="isPaidUser ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-500/25' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'">
            <i v-if="saving" class="fa-solid fa-spinner animate-spin"></i>
            <i v-else-if="isPaidUser && !hasImapConfigured" class="fa-solid fa-key text-amber-300"></i>
            <i v-else-if="isPaidUser" class="fa-solid fa-paper-plane text-amber-300"></i>
            <i v-else class="fa-solid fa-download text-blue-200"></i>
            <span v-if="!isPaidUser">{{ saving ? '正在生成并下载...' : '确认并立即下载 PDF 与复制邮件 ➔' }}</span>
            <span v-else-if="!hasImapConfigured">前往绑定企业邮箱草稿箱 ➔</span>
            <span v-else>{{ saving ? '正在同步写入草稿箱...' : '确认并直接存入 Foxmail 草稿箱 ➔' }}</span>
          </button>
        </div>`;

if (!content.includes(oldConfirmModalHeader)) {
  console.error('❌ 未找到 oldConfirmModalHeader！');
  process.exit(1);
}
content = content.replace(oldConfirmModalHeader, newConfirmModalHeader);
content = content.replace(oldConfirmModalBody, newConfirmModalBody);
console.log('✅ 成功替换二次确认弹窗！');

// 5. 改造出单成功引导弹窗 (successModal) 区分试用与付费
const oldSuccessModalBody = `        <div class="bg-emerald-50/70 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1.5 border border-emerald-200/80">
          <div class="font-bold flex items-center">
            <i class="fa-solid fa-file-pdf mr-1.5 text-red-500"></i>
            正式 PDF 报价单已生成完毕
          </div>
          <p class="text-[11px] text-emerald-700 leading-relaxed">
            单号: <span class="font-mono font-bold">{{ quotation.quotationNumber }}</span> · 总额: <span class="font-mono font-bold">{{ quotation.currency }} {{ formatNumber(computedTotalAmount) }}</span>
          </p>
        </div>

        <div class="space-y-3 pt-1">
          <!-- 1. 在线预览与另存 PDF -->
          <button @click="openPdfPreview" class="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer border border-slate-200">
            <i class="fa-regular fa-file-pdf text-red-500 text-sm"></i>
            <span>在线预览 / 另存为最新 PDF 报价单</span>
          </button>

          <!-- 2. 主发信操作按钮 (根据用户偏好智能触发) -->
          <div class="space-y-1.5">
            <button @click="executeCopyAndSendEmail" class="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer">
              <i :class="preferredMailClientIcon"></i>
              <span>{{ preferredMailClientLabel }}</span>
            </button>
            <p class="text-[10px] text-slate-400 text-center">
              💡 点击将自动复制最新英文邮件正文，并调起您习惯的客户端或网页
            </p>
          </div>

          <!-- 3. 智能外贸邮箱客户端快捷切换器 -->
          <div class="pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-bold text-slate-500">切换常用发信方式 (点击秒切并自动记忆)：</span>
            </div>
            <div class="grid grid-cols-3 gap-1.5 text-[10px]">
              <button type="button" @click="setMailClient('desktop')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'desktop' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-solid fa-laptop text-xs text-indigo-500"></i>
                <span>Foxmail/Outlook</span>
              </button>
              <button type="button" @click="setMailClient('qq')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'qq' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-brands fa-qq text-xs text-blue-500"></i>
                <span>QQ 网页邮</span>
              </button>
              <button type="button" @click="setMailClient('163')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === '163' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-solid fa-at text-xs text-red-500"></i>
                <span>163 网页邮</span>
              </button>
              <button type="button" @click="setMailClient('gmail')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'gmail' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-brands fa-google text-xs text-rose-500"></i>
                <span>Gmail 草稿</span>
              </button>
              <button type="button" @click="setMailClient('outlook_web')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'outlook_web' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-brands fa-microsoft text-xs text-cyan-600"></i>
                <span>Outlook 网页</span>
              </button>
              <button type="button" @click="setMailClient('copy')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'copy' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-regular fa-copy text-xs text-slate-400"></i>
                <span>纯复制正文</span>
              </button>
            </div>
          </div>
        </div>`;

const newSuccessModalBody = `        <!-- 极客草稿箱直达成功提示 -->
        <div v-if="isPaidUser && draftInjectionStatus.injected" class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 text-xs text-emerald-950 space-y-2 border border-emerald-200 shadow-xs">
          <div class="font-bold flex items-center text-emerald-800 text-sm">
            <i class="fa-solid fa-crown text-amber-500 mr-2"></i>
            已成功直达您的 Foxmail/企业邮【{{ draftInjectionStatus.mailbox || '草稿箱' }}】！
          </div>
          <p class="text-[11px] text-emerald-700 leading-relaxed">
            单号: <span class="font-mono font-bold">{{ quotation.quotationNumber }}</span> · 总额: <span class="font-mono font-bold">{{ quotation.currency }} {{ formatNumber(computedTotalAmount) }}</span><br>
            海外买家收件地址已预填，正式 PDF 报价单已挂载在附件，英文正文已排版完毕。<strong>您只需打开电脑 Foxmail 或手机邮箱的草稿箱，点击“发送”即可！</strong>
          </p>
        </div>

        <!-- 试用出单成功提示 -->
        <div v-else class="bg-blue-50/80 rounded-xl p-4 text-xs text-blue-950 space-y-2 border border-blue-200 shadow-xs">
          <div class="font-bold flex items-center text-blue-800 text-sm">
            <i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>
            正式 PDF 报价单已生成完毕！
          </div>
          <p class="text-[11px] text-slate-600 leading-relaxed">
            单号: <span class="font-mono font-bold text-slate-900">{{ quotation.quotationNumber }}</span> · 总额: <span class="font-mono font-bold text-blue-700">{{ quotation.currency }} {{ formatNumber(computedTotalAmount) }}</span><br>
            最新 PDF 已自动触发下载，地道英文回信内容已同步复制到剪贴板！
          </p>
        </div>

        <div class="space-y-3 pt-1">
          <!-- 1. 重新下载/预览 PDF 按钮 -->
          <div class="grid grid-cols-2 gap-2">
            <button @click="downloadPdfFile(quotation.quotationNumber)" class="inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer border border-slate-200 shadow-xs">
              <i class="fa-solid fa-download text-blue-600 text-xs"></i>
              <span>下载 PDF 报价单</span>
            </button>
            <button @click="openPdfPreview" class="inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition active:scale-95 cursor-pointer border border-slate-200 shadow-xs">
              <i class="fa-regular fa-file-pdf text-red-500 text-xs"></i>
              <span>在线预览 PDF</span>
            </button>
          </div>

          <!-- 2. 主发信操作按钮 (根据用户偏好智能触发) -->
          <div class="space-y-1.5">
            <button @click="executeCopyAndSendEmail" class="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer">
              <i :class="preferredMailClientIcon"></i>
              <span>{{ preferredMailClientLabel }}</span>
            </button>
            <p class="text-[10px] text-slate-400 text-center">
              💡 点击将自动复制最新英文邮件正文，并调起您习惯的客户端或网页
            </p>
          </div>

          <!-- 3. 智能外贸邮箱客户端快捷切换器 -->
          <div class="pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-bold text-slate-500">切换常用发信方式 (点击秒切并自动记忆)：</span>
            </div>
            <div class="grid grid-cols-3 gap-1.5 text-[10px]">
              <button type="button" @click="setMailClient('desktop')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'desktop' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-solid fa-laptop text-xs text-indigo-500"></i>
                <span>Foxmail/Outlook</span>
              </button>
              <button type="button" @click="setMailClient('qq')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'qq' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-brands fa-qq text-xs text-blue-500"></i>
                <span>QQ 网页邮</span>
              </button>
              <button type="button" @click="setMailClient('163')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === '163' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-solid fa-at text-xs text-red-500"></i>
                <span>163 网页邮</span>
              </button>
              <button type="button" @click="setMailClient('gmail')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'gmail' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-brands fa-google text-xs text-rose-500"></i>
                <span>Gmail 草稿</span>
              </button>
              <button type="button" @click="setMailClient('outlook_web')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'outlook_web' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-brands fa-microsoft text-xs text-cyan-600"></i>
                <span>Outlook 网页</span>
              </button>
              <button type="button" @click="setMailClient('copy')" 
                      class="py-1.5 px-1 rounded-lg border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      :class="preferredMailClient === 'copy' ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                <i class="fa-regular fa-copy text-xs text-slate-400"></i>
                <span>纯复制正文</span>
              </button>
            </div>
          </div>
        </div>`;

if (!content.includes(oldSuccessModalBody)) {
  console.error('❌ 未找到 oldSuccessModalBody，无法替换成功弹窗！');
  process.exit(1);
}
content = content.replace(oldSuccessModalBody, newSuccessModalBody);
console.log('✅ 成功替换出单成功引导弹窗！');

// 6. 在 JS 代码中加入 copyEmailSubject, copyEmailBodyOnly, downloadPdfFile
const oldCopyDraftEmail = `        const copyDraftEmail = () => {
          const fullEmail = \`Subject: \${editableEmailSubject.value}\\n\\n\${editableEmailBody.value}\`;
          navigator.clipboard.writeText(fullEmail);
          showToast('已成功复制完整英文邮件（含标题与正文）！');
        };`;

const newCopyDraftEmail = `        const copyDraftEmail = () => {
          const fullEmail = \`Subject: \${editableEmailSubject.value}\\n\\n\${editableEmailBody.value}\`;
          navigator.clipboard.writeText(fullEmail);
          showToast('已成功复制完整英文邮件（含标题与正文）！');
        };

        const copyEmailSubject = () => {
          if (!editableEmailSubject.value) return;
          navigator.clipboard.writeText(editableEmailSubject.value);
          showToast('已复制邮件主题到剪贴板！');
        };

        const copyEmailBodyOnly = () => {
          if (!editableEmailBody.value) return;
          navigator.clipboard.writeText(editableEmailBody.value);
          showToast('已复制纯英文邮件正文到剪贴板！');
        };

        const downloadPdfFile = (quoteNum, fileName) => {
          const qId = quoteNum || quotation.value?.quotationNumber || getQuoteIdFromUrl();
          const token = getTokenFromUrl();
          const downloadUrl = \`/api/v1/quotes/\${qId}/pdf\${token ? \`?token=\${token}\` : ''}\`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = fileName || \`\${qId}_Official_Quotation.pdf\`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };`;

if (!content.includes(oldCopyDraftEmail)) {
  console.error('❌ 未找到 oldCopyDraftEmail，无法增加单项复制函数！');
  process.exit(1);
}
content = content.replace(oldCopyDraftEmail, newCopyDraftEmail);
console.log('✅ 成功增加 copyEmailSubject / copyEmailBodyOnly / downloadPdfFile 函数！');

// 7. 注入 isPaidUser 和 hasImapConfigured 及 draftInjectionStatus
const oldSuccessModalDecl = `        const successModal = ref({
          show: false
        });`;

const newSuccessModalDecl = `        const successModal = ref({
          show: false
        });

        const draftInjectionStatus = ref({
          injected: false,
          mailbox: '',
          error: ''
        });

        const isPaidUser = computed(() => {
          if (!currentTenant.value) return false;
          const p = currentTenant.value.plan;
          const isPaidPlan = p === 'geek' || p === 'monthly' || p === 'annual' || p === 'starter' || p === 'pro' || p === 'enterprise';
          return Boolean(isPaidPlan || currentTenant.value.isPaid);
        });

        const hasImapConfigured = computed(() => {
          return Boolean(currentTenant.value?.hasImapConfig || currentTenant.value?.imapConfig?.authCode || currentTenant.value?.imapConfig?.hasAuthCode);
        });`;

if (!content.includes(oldSuccessModalDecl)) {
  console.error('❌ 未找到 oldSuccessModalDecl，无法注入状态定义！');
  process.exit(1);
}
content = content.replace(oldSuccessModalDecl, newSuccessModalDecl);
console.log('✅ 成功注入 isPaidUser / hasImapConfigured / draftInjectionStatus 计算属性！');

// 8. 改造 executeSaveAndRegenerate 函数
const oldExecuteSave = `        const executeSaveAndRegenerate = async () => {
          saving.value = true;
          const id = quotation.value?.quotationNumber || getQuoteIdFromUrl();
          const token = getTokenFromUrl();
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = \`Bearer \${token}\`;

          quotation.value.totalAmountForeign = computedTotalAmount.value;
          quotation.value.paymentTerms = terms.value.payment;
          quotation.value.priceValidity = terms.value.validity;
          quotation.value.leadTime = terms.value.leadTime;
          quotation.value.termsAndConditions = [
            terms.value.payment,
            terms.value.validity,
            terms.value.leadTime,
            terms.value.samplePolicy ? \`Sample Policy: \${terms.value.samplePolicy}\` : '',
            terms.value.remarks
          ].filter(Boolean).join('\\n');

          try {
            const res = await fetch(\`/api/v1/quotes/\${id}\${token ? \`?token=\${token}\` : ''}\`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                quotation: quotation.value,
                terms: terms.value,
                customEmailSubject: editableEmailSubject.value,
                customEmailBody: editableEmailBody.value
              })
            });
            const data = await res.json();
            if (data.success) {
              showConfirmModal.value = false;
              successModal.value.show = true;
              showToast('✅ 报价单已重新生成！PDF与邮件草稿已就绪！', 'success');
            } else {
              showToast(data.error || '保存失败', 'error');
            }
          } catch (e) {
            showToast('请求失败，请检查网络与后台服务', 'error');
          } finally {
            saving.value = false;
          }
        };`;

const newExecuteSave = `        const executeSaveAndRegenerate = async () => {
          // 如果是付费极客用户但尚未绑定授权码，自动引导进入授权码配置弹窗
          if (isPaidUser.value && !hasImapConfigured.value) {
            showConfirmModal.value = false;
            openImapModal();
            showToast('👑 极客专属特权：请先填写一次邮箱客户端授权码，以后即可全自动直达草稿箱！', 'info');
            return;
          }

          saving.value = true;
          const id = quotation.value?.quotationNumber || getQuoteIdFromUrl();
          const token = getTokenFromUrl();
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = \`Bearer \${token}\`;

          quotation.value.totalAmountForeign = computedTotalAmount.value;
          quotation.value.paymentTerms = terms.value.payment;
          quotation.value.priceValidity = terms.value.validity;
          quotation.value.leadTime = terms.value.leadTime;
          quotation.value.termsAndConditions = [
            terms.value.payment,
            terms.value.validity,
            terms.value.leadTime,
            terms.value.samplePolicy ? \`Sample Policy: \${terms.value.samplePolicy}\` : '',
            terms.value.remarks
          ].filter(Boolean).join('\\n');

          try {
            const res = await fetch(\`/api/v1/quotes/\${id}\${token ? \`?token=\${token}\` : ''}\`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                quotation: quotation.value,
                terms: terms.value,
                customEmailSubject: editableEmailSubject.value,
                customEmailBody: editableEmailBody.value,
                injectDraft: isPaidUser.value && hasImapConfigured.value
              })
            });
            const data = await res.json();
            if (data.success) {
              showConfirmModal.value = false;

              if (isPaidUser.value && hasImapConfigured.value) {
                // 付费极客模式：草稿箱直达
                if (data.draftInjection?.success) {
                  draftInjectionStatus.value = {
                    injected: true,
                    mailbox: data.draftInjection.mailbox || '草稿箱',
                    error: ''
                  };
                  showToast(\`🎉 成功存入您的 Foxmail/企业邮【\${data.draftInjection.mailbox || '草稿箱'}】！打开邮箱即可一键直发！\`, 'success');
                } else {
                  draftInjectionStatus.value = {
                    injected: false,
                    mailbox: '',
                    error: data.draftInjection?.error || '未能连接到企邮服务器'
                  };
                  showToast(\`⚠️ 草稿箱自动写入提示: \${data.draftInjection?.error || '连接超时'}，已为您保留 PDF 与邮件供手动发送\`, 'warning');
                }
              } else {
                // 试用模式：自动触发下载最新 PDF，并复制英文邮件至剪贴板
                draftInjectionStatus.value = { injected: false, mailbox: '', error: '' };
                copyDraftEmail();
                downloadPdfFile(id, data.draftEmail?.pdfFileName);
                showToast('✅ 报价单已重新生成！PDF 开始自动下载，英文正文已复制！', 'success');
              }

              successModal.value.show = true;
            } else {
              showToast(data.error || '保存失败', 'error');
            }
          } catch (e) {
            showToast('请求失败，请检查网络与后台服务', 'error');
          } finally {
            saving.value = false;
          }
        };`;

if (!content.includes(oldExecuteSave)) {
  console.error('❌ 未找到 oldExecuteSave，无法替换 executeSaveAndRegenerate！');
  process.exit(1);
}
content = content.replace(oldExecuteSave, newExecuteSave);
console.log('✅ 成功改造 executeSaveAndRegenerate 函数！');

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(reviewHtmlPath, content, 'utf-8');
console.log('🎉 public/review.html 全量更新完毕！');
