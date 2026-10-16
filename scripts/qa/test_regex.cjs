const fs = require('fs');
let codeHtml = fs.readFileSync('design/stitch_kelvinflow_landing_page_design/code.html', 'utf8');

const googleLogoUrl1 = 'https://lh3.googleusercontent.com/aida/AEtjO1Vvq3Nk1VsIkIS9DHJOkbOOsOiAntdUADuTkAAdMv2ywLJE0bNkkzXiyV5x-qE7RK1fC8acDC7vF_VqNF6LFGTMWOJG9XXVKqesdKzQ5qw4QkwAN6Ch0JrU_LHCwbFMjDfCwQK8GArWM9a14c-dUajUAkLse4FHUgY7mUUoyiJtiqU7gSA23_PfMDL68PNG6aByD0-fwXW-tH-K5aJBPEU3sFCCQfeYLiPM4DEoyKyqpX3fE_UHanm0lM4';
const googleLogoUrl2 = 'https://lh3.googleusercontent.com/aida/AEtjO1VbWXhvrHa6A3FcuFSwDNoIIBbGFwqULSBjEQfxGYJYYtKoZGC2HILPzb57IKf0ZY9Ws3PQoCkX9lE5VAB47MvaaBtD5do9b_FLqu6Srs0xli0q7jzDBbQzvMYGFGRe2F_YsgCIgd1uiLWNxV_Y7W5a6ps5-eeNB2AC7CYpCCXKHh44whLG93m_zCAaINUSRFAWSKSL9vY69cRytikqIH_CkpkqJkoEwm54LibEzQqiwK9x4GdJtsE6_eA';
codeHtml = codeHtml.split(googleLogoUrl1).join('/k_logo.svg');
codeHtml = codeHtml.split(googleLogoUrl2).join('/k_logo.svg');

const headerTarget = '<a class="flex items-center gap-2 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99]" data-path="landing-page" href="/"><img alt="KelvinFlow Logo" class="object-contain inline-block shrink-0" src="/k_logo.svg" style="width: 66px; height: 66px; margin: -12px -20px -12px -8px;"><span class="font-headline-md text-[20px] font-bold tracking-tight text-[#1B2A4A] flex items-center gap-1.5 leading-none">KelvinFlow<span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span></a>';

console.log('headerTarget found:', codeHtml.indexOf(headerTarget) !== -1);

const footerTarget = '<div class="flex items-center gap-1.5"><img alt="KelvinFlow Logo" class="object-contain inline-block shrink-0" src="/k_logo.svg" style="width: 48px; height: 48px; margin: -8px -15px -8px -4px;"><span class="font-headline-sm text-headline-sm text-[#1B2A4A] flex items-center gap-1.5">KelvinFlow<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 leading-none">AI</span></span></div>';

console.log('footerTarget found:', codeHtml.indexOf(footerTarget) !== -1);
