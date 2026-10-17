const fs = require('fs');
const path = require('path');

// 1. Read base code.html (v13 design from stitch_kelvinflow_landing_page_design/kelvinflow_faq)
const codeHtmlPath = path.join(__dirname, '..', 'design', 'stitch_kelvinflow_landing_page_design', 'kelvinflow_faq', 'code.html');
let codeHtml = fs.readFileSync(codeHtmlPath, 'utf8');

// Truncate at </footer>
const footerEndIdx = codeHtml.indexOf('</footer>') + 9;
if (footerEndIdx <= 9) {
  throw new Error('Could not find </footer> in code.html');
}
codeHtml = codeHtml.substring(0, footerEndIdx);

// Remove the empty emotion style tags
codeHtml = codeHtml.replace(/<style data-emotion="css" data-s=""><\/style>/g, '');

// S1 (P0) & D1/D2 regression fix:
// 1) Remove body{overscroll-behavior:none;} which froze mobile touch scroll on real devices
// 2) Remove ::-webkit-scrollbar{display:none;} per regression requirement
codeHtml = codeHtml.replace('body{overscroll-behavior:none;}', '');
codeHtml = codeHtml.replace('::-webkit-scrollbar{display:none;}', '');

// Replace logo image URLs with /k_logo.svg
const googleLogoUrl1 = 'https://lh3.googleusercontent.com/aida/AEtjO1Vvq3Nk1VsIkIS9DHJOkbOOsOiAntdUADuTkAAdMv2ywLJE0bNkkzXiyV5x-qE7RK1fC8acDC7vF_VqNF6LFGTMWOJG9XXVKqesdKzQ5qw4QkwAN6Ch0JrU_LHCwbFMjDfCwQK8GArWM9a14c-dUajUAkLse4FHUgY7mUUoyiJtiqU7gSA23_PfMDL68PNG6aByD0-fwXW-tH-K5aJBPEU3sFCCQfeYLiPM4DEoyKyqpX3fE_UHanm0lM4';
const googleLogoUrl2 = 'https://lh3.googleusercontent.com/aida/AEtjO1VbWXhvrHa6A3FcuFSwDNoIIBbGFwqULSBjEQfxGYJYYtKoZGC2HILPzb57IKf0ZY9Ws3PQoCkX9lE5VAB47MvaaBtD5do9b_FLqu6Srs0xli0q7jzDBbQzvMYGFGRe2F_YsgCIgd1uiLWNxV_Y7W5a6ps5-eeNB2AC7CYpCCXKHh44whLG93m_zCAaINUSRFAWSKSL9vY69cRytikqIH_CkpkqJkoEwm54LibEzQqiwK9x4GdJtsE6_eA';
codeHtml = codeHtml.split(googleLogoUrl1).join('/k_logo.svg');
codeHtml = codeHtml.split(googleLogoUrl2).join('/k_logo.svg');

// 1.0 扩展 Tailwind spacing 配置以原生支持 5.5 (22px)
codeHtml = codeHtml.replace(
  'spacing:{"gutter-lg":"2rem"',
  'spacing:{"5.5":"1.375rem","gutter-lg":"2rem"'
);

// 1.1 顶栏 Logo 图标与品牌文字：全站统一采用黄金比例规范 (w-6 h-6, items-end, gap-1.5, text-xl leading-none)
// 优化 hover 效果：移除整体 scale 防止文字抖动位移，仅对图标做微缩放，文本与 AI 徽章保持平稳
const oldHeaderLogo = '<a class="flex items-center gap-2 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99]" data-path="landing-page" href="#"><img alt="KelvinFlow Logo" class="object-contain inline-block shrink-0" src="/k_logo.svg" style="width: 66px; height: 66px; margin: -12px -20px -12px -8px;"><span class="font-headline-md text-[20px] font-bold tracking-tight text-[#1B2A4A] flex items-center gap-1.5 leading-none">KelvinFlow<span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span></a>';
const newHeaderLogo = '<a class="group flex items-end gap-1.5 min-h-[44px] transition-opacity duration-200 hover:opacity-85 py-2 cursor-pointer" data-path="landing-page" href="/"><img src="/k_logo.svg" alt="KelvinFlow Logo" class="w-6 h-6 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"><span class="text-xl font-bold tracking-tight text-[#1B2A4A] leading-none select-none">KelvinFlow</span><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none mb-0.5 uppercase select-none transition-colors duration-200 group-hover:bg-[#FDE68A]">AI</span></a>';
codeHtml = codeHtml.replace(oldHeaderLogo, newHeaderLogo);

// S2 Hero 主图：100% 依循 kelvinflow_faq/code.html 最新设计稿 (方案 1: 全幅大视口极致拉伸 · 沉浸式宽屏展示)
// 1. 注入无障碍审计属性，并添加 pointer-events-none select-none inert 彻底禁用主图内一切点击交互（纯视觉样机展示）
codeHtml = codeHtml.replace(
  '<div class="w-full max-w-7xl mx-auto rounded-2xl bg-white/80 p-2 md:p-3 border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(29,78,216,0.12),0_12px_24px_-8px_rgba(15,23,42,0.08)] hover:shadow-2xl hover:-translate-y-0.5 backdrop-blur-sm transition-all duration-300">',
  '<div class="w-full max-w-7xl mx-auto rounded-2xl bg-white/80 p-2 md:p-3 border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(29,78,216,0.12),0_12px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 pointer-events-none select-none cursor-default" inert aria-label="KelvinFlow Quotation Review Interface Preview">'
);

// 2. 侧边栏 Logo 与品牌文字：以左上角顶栏 Logo 为绝对对齐基准 (w-6 h-6, items-end, gap-1.5, text-xl leading-none, mb-0.5 AI badge)
const oldSidebarLogo = '<div class="flex items-center gap-1.5"><img alt="KelvinFlow Logo" class="object-contain inline-block shrink-0" src="/k_logo.svg" style="width: 52px; height: 52px; margin: -10px -16px -10px -6px;"><span class="text-[17px] text-slate-800 tracking-tight font-bold leading-none flex items-center gap-1.5">KelvinFlow<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span></div>';
const newSidebarLogo = '<div class="flex items-end gap-1.5 min-h-[44px] py-2"><img src="/k_logo.svg" alt="KelvinFlow Logo" class="w-6 h-6 object-contain shrink-0"><span class="text-xl font-bold tracking-tight text-[#1B2A4A] leading-none select-none">KelvinFlow</span><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none mb-0.5 uppercase select-none">AI</span></div>';
codeHtml = codeHtml.replace(oldSidebarLogo, newSidebarLogo);

// Insert favicons and FontAwesome in <head>
const headInsert = `
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    html {
      overflow-x: clip;
      scrollbar-gutter: stable;
    }
    body {
      overflow-x: clip;
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

// Fix header layout shift: remove transition-all to eliminate any horizontal gliding when modals toggle
codeHtml = codeHtml.replace(
  '<header class="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_0_0_#f1f5f9] transition-all">',
  '<header class="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_0_0_#f1f5f9] transition-colors duration-150">'
);

// Update Header container for mobile responsive padding
codeHtml = codeHtml.replace(
  '<div class="h-16 max-w-[1440px] mx-auto px-margin-desktop flex items-center justify-between">',
  '<div class="h-16 max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex items-center justify-between">'
);

// Update Header nav links and action buttons
const oldNav = `<nav class="hidden md:flex items-center gap-space-lg" data-active-classes="text-on-surface font-semibold"><a class="nav-link-subtle font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" data-path="features" href="#">功能特性</a><a class="nav-link-subtle font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" data-path="workflow" href="#">工作流程</a><a class="nav-link-subtle font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" data-path="excel-template" href="#">底价表规范</a><a class="nav-link-subtle font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" data-path="faq" href="#">常见问题</a></nav>`;
const newNav = `<nav class="hidden md:flex items-center gap-space-lg" data-active-classes="text-on-surface font-semibold"><a class="font-body-md text-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150" data-path="features" href="#features">功能特性</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150" data-path="workflow" href="#workflow">工作流程</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150" data-path="excel-template" href="#excel-template">底价表规范</a><a class="font-body-md text-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150" data-path="faq" href="#faq">常见问题</a></nav>`;
codeHtml = codeHtml.replace(oldNav, newNav);

