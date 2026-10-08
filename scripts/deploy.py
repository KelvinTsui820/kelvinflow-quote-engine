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
        print(f"🔌 正在连接服务器 {host}:{port}...")
        ssh.connect(host, port=port, username=username, password=password, timeout=15)
        print("✅ SSH 连接成功！")

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
        sftp.close()
        print("✅ 部署包上传完成！")

        commands = [
            "echo '===> [1/3] 解压最新代码与预编译产物到 /var/www/quote_app...'",
            "mkdir -p /var/www/quote_app && tar -xzf /root/project.tar.gz -C /var/www/quote_app",
            "echo '===> [2/3] 热重载 PM2 进程 quote-core...'",
            "cd /var/www/quote_app && (pm2 reload quote-core --update-env || pm2 restart quote-core --update-env)",
            "echo '===> [3/3] 检查服务健康状态...'",
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
