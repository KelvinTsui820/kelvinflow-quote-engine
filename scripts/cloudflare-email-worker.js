/**
 * KelvinFlow · Cloudflare Email Worker (彻底解耦 n8n 的直通中枢脚本)
 * 
 * 功能：
 * 1. 挂载于 Cloudflare Email Routing (电子邮件路由)；
 * 2. 毫秒级捕获所有海外买家发往企业域名的询盘邮件 (如 rfq@yourdomain.com / sales@yourdomain.com)；
 * 3. 零密码、零封号风险：无需向任何外部系统提供企业邮箱密码；
 * 4. 彻底取代 n8n，无内存开销、零服务器负载、99.99% 高可用！
 * 
 * 部署步骤 (仅需 1 分钟)：
 * 1. 登录 Cloudflare 控制台 -> 选中您的企业域名 -> 侧边栏【Email (电子邮件)】->【Email Routing (电子邮件路由)】；
 * 2. 点击【Email Workers (电子邮件 Worker)】->【Create Worker (创建 Worker)】；
 * 3. 将本文件全部代码复制粘贴到 Worker 编辑器中，点击【Save and Deploy (保存并部署)】；
 * 4. 返回【Routing Rules (路由规则)】->【Custom addresses (自定义地址)】，将您的询盘接收邮箱 (如 quote@或 rfq@或 Catch-all 全部邮件) 动作设为【Send to Worker (发送到 Worker)】，选择刚创建的 Worker 即可！
 */

export default {
  async email(message, env, ctx) {
    const from = message.from || 'unknown_buyer@domain.com';
    const to = message.to || 'sales@kelvinflow.com';
    const subject = message.headers.get('subject') || '(无主题买家询盘)';

    // 读取邮件原始流数据 (支持完整 MIME 与附件)
    const rawEmail = await new Response(message.raw).text();

    // 核心报价引擎直通地址
    const targetUrl = env.KELVINFLOW_INBOUND_URL || 'https://quote.kelvinflow.com/api/inbound/email';

    // 构造请求载荷
    const payload = {
      from,
      to,
      subject,
      text: rawEmail
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Email-Worker-KelvinFlow/1.0',
          'x-source': 'cloudflare-email-worker'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      console.log(`✅ [KelvinFlow Direct] 询盘已成功直推核心引擎: 单号 [${resData.quotationNumber}], 状态: ${response.status}`);
    } catch (err) {
      console.error(`❌ [KelvinFlow Direct] 推送至报价引擎异常:`, err.message);
      // 保证 Cloudflare 内部不抛错拒信
    }
  }
};