const oldActions = `<div class="flex items-center gap-space-md"><a class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" data-path="login" href="#">登录</a><a class="inline-flex items-center justify-center px-space-md py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:scale-[1.02] active:scale-[0.98] hover:shadow-md transition-all duration-200" data-path="signup" href="#">免费试用</a></div>`;
const newActions = `<div class="flex items-center gap-2 sm:gap-space-md">
      <button id="nav-login-btn" onclick="openInboundModal('login')" class="hidden md:inline-flex font-body-md text-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150 cursor-pointer bg-transparent border-0 p-0 items-center" data-path="login" type="button">登录</button>
      <button id="nav-trial-btn" onclick="openInboundModal('starter')" class="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 sm:px-space-md sm:py-space-xs rounded-full bg-primary-container text-on-primary font-body-md text-sm sm:text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer border-0" data-path="signup" type="button">免费试用</button>
      <a id="nav-workbench-btn" style="display: none;" class="items-center justify-center px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-primary-container text-on-primary font-body-md text-sm sm:text-body-md font-semibold shadow-[0_1px_3px_rgba(29,78,216,0.25)] hover:opacity-95 transition-all cursor-pointer" href="/review/QT-20260904-888">进入审单台</a>
      <div id="nav-user-chip" style="display: none;" class="items-center gap-2 pl-3 pr-2 py-1 bg-surface-container rounded-full text-xs font-medium text-on-surface border border-outline-variant/30">
        <span id="nav-user-phone" class="font-numeric-data text-xs text-on-surface"></span>
        <button onclick="openLogoutModal()" title="退出当前账号" class="w-6 h-6 rounded-full bg-surface-container-high hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition cursor-pointer text-slate-500 border-0">
          <i class="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
        </button>
      </div>
      <button id="mobile-menu-btn" onclick="toggleMobileNav()" class="md:hidden text-[#1B2A4A] w-11 h-11 min-w-[44px] min-h-[44px] shrink-0 p-2 transition-colors cursor-pointer flex items-center justify-center rounded-lg hover:bg-surface-container border-0 bg-transparent" aria-label="切换移动端导航" type="button">
        <svg id="mobile-menu-icon" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>`;
codeHtml = codeHtml.replace(oldActions, newActions);

// Insert mobile menu drawer right after </header>
const mobileDrawer = `
  <div id="mobile-nav-drawer" class="hidden md:hidden fixed top-16 left-0 right-0 z-40 px-6 py-4 bg-surface-container-lowest/95 backdrop-blur-md border-b border-[#f1f5f9] shadow-lg space-y-3">
    <a onclick="closeMobileNav()" href="#features" class="block font-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150 py-1.5">功能特性</a>
    <a onclick="closeMobileNav()" href="#workflow" class="block font-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150 py-1.5">工作流程</a>
    <a onclick="closeMobileNav()" href="#excel-template" class="block font-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150 py-1.5">底价表规范</a>
    <a onclick="closeMobileNav()" href="#faq" class="block font-body-md text-on-surface-variant hover:text-[#1D4ED8] transition-colors duration-150 py-1.5">常见问题</a>
    <div class="pt-3 border-t border-outline-variant/20 flex gap-3">
      <button onclick="closeMobileNav(); openInboundModal('login')" class="flex-1 py-2 text-center text-sm font-medium text-on-surface-variant bg-surface-container rounded-full">登录</button>
      <button onclick="closeMobileNav(); openInboundModal('starter')" class="flex-1 py-2 text-center text-sm font-semibold text-white bg-primary-container rounded-full">免费试用</button>
    </div>
  </div>
`;
codeHtml = codeHtml.replace('</header>', `</header>${mobileDrawer}`);

// In Hero: update CTA button
codeHtml = codeHtml.replace(
  '<a class="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] transition-all duration-200" href="#trial">\n          免费开始试用\n        </a>',
  '<button class="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer border-0" onclick="openInboundModal(\'starter\')" type="button">免费开始试用</button>'
);

// DEF-12: Trust & Metrics Bar (Section 2) gets id="features" with scroll-mt-20
codeHtml = codeHtml.replace(
  '<section class="w-full py-12 bg-surface-container-low">',
  '<section class="w-full py-12 bg-surface-container-low scroll-mt-20 relative" id="features">'
);

// Section 3: Workflow gets scroll-mt-20
codeHtml = codeHtml.replace(
  '<section class="w-full py-24 bg-surface-container-lowest" id="workflow">',
  '<section class="w-full py-24 bg-surface-container-lowest scroll-mt-20 relative" id="workflow">'
);

// DEF-12: Decouple features and excel-template (Section 4 retains id="excel-template" with scroll-mt-20)
codeHtml = codeHtml.replace(
  '<section class="w-full py-24 bg-surface-container-low" id="excel-template">',
  '<section class="w-full py-24 bg-surface-container-low relative scroll-mt-20" id="excel-template">'
);

// Section 5: FAQ gets scroll-mt-20
codeHtml = codeHtml.replace(
  '<section class="w-full py-24 bg-surface-container-lowest" id="faq">',
  '<section class="w-full py-24 bg-surface-container-lowest scroll-mt-20 relative" id="faq">'
);

// In Excel feature: update template download link
codeHtml = codeHtml.replace(
  '<a class="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-lowest text-primary-container hover:text-primary font-headline-sm text-headline-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 border border-outline-variant/30 hover:border-primary-container/40" href="#trial">',
  '<a class="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface-container-lowest text-primary-container hover:text-primary font-headline-sm text-headline-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 border border-outline-variant/30 hover:border-primary-container/40" href="/api/v1/template/pricing-sheet" download="kelvinflow-pricing-template.xlsx">'
);

// In Pre-footer conversion callout: update CTA button
codeHtml = codeHtml.replace(
  '<a class="group w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(29,78,216,0.32)] active:translate-y-0 active:scale-[0.98] transition-all duration-200" href="#">免费开始试用</a>',
  '<button class="group w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(29,78,216,0.32)] active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer border-0" onclick="openInboundModal(\'starter\')" type="button">免费开始试用</button>'
);

// M2: 底部 CTA 区三个勾选卖点在移动端改为垂直排列，每行一个卖点、勾选图标左对齐；桌面端保持横向三列
codeHtml = codeHtml.replace(
  '<div class="mt-8 flex flex-wrap items-center justify-center gap-6 text-on-surface-variant text-body-sm font-body-sm">',
  '<div class="mt-8 flex flex-col md:flex-row items-start md:items-center justify-center gap-3 md:gap-6 text-on-surface-variant text-body-sm font-body-sm">'
);

// M3 & Footer: 优化页脚在移动端的内边距并增加 id="footer" 与 scroll-reveal
codeHtml = codeHtml.replace(
  '<footer class="w-full bg-surface-container-lowest border-t border-outline-variant/30 py-8 px-6"><div class="max-w-[1440px] mx-auto px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-lg">',
  '<footer class="w-full bg-surface-container-lowest border-t border-[#f1f5f9] py-space-xl" id="footer"><div class="scroll-reveal max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-lg" data-reveal-delay="0">'
);

// 底栏 Logo 图标与品牌文字：全站统一采用黄金比例规范 (w-6 h-6, items-end, gap-1.5, text-xl leading-none) 与顶部导航完全一致的无抖动交互微动效
const oldFooterLogo = '<div class="flex items-center gap-1.5"><img alt="KelvinFlow Logo" class="object-contain inline-block shrink-0" src="/k_logo.svg" style="width: 48px; height: 48px; margin: -8px -15px -8px -4px;"><span class="font-headline-sm text-headline-sm text-[#1B2A4A] flex items-center gap-1.5">KelvinFlow<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span></div>';
const newFooterLogo = '<a href="/" class="group flex items-end gap-1.5 min-h-[44px] py-2 transition-opacity duration-200 hover:opacity-85 cursor-pointer w-fit" aria-label="KelvinFlow 首页"><img src="/k_logo.svg" alt="KelvinFlow Logo" class="w-6 h-6 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"><span class="text-xl font-bold tracking-tight text-[#1B2A4A] leading-none select-none">KelvinFlow</span><span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none mb-0.5 uppercase select-none transition-colors duration-200 group-hover:bg-[#FDE68A]">AI</span></a>';
codeHtml = codeHtml.replace(oldFooterLogo, newFooterLogo);
codeHtml = codeHtml.replace(
  '<a class="font-body-sm text-body-sm text-on-surface-variant hover:text-primary-container transition-colors duration-150" href="mailto:hi@kelvinflow.com">hi@kelvinflow.com</a>',
  '<a class="font-body-sm text-body-sm text-on-surface-variant hover:text-primary-container transition-colors duration-150 inline-flex items-center min-h-[44px] py-2.5 px-2" href="mailto:sales@kelvinflow.com">sales@kelvinflow.com</a>'
);

// ==================== SCROLL REVEAL INJECTIONS ====================
// Section 2: 3 Metric Cards (依次错开 100ms 并注入高质感 hover 交互动画)
codeHtml = codeHtml.replace(
  '<!-- Metric Card 1 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/50 transition-all duration-300">',
  '<!-- Metric Card 1 -->\n      <div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 hover:border-primary/40 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Metric Card 2 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/50 transition-all duration-300">',
  '<!-- Metric Card 2 -->\n      <div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 hover:border-primary/40 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- Metric Card 3 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/50 transition-all duration-300">',
  '<!-- Metric Card 3 -->\n      <div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 hover:border-primary/40 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between" data-reveal-delay="200">'
);

