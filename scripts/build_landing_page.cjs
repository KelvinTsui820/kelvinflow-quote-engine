const fs = require('fs');
const path = require('path');

// 1. Read base code.html
const codeHtmlPath = path.join(__dirname, '..', 'design', 'stitch_kelvinflow_landing_page_design', 'code.html');
let codeHtml = fs.readFileSync(codeHtmlPath, 'utf8');

// Truncate at </footer>
const footerEndIdx = codeHtml.indexOf('</footer>') + 9;
if (footerEndIdx <= 9) {
  throw new Error('Could not find </footer> in code.html');
}
codeHtml = codeHtml.substring(0, footerEndIdx);

// Remove the empty emotion style tags
codeHtml = codeHtml.replace(/<style data-emotion="css" data-s=""><\/style>/g, '');

// Replace logo image URLs with /k_logo.svg
const googleLogoUrl = 'https://lh3.googleusercontent.com/aida/AEtjO1Vvq3Nk1VsIkIS9DHJOkbOOsOiAntdUADuTkAAdMv2ywLJE0bNkkzXiyV5x-qE7RK1fC8acDC7vF_VqNF6LFGTMWOJG9XXVKqesdKzQ5qw4QkwAN6Ch0JrU_LHCwbFMjDfCwQK8GArWM9a14c-dUajUAkLse4FHUgY7mUUoyiJtiqU7gSA23_PfMDL68PNG6aByD0-fwXW-tH-K5aJBPEU3sFCCQfeYLiPM4DEoyKyqpX3fE_UHanm0lM4';
codeHtml = codeHtml.split(googleLogoUrl).join('/k_logo.svg');

// Insert favicons and FontAwesome in <head>
const headInsert = `
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
`;
codeHtml = codeHtml.replace('</head>', `${headInsert}\n</head>`);

// Update Header nav links and action buttons
const oldNav = `<nav class="hidden md:flex items-center gap-space-lg" data-active-classes="text-on-surface font-semibold"><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="features" href="#">功能特性</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="workflow" href="#">工作流程</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="excel-template" href="#">底价表规范</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="faq" href="#">常见问题</a></nav>`;
const newNav = `<nav class="hidden md:flex items-center gap-space-lg" data-active-classes="text-on-surface font-semibold"><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="features" href="#features">功能特性</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="workflow" href="#workflow">工作流程</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="excel-template" href="#features">底价表规范</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="faq" href="#faq">常见问题</a></nav>`;
codeHtml = codeHtml.replace(oldNav, newNav);

const oldActions = `<div class="flex items-center gap-space-md"><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="login" href="#">登录</a><a class="inline-flex items-center justify-center px-space-md py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150" data-path="signup" href="#">免费试用</a><div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div>`;
const newActions = `<div class="flex items-center gap-space-md">
      <a id="nav-login-btn" onclick="openInboundModal('login')" class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150 cursor-pointer" data-path="login" href="javascript:void(0)">登录</a>
      <a id="nav-trial-btn" onclick="openInboundModal('starter')" class="inline-flex items-center justify-center px-space-md py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer" data-path="signup" href="javascript:void(0)">免费试用</a>
      <a id="nav-workbench-btn" style="display: none;" class="items-center justify-center px-4 py-1.5 rounded-full bg-primary-container text-on-primary font-body-md text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 transition-all cursor-pointer" href="/review/QT-20260904-888">进入审单台</a>
      <div id="nav-user-chip" style="display: none;" class="items-center gap-2 pl-3 pr-2 py-1 bg-surface-container rounded-full text-xs font-medium text-on-surface border border-outline-variant/30">
        <span id="nav-user-phone" class="font-numeric-data text-xs text-on-surface"></span>
        <button onclick="logoutUser()" title="退出当前账号" class="w-6 h-6 rounded-full bg-surface-container-high hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition cursor-pointer text-slate-500">
          <i class="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
        </button>
      </div>
      <button id="mobile-menu-btn" onclick="toggleMobileNav()" class="md:hidden text-on-surface-variant hover:text-on-surface p-2 text-base transition-colors cursor-pointer flex items-center justify-center rounded-lg hover:bg-surface-container" aria-label="切换移动端导航">
        <i id="mobile-menu-icon" class="fa-solid fa-bars"></i>
      </button>
    </div>`;
codeHtml = codeHtml.replace(oldActions, newActions);

// Insert mobile menu drawer right after </header>
const mobileDrawer = `
  <div id="mobile-nav-drawer" class="hidden md:hidden fixed top-16 left-0 right-0 z-40 px-6 py-4 bg-surface-container-lowest/95 backdrop-blur-md border-b border-[#f1f5f9] shadow-lg space-y-3">
    <a onclick="closeMobileNav()" href="#features" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">功能特性</a>
    <a onclick="closeMobileNav()" href="#workflow" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">工作流程</a>
    <a onclick="closeMobileNav()" href="#features" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">底价表规范</a>
    <a onclick="closeMobileNav()" href="#faq" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">常见问题</a>
    <div class="pt-3 border-t border-outline-variant/20 flex gap-3">
      <button onclick="closeMobileNav(); openInboundModal('login')" class="flex-1 py-2 text-center text-sm font-medium text-on-surface-variant bg-surface-container rounded-full">登录</button>
      <button onclick="closeMobileNav(); openInboundModal('starter')" class="flex-1 py-2 text-center text-sm font-semibold text-white bg-primary-container rounded-full">免费试用</button>
    </div>
  </div>
`;
codeHtml = codeHtml.replace('</header>', `</header>${mobileDrawer}`);

// In Hero: update CTA buttons
codeHtml = codeHtml.replace(
  '<a class="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150" href="#trial">',
  '<a class="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer" onclick="openInboundModal(\'starter\')" href="javascript:void(0)">'
);

// In Excel feature section: add id="features"
codeHtml = codeHtml.replace(
  '<section class="w-full py-24 bg-surface-container-low">',
  '<section class="w-full py-24 bg-surface-container-low" id="features">'
);

// In Excel feature: update template download link
codeHtml = codeHtml.replace(
  '<a class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-lowest text-primary-container font-headline-sm text-headline-sm font-semibold shadow-sm hover:shadow-md transition-all" href="#trial">',
  '<a class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-lowest text-primary-container font-headline-sm text-headline-sm font-semibold shadow-sm hover:shadow-md transition-all" href="/api/v1/template/pricing-sheet" download="kelvinflow-pricing-template.xlsx">'
);

