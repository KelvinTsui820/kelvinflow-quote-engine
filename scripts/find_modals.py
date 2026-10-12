import re

for fname in ['public/index.html', 'public/review.html']:
    with open(fname, 'r', encoding='utf-8') as f:
        text = f.read()
    print('===', fname, '===')
    for m in re.finditer(r'<div[^>]*id=["\']([^"\']*modal[^"\']*)["\'][^>]*>', text, re.IGNORECASE):
        print(m.group(0)[:150])