// Section 3: Workflow Header & 3 Step Cards (依次错开 100ms)
codeHtml = codeHtml.replace(
  '<div class="text-center max-w-3xl mx-auto mb-16">',
  '<div class="scroll-reveal text-center max-w-3xl mx-auto mb-16" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Step 1 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col relative cursor-default hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/30 transition-all duration-300">',
  '<!-- Step 1 -->\n<div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col relative cursor-default hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/30 transition-all duration-300" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Step 2 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col relative cursor-default hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/30 transition-all duration-300">',
  '<!-- Step 2 -->\n<div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col relative cursor-default hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/30 transition-all duration-300" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- Step 3 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col relative cursor-default hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/30 transition-all duration-300">',
  '<!-- Step 3 -->\n<div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/25 flex flex-col relative cursor-default hover:-translate-y-1.5 hover:shadow-lg hover:border-primary/30 transition-all duration-300" data-reveal-delay="200">'
);

// Section 4: Features Header & 3 Feature Cards (依次错开 100ms)
codeHtml = codeHtml.replace(
  '<div class="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">',
  '<div class="scroll-reveal flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Feature 1 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/40 transition-all duration-300">',
  '<!-- Feature 1 -->\n<div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/40 transition-all duration-300" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- Feature 2 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/40 transition-all duration-300">',
  '<!-- Feature 2 -->\n<div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/40 transition-all duration-300" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- Feature 3 -->\n<div class="group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/40 transition-all duration-300">',
  '<!-- Feature 3 -->\n<div class="scroll-reveal group bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between cursor-default hover:-translate-y-1 hover:shadow-md hover:border-outline-variant/40 transition-all duration-300" data-reveal-delay="200">'
);

// Section 5: FAQ Header & 4 FAQ Items (依次错开 80-100ms)
codeHtml = codeHtml.replace(
  '<!-- Section Header -->\n<div class="text-center mb-16">',
  '<!-- Section Header -->\n<div class="scroll-reveal text-center mb-16" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 1 (首项展开，展示完整交互) -->\n<div class="faq-accordion-item is-open bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm">',
  '<!-- FAQ Item 1 (首项展开，展示完整交互) -->\n<div class="scroll-reveal faq-accordion-item is-open bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm" data-reveal-delay="0">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 2 -->\n<div class="faq-accordion-item bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm">',
  '<!-- FAQ Item 2 -->\n<div class="scroll-reveal faq-accordion-item bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm" data-reveal-delay="100">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 3 -->\n<div class="faq-accordion-item bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm">',
  '<!-- FAQ Item 3 -->\n<div class="scroll-reveal faq-accordion-item bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm" data-reveal-delay="200">'
);
codeHtml = codeHtml.replace(
  '<!-- FAQ Item 4 -->\n<div class="faq-accordion-item bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm">',
  '<!-- FAQ Item 4 -->\n<div class="scroll-reveal faq-accordion-item bg-surface-container-low rounded-2xl p-6 md:p-8 border border-transparent shadow-sm" data-reveal-delay="300">'
);

// Section 6: Pre-footer Trial CTA
codeHtml = codeHtml.replace(
  '<div class="bg-surface-container-lowest rounded-3xl p-10 md:p-16 shadow-lg text-center flex flex-col items-center border border-outline-variant/20 hover:border-blue-200/80 hover:shadow-[0_20px_50px_rgba(29,78,216,0.08)] transition-all duration-300 relative overflow-hidden">',
  '<div class="scroll-reveal bg-surface-container-lowest rounded-3xl p-10 md:p-16 shadow-lg text-center flex flex-col items-center border border-outline-variant/20 hover:border-blue-200/80 hover:shadow-[0_20px_50px_rgba(29,78,216,0.08)] transition-all duration-300 relative overflow-hidden" data-reveal-delay="0">'
);

