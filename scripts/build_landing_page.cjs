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

// 1.1 顶栏 Logo 图标 w-10 h-10 与 品牌文字 KelvinFlow AI 20px
codeHtml = codeHtml.replace(
  '<img src="/k_logo.svg" alt="KelvinFlow Logo" class="object-contain inline-block shrink-0" style="width: 56px; height: 56px; margin: -10px -18px -10px -6px;">',
  '<img src="/k_logo.svg" alt="KelvinFlow Logo" class="w-10 h-10 object-contain inline-block shrink-0">'
);
codeHtml = codeHtml.replace(
  '<span class="font-headline-sm text-headline-sm font-bold tracking-tight text-[#1B2A4A] flex items-center gap-1.5">KelvinFlow<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span>',
  '<span class="font-headline-sm text-headline-sm text-[20px] font-bold tracking-tight text-[#1B2A4A] flex items-center gap-1.5">KelvinFlow<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span>'
);

// 1.2 Hero 副文案按设计稿对版更新
codeHtml = codeHtml.replace(
  '<p class="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mb-10 leading-relaxed font-normal">AI 自动解析客户询盘意向，快速匹配你的出厂底价表，生成专业英文报价单 PDF 并写入邮箱草稿箱。你只需核对、在邮箱中手动发送。</p>',
  '<p class="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mb-10 leading-relaxed font-normal">针对复杂梯度起订量、海运拼箱、多阶关税与阶梯毛利，KelvinFlow AI 毫秒级重构外贸算价体验。</p>'
);

// Insert favicons and FontAwesome in <head>
const headInsert = `
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    html, body {
      overflow-x: hidden;
      max-width: 100vw;
    }
    /* 滚动渐入动画 (克制自然上浮 20px，耗时 550ms) */
    .scroll-reveal {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: opacity, transform;
    }
    .scroll-reveal.revealed {
      opacity: 1;
      transform: translateY(0);
    }
    @media (prefers-reduced-motion: reduce) {
      .scroll-reveal {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
    }
  </style>
`;
codeHtml = codeHtml.replace('</head>', `${headInsert}\n</head>`);

// Update Header container for mobile responsive padding
codeHtml = codeHtml.replace(
  '<div class="h-16 max-w-[1440px] mx-auto px-margin-desktop flex items-center justify-between">',
  '<div class="h-16 max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex items-center justify-between">'
);

// Update Header nav links and action buttons
const oldNav = `<nav class="hidden md:flex items-center gap-space-lg" data-active-classes="text-on-surface font-semibold"><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="features" href="#">功能特性</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="workflow" href="#">工作流程</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="excel-template" href="#">底价表规范</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="faq" href="#">常见问题</a></nav>`;
const newNav = `<nav class="hidden md:flex items-center gap-space-lg" data-active-classes="text-on-surface font-semibold"><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="features" href="#features">功能特性</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="workflow" href="#workflow">工作流程</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="excel-template" href="#excel-template">底价表规范</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="faq" href="#faq">常见问题</a></nav>`;
codeHtml = codeHtml.replace(oldNav, newNav);

const oldActions = `<div class="flex items-center gap-space-md"><a class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150" data-path="login" href="#">登录</a><a class="inline-flex items-center justify-center px-space-md py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150" data-path="signup" href="#">免费试用</a><div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div>`;
const newActions = `<div class="flex items-center gap-2 sm:gap-space-md">
      <a id="nav-login-btn" onclick="openInboundModal('login')" class="hidden md:inline-flex font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors duration-150 cursor-pointer" data-path="login" href="javascript:void(0)">登录</a>
      <a id="nav-trial-btn" onclick="openInboundModal('starter')" class="inline-flex items-center justify-center px-3 py-1.5 sm:px-space-md sm:py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-sm sm:text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer" data-path="signup" href="javascript:void(0)">免费试用</a>
      <a id="nav-workbench-btn" style="display: none;" class="items-center justify-center px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-primary-container text-on-primary font-body-md text-sm sm:text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 transition-all cursor-pointer" href="/review/QT-20260904-888">进入审单台</a>
      <div id="nav-user-chip" style="display: none;" class="items-center gap-2 pl-3 pr-2 py-1 bg-surface-container rounded-full text-xs font-medium text-on-surface border border-outline-variant/30">
        <span id="nav-user-phone" class="font-numeric-data text-xs text-on-surface"></span>
        <button onclick="openLogoutModal()" title="退出当前账号" class="w-6 h-6 rounded-full bg-surface-container-high hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition cursor-pointer text-slate-500">
          <i class="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
        </button>
      </div>
      <button id="mobile-menu-btn" onclick="toggleMobileNav()" class="md:hidden text-[#1B2A4A] p-1.5 transition-colors cursor-pointer flex items-center justify-center rounded-lg hover:bg-surface-container" aria-label="切换移动端导航">
        <svg id="mobile-menu-icon" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>`;
codeHtml = codeHtml.replace(oldActions, newActions);

