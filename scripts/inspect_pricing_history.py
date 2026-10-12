import subprocess

show = subprocess.run(['git', 'show', 'f389076:public/index.html'], capture_output=True, text=True, encoding='utf-8', errors='ignore')
# let's find payment-modal in f389076
lines = show.stdout.split('\n')
for i, line in enumerate(lines):
    if 'payment-modal' in line:
        for j in range(max(0, i-5), min(len(lines), i+60)):
            print(f"{j+1}: {lines[j]}")
        break
