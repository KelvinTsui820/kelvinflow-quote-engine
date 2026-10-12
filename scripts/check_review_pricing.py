with open('public/review.html', 'r', encoding='utf-8') as f:
    text = f.read()

out = []
idx = text.find('pricingModal.show')
while idx != -1:
    out.append("=== Found at idx: " + str(idx) + " ===")
    out.append(text[max(0, idx-100):min(len(text), idx+1200)])
    idx = text.find('pricingModal.show', idx+1)

with open('scripts/review_pricing.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print("Wrote", len(out), "chunks")
