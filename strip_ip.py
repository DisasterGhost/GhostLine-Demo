"""Strip sensitive IP from GhostLine-Demo source files."""
import re

# 1. Strip modelData blocks from wikiContent.ts
with open('src/data/wikiContent.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove modelData array properties (multiline)
content = re.sub(r'\s*modelData:\s*\[[\s\S]*?\],?\n', '\n', content)

with open('src/data/wikiContent.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"wikiContent.ts: modelData blocks stripped")

# 2. Fix reasoning blue in statePalettes.ts
with open('src/data/statePalettes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("#00CCCC", "#33AAFF")
# Update comment too
content = content.replace("Robin's egg blue", "Bright blue")

with open('src/data/statePalettes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("statePalettes.ts: #00CCCC -> #33AAFF")

# 3. Clean SignalsPanel.tsx footer - replace specific numbers with generic text
with open('src/components/SignalsPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "DT: 55-feat, 95.4% adj-acc (primary). LDA: r(T,C)=0.955, 71% cls-acc. Halluc: F1=0.980 (macro, GroupKFold).",
    "Geometric state classifier with hallucination ensemble. All signals extracted in real-time during generation."
)

with open('src/components/SignalsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SignalsPanel.tsx: footer cleaned")

# 4. Verify
with open('src/data/wikiContent.ts', 'r', encoding='utf-8') as f:
    remaining = f.read().count('modelData:')
print(f"Remaining 'modelData:' in wikiContent: {remaining} (should be 1 - the interface field)")
