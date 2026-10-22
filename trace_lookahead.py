import docx
import os
import re

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
doc = docx.Document(os.path.join(converted_dir, "第5章中国特色社会主义理论体系的形成发展.docx"))

def clean_text(text):
    text = text.strip()
    text = text.replace('\xa0', ' ')
    text = text.replace('\u3000', ' ')
    return text

paragraphs = doc.paragraphs
p_idx = 93
text = clean_text(paragraphs[p_idx].text)
print(f"Start question paragraph {p_idx}: {repr(text)}")

inline_ans_parts = []
lookahead_idx = p_idx + 1
while lookahead_idx < len(paragraphs):
    next_text = clean_text(paragraphs[lookahead_idx].text)
    if not next_text:
        lookahead_idx += 1
        continue
    
    stop_matched = None
    if re.match(r'^(\d+)[\.．\s]', next_text):
        stop_matched = "starts with number"
    elif any(h in next_text for h in ["单选题", "多选题", "简答题", "论述题", "一、", "二、", "三、", "四、"]):
        stop_matched = "matched heading"
        
    print(f"  Lookahead {lookahead_idx}: {repr(next_text)} | stop_matched: {stop_matched}")
    
    if stop_matched:
        break
        
    inline_ans_parts.append(next_text)
    lookahead_idx += 1

print("inline_ans_parts:", inline_ans_parts)