// Append the Reskinned Modals & JavaScript Logic right before </body>
// NOTE:
// 1) style="display: none;" added directly to modal overlays to guarantee 0 intercept when hidden
// 2) Agreement checkbox has NO checked attribute (unchecked by default per D1/D2 regression)
const modalsAndScripts = `
  <!-- ========================================================================= -->
  <!-- 弹窗交互组件群 (Precision Trade Minimal v13 Modals)                       -->
  <!-- ========================================================================= -->

  <!-- A. 试用开通 & 密码登录弹窗 (Inbound Modal) -->
  <div id="inbound-modal" style="display: none;" class="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <!-- Click Scrim -->
    <div class="absolute inset-0" onclick="closeInboundModal()"></div>

    <!-- Modal Card Body (加宽至 480px 并优化内边距以确保协议单行不折行) -->
    <div onclick="event.stopPropagation()" class="max-w-[480px] w-full bg-surface-container-lowest rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-200 z-10 my-auto">
      
      <!-- 关闭按钮 (X 图标，与设计稿对齐，满足 44px 触控要求) -->
      <button onclick="closeInboundModal()" aria-label="关闭弹窗" class="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors duration-150 group cursor-pointer focus:outline-none" type="button">
        <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:rotate-90">close</span>
      </button>

      <!-- 品牌标识与 Logo (全站黄金比例规范) -->
      <div class="flex flex-col items-center text-center">
        <div class="flex items-end justify-center gap-1.5 mb-2">
          <img src="/k_logo.svg" alt="KelvinFlow Logo" class="w-6 h-6 object-contain shrink-0">
          <span class="text-xl font-bold tracking-tight text-[#1B2A4A] leading-none">KelvinFlow</span>
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
            <span>无需信用卡 · 即刻开启，快速出单</span>
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
            <p id="email-risk-error-msg" class="hidden text-error text-[11px] mt-0.5"></p>
          </div>

          <!-- 邮箱验证码输入项 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-code">
              邮箱验证码
            </label>
            <div class="flex gap-2">
              <div class="relative flex-1 flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">verified_user</span>
                <input class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-code" maxlength="6" placeholder="6 位验证码" required type="text">
              </div>
              <button class="h-11 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs transition-colors shrink-0 flex items-center justify-center cursor-pointer min-w-[100px]" id="btn-send-code" onclick="sendInboundVerificationCode()" type="button">
                <span id="btn-send-code-text">获取验证码</span>
              </button>
            </div>
          </div>

          <!-- 错误态反馈信息条 (设计稿对版：红字"验证码已失效或输入有误，请核对后重试") -->
          <div id="inbound-error-feedback" class="hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200/60 text-error text-[12px]">
            <span class="material-symbols-outlined text-[16px] shrink-0" style="font-variation-settings: 'FILL' 1;">error</span>
            <span id="inbound-error-feedback-text">验证码已失效或输入有误，请核对后重试</span>
          </div>

          <!-- 设置登录密码输入项 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-password">
              设置登录密码
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock</span>
              <input class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-password" minlength="6" placeholder="至少 6 位字符" required type="password">
              <button aria-label="切换密码可见性" class="absolute right-3 text-outline hover:text-on-surface transition-colors cursor-pointer" onclick="togglePasswordVisibility('inbound-password', 'pwd-toggle-icon-reg')" type="button">
                <span class="material-symbols-outlined text-[18px]" id="pwd-toggle-icon-reg">visibility</span>
              </button>
            </div>
          </div>

          <!-- 您从哪里了解到 KelvinFlow？(v13 核心指纹自定义下拉，选填) -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" for="custom-channel-btn">
              <span>您从哪里了解到 KelvinFlow？</span>
              <span class="font-label-sm text-label-sm text-outline font-normal">选填</span>
            </label>
            <div class="relative" id="custom-channel-dropdown">
              <!-- 兼容提交的隐藏 input，取值逻辑与原有 handleInboundSubmit 完全兼容 -->
              <input type="hidden" id="inbound-channel-select" name="channel" value="">
              
              <!-- 下拉触发按钮 (关闭态样式与原生保持一致) -->
              <button type="button" id="custom-channel-btn" onclick="toggleCustomChannelDropdown()" class="w-full h-11 pl-10 pr-9 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60 flex items-center justify-between cursor-pointer text-left select-none relative" aria-haspopup="listbox" aria-expanded="false">
                <span id="custom-channel-label" class="text-outline-variant font-normal">请选择了解渠道</span>
                <span id="custom-channel-arrow" class="material-symbols-outlined absolute right-3 text-outline text-[20px] transition-transform duration-200 pointer-events-none">arrow_drop_down</span>
              </button>
              <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">campaign</span>

              <!-- 展开态：圆角白底列表、hover 行高亮、选中打勾 -->
              <div id="custom-channel-menu" class="hidden absolute top-full left-0 right-0 mt-1 z-30 py-1 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/30 overflow-hidden" role="listbox">
                <div class="channel-option flex items-center justify-between px-3.5 py-2.5 text-body-md cursor-pointer text-on-surface hover:bg-blue-50 hover:text-primary transition-colors duration-150 select-none" data-value="friend" role="option" tabindex="0">
                  <span>朋友推荐</span>
                  <span class="material-symbols-outlined text-[18px] text-primary hidden check-icon" style="font-variation-settings: 'FILL' 1;">check</span>
                </div>
                <div class="channel-option flex items-center justify-between px-3.5 py-2.5 text-body-md cursor-pointer text-on-surface hover:bg-blue-50 hover:text-primary transition-colors duration-150 select-none" data-value="xiaohongshu" role="option" tabindex="0">
                  <span>小红书</span>
                  <span class="material-symbols-outlined text-[18px] text-primary hidden check-icon" style="font-variation-settings: 'FILL' 1;">check</span>
                </div>
                <div class="channel-option flex items-center justify-between px-3.5 py-2.5 text-body-md cursor-pointer text-on-surface hover:bg-blue-50 hover:text-primary transition-colors duration-150 select-none" data-value="google" role="option" tabindex="0">
                  <span>谷歌搜索</span>
                  <span class="material-symbols-outlined text-[18px] text-primary hidden check-icon" style="font-variation-settings: 'FILL' 1;">check</span>
                </div>
                <div class="channel-option flex items-center justify-between px-3.5 py-2.5 text-body-md cursor-pointer text-on-surface hover:bg-blue-50 hover:text-primary transition-colors duration-150 select-none" data-value="other" role="option" tabindex="0">
                  <span>其他</span>
                  <span class="material-symbols-outlined text-[18px] text-primary hidden check-icon" style="font-variation-settings: 'FILL' 1;">check</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 用户协议勾选 (按最新用户真机反馈：删除保密承诺，仅保留用户服务协议) -->
          <div class="flex items-center gap-2 pt-1 text-left">
            <input class="w-4 h-4 rounded text-primary-container bg-surface-container-lowest focus:ring-0 cursor-pointer accent-primary-container shrink-0" id="inbound-agreement-checkbox" required type="checkbox">
            <label class="font-label-sm text-label-sm text-on-surface-variant select-none inline-flex items-center gap-1 cursor-pointer" for="inbound-agreement-checkbox">
              <span>我已阅读并同意</span>
              <button type="button" onclick="event.preventDefault(); openAgreementModal('terms')" class="text-primary-container hover:underline font-semibold cursor-pointer p-0 bg-transparent border-0 inline">《用户服务协议》</button>
            </label>
          </div>

          <!-- 开通试用主按钮 -->
          <button class="w-full h-12 rounded-xl bg-primary-container hover:bg-blue-700 active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-1 cursor-pointer" id="btn-inbound-submit" type="submit">
            <span id="btn-inbound-submit-text">立即开通 7 天免费试用</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <!-- 注册底部说明与切换登录 -->
        <div class="text-center pt-3 pb-1 border-t border-surface-container-high mt-3.5">
          <p class="font-label-sm text-label-sm text-outline mb-2">
            赠送 100 次 AI 深度询盘解析 · 免绑定信用卡
          </p>
          <p class="font-body-sm text-body-sm text-on-surface-variant">
            已有 KelvinFlow 账号？
            <button type="button" class="font-medium text-primary-container hover:underline transition-all cursor-pointer bg-transparent border-0 p-0 inline" onclick="switchInboundFormMode('login')">直接登录</button>
          </p>
        </div>
      </div>

      <!-- 2. 登录视图 (kelvinflow_1 对版) -->
      <div id="inbound-login-view" class="hidden">
        <div class="text-center mb-3">
          <h2 class="font-headline-lg text-headline-lg font-bold text-[#1B2A4A] tracking-tight mt-1 mb-1">
            欢迎回到 KelvinFlow
          </h2>
          <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[280px] mx-auto leading-normal">
            登录工作台，继续高效流转海外询盘与报价
          </p>
        </div>

        <form id="inbound-login-form" onsubmit="handleInboundLoginSubmit(event)" class="flex flex-col gap-3.5">
          <!-- 工作邮箱 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-login-email">
              工作邮箱
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">mail</span>
              <input class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-login-email" placeholder="name@company.com" required type="email">
            </div>
          </div>

          <!-- 登录密码 -->
          <div class="flex flex-col gap-1.5 text-left">
            <label class="font-label-md text-label-md text-on-surface font-semibold" for="inbound-login-password">
              登录密码
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock</span>
              <input class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="inbound-login-password" placeholder="••••••••" required type="password">
              <button aria-label="切换密码可见性" class="absolute right-3 text-outline hover:text-on-surface transition-colors cursor-pointer" onclick="togglePasswordVisibility('inbound-login-password', 'pwd-toggle-icon-login')" type="button">
                <span class="material-symbols-outlined text-[18px]" id="pwd-toggle-icon-login">visibility</span>
              </button>
            </div>
          </div>

          <!-- 登录错误反馈条 (设计稿对版：红字"密码错误，请重试") -->
          <div id="inbound-login-error" class="hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200/60 text-error text-[12px]">
            <span class="material-symbols-outlined text-[16px] shrink-0" style="font-variation-settings: 'FILL' 1;">error</span>
            <span id="inbound-login-error-text">密码错误，请重试</span>
          </div>

          <!-- 记住此设备与忘记密码 -->
          <div class="flex items-center justify-between text-left mt-1 mb-2">
            <label class="flex items-center gap-2 cursor-pointer select-none group">
              <input class="w-4 h-4 rounded text-primary-container accent-primary-container focus:ring-0 cursor-pointer" id="inbound-remember-device" type="checkbox">
              <span class="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                记住此设备
              </span>
            </label>
            <button type="button" class="font-body-sm text-body-sm font-medium text-primary-container hover:underline transition-all cursor-pointer bg-transparent border-0 p-0 inline" onclick="openForgotPasswordModal()">
              忘记密码？
            </button>
          </div>

          <!-- 登录工作台主按钮 -->
          <button class="w-full h-12 rounded-xl bg-primary-container hover:bg-blue-700 active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer" id="btn-inbound-login-submit" type="submit">
            <span id="btn-inbound-login-text">登录工作台</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <!-- 登录底部切换注册 (对版设计稿：去注册) -->
        <div class="text-center pt-3 pb-1 border-t border-surface-container-high mt-4">
          <p class="font-body-sm text-body-sm text-on-surface-variant">
            还没有账号？
            <button type="button" class="font-medium text-primary-container hover:underline transition-all cursor-pointer bg-transparent border-0 p-0 inline" onclick="switchInboundFormMode('register')">去注册</button>
          </p>
        </div>
      </div>

    </div>
  </div>

  <!-- B. 找回密码弹窗 (Forgot Password Modal) -->
  <div id="forgot-password-modal" style="display: none;" class="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <div class="absolute inset-0" onclick="closeForgotPasswordModal()"></div>
    <div onclick="event.stopPropagation()" class="max-w-[440px] w-full bg-surface-container-lowest rounded-2xl shadow-2xl p-7 md:p-8 relative overflow-hidden transition-all duration-200 z-10 my-auto">
      
      <!-- 关闭按钮 (满足 44px 触控要求) -->
      <button onclick="closeForgotPasswordModal()" aria-label="关闭密码重置窗口" class="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors duration-150 group cursor-pointer focus:outline-none" type="button">
        <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:rotate-90">close</span>
      </button>

      <!-- 品牌 Header -->
      <div class="flex flex-col items-center text-center mb-3">
        <span class="px-3 py-1 rounded-full font-label-md text-label-md font-semibold text-primary bg-primary-fixed flex items-center gap-1.5 w-fit">
          <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">security</span>
          安全密码重置
        </span>
        <h2 class="font-headline-lg text-headline-lg font-bold text-[#1B2A4A] tracking-tight mt-2 mb-1">重置登录密码</h2>
        <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[280px] leading-normal" id="forgot-modal-desc">
          输入您注册时的工作邮箱，验证身份后设置新密码
        </p>
      </div>

      <!-- Step 1: 验证工作邮箱 -->
      <form id="forgot-step1-form" onsubmit="handleForgotStep1Submit(event)" class="flex flex-col gap-3.5">
        <div class="flex flex-col gap-1.5 text-left">
          <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-email">
            注册工作邮箱
          </label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">mail</span>
            <input class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="forgot-email" placeholder="name@company.com" required type="email">
          </div>
        </div>

        <div class="flex flex-col gap-1.5 text-left">
          <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-code">
            邮箱验证码
          </label>
          <div class="flex gap-2">
            <div class="relative flex-1 flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">verified_user</span>
              <input class="w-full h-11 pl-10 pr-3.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="forgot-code" maxlength="6" placeholder="6 位验证码" required type="text">
            </div>
            <button class="h-11 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs transition-colors shrink-0 flex items-center justify-center cursor-pointer min-w-[100px]" id="btn-forgot-send-code" onclick="sendForgotVerificationCode()" type="button">
              <span id="btn-forgot-send-code-text">获取验证码</span>
            </button>
          </div>
        </div>

        <div id="forgot-step1-error-feedback" class="hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200/60 text-error text-[12px]">
          <span class="material-symbols-outlined text-[16px] shrink-0" style="font-variation-settings: 'FILL' 1;">error</span>
          <span id="forgot-step1-error-text">验证码有误或已过期</span>
        </div>

        <button class="w-full h-12 rounded-xl bg-primary-container hover:bg-blue-700 active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-2 cursor-pointer" id="btn-forgot-step1-submit" type="submit">
          <span>下一步：设置新密码</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>

      <!-- Step 2: 设置新密码 -->
      <form id="forgot-step2-form" onsubmit="handleForgotStep2Submit(event)" class="hidden flex flex-col gap-3.5">
        <div class="flex flex-col gap-1.5 text-left">
          <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-new-password">
            设置新密码
          </label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock</span>
            <input class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="forgot-new-password" minlength="6" placeholder="新密码 (至少 6 位字符)" required type="password">
            <button aria-label="切换密码可见性" class="absolute right-3 text-outline hover:text-on-surface transition-colors cursor-pointer" onclick="togglePasswordVisibility('forgot-new-password', 'pwd-toggle-icon-new')" type="button">
              <span class="material-symbols-outlined text-[18px]" id="pwd-toggle-icon-new">visibility</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5 text-left">
          <label class="font-label-md text-label-md text-on-surface font-semibold" for="forgot-confirm-password">
            确认新密码
          </label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3.5 text-outline text-[18px] pointer-events-none">lock_reset</span>
            <input class="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm outline-none transition-all placeholder:text-outline-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 border border-outline-variant/60" id="forgot-confirm-password" minlength="6" placeholder="再次输入新密码" required type="password">
            <button aria-label="切换密码可见性" class="absolute right-3 text-outline hover:text-on-surface transition-colors cursor-pointer" onclick="togglePasswordVisibility('forgot-confirm-password', 'pwd-toggle-icon-confirm')" type="button">
              <span class="material-symbols-outlined text-[18px]" id="pwd-toggle-icon-confirm">visibility</span>
            </button>
          </div>
        </div>

        <div id="forgot-step2-error-feedback" class="hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200/60 text-error text-[12px]">
          <span class="material-symbols-outlined text-[16px] shrink-0" style="font-variation-settings: 'FILL' 1;">error</span>
          <span id="forgot-step2-error-text">密码更新失败</span>
        </div>
        <div id="forgot-step2-success-feedback" class="hidden flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[12px]"></div>

        <button class="w-full h-12 rounded-xl bg-primary-container hover:bg-blue-700 active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm font-semibold shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-2 cursor-pointer" id="btn-forgot-step2-submit" type="submit">
          <span id="btn-forgot-step2-text">确认并保存新密码</span>
          <span class="material-symbols-outlined text-[18px]">check</span>
        </button>
      </form>

      <div class="text-center pt-3 border-t border-surface-container-high mt-4">
        <button type="button" class="font-body-sm text-body-sm font-medium text-primary-container hover:underline transition-all cursor-pointer flex items-center justify-center gap-1 bg-transparent border-0 p-0 inline mx-auto" onclick="backToLoginFromForgot()">
          <span class="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>返回登录</span>
        </button>
      </div>

    </div>
  </div>

  <!-- C. 退出登录确认弹窗 (kelvinflow_2 对版，预埋供 4b 使用) -->
  <div id="logout-dialog-overlay" style="display: none;" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200">
    <div class="absolute inset-0" onclick="closeLogoutModal()"></div>
    <div onclick="event.stopPropagation()" class="relative w-full max-w-sm rounded-[24px] bg-surface-container-lowest p-6 sm:p-8 shadow-[0_20px_50px_rgba(19,27,46,0.14),0_4px_12px_rgba(19,27,46,0.06)] transform transition-all duration-200 scale-100 flex flex-col items-center text-center z-10 my-auto" id="logout-modal-card">
      <!-- 关闭图标 (满足 44px 触控要求) -->
      <button onclick="closeLogoutModal()" aria-label="关闭弹窗" class="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200 hover:rotate-90 cursor-pointer focus:outline-none" id="close-modal-btn" type="button">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <!-- 红色警示图标容器 -->
      <div class="w-14 h-14 rounded-full bg-error-container/40 flex items-center justify-center text-error mb-4 shadow-sm">
        <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">logout</span>
      </div>

      <!-- 用户身份徽章 -->
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-md text-label-md mb-3 border border-outline-variant/30">
        <span class="material-symbols-outlined text-[14px]">account_circle</span>
        <span id="logout-user-email">user@company.com</span>
      </div>

      <!-- 标题与说明文案 -->
      <h3 class="font-headline-md text-headline-md font-bold text-on-surface mb-2 tracking-tight">退出登录</h3>
      <p class="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
        确定要退出当前账号吗？
      </p>

      <!-- 信息安全提示条 -->
      <div class="w-full bg-surface-container-low rounded-xl p-3 mb-6 text-left flex items-start gap-2.5 border border-outline-variant/20">
        <span class="material-symbols-outlined text-outline text-[16px] mt-0.5 shrink-0">info</span>
        <p class="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
          退出后需重新验证工作邮箱登录，未保存的单据草稿已加密同步至服务器。
        </p>
      </div>

      <!-- 按钮操作区 -->
      <div class="flex items-center gap-3 w-full">
        <button onclick="closeLogoutModal()" class="flex-1 py-2.5 px-5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-sm font-semibold transition-all duration-150 active:scale-95 cursor-pointer" type="button">
          取消
        </button>
        <button onclick="confirmLogoutUser()" class="flex-1 py-2.5 px-5 rounded-full bg-error hover:bg-red-700 text-white font-headline-sm text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5" type="button">
          <span class="material-symbols-outlined text-[16px]">power_settings_new</span>
          <span>确认退出</span>
        </button>
      </div>
    </div>
  </div>

  <!-- E. 合规政策与协议保障模态弹窗 (Agreement Modal - DEF-13 & DEF-14) -->
  <div id="agreement-modal" style="display: none;" class="fixed inset-0 z-[60] bg-[#0F172A]/50 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200 flex items-center justify-center p-4 overflow-y-auto">
    <!-- Click Scrim -->
    <div class="absolute inset-0" onclick="closeAgreementModal()"></div>

    <!-- Modal Card Body -->
    <div onclick="event.stopPropagation()" class="max-w-[620px] w-full bg-surface-container-lowest rounded-2xl shadow-2xl p-6 md:p-8 relative flex flex-col max-h-[90vh] z-10 my-auto">
      
      <!-- Close Button (满足 44px 触控要求) -->
      <button onclick="closeAgreementModal()" aria-label="关闭协议弹窗" class="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors duration-150 group cursor-pointer focus:outline-none border-0 bg-transparent" type="button">
        <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:rotate-90">close</span>
      </button>

      <!-- 弹窗 Header -->
      <div class="flex items-center gap-2.5 mb-3 pr-10">
        <div class="w-9 h-9 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[22px]">verified_user</span>
        </div>
        <div>
          <h3 class="font-headline-md text-[18px] font-bold text-[#1B2A4A] tracking-tight leading-tight">用户服务协议</h3>
          <p class="font-body-sm text-[12px] text-on-surface-variant">版本生效日期：2026 年 10 月 16 日 · 商业级数据安全隔离</p>
        </div>
      </div>

      <!-- 协议内容滚动容器 -->
      <div id="agreement-scroll-container" class="overflow-y-auto pr-3 py-2 text-left text-on-surface font-body-sm text-[13px] leading-relaxed max-h-[50vh] border-y border-surface-container-high/60 my-1 space-y-4">
        
        <!-- 用户服务协议正文 -->
        <div id="agreement-pane-terms" class="space-y-4">
          <div class="bg-surface-container-low/70 p-3 rounded-lg border border-outline-variant/30 text-xs text-on-surface-variant">
            签约主体：KelvinFlow 智能报价引擎平台运营方与企业/个人注册用户
          </div>
          <div>
            <h4 class="font-bold text-[#1B2A4A] text-sm mb-1">1. 【导言与服务说明】</h4>
            <p class="text-on-surface-variant">欢迎使用 KelvinFlow（以下简称“本平台”）。本平台是专为外贸业务员、跨境 SOHO 及出口制造企业打造的智能化外贸算价与询盘解析辅助工具。用户通过工作邮箱注册并启用本服务，即表示完全理解并自愿遵守本协议所有条款。</p>
          </div>
          <div>
            <h4 class="font-bold text-[#1B2A4A] text-sm mb-1">2. 【核心服务范畴与业务边界】</h4>
            <p class="text-on-surface-variant mb-1.5"><strong>2.1 询盘要素解析：</strong>基于深度自然语言理解技术，对用户主动转发的外贸询盘邮件正文进行品名、型号规格、采购数量（MOQ）及国际贸易术语（Incoterms：FOB/CIF/CFR 等）的结构化抽取。</p>
            <p class="text-on-surface-variant mb-1.5"><strong>2.2 底价规则智能匹配：</strong>将抽取的询盘要素与用户私有上传的 Excel 底价表进行阶梯价位、关税加价、海运拼箱成本及汇率结算规则匹配。</p>
            <p class="text-on-surface-variant mb-1.5"><strong>2.3 商业单据草稿生成：</strong>基于匹配结果，自动生成符合国际商务标准的英文报价单（Proforma Invoice / Quotation Sheet）PDF 草稿，并投递至用户工作邮箱草稿箱。</p>
            <p class="text-on-surface-variant"><strong>2.4 商业决策免责声明：</strong>本平台生成的所有报价单均为“待核对草稿”，不构成任何最终具有法律效力的对外商业要约。用户在正式向海外买家发送邮件前，拥有且必须履行最终核实与确认职责，本平台不对因用户未核实单据而产生的商业贸易纠纷承担连带责任。</p>
          </div>
          <div>
            <h4 class="font-bold text-[#1B2A4A] text-sm mb-1">3. 【用户数据与知识产权归属】</h4>
            <p class="text-on-surface-variant mb-1.5"><strong>3.1 用户私有数据绝对归属：</strong>用户上传的任何企业底价表（Excel/CSV）、产品规格明细、客户采购商名录及往来邮件正文，其知识产权与商业机密权利 100% 独家归属于用户或用户所属企业。</p>
            <p class="text-on-surface-variant"><strong>3.2 严禁用于公共模型训练承诺：</strong>本平台严正承诺，绝对不会将用户的私有产品底价、成本公式及客户采购信息用于任何公共大语言模型（LLM）的无监督微调或公开知识库沉淀。</p>
          </div>
          <div>
            <h4 class="font-bold text-[#1B2A4A] text-sm mb-1">4. 【账号安全与使用守则】</h4>
            <p class="text-on-surface-variant mb-1.5">4.1 用户应妥善保管登录密码及工作邮箱访问权限，凡使用该账号进行的操作均视为用户本人行为。</p>
            <p class="text-on-surface-variant">4.2 严禁利用本平台从事任何违反出口管制法律法规、侵犯第三方知识产权或伪造欺诈性外贸商业单据的非法活动。</p>
          </div>
          <div>
            <h4 class="font-bold text-[#1B2A4A] text-sm mb-1">5. 【服务变更、中断与终止】</h4>
            <p class="text-on-surface-variant">本平台有权对系统进行常规升级与维护。若因不可抗力或电信网络中断导致服务偶发不可用，平台将全力进行抢修，但不承担间接商业利润损失。</p>
          </div>
        </div>

      </div>

      <!-- 弹窗底部操作区 -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <button onclick="closeAgreementModal()" class="py-2.5 px-5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-headline-sm text-sm font-semibold transition-all duration-150 active:scale-95 cursor-pointer border-0" type="button">
          关闭
        </button>
        <button onclick="acceptAgreementFromModal()" class="py-2.5 px-6 rounded-full bg-primary-container hover:bg-blue-700 text-on-primary font-headline-sm text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 border-0" type="button">
          <span class="material-symbols-outlined text-[16px]">check_circle</span>
          <span>我已了解并同意</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    // =========================================================================
    // 前端核心驱动脚本 (试用/登录/找回密码/Escape退出/60s倒计时防抖)
    // =========================================================================

    let currentInboundFormMode = 'register';
    let codeCountdownTimer = null;
    let codeCountdownSeconds = 0;
    let forgotCountdownTimer = null;
    let forgotCountdownSeconds = 0;
    let forgotResetToken = '';

    function toggleMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      if (drawer) {
        drawer.classList.toggle('hidden');
      }
    }
    function closeMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      if (drawer) {
        drawer.classList.add('hidden');
      }
    }

    function updateNavForLoggedInUser() {
      const token = localStorage.getItem('saas_auth_token');
      const email = localStorage.getItem('kelvinflow_user_email');
      const tenant = localStorage.getItem('kelvinflow_active_tenant');
      const trialBtn = document.getElementById('nav-trial-btn');
      const loginBtn = document.getElementById('nav-login-btn');
      const wbBtn = document.getElementById('nav-workbench-btn');
      const userChip = document.getElementById('nav-user-chip');
      const userPhone = document.getElementById('nav-user-phone');
      const logoutEmail = document.getElementById('logout-user-email');

      if (token && email) {
        const wbUrl = tenant ? ('/review/QT-20260904-888?tenant=' + encodeURIComponent(tenant)) : '/review/QT-20260904-888';
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

    function isAnyModalOpen() {
      const modals = ['agreement-modal', 'inbound-modal', 'forgot-password-modal', 'logout-dialog-overlay'];
      return modals.some(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden') && el.style.display !== 'none';
      });
    }

    function lockBodyScroll() {
      document.documentElement.style.overflow = 'hidden';
    }

    function unlockBodyScroll() {
      if (!isAnyModalOpen()) {
        document.documentElement.style.overflow = '';
      }
    }

    // DEF-13 & DEF-14: 法务协议弹窗核心控制函数 (仅保留用户服务协议)
    function openAgreementModal(tab) {
      const modal = document.getElementById('agreement-modal');
      if (!modal) return;
      lockBodyScroll();
      modal.style.display = 'flex';
      modal.offsetHeight; // 强制回流以触发过渡
      modal.classList.remove('hidden', 'opacity-0');
      const scroller = document.getElementById('agreement-scroll-container');
      if (scroller) scroller.scrollTop = 0;
    }

    function closeAgreementModal() {
      const modal = document.getElementById('agreement-modal');
      if (!modal) return;
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        unlockBodyScroll();
      }, 150);
    }

    function switchAgreementTab(tab) {
      const scroller = document.getElementById('agreement-scroll-container');
      if (scroller) scroller.scrollTop = 0;
    }

    function acceptAgreementFromModal() {
      const checkbox = document.getElementById('inbound-agreement-checkbox');
      if (checkbox) checkbox.checked = true;
      closeAgreementModal();
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

      const regErr = document.getElementById('inbound-error-feedback');
      const loginErr = document.getElementById('inbound-login-error');
      if (regErr) regErr.classList.add('hidden');
      if (loginErr) loginErr.classList.add('hidden');
    }

    // L4: 自定义了解渠道下拉交互 (打开/关闭/选中/键盘)
    function toggleCustomChannelDropdown() {
      const menu = document.getElementById('custom-channel-menu');
      const arrow = document.getElementById('custom-channel-arrow');
      const btn = document.getElementById('custom-channel-btn');
      if (!menu) return;
      const isOpen = !menu.classList.contains('hidden');
      if (isOpen) {
        closeCustomChannelDropdown();
      } else {
        menu.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        if (btn) btn.setAttribute('aria-expanded', 'true');
      }
    }

    function closeCustomChannelDropdown() {
      const menu = document.getElementById('custom-channel-menu');
      const arrow = document.getElementById('custom-channel-arrow');
      const btn = document.getElementById('custom-channel-btn');
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        if (arrow) arrow.style.transform = '';
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    }

    function selectCustomChannel(val, text) {
      const input = document.getElementById('inbound-channel-select');
      const label = document.getElementById('custom-channel-label');
      if (input) input.value = val;
      if (label) {
        label.textContent = text;
        label.classList.remove('text-outline-variant');
        label.classList.add('text-on-surface');
      }
      const options = document.querySelectorAll('.channel-option');
      options.forEach(opt => {
        const check = opt.querySelector('.check-icon');
        if (opt.getAttribute('data-value') === val) {
          if (check) check.classList.remove('hidden');
          opt.classList.add('bg-blue-50/60', 'text-primary');
        } else {
          if (check) check.classList.add('hidden');
          opt.classList.remove('bg-blue-50/60', 'text-primary');
        }
      });
      closeCustomChannelDropdown();
      const btn = document.getElementById('custom-channel-btn');
      if (btn) btn.focus();
    }

    function initCustomChannelDropdown() {
      const btn = document.getElementById('custom-channel-btn');
      const menu = document.getElementById('custom-channel-menu');
      if (!btn || !menu) return;

      const options = Array.from(menu.querySelectorAll('.channel-option'));
      options.forEach((opt, idx) => {
        opt.onclick = () => {
          const val = opt.getAttribute('data-value');
          const text = opt.querySelector('span')?.textContent || '';
          selectCustomChannel(val, text);
        };

        opt.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const val = opt.getAttribute('data-value');
            const text = opt.querySelector('span')?.textContent || '';
            selectCustomChannel(val, text);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = (idx + 1) % options.length;
            options[nextIdx].focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = (idx - 1 + options.length) % options.length;
            options[prevIdx].focus();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeCustomChannelDropdown();
            btn.focus();
          }
        };
      });

      btn.onkeydown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (menu.classList.contains('hidden')) {
            toggleCustomChannelDropdown();
          }
          if (options.length > 0) {
            options[0].focus();
          }
        }
      };

      document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('custom-channel-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
          closeCustomChannelDropdown();
        }
      });
    }

    function openInboundModal(tier) {
      if (tier && tier !== 'starter' && tier !== 'login') {
        localStorage.setItem('kelvinflow_pending_tier', tier);
      } else if (tier === 'starter') {
        localStorage.setItem('kelvinflow_pending_tier', 'starter');
      }

      const modal = document.getElementById('inbound-modal');
      if (!modal) return;

      if (tier === 'login') {
        switchInboundFormMode('login');
      } else {
        switchInboundFormMode('register');
      }

      lockBodyScroll();
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
      });
    }

    function closeInboundModal() {
      closeCustomChannelDropdown();
      const modal = document.getElementById('inbound-modal');
      if (!modal) return;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        unlockBodyScroll();
      }, 200);
    }

    function openForgotPasswordModal() {
      const inboundModal = document.getElementById('inbound-modal');
      if (inboundModal) {
        inboundModal.classList.remove('opacity-100');
        inboundModal.classList.add('opacity-0');
        setTimeout(() => {
          inboundModal.classList.add('hidden');
          inboundModal.style.display = 'none';
        }, 200);
      }

      const step1Form = document.getElementById('forgot-step1-form');
      const step2Form = document.getElementById('forgot-step2-form');
      const desc = document.getElementById('forgot-modal-desc');
      const errFeedback1 = document.getElementById('forgot-step1-error-feedback');
      const errFeedback2 = document.getElementById('forgot-step2-error-feedback');
      const succFeedback2 = document.getElementById('forgot-step2-success-feedback');

      if (step1Form) step1Form.classList.remove('hidden');
      if (step2Form) step2Form.classList.add('hidden');
      if (desc) desc.textContent = '输入您注册时的工作邮箱，验证身份后设置新密码';
      if (errFeedback1) errFeedback1.classList.add('hidden');
      if (errFeedback2) errFeedback2.classList.add('hidden');
      if (succFeedback2) succFeedback2.classList.add('hidden');
      forgotResetToken = '';

      const modal = document.getElementById('forgot-password-modal');
      if (!modal) return;
      lockBodyScroll();
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
      });

      const loginEmail = document.getElementById('inbound-login-email')?.value || '';
      const forgotEmailInput = document.getElementById('forgot-email');
      if (loginEmail && forgotEmailInput && !forgotEmailInput.value) {
        forgotEmailInput.value = loginEmail;
      }
    }

    function closeForgotPasswordModal() {
      const modal = document.getElementById('forgot-password-modal');
      if (!modal) return;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        unlockBodyScroll();
      }, 200);
    }

    function backToLoginFromForgot() {
      closeForgotPasswordModal();
      setTimeout(() => {
        openInboundModal('login');
      }, 220);
    }

    // 退出确认弹窗 (kelvinflow_2 对版，预埋)
    function openLogoutModal() {
      const modal = document.getElementById('logout-dialog-overlay');
      if (!modal) return;
      const email = localStorage.getItem('kelvinflow_user_email') || 'kelvin.chen@tradecorp.com';
      const emailEl = document.getElementById('logout-user-email');
      if (emailEl) emailEl.textContent = email;

      lockBodyScroll();
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
      });
    }

    function closeLogoutModal() {
      const modal = document.getElementById('logout-dialog-overlay');
      if (!modal) return;
      modal.classList.remove('opacity-100');
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        unlockBodyScroll();
      }, 200);
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

    // D2: 立即进入倒计时与禁用态
    function sendInboundVerificationCode() {
      const emailInput = document.getElementById('inbound-email');
      const email = (emailInput?.value || '').trim();
      const btn = document.getElementById('btn-send-code');
      const btnText = document.getElementById('btn-send-code-text');
      const errFeedback = document.getElementById('inbound-error-feedback');
      const errText = document.getElementById('inbound-error-feedback-text');

      if (!email || !email.includes('@')) {
        if (errFeedback && errText) {
          errText.textContent = '请输入有效的工作邮箱';
          errFeedback.classList.remove('hidden');
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (btn) btn.disabled = true;
      codeCountdownSeconds = 60;
      if (btnText) btnText.textContent = '60s可重发';
      if (btn) btn.classList.add('opacity-60', 'cursor-not-allowed');

      if (codeCountdownTimer) clearInterval(codeCountdownTimer);
      codeCountdownTimer = setInterval(() => {
        codeCountdownSeconds--;
        if (codeCountdownSeconds > 0) {
          if (btnText) btnText.textContent = codeCountdownSeconds + 's可重发';
        } else {
          clearInterval(codeCountdownTimer);
          codeCountdownTimer = null;
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-60', 'cursor-not-allowed');
          }
          if (btnText) btnText.textContent = '获取验证码';
        }
      }, 1000);

      fetch('/api/v1/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (errFeedback && errText) {
            errText.textContent = data.error || '验证码发送失败，请稍后重试';
            errFeedback.classList.remove('hidden');
          }
        }
      })
      .catch(err => {
        console.error('获取验证码网络异常:', err);
        if (errFeedback && errText) {
          errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
      });
    }

    function handleInboundSubmit(e) {
      e.preventDefault();
      const email = (document.getElementById('inbound-email')?.value || '').trim();
      const code = (document.getElementById('inbound-code')?.value || '').trim();
      const password = (document.getElementById('inbound-password')?.value || '').trim();
      const channelSelect = document.getElementById('inbound-channel-select');
      const channel = channelSelect ? channelSelect.value : '';
      const agree = document.getElementById('inbound-agreement-checkbox')?.checked;
      const errFeedback = document.getElementById('inbound-error-feedback');
      const errText = document.getElementById('inbound-error-feedback-text');
      const submitBtn = document.getElementById('btn-inbound-submit');
      const submitBtnText = document.getElementById('btn-inbound-submit-text');

      if (errFeedback) errFeedback.classList.add('hidden');

      if (!agree) {
        if (errFeedback && errText) {
          errText.textContent = '请先阅读并同意用户服务协议';
          errFeedback.classList.remove('hidden');
        }
        return;
      }

      if (!code || code.length < 6) {
        if (errFeedback && errText) {
          errText.textContent = '验证码已失效或输入有误，请核对后重试';
          errFeedback.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitBtnText) submitBtnText.textContent = '开通试用中...';

      fetch('/api/v1/auth/trial-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          code: code,
          password: password,
          sourceChannel: channel || 'direct'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (errFeedback && errText) {
            errText.textContent = data.error || '验证码已失效或输入有误，请核对后重试';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = '立即开通 7 天免费试用';
          return;
        }

        if (data.token) localStorage.setItem('saas_auth_token', data.token);
        if (data.email) localStorage.setItem('kelvinflow_user_email', data.email);
        if (data.tenantId) localStorage.setItem('kelvinflow_active_tenant', data.tenantId);
        if (data.plan) localStorage.setItem('kelvinflow_user_plan', data.plan);
        if (data.remainingDays) localStorage.setItem('kelvinflow_remaining_days', data.remainingDays);

        updateNavForLoggedInUser();
        closeInboundModal();

        const targetTenant = data.tenantId || 'tenant_trial';
        window.location.href = '/review/QT-20260904-888?tenant=' + encodeURIComponent(targetTenant);
      })
      .catch(err => {
        console.error('注册提交网络异常:', err);
        if (errFeedback && errText) {
          errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = false;
        if (submitBtnText) submitBtnText.textContent = '立即开通 7 天免费试用';
      });
    }

    function handleInboundLoginSubmit(e) {
      e.preventDefault();
      const email = (document.getElementById('inbound-login-email')?.value || '').trim();
      const password = (document.getElementById('inbound-login-password')?.value || '').trim();
      const errBox = document.getElementById('inbound-login-error');
      const errText = document.getElementById('inbound-login-error-text');
      const submitBtn = document.getElementById('btn-inbound-login-submit');
      const submitBtnText = document.getElementById('btn-inbound-login-text');

      if (errBox) errBox.classList.add('hidden');

      if (!email || !password) {
        if (errBox && errText) {
          errText.textContent = '请输入工作邮箱与登录密码';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitBtnText) submitBtnText.textContent = '正在登录工作台...';

      fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (errBox && errText) {
            errText.textContent = data.error || '密码错误，请重试';
            errBox.classList.remove('hidden');
          }
          if (submitBtn) submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = '登录工作台';
          return;
        }

        if (data.token) localStorage.setItem('saas_auth_token', data.token);
        if (data.email) localStorage.setItem('kelvinflow_user_email', data.email);
        if (data.tenantId) localStorage.setItem('kelvinflow_active_tenant', data.tenantId);
        if (data.plan) localStorage.setItem('kelvinflow_user_plan', data.plan);
        if (data.remainingDays) localStorage.setItem('kelvinflow_remaining_days', data.remainingDays);

        updateNavForLoggedInUser();
        closeInboundModal();

        const targetTenant = data.tenantId || 'tenant_trial';
        window.location.href = '/review/QT-20260904-888?tenant=' + encodeURIComponent(targetTenant);
      })
      .catch(err => {
        console.error('登录提交异常:', err);
        if (errBox && errText) {
          errText.textContent = '网络连接异常，请重试';
          errBox.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = false;
        if (submitBtnText) submitBtnText.textContent = '登录工作台';
      });
    }

    function sendForgotVerificationCode() {
      const email = (document.getElementById('forgot-email')?.value || '').trim();
      const btn = document.getElementById('btn-forgot-send-code');
      const btnText = document.getElementById('btn-forgot-send-code-text');
      const errFeedback = document.getElementById('forgot-step1-error-feedback');
      const errText = document.getElementById('forgot-step1-error-text');

      if (!email || !email.includes('@')) {
        if (errFeedback && errText) {
          errText.textContent = '请输入注册使用的工作邮箱';
          errFeedback.classList.remove('hidden');
        }
        return;
      }

      if (btn) btn.disabled = true;
      forgotCountdownSeconds = 60;
      if (btnText) btnText.textContent = '60s可重发';
      if (btn) btn.classList.add('opacity-60', 'cursor-not-allowed');

      if (forgotCountdownTimer) clearInterval(forgotCountdownTimer);
      forgotCountdownTimer = setInterval(() => {
        forgotCountdownSeconds--;
        if (forgotCountdownSeconds > 0) {
          if (btnText) btnText.textContent = forgotCountdownSeconds + 's可重发';
        } else {
          clearInterval(forgotCountdownTimer);
          forgotCountdownTimer = null;
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-60', 'cursor-not-allowed');
          }
          if (btnText) btnText.textContent = '获取验证码';
        }
      }, 1000);

      fetch('/api/v1/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (errFeedback && errText) {
            errText.textContent = data.error || '验证码发送失败，请核对邮箱后重试';
            errFeedback.classList.remove('hidden');
          }
        }
      })
      .catch(err => {
        console.error('找回密码发码异常:', err);
        if (errFeedback && errText) {
          errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
      });
    }

    function handleForgotStep1Submit(e) {
      e.preventDefault();
      const email = (document.getElementById('forgot-email')?.value || '').trim();
      const code = (document.getElementById('forgot-code')?.value || '').trim();
      const errFeedback = document.getElementById('forgot-step1-error-feedback');
      const errText = document.getElementById('forgot-step1-error-text');
      const submitBtn = document.getElementById('btn-forgot-step1-submit');

      if (errFeedback) errFeedback.classList.add('hidden');

      if (!code || code.length < 6) {
        if (errFeedback && errText) {
          errText.textContent = '请输入 6 位邮箱验证码';
          errFeedback.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      fetch('/api/v1/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, code: code })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (errFeedback && errText) {
            errText.textContent = data.error || '验证码有误或已过期，请核对后重试';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        forgotResetToken = data.resetToken;
        document.getElementById('forgot-step1-form')?.classList.add('hidden');
        document.getElementById('forgot-step2-form')?.classList.remove('hidden');
        const desc = document.getElementById('forgot-modal-desc');
        if (desc) desc.textContent = '身份验证已通过，请为您的账号设置全新登录密码';
        if (submitBtn) submitBtn.disabled = false;
      })
      .catch(err => {
        console.error('核验找回密码验证码异常:', err);
        if (errFeedback && errText) {
          errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = false;
      });
    }

    function handleForgotStep2Submit(e) {
      e.preventDefault();
      const newPassword = (document.getElementById('forgot-new-password')?.value || '').trim();
      const confirmPassword = (document.getElementById('forgot-confirm-password')?.value || '').trim();
      const errFeedback = document.getElementById('forgot-step2-error-feedback');
      const errText = document.getElementById('forgot-step2-error-text');
      const succFeedback = document.getElementById('forgot-step2-success-feedback');
      const submitBtn = document.getElementById('btn-forgot-step2-submit');

      if (errFeedback) errFeedback.classList.add('hidden');
      if (succFeedback) succFeedback.classList.add('hidden');

      if (!newPassword || newPassword.length < 6) {
        if (errFeedback && errText) {
          errText.textContent = '新密码长度至少需要 6 位字符';
          errFeedback.classList.remove('hidden');
        }
        return;
      }

      if (newPassword !== confirmPassword) {
        if (errFeedback && errText) {
          errText.textContent = '两次输入的密码不一致，请核对后重新输入！';
          errFeedback.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      fetch('/api/v1/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: forgotResetToken, newPassword: newPassword })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (errFeedback && errText) {
            errText.textContent = data.error || '密码更改失败，请稍后重试';
            errFeedback.classList.remove('hidden');
          }
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        if (succFeedback) {
          succFeedback.innerHTML = '<span class="material-symbols-outlined text-[15px]" style="font-variation-settings: \\'FILL\\' 1;">check_circle</span><span>密码已成功重置，即将返回登录窗口...</span>';
          succFeedback.classList.remove('hidden');
        }

        setTimeout(() => {
          backToLoginFromForgot();
        }, 1500);
      })
      .catch(err => {
        console.error('重置密码提交异常:', err);
        if (errFeedback && errText) {
          errText.textContent = '网络连接异常，请重试';
          errFeedback.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = false;
      });
    }

    // D1: 全局 Escape 键退出当前最顶层激活的弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        // L4: 如果了解渠道下拉展开，按 Escape 仅收起下拉，不关闭弹窗
        const channelMenu = document.getElementById('custom-channel-menu');
        if (channelMenu && !channelMenu.classList.contains('hidden')) {
          closeCustomChannelDropdown();
          const btn = document.getElementById('custom-channel-btn');
          if (btn) btn.focus();
          e.stopPropagation();
          return;
        }

        const agreementModal = document.getElementById('agreement-modal');
        if (agreementModal && !agreementModal.classList.contains('hidden') && agreementModal.style.display !== 'none') {
          closeAgreementModal();
          return;
        }
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

    // DEF-09: 全局 Tab 键模态弹窗焦点陷阱 (Focus Trap)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modals = ['agreement-modal', 'inbound-modal', 'forgot-password-modal', 'logout-dialog-overlay'];
        const activeModal = modals
          .map(id => document.getElementById(id))
          .find(m => m && !m.classList.contains('hidden') && m.style.display !== 'none');
        if (!activeModal) return;

        const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusables = Array.from(activeModal.querySelectorAll(focusableSelector))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
          });

        if (focusables.length === 0) return;

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !activeModal.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !activeModal.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    });

    // =========================================================================
    // 滚动渐入动画 (Scroll Reveal via IntersectionObserver)
    // =========================================================================
    function initScrollReveal() {
      // prefers-reduced-motion 时禁用动画，内容直接显示
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
          obs.unobserve(el);

          const customDelay = el.dataset.revealDelay;
          const delay = customDelay !== undefined ? parseInt(customDelay, 10) : (idx * 100);

          setTimeout(() => {
            el.classList.add('revealed');

            const cleanup = () => {
              el.classList.remove('scroll-reveal', 'revealed');
              el.removeEventListener('transitionend', onEnd);
            };
            const onEnd = (e) => {
              if (e.propertyName === 'transform') cleanup();
            };
            el.addEventListener('transitionend', onEnd);
            setTimeout(cleanup, 750);
          }, delay);
        });
      }, {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      });

      revealElements.forEach(el => observer.observe(el));
    }

    // 全局页面平滑滚动与固定顶栏 (64px) 72px 偏移量对齐，防止锚点跳跃不准
    function initSmoothScrollOffset() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          const href = this.getAttribute('href');
          if (href && href !== '#' && href.startsWith('#')) {
            const targetEl = document.querySelector(href);
            if (targetEl) {
              e.preventDefault();
              const headerOffset = 72;
              const elementPosition = targetEl.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
              history.pushState(null, '', href);
            }
          }
        });
      });

      if (window.location.hash) {
        setTimeout(() => {
          const targetEl = document.querySelector(window.location.hash);
          if (targetEl) {
            const headerOffset = 72;
            const elementPosition = targetEl.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
          }
        }, 150);
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      updateNavForLoggedInUser();
      initScrollReveal();
      initCustomChannelDropdown();
      initSmoothScrollOffset();
    });
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      initScrollReveal();
      initCustomChannelDropdown();
      initSmoothScrollOffset();
    }
  </script>
`;

const finalHtml = codeHtml + '\n' + modalsAndScripts + '\n</body></html>';

// 3. Strict Prohibited Words Validation (8 items must be 0)
const prohibitedWords = [
  '99.4%',
  '180,000+',
  '95%',
  '一键',
  '实时汇率',
  '中国银行',
  '自动获取',
  'Sinosure',
  '10 秒',
  '10秒'
];

let hasProhibited = false;
prohibitedWords.forEach(w => {
  const count = (finalHtml.match(new RegExp(w.replace(/[.*+?^${}()|[\\]/g, '\\\\$&'), 'g')) || []).length;
  if (count > 0) {
    console.error(`PROHIBITED WORD DETECTED: "${w}" count = ${count}`);
    hasProhibited = true;
  }
});

if (hasProhibited) {
  console.error('FATAL: Prohibited words detected in landing page HTML!');
  process.exit(1);
}

// 4. Write output to public/index.html
const outPath = path.join(__dirname, '..', 'public', 'index.html');
fs.writeFileSync(outPath, finalHtml, 'utf8');
console.log(`Successfully generated ${outPath} (${finalHtml.length} bytes)`);