// In Pre-footer conversion callout: update CTA button
codeHtml = codeHtml.replace(
  '<a class="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150" href="#">',
  '<a class="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer" onclick="openInboundModal(\'starter\')" href="javascript:void(0)">'
);

// Append the Reskinned Modals & JavaScript Logic right before </body>
const modalsAndScripts = `
  <!-- ========================================================================= -->
  <!-- 弹窗交互组件群 (Reskinned Precision Trade Minimal Modals)                   -->
  <!-- ========================================================================= -->

  <!-- A. 试用开通 & 密码登录弹窗 (Inbound Modal) -->
  <div id="inbound-modal" class="fixed inset-0 z-[210] bg-slate-900/60 backdrop-blur-md hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <div onclick="event.stopPropagation()" class="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative cursor-default">
      
      <!-- 关闭按钮 -->
      <button onclick="closeInboundModal()" aria-label="关闭试用开通窗口" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100">
        <i class="fa-solid fa-xmark text-base"></i>
      </button>

      <!-- 顶部 Badge -->
      <div class="mb-4">
        <span id="inbound-tier-badge" class="px-3 py-1 rounded-full text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#1D4ED8]/20">
          免费开通 7 天全功能试用席位
        </span>
      </div>

      <h3 id="inbound-title" class="text-2xl font-bold text-[#0F172A] mb-1.5">开启外贸智能出单体验</h3>
      <p id="inbound-desc" class="text-xs text-[#64748B] mb-6">开箱自带演示底价库 · 密码加密保护商业机密</p>

      <!-- 模式切换 Tab -->
      <div class="flex p-1 bg-[#F1F5F9] rounded-xl mb-6">
        <button id="inbound-subtab-reg" onclick="switchInboundFormMode('register')" class="flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer bg-white text-[#1D4ED8] shadow-sm">
          <span>开通 7 天试用</span>
        </button>
        <button id="inbound-subtab-login" onclick="switchInboundFormMode('login')" class="flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-[#64748B] hover:text-[#0F172A]">
          <span>密码登录</span>
        </button>
      </div>

      <!-- 1. 注册表单 -->
      <form id="inbound-form" onsubmit="handleInboundSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[#334155] mb-1.5">
            工作邮箱 (登录主账号) <span class="text-[#1D4ED8]">*</span>
          </label>
          <div class="flex gap-2">
            <input type="email" id="inbound-email" placeholder="常用工作邮箱 (如 sales@company.com)" required class="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:text-slate-400 placeholder:text-xs transition-colors">
            <button type="button" id="btn-send-code" onclick="sendInboundVerificationCode()" class="px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] hover:bg-blue-100 border border-[#1D4ED8]/30 text-[#1D4ED8] font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center justify-center min-w-[96px]">
              <span id="btn-send-code-text">获取验证码</span>
            </button>
          </div>
          <p id="email-risk-error-msg" class="hidden text-rose-600 text-[11px] mt-1"></p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-[#334155]">
              邮箱验证码 <span class="text-[#1D4ED8]">*</span>
            </label>
            <span id="code-sent-tip" class="hidden text-[11px] text-[#1D4ED8] font-medium">已发送至工作邮箱</span>
          </div>
          <input type="text" id="inbound-code" maxlength="6" placeholder="请输入6位邮箱验证码" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm font-mono tracking-widest focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 placeholder:text-xs transition-colors">
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#334155] mb-1.5">
            设置登录密码 (6-20位) <span class="text-[#1D4ED8]">*</span>
          </label>
          <div class="relative">
            <input type="password" id="inbound-password" minlength="6" maxlength="20" placeholder="请设置您的工作台登录密码 (6-20位)" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:text-slate-400 placeholder:text-sm transition-colors">
            <button type="button" onclick="togglePasswordVisibility('inbound-password', 'reg-pwd-icon')" aria-label="切换密码明文显示" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs">
              <i id="reg-pwd-icon" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <!-- 自定义来源渠道 -->
        <div id="custom-channel-wrapper" class="relative">
          <label class="block text-xs font-semibold text-[#334155] mb-1.5">您从哪里了解到 KelvinFlow？</label>
          <input type="hidden" id="inbound-channel-source" value="">
          <div id="custom-channel-trigger" onclick="toggleCustomChannelDropdown(event)" class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm flex items-center justify-between cursor-pointer hover:border-slate-400 transition-colors">
            <span id="custom-channel-label" class="flex items-center gap-2 text-slate-400">
              <span class="text-xs">🌐</span> <span class="text-xs">请选择了解渠道 (选填)</span>
            </span>
            <i id="custom-channel-arrow" class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform"></i>
          </div>
          <!-- 下拉菜单 -->
          <div id="custom-channel-menu" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1 z-30">
            <div onclick="selectCustomChannel('xiaohongshu', '📕', '小红书')" data-val="xiaohongshu" class="custom-channel-option px-3 py-2 rounded-lg text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between cursor-pointer">
              <span class="flex items-center gap-2"><span>📕</span><span>小红书</span></span>
              <i class="option-check fa-solid fa-check text-[#1D4ED8] hidden"></i>
            </div>
            <div onclick="selectCustomChannel('peer', '🤝', '外贸同行/朋友推荐')" data-val="peer" class="custom-channel-option px-3 py-2 rounded-lg text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between cursor-pointer">
              <span class="flex items-center gap-2"><span>🤝</span><span>外贸同行/朋友推荐</span></span>
              <i class="option-check fa-solid fa-check text-[#1D4ED8] hidden"></i>
            </div>
            <div onclick="selectCustomChannel('wechat_group', '💬', '外贸行业群组')" data-val="wechat_group" class="custom-channel-option px-3 py-2 rounded-lg text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between cursor-pointer">
              <span class="flex items-center gap-2"><span>💬</span><span>外贸行业群组</span></span>
              <i class="option-check fa-solid fa-check text-[#1D4ED8] hidden"></i>
            </div>
            <div onclick="selectCustomChannel('search', '🔍', '搜索引擎/其它')" data-val="search" class="custom-channel-option px-3 py-2 rounded-lg text-xs text-[#334155] hover:bg-[#F1F5F9] flex items-center justify-between cursor-pointer">
              <span class="flex items-center gap-2"><span>🔍</span><span>搜索引擎/其它</span></span>
              <i class="option-check fa-solid fa-check text-[#1D4ED8] hidden"></i>
            </div>
          </div>
        </div>

        <!-- 数据安全保障条 -->
        <div class="p-3 rounded-xl bg-[#EFF6FF] border border-[#1D4ED8]/20 text-[#1D4ED8] text-xs leading-relaxed flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-[#1D4ED8] flex-shrink-0"></i>
          <span>底价表与历史报价单安全保留 30 天 · 到期不自动扣费</span>
        </div>

        <div id="inbound-error-feedback" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"></div>
        <div id="inbound-success-feedback" class="hidden p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs"></div>

        <button type="submit" id="inbound-submit-btn" class="w-full py-3.5 rounded-full font-bold text-sm text-white bg-primary-container hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer">
          <i class="fa-solid fa-wand-magic-sparkles text-amber-300 text-xs"></i>
          <span>立即开通 7 天免费试用 ➔</span>
        </button>
      </form>

      <!-- 2. 登录表单 -->
      <form id="inbound-login-form" novalidate onsubmit="handleInboundLoginSubmit(event)" class="hidden space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[#334155] mb-1.5">工作邮箱</label>
          <input type="email" id="inbound-login-email" name="username" autocomplete="username" placeholder="请输入注册工作邮箱" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors">
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-[#334155]">账户密码</label>
            <div class="flex items-center gap-2">
              <button type="button" onclick="openForgotPasswordModal()" class="text-xs text-[#1D4ED8] hover:underline transition cursor-pointer">忘记密码？</button>
              <span class="text-slate-400 text-xs">·</span>
              <span id="login-pwd-security-badge" class="text-[11px] text-slate-500">加密保护</span>
            </div>
          </div>
          <div class="relative">
            <input type="password" id="inbound-login-password" name="password" autocomplete="current-password" placeholder="请输入账户登录密码" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors">
            <button type="button" onclick="togglePasswordVisibility('inbound-login-password', 'login-pwd-icon')" aria-label="切换登录密码明文显示" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs">
              <i id="login-pwd-icon" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>

        <div id="inbound-login-error-feedback" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"></div>
        <div id="inbound-login-success-feedback" class="hidden p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs"></div>

        <button type="submit" id="inbound-login-submit-btn" class="w-full py-3.5 rounded-full font-bold text-sm text-white bg-primary-container hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer">
          <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
          <span id="inbound-login-btn-text">验证密码并登入系统 ➔</span>
        </button>
      </form>

    </div>
  </div>

  <!-- B. 密码重置弹窗 (Forgot Password Modal) -->
  <div id="forgot-password-modal" class="fixed inset-0 z-[220] bg-slate-900/60 backdrop-blur-md hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <div onclick="event.stopPropagation()" class="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative cursor-default">
      
      <!-- 关闭按钮 -->
      <button onclick="closeForgotPasswordModal()" aria-label="关闭密码重置窗口" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100">
        <i class="fa-solid fa-xmark text-base"></i>
      </button>

      <!-- 顶部 Badge -->
      <div class="mb-4">
        <span class="px-3 py-1 rounded-full text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#1D4ED8]/20 flex items-center gap-1.5 w-fit">
          <i class="fa-solid fa-shield-halved text-[#1D4ED8]"></i>
          <span>账号安全中心 · 找回密码</span>
        </span>
      </div>

      <!-- 阶段 1：核验工作邮箱验证码 -->
      <div id="forgot-step-1">
        <h3 class="text-2xl font-bold text-[#0F172A] mb-1.5">重置登录密码</h3>
        <p class="text-xs text-[#64748B] mb-6">输入注册工作邮箱获取验证码，核验后即可设置新密码</p>

        <form id="forgot-step1-form" onsubmit="handleForgotStep1Submit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[#334155] mb-1.5">
              注册工作邮箱 <span class="text-[#1D4ED8]">*</span>
            </label>
            <div class="flex gap-2">
              <input type="email" id="forgot-email" placeholder="请输入注册时的工作邮箱" required class="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:text-slate-400 placeholder:text-xs transition-colors">
              <button type="button" id="btn-forgot-send-code" onclick="sendForgotPasswordCode()" class="px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] hover:bg-blue-100 border border-[#1D4ED8]/30 text-[#1D4ED8] font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center justify-center min-w-[96px]">
                <span id="btn-forgot-send-code-text">获取验证码</span>
              </button>
            </div>
            <p id="forgot-email-error" class="hidden text-rose-600 text-[11px] mt-1"></p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold text-[#334155]">
                邮箱验证码 <span class="text-[#1D4ED8]">*</span>
              </label>
              <span id="forgot-code-sent-tip" class="hidden text-[11px] text-[#1D4ED8] font-medium">已发送至工作邮箱</span>
            </div>
            <input type="text" id="forgot-code" maxlength="6" placeholder="请输入 6 位邮箱验证码" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm font-mono tracking-widest focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 placeholder:text-xs transition-colors">
          </div>

          <div id="forgot-step1-error-feedback" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"></div>
          <div id="forgot-step1-success-feedback" class="hidden p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs"></div>

          <button type="submit" id="btn-forgot-step1-submit" class="w-full py-3.5 rounded-full font-bold text-sm text-white bg-primary-container hover:bg-blue-700 shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer">
            <span id="btn-forgot-step1-text">下一步：设置新密码 ➔</span>
          </button>

          <div class="text-center pt-2">
            <button type="button" onclick="cancelForgotPasswordAndReturnLogin()" class="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer inline-flex items-center gap-1.5">
              <i class="fa-solid fa-arrow-left text-[10px]"></i>
              <span>返回密码登录</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 阶段 2：输入新密码 -->
      <div id="forgot-step-2" class="hidden">
        <h3 class="text-2xl font-bold text-[#0F172A] mb-1.5">输入新密码</h3>
        <p class="text-xs text-[#64748B] mb-6">验证码已核验通过，请设置并确认您的新登录密码</p>

        <form id="forgot-step2-form" onsubmit="handleForgotStep2Submit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[#334155] mb-1.5">
              重置新密码 <span class="text-[#1D4ED8]">*</span>
            </label>
            <div class="relative">
              <input type="password" id="forgot-new-password" minlength="6" maxlength="20" placeholder="请输入新密码 (6-20位字符)" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:text-slate-400 placeholder:text-sm transition-colors">
              <button type="button" onclick="togglePasswordVisibility('forgot-new-password', 'forgot-new-pwd-icon')" aria-label="切换新密码显示" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs">
                <i id="forgot-new-pwd-icon" class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#334155] mb-1.5">
              再次输入新密码 <span class="text-[#1D4ED8]">*</span>
            </label>
            <div class="relative">
              <input type="password" id="forgot-confirm-password" minlength="6" maxlength="20" placeholder="请再次输入新密码 (须与上方一致)" required class="w-full px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm focus:outline-none focus:border-[#1D4ED8] focus:bg-white placeholder:text-slate-400 placeholder:text-sm transition-colors">
              <button type="button" onclick="togglePasswordVisibility('forgot-confirm-password', 'forgot-confirm-pwd-icon')" aria-label="切换确认密码显示" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs">
                <i id="forgot-confirm-pwd-icon" class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>

          <div id="forgot-step2-error-feedback" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs"></div>
          <div id="forgot-step2-success-feedback" class="hidden p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs"></div>

          <button type="submit" id="btn-forgot-step2-submit" class="w-full py-3.5 rounded-full font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer">
            <i class="fa-solid fa-check text-white text-xs"></i>
            <span id="btn-forgot-step2-text">确认更改</span>
          </button>

          <div class="text-center pt-2">
            <button type="button" onclick="backToForgotStep1()" class="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer inline-flex items-center gap-1.5">
              <i class="fa-solid fa-arrow-left text-[10px]"></i>
              <span>返回上一步</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>

  <!-- C. 退出登录确认弹窗 (Logout Modal) -->
  <div id="logout-confirm-modal" onclick="closeLogoutModal()" class="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200 cursor-pointer">
    <div onclick="event.stopPropagation()" class="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-xs p-6 shadow-2xl relative cursor-default text-center">
      <h4 class="text-base font-bold text-[#0F172A] mb-2">确认退出登录？</h4>
      <p class="text-xs text-[#64748B] mb-5">退出后本地将清除账号令牌，您可随时重新登录。</p>
      <div class="flex items-center space-x-2">
        <button onclick="closeLogoutModal()" class="flex-1 py-2 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#334155] font-medium text-xs transition cursor-pointer">取消</button>
        <button onclick="confirmLogoutUser()" class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer">退出</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- 核心前端交互与状态机 (Functional JavaScript Engine)                       -->
  <!-- ========================================================================= -->
  <script>
    let currentInboundTier = 'general';
    let currentInboundFormMode = 'register';
    let verificationCooldownTimer = null;
    let forgotPasswordCooldownTimer = null;
    let forgotResetToken = '';

    // FAQ 手风琴展开与收起
    function toggleFaq(headerEl) {
      const content = headerEl.nextElementSibling;
      const icon = headerEl.querySelector('.material-symbols-outlined');
      if (!content || !icon) return;
      if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
      } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
      }
    }

    // 移动端菜单切换
    function toggleMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      const icon = document.getElementById('mobile-menu-icon');
      if (!drawer) return;
      const isHidden = drawer.classList.contains('hidden');
      if (isHidden) {
        drawer.classList.remove('hidden');
        if (icon) { icon.classList.remove('fa-bars'); icon.classList.add('fa-xmark'); }
      } else {
        drawer.classList.add('hidden');
        if (icon) { icon.classList.remove('fa-xmark'); icon.classList.add('fa-bars'); }
      }
    }

    function closeMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      const icon = document.getElementById('mobile-menu-icon');
      if (drawer) drawer.classList.add('hidden');
      if (icon) { icon.classList.remove('fa-xmark'); icon.classList.add('fa-bars'); }
    }

    // 登录与试用状态自适应
    function updateNavForLoggedInUser() {
      const email = localStorage.getItem('kelvinflow_user_email') || localStorage.getItem('kelvinflow_user_phone');
      const token = localStorage.getItem('saas_auth_token');
      const wbUrl = token ? '/review/QT-20260904-888?token=' + encodeURIComponent(token) : '/review/QT-20260904-888';

      const trialBtn = document.getElementById('nav-trial-btn');
      const loginBtn = document.getElementById('nav-login-btn');
      const wbBtn = document.getElementById('nav-workbench-btn');
      const userChip = document.getElementById('nav-user-chip');
      const userPhone = document.getElementById('nav-user-phone');

      if (email) {
        if (trialBtn) trialBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
        if (wbBtn) { wbBtn.style.display = 'inline-flex'; wbBtn.href = wbUrl; }
        if (userChip) {
          userChip.style.display = 'inline-flex';
          if (userPhone) {
            userPhone.textContent = email;
          }
        }

        const statusUrl = '/api/v1/auth/trial-status?email=' + encodeURIComponent(email);
        fetch(statusUrl)
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.exists) {
              if (data.plan) localStorage.setItem('kelvinflow_user_plan', data.plan);
              if (data.expired) localStorage.setItem('kelvinflow_user_expired', 'true');
              if (data.isPaid) localStorage.setItem('kelvinflow_user_is_paid', 'true');
            }
          })
          .catch(() => {});
      } else {
        if (trialBtn) trialBtn.style.display = 'inline-flex';
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (wbBtn) wbBtn.style.display = 'none';
        if (userChip) userChip.style.display = 'none';
      }
    }

    function lockBodyScroll() {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.documentElement.style.paddingRight = scrollbarWidth + 'px';
      }
      document.documentElement.style.overflow = 'hidden';
    }

    function unlockBodyScroll() {
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
    }

    function togglePasswordVisibility(inputId, iconId) {
      const input = document.getElementById(inputId);
      const icon = document.getElementById(iconId);
      if (!input || !icon) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    }

    function switchInboundFormMode(mode) {
      currentInboundFormMode = mode;
      const subtabReg = document.getElementById('inbound-subtab-reg');
      const subtabLogin = document.getElementById('inbound-subtab-login');
      const formReg = document.getElementById('inbound-form');
      const formLogin = document.getElementById('inbound-login-form');
      const badge = document.getElementById('inbound-tier-badge');
      const title = document.getElementById('inbound-title');
      const desc = document.getElementById('inbound-desc');

      if (mode === 'login') {
        if (subtabReg) subtabReg.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-[#64748B] hover:text-[#0F172A]';
        if (subtabLogin) subtabLogin.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer bg-white text-[#1D4ED8] shadow-sm';
        if (formReg) formReg.classList.add('hidden');
        if (formLogin) formLogin.classList.remove('hidden');

        if (badge) badge.textContent = '已有账号登录 · 个人版/试用会员';
        if (title) title.textContent = '欢迎登录外贸智能工作台';
        if (desc) desc.textContent = '密码加密保护 · 安全管理私有底价库与报价草稿';

        const savedAccount = localStorage.getItem('kelvinflow_user_email') || '';
        const loginEmailInput = document.getElementById('inbound-login-email');
        if (savedAccount && loginEmailInput && !loginEmailInput.value) {
          loginEmailInput.value = savedAccount;
        }
      } else {
        if (subtabReg) subtabReg.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer bg-white text-[#1D4ED8] shadow-sm';
        if (subtabLogin) subtabLogin.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-[#64748B] hover:text-[#0F172A]';
        if (formReg) formReg.classList.remove('hidden');
        if (formLogin) formLogin.classList.add('hidden');

        if (badge) badge.textContent = '免费开通 7 天全功能试用席位';
        if (title) title.textContent = '开启外贸智能出单体验';
        if (desc) desc.textContent = '开箱自带演示底价库 · 密码加密保护商业机密';
      }
    }

    function openInboundModal(tier) {
      currentInboundTier = tier || 'general';

      const token = localStorage.getItem('saas_auth_token');
      if (token && tier !== 'login') {
        const redirectBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? '/review/QT-20260904-888'
          : 'https://quote.kelvinflow.com/';
        window.location.href = redirectBase + '?token=' + encodeURIComponent(token);
        return;
      }

      const modal = document.getElementById('inbound-modal');
      const badge = document.getElementById('inbound-tier-badge');

      if (tier === 'login') {
        switchInboundFormMode('login');
      } else {
        switchInboundFormMode('register');
      }

      if (badge && tier !== 'login') {
        badge.textContent = '免费开通 7 天全功能试用席位 (零风险体验)';
      }

      if (!modal) return;
      lockBodyScroll();
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
      }, 10);
    }

    function closeInboundModal() {
      const modal = document.getElementById('inbound-modal');
      if (!modal) return;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        unlockBodyScroll();
      }, 200);
    }

    function openForgotPasswordModal() {
      const inboundModal = document.getElementById('inbound-modal');
      if (inboundModal) {
        inboundModal.classList.remove('opacity-100');
        inboundModal.classList.add('opacity-0');
        setTimeout(() => inboundModal.classList.add('hidden'), 200);
      }

      const step1 = document.getElementById('forgot-step-1');
      const step2 = document.getElementById('forgot-step-2');
      if (step1) step1.classList.remove('hidden');
      if (step2) step2.classList.add('hidden');

      const loginEmail = document.getElementById('inbound-login-email')?.value?.trim();
      const savedEmail = localStorage.getItem('kelvinflow_user_email') || '';
      const emailInput = document.getElementById('forgot-email');
      if (emailInput) {
        emailInput.value = loginEmail || savedEmail || '';
      }

      const codeInput = document.getElementById('forgot-code');
      if (codeInput) codeInput.value = '';
      const newPwdInput = document.getElementById('forgot-new-password');
      if (newPwdInput) newPwdInput.value = '';
      const confirmPwdInput = document.getElementById('forgot-confirm-password');
      if (confirmPwdInput) confirmPwdInput.value = '';

      const err1 = document.getElementById('forgot-step1-error-feedback');
      if (err1) { err1.textContent = ''; err1.classList.add('hidden'); }
      const succ1 = document.getElementById('forgot-step1-success-feedback');
      if (succ1) { succ1.textContent = ''; succ1.classList.add('hidden'); }
      const emailErr = document.getElementById('forgot-email-error');
      if (emailErr) { emailErr.textContent = ''; emailErr.classList.add('hidden'); }
      const err2 = document.getElementById('forgot-step2-error-feedback');
      if (err2) { err2.textContent = ''; err2.classList.add('hidden'); }
      const succ2 = document.getElementById('forgot-step2-success-feedback');
      if (succ2) { succ2.textContent = ''; succ2.classList.add('hidden'); }
      const codeTip = document.getElementById('forgot-code-sent-tip');
      if (codeTip) codeTip.classList.add('hidden');

      forgotResetToken = '';

      const modal = document.getElementById('forgot-password-modal');
      if (!modal) return;
      lockBodyScroll();
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        if (emailInput && !emailInput.value) emailInput.focus();
        else if (codeInput) codeInput.focus();
      }, 10);
    }

    function closeForgotPasswordModal() {
      const modal = document.getElementById('forgot-password-modal');
      if (!modal) return;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        unlockBodyScroll();
      }, 200);
    }

    function cancelForgotPasswordAndReturnLogin() {
      closeForgotPasswordModal();
      setTimeout(() => {
        openInboundModal('login');
      }, 220);
    }

    function backToForgotStep1() {
      const step1 = document.getElementById('forgot-step-1');
      const step2 = document.getElementById('forgot-step-2');
      if (step1) step1.classList.remove('hidden');
      if (step2) step2.classList.add('hidden');
    }

    async function sendInboundVerificationCode() {
      const emailInput = document.getElementById('inbound-email');
      const email = (emailInput?.value || '').trim();
      const btn = document.getElementById('btn-send-code');
      const btnText = document.getElementById('btn-send-code-text');
      const riskErr = document.getElementById('email-risk-error-msg');
      const codeTip = document.getElementById('code-sent-tip');

      if (riskErr) { riskErr.classList.add('hidden'); riskErr.textContent = ''; }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (riskErr) {
          riskErr.textContent = '请输入合法的电子邮箱地址（用于接收验证码）';
          riskErr.classList.remove('hidden');
        }
        emailInput?.focus();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i>';
      }

      try {
        const res = await fetch('/api/v1/auth/trial-register/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!data.success) {
          if (riskErr) {
            riskErr.textContent = data.error || '验证码发送受阻，请稍后再试';
            riskErr.classList.remove('hidden');
          }
          if (btn) {
            btn.disabled = false;
            btnText.textContent = '获取验证码';
          }
          return;
        }

        if (codeTip) {
          codeTip.textContent = '验证码已发送至邮箱 (10分钟有效)';
          codeTip.classList.remove('hidden');
        }

        document.getElementById('inbound-code')?.focus();

        let secondsLeft = 60;
        btnText.textContent = secondsLeft + 's可重发';
        if (verificationCooldownTimer) clearInterval(verificationCooldownTimer);
        verificationCooldownTimer = setInterval(() => {
          secondsLeft--;
          if (secondsLeft <= 0) {
            clearInterval(verificationCooldownTimer);
            verificationCooldownTimer = null;
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = '获取验证码';
          } else {
            if (btnText) btnText.textContent = secondsLeft + 's可重发';
          }
        }, 1000);

      } catch (err) {
        console.error('发送验证码网络异常:', err);
        if (riskErr) {
          riskErr.textContent = '网络连接异常，请重试';
          riskErr.classList.remove('hidden');
        }
        if (btn) {
          btn.disabled = false;
          btnText.textContent = '获取验证码';
        }
      }
    }

    async function handleInboundSubmit(e) {
      e.preventDefault();
      const email = (document.getElementById('inbound-email')?.value || '').trim();
      const code = (document.getElementById('inbound-code')?.value || '').trim();
      const password = (document.getElementById('inbound-password')?.value || '').trim();
      const channelSource = (document.getElementById('inbound-channel-source')?.value || '').trim();
      const riskErr = document.getElementById('email-risk-error-msg');
      const errorBox = document.getElementById('inbound-error-feedback');
      const successBox = document.getElementById('inbound-success-feedback');
      const submitBtn = document.getElementById('inbound-submit-btn');

      if (riskErr) { riskErr.classList.add('hidden'); riskErr.textContent = ''; }
      if (errorBox) { errorBox.classList.add('hidden'); errorBox.innerHTML = ''; }
      if (successBox) { successBox.classList.add('hidden'); successBox.innerHTML = ''; }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (riskErr) {
          riskErr.textContent = '请输入合法的电子邮箱地址';
          riskErr.classList.remove('hidden');
        }
        document.getElementById('inbound-email')?.focus();
        return;
      }

      if (!code || code.length !== 6) {
        if (errorBox) {
          errorBox.textContent = '请输入邮件中收到的 6 位数字验证码';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-code')?.focus();
        return;
      }

      if (!password || password.length < 6) {
        if (errorBox) {
          errorBox.textContent = '请设置至少 6 位的登录密码，用于保护您的私有底价机密';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-password')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> <span>正在验证并开通 7 天免费试用...</span>';
      }

      try {
        const res = await fetch('/api/v1/auth/trial-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, password, channelSource })
        });
        const data = await res.json();

        if (!data.success) {
          if (data.canLogin) {
            switchInboundFormMode('login');
            const loginEmailInput = document.getElementById('inbound-login-email');
            if (loginEmailInput) loginEmailInput.value = email;
            const loginErrBox = document.getElementById('inbound-login-error-feedback');
            if (loginErrBox) {
              loginErrBox.textContent = data.error || '该邮箱已开通过试用，请在此输入密码直接登录！';
              loginErrBox.classList.remove('hidden');
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-amber-300 text-xs"></i> <span>立即开通 7 天免费试用 ➔</span>';
            }
            return;
          }

          if (errorBox) {
            errorBox.textContent = data.error || '开通失败，请检查输入或重试';
            errorBox.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-amber-300 text-xs"></i> <span>立即开通 7 天免费试用 ➔</span>';
          }
          return;
        }

        if (data.token) {
          localStorage.setItem('saas_auth_token', data.token);
          localStorage.setItem('kelvinflow_user_email', email);
          localStorage.setItem('kelvinflow_user_name', data.user?.name || '外贸同行');
          localStorage.setItem('kelvinflow_remaining_days', String(data.remainingDays || 7));
          localStorage.setItem('kelvinflow_user_plan', 'trial');
          localStorage.setItem('kelvinflow_user_is_paid', 'false');
          updateNavForLoggedInUser();
        }

        if (successBox) {
          successBox.innerHTML = '<div class="flex items-center space-x-2"><i class="fa-solid fa-circle-check text-emerald-500 text-lg flex-shrink-0"></i><div><strong class="text-xs text-slate-800">🎉 试用开通成功！</strong><p class="text-[11px] text-emerald-600 mt-0.5">正在为您准备工作台，即将跳转...</p></div></div>';
          successBox.classList.remove('hidden');
        }

        setTimeout(() => {
          const redirectBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/review/QT-20260904-888'
            : 'https://quote.kelvinflow.com/';
          window.location.href = redirectBase + '?token=' + encodeURIComponent(data.token) + '&tour=1';
        }, 600);

      } catch (err) {
        console.error('试用开通异常:', err);
        if (errorBox) {
          errorBox.textContent = '网络连接异常，请重试！';
          errorBox.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-amber-300 text-xs"></i> <span>立即开通 7 天免费试用 ➔</span>';
        }
      }
    }

    async function handleInboundLoginSubmit(e) {
      e.preventDefault();
      const email = (document.getElementById('inbound-login-email')?.value || '').trim();
      const password = (document.getElementById('inbound-login-password')?.value || '').trim();
      const errorBox = document.getElementById('inbound-login-error-feedback');
      const successBox = document.getElementById('inbound-login-success-feedback');
      const submitBtn = document.getElementById('inbound-login-submit-btn');

      if (errorBox) { errorBox.classList.add('hidden'); errorBox.innerHTML = ''; }
      if (successBox) { successBox.classList.add('hidden'); successBox.innerHTML = ''; }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (errorBox) {
          errorBox.innerHTML = '<span>请输入注册的工作邮箱（如 yourname@company.com）</span>';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-login-email')?.focus();
        return;
      }

      if (!password) {
        if (errorBox) {
          errorBox.innerHTML = '<span>请输入账户登录密码</span>';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-login-password')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> <span>正在验证密码并登入...</span>';
      }

      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!data.success) {
          if (errorBox) {
            errorBox.textContent = data.message || data.error || '登录失败，请核对工作邮箱与密码';
            errorBox.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket text-xs"></i> <span>验证密码并登入系统 ➔</span>';
          }
          return;
        }

        if (data.token) {
          localStorage.setItem('saas_auth_token', data.token);
          localStorage.setItem('kelvinflow_user_email', data.user?.email || email);
          if (data.user?.name) localStorage.setItem('kelvinflow_user_name', data.user.name);
          if (data.remainingDays !== undefined) localStorage.setItem('kelvinflow_remaining_days', String(data.remainingDays));
          if (data.plan) localStorage.setItem('kelvinflow_user_plan', data.plan);
          if (data.isPaid !== undefined) localStorage.setItem('kelvinflow_user_is_paid', String(data.isPaid));
          updateNavForLoggedInUser();
        }

        if (successBox) {
          successBox.innerHTML = '<div class="flex items-center space-x-2"><i class="fa-solid fa-circle-check text-emerald-500 text-lg flex-shrink-0"></i><div><strong class="text-xs text-slate-800">🎉 登录成功！</strong><p class="text-[11px] text-emerald-600 mt-0.5">欢迎回到工作台，正在跳转...</p></div></div>';
          successBox.classList.remove('hidden');
        }

        setTimeout(() => {
          const redirectBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/review/QT-20260904-888'
            : 'https://quote.kelvinflow.com/';
          window.location.href = redirectBase + '?token=' + encodeURIComponent(data.token);
        }, 600);

      } catch (err) {
        if (errorBox) {
          errorBox.textContent = '网络连接异常，请稍后重试';
          errorBox.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket text-xs"></i> <span>验证密码并登入系统 ➔</span>';
        }
      }
    }

    async function sendForgotPasswordCode() {
      const emailInput = document.getElementById('forgot-email');
      const email = (emailInput?.value || '').trim();
      const btn = document.getElementById('btn-forgot-send-code');
      const btnText = document.getElementById('btn-forgot-send-code-text');
      const emailErr = document.getElementById('forgot-email-error');
      const errFeedback = document.getElementById('forgot-step1-error-feedback');
      const succFeedback = document.getElementById('forgot-step1-success-feedback');
      const codeTip = document.getElementById('forgot-code-sent-tip');

      if (emailErr) { emailErr.textContent = ''; emailErr.classList.add('hidden'); }
      if (errFeedback) { errFeedback.textContent = ''; errFeedback.classList.add('hidden'); }
      if (succFeedback) { succFeedback.textContent = ''; succFeedback.classList.add('hidden'); }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (emailErr) {
          emailErr.textContent = '请输入合法的注册工作邮箱地址';
          emailErr.classList.remove('hidden');
        }
        emailInput?.focus();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i>';
      }

      try {
        const res = await fetch('/api/v1/auth/forgot-password/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!data.success) {
          if (errFeedback) {
            errFeedback.textContent = data.error || '验证码发送受阻，请稍后再试';
            errFeedback.classList.remove('hidden');
          }
          if (btn) {
            btn.disabled = false;
            btnText.textContent = '获取验证码';
          }
          return;
        }

        if (codeTip) {
          codeTip.textContent = '验证码已发送至工作邮箱 (10分钟有效)';
          codeTip.classList.remove('hidden');
        }

        document.getElementById('forgot-code')?.focus();

        let secondsLeft = 60;
        btnText.textContent = secondsLeft + 's可重发';
        if (forgotPasswordCooldownTimer) clearInterval(forgotPasswordCooldownTimer);
        forgotPasswordCooldownTimer = setInterval(() => {
          secondsLeft--;
          if (secondsLeft <= 0) {
            clearInterval(forgotPasswordCooldownTimer);
            forgotPasswordCooldownTimer = null;
            if (btn) btn.disabled = false;
            btnText.textContent = '获取验证码';
          } else {
            btnText.textContent = secondsLeft + 's可重发';
          }
        }, 1000);

      } catch (err) {
        console.error('发送密码重置码网络异常:', err);
        if (errFeedback) {
          errFeedback.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (btn) {
          btn.disabled = false;
          btnText.textContent = '获取验证码';
        }
      }
    }

    async function handleForgotStep1Submit(e) {
      e.preventDefault();
      const email = (document.getElementById('forgot-email')?.value || '').trim();
      const code = (document.getElementById('forgot-code')?.value || '').trim();
      const errFeedback = document.getElementById('forgot-step1-error-feedback');
      const succFeedback = document.getElementById('forgot-step1-success-feedback');
      const submitBtn = document.getElementById('btn-forgot-step1-submit');
      const submitBtnText = document.getElementById('btn-forgot-step1-text');

      if (errFeedback) { errFeedback.textContent = ''; errFeedback.classList.add('hidden'); }
      if (succFeedback) { succFeedback.textContent = ''; succFeedback.classList.add('hidden'); }

      if (!email) {
        document.getElementById('forgot-email')?.focus();
        return;
      }
      if (!code || code.length !== 6) {
        if (errFeedback) {
          errFeedback.textContent = '请输入完整的 6 位验证码';
          errFeedback.classList.remove('hidden');
        }
        document.getElementById('forgot-code')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = '正在核验验证码...';
      }

      try {
        const res = await fetch('/api/v1/auth/forgot-password/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();

        if (!data.success) {
          if (errFeedback) {
            errFeedback.textContent = data.error || '验证码错误或已失效';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtnText) submitBtnText.textContent = '下一步：设置新密码 ➔';
          }
          return;
        }

        forgotResetToken = data.resetToken || '';

        const step1 = document.getElementById('forgot-step-1');
        const step2 = document.getElementById('forgot-step-2');
        if (step1) step1.classList.add('hidden');
        if (step2) step2.classList.remove('hidden');

        document.getElementById('forgot-new-password')?.focus();

      } catch (err) {
        console.error('核验验证码网络异常:', err);
        if (errFeedback) {
          errFeedback.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = '下一步：设置新密码 ➔';
        }
      }
    }

    async function handleForgotStep2Submit(e) {
      e.preventDefault();
      const email = (document.getElementById('forgot-email')?.value || '').trim();
      const newPassword = (document.getElementById('forgot-new-password')?.value || '').trim();
      const confirmPassword = (document.getElementById('forgot-confirm-password')?.value || '').trim();
      const errFeedback = document.getElementById('forgot-step2-error-feedback');
      const succFeedback = document.getElementById('forgot-step2-success-feedback');
      const submitBtn = document.getElementById('btn-forgot-step2-submit');
      const submitBtnText = document.getElementById('btn-forgot-step2-text');

      if (errFeedback) { errFeedback.textContent = ''; errFeedback.classList.add('hidden'); }
      if (succFeedback) { succFeedback.textContent = ''; succFeedback.classList.add('hidden'); }

      if (!newPassword || newPassword.length < 6) {
        if (errFeedback) {
          errFeedback.textContent = '新密码长度至少需要 6 位字符';
          errFeedback.classList.remove('hidden');
        }
        document.getElementById('forgot-new-password')?.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        if (errFeedback) {
          errFeedback.textContent = '两次输入的密码不一致，请核对后重新输入！';
          errFeedback.classList.remove('hidden');
        }
        document.getElementById('forgot-confirm-password')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = '正在更改密码...';
      }

      try {
        const res = await fetch('/api/v1/auth/forgot-password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            resetToken: forgotResetToken,
            code: (document.getElementById('forgot-code')?.value || '').trim(),
            newPassword,
            confirmPassword
          })
        });
        const data = await res.json();

        if (!data.success) {
          if (errFeedback) {
            errFeedback.textContent = data.error || '密码更改失败，请稍后重试';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtnText) submitBtnText.textContent = '确认更改';
          }
          return;
        }

        if (succFeedback) {
          succFeedback.innerHTML = '<div class="flex items-center space-x-2"><i class="fa-solid fa-circle-check text-emerald-500 text-lg flex-shrink-0"></i><div><strong class="text-xs text-slate-800">🎉 更改成功！</strong><p class="text-[11px] text-emerald-600 mt-0.5">密码已成功重置，即将返回登录窗口...</p></div></div>';
          succFeedback.classList.remove('hidden');
        }

        setTimeout(() => {
          closeForgotPasswordModal();
          setTimeout(() => {
            openInboundModal('login');
            const loginEmailInput = document.getElementById('inbound-login-email');
            if (loginEmailInput) loginEmailInput.value = email;
            const loginPwdInput = document.getElementById('inbound-login-password');
            if (loginPwdInput) {
              loginPwdInput.value = '';
              loginPwdInput.focus();
            }
          }, 250);
        }, 1200);

      } catch (err) {
        console.error('重置密码提交异常:', err);
        if (errFeedback) {
          errFeedback.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = '确认更改';
        }
      }
    }

    function toggleCustomChannelDropdown(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const menu = document.getElementById('custom-channel-menu');
      const arrow = document.getElementById('custom-channel-arrow');
      if (!menu) return;
      const isOpen = !menu.classList.contains('hidden');
      if (isOpen) {
        menu.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
      } else {
        menu.classList.remove('hidden');
        if (arrow) arrow.classList.add('rotate-180');
      }
    }

    function selectCustomChannel(val, icon, label) {
      const input = document.getElementById('inbound-channel-source');
      const labelEl = document.getElementById('custom-channel-label');
      const menu = document.getElementById('custom-channel-menu');
      const arrow = document.getElementById('custom-channel-arrow');

      if (input) input.value = val;
      if (labelEl) labelEl.innerHTML = '<span>' + icon + '</span> <span class="text-[#0F172A] font-medium">' + label + '</span>';
      
      document.querySelectorAll('.custom-channel-option').forEach(opt => {
        const check = opt.querySelector('.option-check');
        if (opt.getAttribute('data-val') === val) {
          opt.classList.add('bg-blue-50', 'text-[#1D4ED8]', 'font-bold');
          if (check) check.classList.remove('hidden');
        } else {
          opt.classList.remove('bg-blue-50', 'text-[#1D4ED8]', 'font-bold');
          if (check) check.classList.add('hidden');
        }
      });

      if (menu) menu.classList.add('hidden');
      if (arrow) arrow.classList.remove('rotate-180');
    }

    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('custom-channel-wrapper');
      const menu = document.getElementById('custom-channel-menu');
      const arrow = document.getElementById('custom-channel-arrow');
      if (wrapper && !wrapper.contains(e.target) && menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
      }
    });

    function logoutUser() {
      const modal = document.getElementById('logout-confirm-modal');
      if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.remove('opacity-0'));
      } else {
        confirmLogoutUser();
      }
    }

    function closeLogoutModal() {
      const modal = document.getElementById('logout-confirm-modal');
      if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
      }
    }

    function confirmLogoutUser() {
      localStorage.removeItem('kelvinflow_user_phone');
      localStorage.removeItem('saas_auth_token');
      localStorage.removeItem('kelvinflow_user_email');
      localStorage.removeItem('kelvinflow_user_name');
      localStorage.removeItem('kelvinflow_user_plan');
      localStorage.removeItem('kelvinflow_user_is_paid');
      localStorage.removeItem('kelvinflow_remaining_days');
      localStorage.removeItem('kelvinflow_user_expired');
      localStorage.removeItem('kelvinflow_active_tenant');
      sessionStorage.clear();
      closeLogoutModal();
      updateNavForLoggedInUser();
      window.location.href = '/?logged_out=1';
    }

    document.addEventListener('DOMContentLoaded', () => {
      updateNavForLoggedInUser();
    });
  </script>
`;

const finalHtml = `${codeHtml}\n${modalsAndScripts}\n</body></html>`;

// 3. Prohibited words verification
const prohibitedWords = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure'];
console.log('--- Prohibited Words Audit ---');
let hasProhibited = false;
prohibitedWords.forEach(w => {
  const count = finalHtml.split(w).length - 1;
  console.log(`${w}: ${count}`);
  if (count > 0) hasProhibited = true;
});

if (hasProhibited) {
  throw new Error('Prohibited words detected in generated HTML!');
}

// 4. Write to public/index.html
const targetPath = path.join(__dirname, '..', 'public', 'index.html');
fs.writeFileSync(targetPath, finalHtml, 'utf8');
console.log('Successfully wrote to public/index.html! Length:', finalHtml.length);
