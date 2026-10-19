import re
import json

with open('scratch/part_three_raw.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Chapter pattern
chapter_names = [
    "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
    "Twenty-One", "Twenty-Two", "Twenty-Three", "Twenty-Four", "Twenty-Five", "Twenty-Six", "Twenty-Seven", "Twenty-Eight", "Twenty-Nine", "Thirty",
    "Thirty-One", "Thirty-Two", "Thirty-Three", "Thirty-Four", "Thirty-Five", "Thirty-Six", "Thirty-Seven", "Thirty-Eight"
]

results = []

for idx, ch_name in enumerate(chapter_names):
    ch_num = idx + 1
    # Search for Chapter <name>:
    pattern = rf"(Chapter\s+{ch_name}:[\s\S]*?)(?=Chapter\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Twenty-One|Twenty-Two|Twenty-Three|Twenty-Four|Twenty-Five|Twenty-Six|Twenty-Seven|Twenty-Eight|Twenty-Nine|Thirty|Thirty-One|Thirty-Two|Thirty-Three|Thirty-Four|Thirty-Five|Thirty-Six|Thirty-Seven|Thirty-Eight|Thirty-Nine|Forty)|\Z)"
    match = re.search(pattern, content, re.IGNORECASE)
    if match:
        ch_text = match.group(1).strip()
        lines = [l.strip() for l in ch_text.split('\n') if l.strip()]
        title_line = lines[0] if lines else f"Chapter {ch_name}"
        
        # Look for key sections: Cameras, Access Control, Intrusion Alarm, Recording, Security Guards, HVM, Glass, etc.
        sections = []
        for line in lines:
            if any(k in line.lower() for k in ['first:', 'second:', 'third:', 'fourth:', 'fifth:', 'sixth:', 'seventh:', 'eighth:', 'cameras', 'recording', 'access control', 'alarm', 'guards', 'specifications']):
                sections.append(line)

        results.append({
            "num": ch_num,
            "name": ch_name,
            "title": title_line,
            "text": ch_text,
            "sections": sections[:10]
        })
    else:
        print(f"Could not find Chapter {ch_name}")

print(f"Parsed {len(results)} chapters.")

# Let's save a structured JSON for each chapter
with open('scratch/chapters_summary.json', 'w', encoding='utf-8') as f:
    json.dump([{
        "chapter_num": r["num"],
        "title": r["title"],
        "char_count": len(r["text"]),
        "sections": r["sections"]
    } for r in results], f, indent=2, ensure_ascii=False)

for r in results:
    print(f"[{r['num']:02d}] {r['title']}")
