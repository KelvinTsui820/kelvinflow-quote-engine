import sys
import os
import time
import paramiko

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

def deploy(password):
    host = "192.255.145.11"
    port = 22
    username = "root"
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_tar = os.path.join(root_dir, "project.tar.gz")
    remote_tar = "/root/project.tar.gz"

    # 自动打包本地最新代码与 dist 编译目录
    print("📦 正在自动构建与打包最新代码...")
    import tarfile
    exclude_dirs = {'node_modules', '.git', '.github', '.cache', 'scratch', 'tmp', 'data'}
    exclude_exts = {'.tar.gz', '.log'}
    with tarfile.open(local_tar, "w:gz") as tar:
        for item in os.listdir(root_dir):
            if item in exclude_dirs or any(item.endswith(ext) for ext in exclude_exts):
                continue
            tar.add(os.path.join(root_dir, item), arcname=item)

    file_size_mb = os.path.getsize(local_tar) / (1024 * 1024)
    print(f"📦 部署包构建完成: {local_tar} ({file_size_mb:.2f} MB)")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        connected = False
        for attempt in range(1, 4):
            try:
                print(f"🔌 正在连接服务器 {host}:{port} (尝试 {attempt}/3)...")
                ssh.connect(host, port=port, username=username, password=password, timeout=30, banner_timeout=60, auth_timeout=60)
                connected = True
                print("✅ SSH 连接成功！")
                break
            except Exception as conn_err:
                print(f"⚠️ 连接尝试 {attempt} 失败: {conn_err}")
                if attempt < 3:
                    time.sleep(2)
        if not connected:
            raise Exception("无法建立 SSH 连接，重试已耗尽")

        print("🚀 正在通过 SFTP 上传 project.tar.gz 到服务器 /root/...")
        sftp = ssh.open_sftp()
        
        last_reported = 0
        def progress_callback(transferred, total):
            nonlocal last_reported
            percent = int((transferred / total) * 100)
            if percent >= last_reported + 25 or percent == 100:
                print(f"   上传进度: {percent}% ({transferred / (1024*1024):.1f}MB / {total / (1024*1024):.1f}MB)")
                last_reported = percent

        sftp.put(local_tar, remote_tar, callback=progress_callback)
        
        # 确保并同步标准种子单据数据与出厂底价表标准模板
        print("📋 正在同步标准样板单据与出厂底价表数据...")
        remote_dirs = [
            "/var/www/quote_app/data/quotes",
            "/var/www/quote_app/data/tenants/default/quotes",
            "/var/www/quote_app/商品底价表",
            "/var/www/quote_app/public/templates"
        ]
        for r_dir in remote_dirs:
            try:
                ssh.exec_command(f"mkdir -p {r_dir}")
            except Exception:
                pass
        
        sample_sync_items = [
            ("data/quotes/QT-20260904-888.json", "/var/www/quote_app/data/quotes/QT-20260904-888.json"),
            ("data/quotes/QT-20260904-888.pdf", "/var/www/quote_app/data/quotes/QT-20260904-888.pdf"),
            ("data/tenants/default/quotes/QT-20260904-888.json", "/var/www/quote_app/data/tenants/default/quotes/QT-20260904-888.json"),
            ("data/tenants/default/quotes/QT-20260904-888.pdf", "/var/www/quote_app/data/tenants/default/quotes/QT-20260904-888.pdf"),
            ("data/quotes/QT-388788.json", "/var/www/quote_app/data/quotes/QT-388788.json"),
            ("data/quotes/QT-388788.pdf", "/var/www/quote_app/data/quotes/QT-388788.pdf"),
            ("data/tenants/default/quotes/QT-388788.json", "/var/www/quote_app/data/tenants/default/quotes/QT-388788.json"),
            ("data/tenants/default/quotes/QT-388788.pdf", "/var/www/quote_app/data/tenants/default/quotes/QT-388788.pdf"),
            ("商品底价表/出厂底价表.xlsx", "/var/www/quote_app/商品底价表/出厂底价表.xlsx"),
            ("商品底价表/出厂底价表.xlsx", "/var/www/quote_app/data/active_pricing.xlsx"),
            ("商品底价表/出厂底价表.xlsx", "/var/www/quote_app/public/templates/出厂底价表.xlsx"),
            ("商品底价表/出厂底价表.xlsx", "/var/www/quote_app/public/templates/Minimal_Export_Pricing_Template.xlsx")
        ]
        for l_sub, r_dest in sample_sync_items:
            l_full = os.path.join(root_dir, l_sub)
            if os.path.exists(l_full):
                try:
                    sftp.put(l_full, r_dest)
                    print(f"   已更新核心数据: {l_sub} -> {r_dest}")
                except Exception as e:
                    print(f"   ⚠️ 同步核心数据跳过: {e}")

        sftp.close()
        print("✅ 部署包与核心数据同步完成！")

        commands = [
            "echo '===> [1/4] 解压最新代码与预编译产物到 /var/www/quote_app...'",
            "mkdir -p /var/www/quote_app && tar -xzf /root/project.tar.gz -C /var/www/quote_app",
            "echo '===> [2/4] 同步更新生产依赖 (含 pdf-parse)...'",
            "cd /var/www/quote_app && npm install --omit=dev --no-audit --prefer-offline || true",
            "echo '===> [3/4] 热重载 PM2 进程 quote-core...'",
            "cd /var/www/quote_app && (pm2 reload quote-core --update-env || pm2 restart quote-core --update-env)",
            "echo '===> [4/4] 检查服务健康状态...'",
            "sleep 3",
            "curl -s http://127.0.0.1:3000/api/v1/health || curl -s http://localhost:3000/api/v1/health"
        ]

        full_cmd = " && ".join(commands)
        print("\n⚙️ 正在服务器执行解压、构建与热重载...")
        stdin, stdout, stderr = ssh.exec_command(full_cmd, get_pty=True)

        for line in iter(stdout.readline, ""):
            try:
                print(line, end="")
            except Exception:
                print(line.encode('ascii', 'replace').decode('ascii'), end="")

        exit_status = stdout.channel.recv_exit_status()
        if exit_status == 0:
            print("\n🎉 服务器部署并重启成功！")
            return True
        else:
            err_output = stderr.read().decode('utf-8')
            print(f"\n❌ 执行失败，退出码: {exit_status}\n错误信息: {err_output}")
            return False

    except paramiko.AuthenticationException:
        print("❌ 身份验证失败：服务器密码错误，请检查！")
        return False
    except Exception as e:
        print(f"❌ 部署过程发生异常: {str(e)}")
        return False
    finally:
        ssh.close()

import getpass

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pwd = sys.argv[1]
    else:
        pwd = os.environ.get("VPS_PASSWORD", "")
        if not pwd:
            try:
                pwd = getpass.getpass("🔑 请输入云服务器 root 密码: ")
            except Exception:
                pwd = input("🔑 请输入云服务器 root 密码: ")

    if not pwd:
        print("❌ 未检测到密码，部署终止！")
        sys.exit(1)

    success = deploy(pwd)
    sys.exit(0 if success else 1)
