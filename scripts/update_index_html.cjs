const fs = require('fs');

const indexHtmlPath = 'public/index.html';
let content = fs.readFileSync(indexHtmlPath, 'utf-8');
const isCrlf = content.includes('\r\n');
if (isCrlf) {
  content = content.replace(/\r\n/g, '\n');
}

// 1. 更新 Hero 副标题
const oldHeroBanner = `<strong class="text-white font-semibold">支持网页直接丢询盘即刻出单；更支持绑定业务邮箱，邮件静默存入发件草稿箱，随时随地复核即可一键直发。</strong>`;
const newHeroBanner = `<strong class="text-white font-semibold">试用期支持网页工作台即刻出单并下载 PDF 与复制回信；升级极客版更享企业邮箱联动，报价单与英文草稿静默存入 Foxmail 草稿箱，点开即发！</strong>`;

if (content.includes(oldHeroBanner)) {
  content = content.replace(oldHeroBanner, newHeroBanner);
  console.log('✅ 成功更新 Hero 区域定位文案！');
}

// 2. 更新 Track A 描述
const oldTrackADesc = `<p class="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
              直接把买家邮件内容或采购单拖入网页，自带演示库，10 秒完成核价与正规 PDF 导出。
            </p>`;
const newTrackADesc = `<p class="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
              直接把买家邮件内容或采购单拖入工作台，自带演示库，10 秒精准核价，一键下载正式 PDF 报价单并复制英文回信草稿，手动发出零门槛。
            </p>`;

if (content.includes(oldTrackADesc)) {
  content = content.replace(oldTrackADesc, newTrackADesc);
  console.log('✅ 成功更新 Track A 描述文案！');
}

// 3. 更新 Track B 描述
const oldTrackBDesc = `<p class="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
              绑定常用业务邮箱，老外询盘由 AI 自动核算底价，回信与正规英文报价单静默写入你的【发件草稿箱】。
            </p>`;
const newTrackBDesc = `<p class="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
              升级付费极客特权：绑定常用业务邮箱专属授权码，老外询盘由 AI 自动核算底价，买家地址、回信与正规英文 PDF 报价单静默写入你的【发件草稿箱】，点开即发！
            </p>`;

if (content.includes(oldTrackBDesc)) {
  content = content.replace(oldTrackBDesc, newTrackBDesc);
  console.log('✅ 成功更新 Track B 描述文案！');
}

// 4. 更新权益卡片文案
const oldBenefitText = `<span class="text-white"><strong>👑 【发件草稿箱静默托管】</strong>：绑定业务邮箱，老外询盘自动算价并写入 Foxmail / 手机邮箱【发件草稿箱】，业务员复核无误即可一键发送</span>`;
const newBenefitText = `<span class="text-white"><strong>👑 【发件草稿箱静默直达 (付费专属)】</strong>：绑定业务邮箱专属授权码，老外询盘自动算价并塞入 Foxmail / 手机邮箱【发件草稿箱】，免去手动拖动附件，业务员点开直接发送</span>`;

if (content.includes(oldBenefitText)) {
  content = content.replace(oldBenefitText, newBenefitText);
  console.log('✅ 成功更新权益卡片草稿箱描述！');
}

const oldWebBenefit = `<span><strong>Web 零门槛即用工作台</strong>：自带开箱演示底价库，复制粘贴买家邮件，10 秒生成全套报价</span>`;
const newWebBenefit = `<span><strong>Web 零门槛即用工作台 (试用标配)</strong>：自带开箱演示底价库，复制粘贴买家邮件，10 秒生成全套报价，一键下载 PDF 并复制英文回信</span>`;

if (content.includes(oldWebBenefit)) {
  content = content.replace(oldWebBenefit, newWebBenefit);
  console.log('✅ 成功更新工作台权益描述！');
}

// 5. 在 FAQ 中增加 Q4: 试用期是否需要邮箱授权码
const oldFaqQ3 = `        <!-- Q3: 试用与数据归属 -->
        <div class="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
          <div class="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono-code font-bold">Q</span>
            <span>试用期结束后如果不续费，我的报价单和底价表会丢失吗？</span>
          </div>
          <div class="text-xs sm:text-sm text-slate-300 pl-8 leading-relaxed">
            <strong class="text-emerald-400">提供 2 个月（60天）安全封存缓冲期：</strong>试用期结束后若暂未续费，系统绝不强制扣费。您的私有底价表与历史生成的报价单数据将为您安全封存保留 2 个月（60天）。在此期间，您可以随时登录工作台查阅或导出本地备份；随时续费亦可一键解封继续出单。数据保留期满前系统会提前多次邮件提醒，充分保障您的商业数字资产安全。
          </div>
        </div>
      </div>`;

const newFaqQ3AndQ4 = `        <!-- Q3: 试用与数据归属 -->
        <div class="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
          <div class="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono-code font-bold">Q</span>
            <span>试用期结束后如果不续费，我的报价单和底价表会丢失吗？</span>
          </div>
          <div class="text-xs sm:text-sm text-slate-300 pl-8 leading-relaxed">
            <strong class="text-emerald-400">提供 2 个月（60天）安全封存缓冲期：</strong>试用期结束后若暂未续费，系统绝不强制扣费。您的私有底价表与历史生成的报价单数据将为您安全封存保留 2 个月（60天）。在此期间，您可以随时登录工作台查阅或导出本地备份；随时续费亦可一键解封继续出单。数据保留期满前系统会提前多次邮件提醒，充分保障您的商业数字资产安全。
          </div>
        </div>

        <!-- Q4: 试用期间需要提供邮箱授权码吗？ -->
        <div class="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
          <div class="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono-code font-bold">Q</span>
            <span>试用期间需要输入我的企业邮箱密码或授权码吗？</span>
          </div>
          <div class="text-xs sm:text-sm text-slate-300 pl-8 leading-relaxed">
            <strong class="text-emerald-400">完全不需要！</strong>免费试用阶段采用 Web 智能审单台模式，您只需在网页中粘贴询盘或上传 PO，10 秒即可精准核价并一键下载正式 PDF 报价单，同时一键复制纯英文回信草稿，手动在常用邮箱中发信，零配置、零风险，不触碰您的企业邮箱隐私。只有当您升级付费极客版并希望开启【Foxmail/企业邮发件草稿箱静默直达】时，才需要在后台配置专用的客户端授权码。
          </div>
        </div>
      </div>`;

if (content.includes(oldFaqQ3)) {
  content = content.replace(oldFaqQ3, newFaqQ3AndQ4);
  console.log('✅ 成功在 FAQ 中增加 Q4 试用期免授权码说明！');
}

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(indexHtmlPath, content, 'utf-8');
console.log('🎉 public/index.html 官网文案全面改造完毕！');
