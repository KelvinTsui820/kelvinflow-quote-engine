import re

with open('public/review.html', 'r', encoding='utf-8') as f:
    text = f.read()

for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', text):
    print(m.group(0))
