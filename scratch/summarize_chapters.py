import json
import re

with open('scratch/all_38_chapters_cleaned.json', 'r', encoding='utf-8') as f:
    chapters = json.load(f)

analysis_report = []

for ch in chapters:
    num = ch["chapter_number"]
    facility = ch["target_facility"]
    text = ch["raw_text"]
    
    # Extract sections like First (Cameras), Second (Recording), Third (Guards), etc.
    sections_found = re.findall(r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth):\s*(.*?)(?=(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth):|\Z)', text, re.DOTALL | re.IGNORECASE)
    
    sec_dict = {}
    for s_title, s_content in sections_found:
        s_title_clean = s_title.strip().capitalize()
        # Find subtitle if any on first line
        lines = [l.strip() for l in s_content.strip().split('\n') if l.strip()]
        header = lines[0] if lines else s_title_clean
        body = '\n'.join(lines[1:]) if len(lines) > 1 else lines[0] if lines else ''
        sec_dict[header] = body[:1000] # preview
    
    # Check retention days
    retention_match = re.search(r'(\d+)\s*days', text, re.IGNORECASE)
    retention = retention_match.group(1) + " days" if retention_match else "31 days (Standard SIRA)"
    
    # Check ANPR / LPR
    has_anpr = bool(re.search(r'license plate|number plate|ANPR|LPR', text, re.IGNORECASE))
    
    # Check Access Control
    has_access = bool(re.search(r'access control|electronic card|biometric', text, re.IGNORECASE))
    
    # Check Intrusion Alarm / Panic Button
    has_alarm = bool(re.search(r'alarm|panic button|motion detector|intrusion', text, re.IGNORECASE))
    
    # Check HVM / Vehicle Barriers
    has_hvm = bool(re.search(r'HVM|barrier|bollard|vehicle crash', text, re.IGNORECASE))
    
    # Check Security Guards
    has_guards = bool(re.search(r'guard|security officer|security personnel', text, re.IGNORECASE))
    
    analysis_report.append({
        "num": num,
        "facility": facility,
        "retention": retention,
        "features": {
            "ANPR": has_anpr,
            "AccessControl": has_access,
            "Alarm_Panic": has_alarm,
            "HVM_Barriers": has_hvm,
            "SecurityGuards": has_guards
        },
        "sections": list(sec_dict.keys()),
        "full_text_snippet": text[:1500]
    })

print(f"Summarized {len(analysis_report)} chapters.")
with open('scratch/analysis_report.json', 'w', encoding='utf-8') as f:
    json.dump(analysis_report, f, indent=2, ensure_ascii=False)