// Insert mobile menu drawer right after </header>
const mobileDrawer = `
  <div id="mobile-nav-drawer" class="hidden md:hidden fixed top-16 left-0 right-0 z-40 px-6 py-4 bg-surface-container-lowest/95 backdrop-blur-md border-b border-[#f1f5f9] shadow-lg space-y-3">
    <a onclick="closeMobileNav()" href="#features" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">功能特性</a>
    <a onclick="closeMobileNav()" href="#workflow" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">工作流程</a>
    <a onclick="closeMobileNav()" href="#excel-template" class="block font-body-md text-on-surface-variant hover:text-on-surface py-1.5">底价表规范</a>
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

// In Excel feature section: add id="features" and anchor id="excel-template"
codeHtml = codeHtml.replace(
  '<section class="w-full py-24 bg-surface-container-low">',
  '<section class="w-full py-24 bg-surface-container-low relative" id="features"><div id="excel-template" class="absolute -top-20"></div>'
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

// M2: 底部 CTA 区三个勾选卖点在移动端改为垂直排列，每行一个卖点、勾选图标左对齐；桌面端保持横向三列
codeHtml = codeHtml.replace(
  '<div class="mt-8 flex items-center gap-6 text-on-surface-variant text-body-sm font-body-sm">',
  '<div class="mt-8 flex flex-col md:flex-row items-start md:items-center justify-center gap-3 md:gap-6 text-on-surface-variant text-body-sm font-body-sm">'
);

// M3: 页脚"© 2026 KelvinFlow. All rights reserved."重复出现两次，删除右侧重复项
codeHtml = codeHtml.replace(
  '<span class="font-body-sm text-body-sm text-outline-variant hidden md:inline">|</span><p class="font-body-sm text-body-sm text-on-surface-variant">© 2026 KelvinFlow. All rights reserved.</p>',
  ''
);

// 优化页脚在移动端的内边距并增加 id="footer" 与 scroll-reveal
codeHtml = codeHtml.replace(
  '<footer class="w-full bg-surface-container-lowest border-t border-[#f1f5f9] py-space-xl"><div class="max-w-[1440px] mx-auto px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-lg">',
  '<footer class="w-full bg-surface-container-lowest border-t border-[#f1f5f9] py-space-xl" id="footer"><div class="scroll-reveal max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-lg" data-reveal-delay="0">'
);

// ==================== SCROLL REVEAL INJECTIONS ====================
// Section 2: 3 Metric Cards (依次错开 100ms)
codeHtml = codeHtml.replace(
  '<!-- Metric Card 1 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between">',
  '<!-- Metric Card 1 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Metric Card 2 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between">',
  '<!-- Metric Card 2 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- Metric Card 3 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between">',
  '<!-- Metric Card 3 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between" data-reveal-delay="200">'
);

// Section 3: Workflow Header & 3 Step Cards (依次错开 100ms)
codeHtml = codeHtml.replace(
  '<div class="text-center max-w-3xl mx-auto mb-16">',
  '<div class="scroll-reveal text-center max-w-3xl mx-auto mb-16" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Step 1 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col relative transition-all duration-200 hover:-translate-y-1">',
  '<!-- Step 1 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col relative transition-all duration-200 hover:-translate-y-1" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Step 2 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col relative transition-all duration-200 hover:-translate-y-1">',
  '<!-- Step 2 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col relative transition-all duration-200 hover:-translate-y-1" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- Step 3 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col relative transition-all duration-200 hover:-translate-y-1">',
  '<!-- Step 3 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col relative transition-all duration-200 hover:-translate-y-1" data-reveal-delay="200">'
);

// Section 4: Features Header & 3 Feature Cards (依次错开 100ms)
codeHtml = codeHtml.replace(
  '<div class="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">',
  '<div class="scroll-reveal flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Feature 1 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between">',
  '<!-- Feature 1 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Feature 2 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between">',
  '<!-- Feature 2 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- Feature 3 -->\n<div class="bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between">',
  '<!-- Feature 3 -->\n<div class="scroll-reveal bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between" data-reveal-delay="200">'
);

// Section 5: FAQ Header & 4 FAQ Items (依次错开 80-100ms)
codeHtml = codeHtml.replace(
  '<!-- Section Header -->\n<div class="text-center mb-16">',
  '<!-- Section Header -->\n<div class="scroll-reveal text-center mb-16" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 1 -->\n<div class="bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all">',
  '<!-- FAQ Item 1 -->\n<div class="scroll-reveal bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 2 -->\n<div class="bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all">',
  '<!-- FAQ Item 2 -->\n<div class="scroll-reveal bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 3 -->\n<div class="bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all">',
  '<!-- FAQ Item 3 -->\n<div class="scroll-reveal bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all" data-reveal-delay="200">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 4 -->\n<div class="bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all">',
  '<!-- FAQ Item 4 -->\n<div class="scroll-reveal bg-surface-container-low rounded-2xl p-6 md:p-8 transition-all" data-reveal-delay="300">'
);

// Section 6: Pre-footer Trial CTA
codeHtml = codeHtml.replace(
  '<div class="bg-surface-container-lowest rounded-3xl p-10 md:p-16 shadow-lg text-center flex flex-col items-center">',
  '<div class="scroll-reveal bg-surface-container-lowest rounded-3xl p-10 md:p-16 shadow-lg text-center flex flex-col items-center" data-reveal-delay="0">'
);

// Append the Reskinned Modals & JavaScript Logic right before </body>
const modalsAndScripts = `
  <!-- ========================================================================= -->
  <!-- 弹窗交互组件群 (Precision Trade Minimal v13 Modals)                       -->
  <!-- ========================================================================= -->

  <!-- A. 试用开通 & 密码登录弹窗 (Inbound Modal) -->
  <div id="inbound-modal" class="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <!-- Click Scrim -->
    <div class="absolute inset-0" onclick="closeInboundModal()"></div>

    <!-- Modal Card Body -->
    <div onclick="event.stopPropagation()" class="max-w-[440px] w-full bg-surface-container-lowest rounded-2xl shadow-2xl p-7 md:p-8 relative overflow-hidden transition-all duration-200 z-10 my-auto">
      
      <!-- 关闭按钮 (X 图标，与设计稿对齐) -->
      <button onclick="closeInboundModal()" aria-label="关闭弹窗" class="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors duration-150 group cursor-pointer focus:outline-none" type="button">
        <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:rotate-90">close</span>
      </button>

      <!-- 品牌标识与 Logo -->
      <div class="flex flex-col items-center text-center">
        <div class="flex items-end justify-center gap-1.5 mb-2">
          <img src="/k_logo.svg" alt="KelvinFlow Logo" class="w-8 h-8 object-contain shrink-0">
          <span class="font-headline-lg text-headline-lg font-bold tracking-tight text-[#1B2A4A] leading-none">KelvinFlow</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none mb-0.5 uppercase">AI</span>
        </div>
      </div>

      <!-- 试用 / 密码登录 双 Tab 切换 -->
      <div class="flex p-1 bg-surface-container-low rounded-xl mb-4 mt-1">
        <button id="inbound-subtab-reg" onclick="switchInboundFormMode('register')" class="flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer bg-surface-container-lowest text-primary-container shadow-sm" type="button">
          <span>开启 7 天免费试用</span>
        </button>
        <button id="inbound-subtab-login" onclick="switchInboundFormMode('login')" class="flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-on-surface-variant hover:text-on-surface" type="button">
          <span>密码登录</span>
        </button>
      </div>

      <!-- 1. 注册/试用视图 (kelvinflow_7 对版) -->
      <div id="inbound-reg-view">
        <div class="text-center mb-3">
          <h2 id="inbound-reg-title" class="font-headline-lg text-headline-lg font-bold text-[#1B2A4A] tracking-tight mt-1 mb-1">
            开启 7 天免费试用
          </h2>
          <!-- 特色徽章 Pill -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-md text-label-md mt-1 mb-2">
            <span class="material-symbols-outlined text-[15px] text-primary" style="font-variation-settings: 'FILL' 1;">verified</span>
            <span>无需信用卡 · 即刻开启 10 秒出单</span>
          </div>
        </div>

        <form id="inbound-form" onsubmit="handleInboundSubmit(event)" class="flex flex-col gap-3.5">
          <!-- 工作邮箱输入项 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" for="inbound-email">
              <span>工作邮箱</span>
              <span class="font-label-sm text-label-sm text-outline font-normal">支持企业邮箱</span>
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">mail</span>
              <input class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-email" placeholder="name@company.com" required type="email">
            </div>
            <p id="email-risk-error-msg" class="hidden text-error font-label-sm text-label-sm mt-0.5 flex items-center gap-1"><span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">error</span><span id="email-risk-error-text"></span></p>
          </div>

          <!-- 验证码组合行 -->
          <div class="flex flex-col gap-1.5 text-left">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-code">
                邮箱验证码
              </label>
              <span id="code-sent-tip" class="hidden font-label-sm text-label-sm text-primary font-medium">已发送至工作邮箱</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="relative flex-1 flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">verified_user</span>
                <input class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-numeric-data text-numeric-data tracking-wider shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-code" maxlength="6" placeholder="6 位数字验证码" required type="text">
              </div>
              <button class="h-11 px-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-95 active:scale-95 transition-all duration-150 shrink-0 flex items-center gap-1.5 select-none cursor-pointer border-none disabled:bg-surface-container disabled:text-outline disabled:cursor-not-allowed" id="btn-send-code" onclick="sendInboundVerificationCode()" type="button">
                <span id="btn-send-code-text">获取验证码</span>
              </button>
            </div>
            <!-- 错误校验提示状态 -->
            <div id="inbound-error-feedback" class="hidden flex items-center gap-1 mt-0.5 px-0.5 text-error">
              <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">error</span>
              <span id="inbound-error-text" class="font-label-sm text-label-sm">验证码已失效或输入有误，请核对后重试</span>
            </div>
            <div id="inbound-success-feedback" class="hidden flex items-center gap-1 mt-0.5 px-0.5 text-emerald-600 font-label-sm text-label-sm"></div>
          </div>

          <!-- 设置密码输入项 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-password">
              设置登录密码
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock</span>
              <input class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-password" minlength="6" maxlength="20" placeholder="不少于 6 位字符（包含字母与数字）" required type="password">
              <button aria-label="显示或隐藏密码" class="absolute right-3 w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer" onclick="togglePasswordVisibility('inbound-password', 'inbound-pwd-icon')" type="button">
                <span class="material-symbols-outlined text-[18px]" id="inbound-pwd-icon">visibility_off</span>
              </button>
            </div>
          </div>

          <!-- 从哪里了解到 KelvinFlow 选填下拉 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" for="inbound-channel-source">
              <span>从哪里了解到 KelvinFlow</span>
              <span class="font-label-sm text-label-sm text-outline font-normal">选填</span>
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">explore</span>
              <select class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all cursor-pointer appearance-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-channel-source">
                <option disabled="" selected="" value="">请选择渠道（选填）</option>
                <option value="friend">朋友推荐</option>
                <option value="xiaohongshu">小红书</option>
                <option value="google">谷歌搜索</option>
                <option value="other">其他</option>
              </select>
              <span class="material-symbols-outlined absolute right-3.5 text-outline text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>

          <!-- 服务协议与隐私条款勾选 -->
          <div class="flex items-center gap-2 pt-1 text-left">
            <input checked="" class="w-4 h-4 rounded text-primary-container bg-surface-container-lowest focus:ring-0 cursor-pointer accent-primary-container" id="inbound-agreement-checkbox" required type="checkbox">
            <label class="font-label-sm text-label-sm text-on-surface-variant cursor-pointer select-none" for="inbound-agreement-checkbox">
              我已阅读并同意 <a class="text-primary hover:underline" href="javascript:void(0)">《用户服务协议》</a> 与 <a class="text-primary hover:underline" href="javascript:void(0)">《跨境商业数据隐私保密承诺》</a>
            </label>
          </div>

          <!-- 主操作按钮：立即开通 7 天免费试用 -->
          <button class="w-full py-3.5 px-6 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:bg-primary active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 mt-2 group cursor-pointer" id="inbound-submit-btn" type="submit">
            <span>立即开通 7 天免费试用</span>
            <span class="material-symbols-outlined text-[18px] transition-transform duration-150 group-hover:translate-x-0.5">arrow_forward</span>
          </button>
        </form>

        <!-- 试用专属包含权益条带 -->
        <div class="mt-4 px-3 py-2 rounded-xl bg-surface-container-low flex items-center justify-between text-left">
          <div class="flex items-center gap-1.5 text-on-surface-variant">
            <span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            <span class="font-label-sm text-label-sm">赠送 100 次 AI 深度询盘解析</span>
          </div>
          <div class="flex items-center gap-1.5 text-on-surface-variant">
            <span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            <span class="font-label-sm text-label-sm">免绑定信用卡</span>
          </div>
        </div>

        <!-- 底部切换入口：已有账号？直接登录 -->
        <div class="mt-5 pt-4 text-center">
          <div class="w-full h-px bg-surface-container mb-4"></div>
          <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-center gap-1.5">
            <span>已有 KelvinFlow 账号？</span>
            <a class="font-headline-sm text-headline-sm text-primary font-semibold hover:underline inline-flex items-center cursor-pointer" onclick="switchInboundFormMode('login')" href="javascript:void(0)">
              直接登录
            </a>
          </p>
        </div>
      </div>

      <!-- 2. 登录视图 (kelvinflow_1 对版) -->
      <div id="inbound-login-view" class="hidden">
        <div class="text-center mb-4">
          <h2 class="font-headline-lg text-headline-lg font-bold text-[#1B2A4A] tracking-tight mt-1 mb-1">
            欢迎回到 KelvinFlow
          </h2>
          <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[320px] mx-auto">
            登录工作台，继续高效流转海外询盘与报价
          </p>
        </div>

        <form id="inbound-login-form" novalidate onsubmit="handleInboundLoginSubmit(event)" class="flex flex-col gap-4">
          <!-- 工作邮箱 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-login-email">
              工作邮箱
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-[18px] text-outline pointer-events-none">
                mail
              </span>
              <input class="w-full h-11 pl-10 pr-4 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-login-email" name="username" autocomplete="username" placeholder="name@company.com" required type="email">
            </div>
          </div>

          <!-- 登录密码 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-login-password">
              登录密码
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-[18px] text-outline pointer-events-none">
                lock
              </span>
              <input class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-login-password" name="password" autocomplete="current-password" placeholder="••••••••" required type="password">
              <button aria-label="显示或隐藏密码" class="absolute right-3 w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface focus:outline-none transition-colors cursor-pointer" id="inbound-login-toggle-pwd" onclick="togglePasswordVisibility('inbound-login-password', 'inbound-login-pwd-icon')" type="button">
                <span class="material-symbols-outlined text-[18px]" id="inbound-login-pwd-icon">visibility_off</span>
              </button>
            </div>
            <!-- Active Error Cue (错误态红字) -->
            <div id="inbound-login-error-feedback" class="hidden flex items-center gap-1.5 mt-0.5 text-error">
              <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">error</span>
              <span id="inbound-login-error-text" class="font-label-sm text-label-sm">密码错误，请重试</span>
            </div>
            <div id="inbound-login-success-feedback" class="hidden flex items-center gap-1 mt-0.5 px-0.5 text-emerald-600 font-label-sm text-label-sm"></div>
          </div>

          <!-- 记住此设备 与 忘记密码 -->
          <div class="flex items-center justify-between text-left mt-1 mb-2">
            <label class="flex items-center gap-2 cursor-pointer select-none group">
              <input checked="" class="w-4 h-4 rounded text-primary-container accent-primary-container focus:ring-0 cursor-pointer" id="inbound-remember-device" type="checkbox">
              <span class="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                记住此设备
              </span>
            </label>
            <a class="font-body-sm text-body-sm font-medium text-primary-container hover:underline transition-all cursor-pointer" onclick="openForgotPasswordModal()" href="javascript:void(0)">
              忘记密码？
            </a>
          </div>

          <!-- 主按钮：登录工作台 -->
          <button class="w-full h-12 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-primary/20 hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150 cursor-pointer" id="inbound-login-submit-btn" type="submit">
            <span id="inbound-login-btn-text">登录工作台</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <!-- 底部去注册 -->
        <div class="mt-6 pt-5 bg-surface-container-low/40 -mx-7 md:-mx-8 -mb-7 md:-mb-8 px-7 md:px-8 pb-7 rounded-b-2xl text-center">
          <p class="font-body-sm text-body-sm text-on-surface-variant">
            还没有账号？
            <a class="font-medium text-primary-container hover:underline ml-1 inline-flex items-center gap-0.5 cursor-pointer" onclick="switchInboundFormMode('register')" href="javascript:void(0)">
              去注册
              <span class="material-symbols-outlined text-[14px]">arrow_outward</span>
            </a>
          </p>
        </div>
      </div>

    </div>
  </div>

  <!-- B. 密码重置弹窗 (Forgot Password Modal) -->
  <div id="forgot-password-modal" class="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <div class="absolute inset-0" onclick="closeForgotPasswordModal()"></div>
    <div onclick="event.stopPropagation()" class="max-w-[440px] w-full bg-surface-container-lowest rounded-2xl shadow-2xl p-7 md:p-8 relative overflow-hidden transition-all duration-200 z-10 my-auto">
      
      <!-- 关闭按钮 -->
      <button onclick="closeForgotPasswordModal()" aria-label="关闭密码重置窗口" class="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors duration-150 group cursor-pointer focus:outline-none" type="button">
        <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:rotate-90">close</span>
      </button>

      <!-- 顶部 Badge -->
      <div class="flex justify-center mb-3">
        <span class="px-3 py-1 rounded-full font-label-md text-label-md font-semibold text-primary bg-primary-fixed flex items-center gap-1.5 w-fit">
          <span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">shield</span>
          <span>账号安全中心 · 找回密码</span>
        </span>
      </div>

      <!-- 阶段 1：核验工作邮箱验证码 -->
      <div id="forgot-step-1">
        <div class="text-center mb-5">
          <h3 class="font-headline-lg text-headline-lg font-bold text-[#1B2A4A] tracking-tight mb-1">重置登录密码</h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant">输入注册工作邮箱获取验证码，核验后即可设置新密码</p>
        </div>

        <form id="forgot-step1-form" onsubmit="handleForgotStep1Submit(event)" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-email">
              注册工作邮箱
            </label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1 flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">mail</span>
                <input type="email" id="forgot-email" placeholder="请输入注册时的工作邮箱" required class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60">
              </div>
              <button type="button" id="btn-forgot-send-code" onclick="sendForgotPasswordCode()" class="h-11 px-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-95 active:scale-95 transition-all duration-150 shrink-0 flex items-center gap-1.5 select-none cursor-pointer border-none disabled:bg-surface-container disabled:text-outline disabled:cursor-not-allowed">
                <span id="btn-forgot-send-code-text">获取验证码</span>
              </button>
            </div>
            <p id="forgot-email-error" class="hidden text-error font-label-sm text-label-sm mt-0.5 flex items-center gap-1"><span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">error</span><span id="forgot-email-error-text"></span></p>
          </div>

          <div class="flex flex-col gap-1.5 text-left">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-code">
                邮箱验证码
              </label>
              <span id="forgot-code-sent-tip" class="hidden font-label-sm text-label-sm text-primary font-medium">已发送至工作邮箱</span>
            </div>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">verified_user</span>
              <input type="text" id="forgot-code" maxlength="6" placeholder="请输入 6 位邮箱验证码" required class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-numeric-data text-numeric-data tracking-wider shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60">
            </div>
          </div>

          <div id="forgot-step1-error-feedback" class="hidden flex items-center gap-1.5 mt-0.5 text-error">
            <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">error</span>
            <span id="forgot-step1-error-text" class="font-label-sm text-label-sm"></span>
          </div>
          <div id="forgot-step1-success-feedback" class="hidden flex items-center gap-1 mt-0.5 px-0.5 text-emerald-600 font-label-sm text-label-sm"></div>

          <button type="submit" id="btn-forgot-step1-submit" class="w-full h-12 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
            <span id="btn-forgot-step1-text">下一步：设置新密码</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>

          <div class="text-center pt-2">
            <button type="button" onclick="cancelForgotPasswordAndReturnLogin()" class="font-body-sm text-body-sm text-outline hover:text-on-surface transition cursor-pointer inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>返回密码登录</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 阶段 2：输入新密码 -->
      <div id="forgot-step-2" class="hidden">
        <div class="text-center mb-5">
          <h3 class="font-headline-lg text-headline-lg font-bold text-[#1B2A4A] tracking-tight mb-1">输入新密码</h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant">验证码已核验通过，请设置并确认您的新登录密码</p>
        </div>

        <form id="forgot-step2-form" onsubmit="handleForgotStep2Submit(event)" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-new-password">
              重置新密码
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock</span>
              <input type="password" id="forgot-new-password" minlength="6" maxlength="20" placeholder="请输入新密码 (不少于 6 位字符)" required class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60">
              <button type="button" onclick="togglePasswordVisibility('forgot-new-password', 'forgot-new-pwd-icon')" aria-label="切换新密码显示" class="absolute right-3 w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px]" id="forgot-new-pwd-icon">visibility_off</span>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-confirm-password">
              再次输入新密码
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock</span>
              <input type="password" id="forgot-confirm-password" minlength="6" maxlength="20" placeholder="请再次输入新密码 (须与上方一致)" required class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60">
              <button type="button" onclick="togglePasswordVisibility('forgot-confirm-password', 'forgot-confirm-pwd-icon')" aria-label="切换确认密码显示" class="absolute right-3 w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px]" id="forgot-confirm-pwd-icon">visibility_off</span>
              </button>
            </div>
          </div>

          <div id="forgot-step2-error-feedback" class="hidden flex items-center gap-1.5 mt-0.5 text-error">
            <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">error</span>
            <span id="forgot-step2-error-text" class="font-label-sm text-label-sm"></span>
          </div>
          <div id="forgot-step2-success-feedback" class="hidden flex items-center gap-1 mt-0.5 px-0.5 text-emerald-600 font-label-sm text-label-sm"></div>

          <button type="submit" id="btn-forgot-step2-submit" class="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-headline-sm text-headline-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
            <span class="material-symbols-outlined text-[18px]">check</span>
            <span id="btn-forgot-step2-text">确认更改</span>
          </button>

          <div class="text-center pt-2">
            <button type="button" onclick="backToForgotStep1()" class="font-body-sm text-body-sm text-outline hover:text-on-surface transition cursor-pointer inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>返回上一步</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>

  <!-- C. 退出登录确认弹窗 (kelvinflow_2 对版，预置隐藏组件供 4b 调用) -->
  <div id="logout-dialog-overlay" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200">
    <div class="absolute inset-0" onclick="closeLogoutModal()"></div>
    <div onclick="event.stopPropagation()" class="relative w-full max-w-sm rounded-[24px] bg-surface-container-lowest p-6 sm:p-8 shadow-[0_20px_50px_rgba(19,27,46,0.14),0_4px_12px_rgba(19,27,46,0.06)] transform transition-all duration-200 scale-100 flex flex-col items-center text-center z-10 my-auto" id="logout-modal-card">
      <!-- 关闭图标 -->
      <button onclick="closeLogoutModal()" aria-label="关闭弹窗" class="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200 hover:rotate-90 cursor-pointer" id="close-modal-btn" type="button">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <!-- 红色退出图标 -->
      <div class="w-14 h-14 rounded-full bg-error-container/40 flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-200">
        <div class="w-10 h-10 rounded-full bg-error-container/70 flex items-center justify-center text-error">
          <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 0, 'wght' 500;">logout</span>
        </div>
      </div>

      <!-- 当前账号徽章 -->
      <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors duration-200 select-none cursor-default text-on-surface-variant mb-3">
        <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
        <span id="logout-user-email" class="font-label-sm text-label-sm tracking-wider">kelvin.chen@tradecorp.com</span>
      </div>

      <!-- 标题与说明 -->
      <h2 class="font-headline-lg text-headline-lg text-on-surface mb-2 font-bold tracking-tight">退出登录</h2>
      <p class="font-body-md text-body-md text-on-surface-variant mb-5 leading-relaxed">确定要退出当前账号吗？</p>

      <!-- 提示条 -->
      <div class="w-full bg-surface-container-low rounded-xl p-3 mb-6 text-left flex items-start gap-2.5">
        <span class="material-symbols-outlined text-outline text-[18px] shrink-0 mt-0.5">info</span>
        <p class="font-body-sm text-body-sm text-on-surface-variant leading-snug">
          退出后将需要重新验证工作邮箱登录，未保存的底价表与汇率草稿已自动加密同步至服务器。
        </p>
      </div>

      <!-- 操作按钮组 -->
      <div class="flex items-center gap-3 w-full">
        <button onclick="closeLogoutModal()" class="flex-1 py-2.5 px-5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md font-semibold transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow text-center cursor-pointer border-none" id="cancel-logout-btn" type="button">
          取消
        </button>
        <button onclick="confirmLogoutAction()" class="flex-1 py-2.5 px-5 rounded-full bg-error-container hover:bg-error hover:text-on-error text-on-error-container font-body-md text-body-md font-semibold transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md text-center flex items-center justify-center gap-1 cursor-pointer group border-none" id="confirm-logout-btn" type="button">
          <span class="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:scale-110">power_settings_new</span>
          <span>确认退出</span>
        </button>
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
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
      } else {
        drawer.classList.add('hidden');
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
      }
    }

    function closeMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      const icon = document.getElementById('mobile-menu-icon');
      if (drawer) drawer.classList.add('hidden');
      if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
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
      const logoutEmail = document.getElementById('logout-user-email');

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
        if (logoutEmail) {
          logoutEmail.textContent = email;
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
        if (trialBtn) trialBtn.style.display = '';
        if (loginBtn) loginBtn.style.display = '';
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
        icon.textContent = 'visibility';
      } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
      }
    }

    function switchInboundFormMode(mode) {
      currentInboundFormMode = mode;
      const subtabReg = document.getElementById('inbound-subtab-reg');
      const subtabLogin = document.getElementById('inbound-subtab-login');
      const regView = document.getElementById('inbound-reg-view');
      const loginView = document.getElementById('inbound-login-view');

      if (mode === 'login') {
        if (subtabReg) subtabReg.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-on-surface-variant hover:text-on-surface';
        if (subtabLogin) subtabLogin.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer bg-surface-container-lowest text-primary-container shadow-sm';
        if (regView) regView.classList.add('hidden');
        if (loginView) loginView.classList.remove('hidden');

        const savedAccount = localStorage.getItem('kelvinflow_user_email') || '';
        const loginEmailInput = document.getElementById('inbound-login-email');
        if (savedAccount && loginEmailInput && !loginEmailInput.value) {
          loginEmailInput.value = savedAccount;
        }
      } else {
        if (subtabReg) subtabReg.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer bg-surface-container-lowest text-primary-container shadow-sm';
        if (subtabLogin) subtabLogin.className = 'flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-on-surface-variant hover:text-on-surface';
        if (regView) regView.classList.remove('hidden');
        if (loginView) loginView.classList.add('hidden');
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

      if (tier === 'login') {
        switchInboundFormMode('login');
      } else {
        switchInboundFormMode('register');
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
      if (err1) { err1.classList.add('hidden'); }
      const emailErr = document.getElementById('forgot-email-error');
      if (emailErr) { emailErr.classList.add('hidden'); }
      const err2 = document.getElementById('forgot-step2-error-feedback');
      if (err2) { err2.classList.add('hidden'); }
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

    // 退出确认弹窗控制 (kelvinflow_2 对版，预置隐藏组件)
    function openLogoutModal() {
      const modal = document.getElementById('logout-dialog-overlay');
      if (!modal) return;
      const email = localStorage.getItem('kelvinflow_user_email') || 'kelvin.chen@tradecorp.com';
      const emailEl = document.getElementById('logout-user-email');
      if (emailEl) emailEl.textContent = email;

      lockBodyScroll();
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
      }, 10);
    }

    function closeLogoutModal() {
      const modal = document.getElementById('logout-dialog-overlay');
      if (!modal) return;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        unlockBodyScroll();
      }, 200);
    }

    function confirmLogoutAction() {
      localStorage.removeItem('saas_auth_token');
      localStorage.removeItem('kelvinflow_user_email');
      localStorage.removeItem('kelvinflow_user_name');
      localStorage.removeItem('kelvinflow_user_plan');
      localStorage.removeItem('kelvinflow_remaining_days');
      localStorage.removeItem('kelvinflow_user_expired');
      localStorage.removeItem('kelvinflow_user_is_paid');
      updateNavForLoggedInUser();
      closeLogoutModal();
    }

    async function sendInboundVerificationCode() {
      const emailInput = document.getElementById('inbound-email');
      const email = (emailInput?.value || '').trim();
      const btn = document.getElementById('btn-send-code');
      const btnText = document.getElementById('btn-send-code-text');
      const riskErr = document.getElementById('email-risk-error-msg');
      const riskText = document.getElementById('email-risk-error-text');
      const codeTip = document.getElementById('code-sent-tip');

      if (riskErr) { riskErr.classList.add('hidden'); if (riskText) riskText.textContent = ''; }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (riskErr) {
          if (riskText) riskText.textContent = '请输入合法的电子邮箱地址（用于接收验证码）';
          riskErr.classList.remove('hidden');
        }
        emailInput?.focus();
        return;
      }

      // D2: 立即进入禁用＋60s 倒计时（不依赖 API 返回，失败不提前恢复）
      if (btn) btn.disabled = true;
      let secondsLeft = 60;
      if (btnText) btnText.textContent = secondsLeft + 's可重发';
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

      try {
        const res = await fetch('/api/v1/auth/trial-register/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!data.success) {
          if (riskErr) {
            if (riskText) riskText.textContent = data.error || '验证码发送受阻，请稍后再试';
            riskErr.classList.remove('hidden');
          }
          return;
        }

        if (codeTip) {
          codeTip.textContent = '验证码已发送至工作邮箱';
          codeTip.classList.remove('hidden');
        }

        document.getElementById('inbound-code')?.focus();

      } catch (err) {
        console.error('发送验证码网络异常:', err);
        if (riskErr) {
          if (riskText) riskText.textContent = '网络连接异常，请重试';
          riskErr.classList.remove('hidden');
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
      const riskText = document.getElementById('email-risk-error-text');
      const errorBox = document.getElementById('inbound-error-feedback');
      const errorText = document.getElementById('inbound-error-text');
      const successBox = document.getElementById('inbound-success-feedback');
      const submitBtn = document.getElementById('inbound-submit-btn');

      if (riskErr) { riskErr.classList.add('hidden'); if (riskText) riskText.textContent = ''; }
      if (errorBox) { errorBox.classList.add('hidden'); }
      if (successBox) { successBox.classList.add('hidden'); successBox.innerHTML = ''; }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (riskErr) {
          if (riskText) riskText.textContent = '请输入合法的电子邮箱地址';
          riskErr.classList.remove('hidden');
        }
        document.getElementById('inbound-email')?.focus();
        return;
      }

      if (!code || code.length !== 6) {
        if (errorBox) {
          if (errorText) errorText.textContent = '验证码已失效或输入有误，请核对后重试';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-code')?.focus();
        return;
      }

      if (!password || password.length < 6) {
        if (errorBox) {
          if (errorText) errorText.textContent = '登录密码长度至少需要 6 位字符';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-password')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>正在为您开通工作台...</span>';
      }

      try {
        const payload = {
          email,
          code,
          password,
          channel: channelSource || '未选择',
          tier: currentInboundTier
        };

        const res = await fetch('/api/v1/auth/trial-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!data.success) {
          if (errorBox) {
            if (errorText) errorText.textContent = data.error || '验证码已失效或输入有误，请核对后重试';
            errorBox.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>立即开通 7 天免费试用</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
          }
          return;
        }

        if (data.token) {
          localStorage.setItem('saas_auth_token', data.token);
          localStorage.setItem('kelvinflow_user_email', email);
          if (data.user?.name) localStorage.setItem('kelvinflow_user_name', data.user.name);
          if (data.remainingDays !== undefined) localStorage.setItem('kelvinflow_remaining_days', String(data.remainingDays));
          if (data.plan) localStorage.setItem('kelvinflow_user_plan', data.plan);
          if (data.isPaid !== undefined) localStorage.setItem('kelvinflow_user_is_paid', String(data.isPaid));
          updateNavForLoggedInUser();
        }

        if (successBox) {
          successBox.innerHTML = '<span class=\"material-symbols-outlined text-[15px]\" style=\"font-variation-settings: \\'FILL\\' 1;\">check_circle</span><span>开通成功！欢迎体验，正在为您跳转至审单工作台...</span>';
          successBox.classList.remove('hidden');
        }

        setTimeout(() => {
          const redirectBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/review/QT-20260904-888'
            : 'https://quote.kelvinflow.com/';
          window.location.href = redirectBase + '?token=' + encodeURIComponent(data.token);
        }, 800);

      } catch (err) {
        console.error('开通试用网络异常:', err);
        if (errorBox) {
          if (errorText) errorText.textContent = '网络连接异常，请稍后重试';
          errorBox.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>立即开通 7 天免费试用</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
        }
      }
    }

    async function handleInboundLoginSubmit(e) {
      e.preventDefault();
      const email = (document.getElementById('inbound-login-email')?.value || '').trim();
      const password = (document.getElementById('inbound-login-password')?.value || '').trim();
      const errorBox = document.getElementById('inbound-login-error-feedback');
      const errorText = document.getElementById('inbound-login-error-text');
      const successBox = document.getElementById('inbound-login-success-feedback');
      const submitBtn = document.getElementById('inbound-login-submit-btn');

      if (errorBox) { errorBox.classList.add('hidden'); }
      if (successBox) { successBox.classList.add('hidden'); successBox.innerHTML = ''; }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (errorBox) {
          if (errorText) errorText.textContent = '请输入合法的电子邮箱地址';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-login-email')?.focus();
        return;
      }

      if (!password) {
        if (errorBox) {
          if (errorText) errorText.textContent = '请输入登录密码';
          errorBox.classList.remove('hidden');
        }
        document.getElementById('inbound-login-password')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>正在验证并登录...</span>';
      }

      try {
        const res = await fetch('/api/v1/auth/password-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!data.success) {
          if (errorBox) {
            if (errorText) errorText.textContent = '密码错误，请重试';
            errorBox.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>登录工作台</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
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
          successBox.innerHTML = '<span class=\"material-symbols-outlined text-[15px]\" style=\"font-variation-settings: \\'FILL\\' 1;\">check_circle</span><span>登录成功！欢迎回到工作台，正在跳转...</span>';
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
          if (errorText) errorText.textContent = '网络连接异常，请稍后重试';
          errorBox.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>登录工作台</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
        }
      }
    }

    async function sendForgotPasswordCode() {
      const emailInput = document.getElementById('forgot-email');
      const email = (emailInput?.value || '').trim();
      const btn = document.getElementById('btn-forgot-send-code');
      const btnText = document.getElementById('btn-forgot-send-code-text');
      const emailErr = document.getElementById('forgot-email-error');
      const emailErrText = document.getElementById('forgot-email-error-text');
      const errFeedback = document.getElementById('forgot-step1-error-feedback');
      const errText = document.getElementById('forgot-step1-error-text');
      const codeTip = document.getElementById('forgot-code-sent-tip');

      if (emailErr) { emailErr.classList.add('hidden'); }
      if (errFeedback) { errFeedback.classList.add('hidden'); }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (emailErr) {
          if (emailErrText) emailErrText.textContent = '请输入合法的注册工作邮箱地址';
          emailErr.classList.remove('hidden');
        }
        emailInput?.focus();
        return;
      }

      if (btn) btn.disabled = true;
      let secondsLeft = 60;
      if (btnText) btnText.textContent = secondsLeft + 's可重发';
      if (forgotPasswordCooldownTimer) clearInterval(forgotPasswordCooldownTimer);
      forgotPasswordCooldownTimer = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(forgotPasswordCooldownTimer);
          forgotPasswordCooldownTimer = null;
          if (btn) btn.disabled = false;
          if (btnText) btnText.textContent = '获取验证码';
        } else {
          if (btnText) btnText.textContent = secondsLeft + 's可重发';
        }
      }, 1000);

      try {
        const res = await fetch('/api/v1/auth/forgot-password/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!data.success) {
          if (errFeedback) {
            if (errText) errText.textContent = data.error || '验证码发送受阻，请稍后再试';
            errFeedback.classList.remove('hidden');
          }
          return;
        }

        if (codeTip) {
          codeTip.textContent = '验证码已发送至工作邮箱';
          codeTip.classList.remove('hidden');
        }

        document.getElementById('forgot-code')?.focus();

      } catch (err) {
        console.error('找回密码发码网络异常:', err);
        if (errFeedback) {
          if (errText) errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
      }
    }

    async function handleForgotStep1Submit(e) {
      e.preventDefault();
      const email = (document.getElementById('forgot-email')?.value || '').trim();
      const code = (document.getElementById('forgot-code')?.value || '').trim();
      const emailErr = document.getElementById('forgot-email-error');
      const emailErrText = document.getElementById('forgot-email-error-text');
      const errFeedback = document.getElementById('forgot-step1-error-feedback');
      const errText = document.getElementById('forgot-step1-error-text');
      const submitBtn = document.getElementById('btn-forgot-step1-submit');

      if (emailErr) { emailErr.classList.add('hidden'); }
      if (errFeedback) { errFeedback.classList.add('hidden'); }

      if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        if (emailErr) {
          if (emailErrText) emailErrText.textContent = '请输入合法的注册工作邮箱地址';
          emailErr.classList.remove('hidden');
        }
        document.getElementById('forgot-email')?.focus();
        return;
      }

      if (!code || code.length !== 6) {
        if (errFeedback) {
          if (errText) errText.textContent = '请输入 6 位数字验证码';
          errFeedback.classList.remove('hidden');
        }
        document.getElementById('forgot-code')?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>正在核验验证码...</span>';
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
            if (errText) errText.textContent = data.error || '验证码核验失败或已过期';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>下一步：设置新密码</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
          }
          return;
        }

        forgotResetToken = data.resetToken || '';

        const step1 = document.getElementById('forgot-step-1');
        const step2 = document.getElementById('forgot-step-2');
        if (step1) step1.classList.add('hidden');
        if (step2) step2.classList.remove('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>下一步：设置新密码</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
        }

        const newPwdInput = document.getElementById('forgot-new-password');
        if (newPwdInput) newPwdInput.focus();

      } catch (err) {
        console.error('核验找回密码验证码异常:', err);
        if (errFeedback) {
          if (errText) errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>下一步：设置新密码</span><span class=\"material-symbols-outlined text-[18px]\">arrow_forward</span>';
        }
      }
    }

    async function handleForgotStep2Submit(e) {
      e.preventDefault();
      const email = (document.getElementById('forgot-email')?.value || '').trim();
      const newPassword = (document.getElementById('forgot-new-password')?.value || '').trim();
      const confirmPassword = (document.getElementById('forgot-confirm-password')?.value || '').trim();
      const errFeedback = document.getElementById('forgot-step2-error-feedback');
      const errText = document.getElementById('forgot-step2-error-text');
      const succFeedback = document.getElementById('forgot-step2-success-feedback');
      const submitBtn = document.getElementById('btn-forgot-step2-submit');
      const submitBtnText = document.getElementById('btn-forgot-step2-text');

      if (errFeedback) { errFeedback.classList.add('hidden'); }
      if (succFeedback) { succFeedback.classList.add('hidden'); }

      if (!newPassword || newPassword.length < 6) {
        if (errFeedback) {
          if (errText) errText.textContent = '新密码长度至少需要 6 位字符';
          errFeedback.classList.remove('hidden');
        }
        document.getElementById('forgot-new-password')?.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        if (errFeedback) {
          if (errText) errText.textContent = '两次输入的密码不一致，请核对后重新输入！';
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
            if (errText) errText.textContent = data.error || '密码更改失败，请稍后重试';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtnText) submitBtnText.textContent = '确认更改';
          }
          return;
        }

        if (succFeedback) {
          succFeedback.innerHTML = '<span class=\"material-symbols-outlined text-[15px]\" style=\"font-variation-settings: \\'FILL\\' 1;\">check_circle</span><span>密码已成功重置，即将返回登录窗口...</span>';
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
          if (errText) errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = '确认更改';
        }
      }
    }

    // D1: 全局 Escape 键退出当前最顶层激活的弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        const forgotModal = document.getElementById('forgot-password-modal');
        const inboundModal = document.getElementById('inbound-modal');
        const logoutModal = document.getElementById('logout-dialog-overlay');
        if (forgotModal && !forgotModal.classList.contains('hidden')) {
          closeForgotPasswordModal();
          return;
        }
        if (logoutModal && !logoutModal.classList.contains('hidden')) {
          closeLogoutModal();
          return;
        }
        if (inboundModal && !inboundModal.classList.contains('hidden')) {
          closeInboundModal();
          return;
        }
      }
    });

    // =========================================================================
    // 滚动渐入动画 (Scroll Reveal via IntersectionObserver)
    // =========================================================================
    function initScrollReveal() {
      // 3. prefers-reduced-motion 时禁用动画，内容直接显示
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.scroll-reveal').forEach(el => {
          el.classList.remove('scroll-reveal');
        });
        return;
      }

      // 检查浏览器是否支持 IntersectionObserver
      if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.scroll-reveal').forEach(el => {
          el.classList.remove('scroll-reveal');
        });
        return;
      }

      const revealElements = document.querySelectorAll('.scroll-reveal');
      if (!revealElements.length) return;

      const observer = new IntersectionObserver((entries, obs) => {
        const intersecting = entries.filter(e => e.isIntersecting);
        intersecting.forEach((entry, idx) => {
          const el = entry.target;
          // 2. 进入视口触发一次，立即取消监听（不重复触发）
          obs.unobserve(el);

          // 1. 依次错开约 80–120ms (默认取 100ms 错开)
          const customDelay = el.dataset.revealDelay;
          const delay = customDelay !== undefined ? parseInt(customDelay, 10) : (idx * 100);

          setTimeout(() => {
            el.classList.add('revealed');

            // 4. 动画完成后清理类名，确保原有 hover / transition 100% 不受影响
            const cleanup = () => {
              el.classList.remove('scroll-reveal', 'revealed');
              el.removeEventListener('transitionend', onEnd);
            };
            const onEnd = (e) => {
              if (e.propertyName === 'transform') cleanup();
            };
            el.addEventListener('transitionend', onEnd);
            setTimeout(cleanup, 750); // 兜底清理
          }, delay);
        });
      }, {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      });

      revealElements.forEach(el => observer.observe(el));
    }

    document.addEventListener('DOMContentLoaded', () => {
      updateNavForLoggedInUser();
      initScrollReveal();
    });
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      initScrollReveal();
    }
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
  console.error('FATAL: Prohibited words detected in landing page HTML!');
  process.exit(1);
}

// 4. Write output to public/index.html
const outPath = path.join(__dirname, '..', 'public', 'index.html');
fs.writeFileSync(outPath, finalHtml, 'utf8');
console.log(`Successfully generated ${outPath} (${finalHtml.length} bytes)`);
