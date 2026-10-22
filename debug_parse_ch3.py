import docx
import os
import re

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
filepath = os.path.join(converted_dir, "第3章社会主义改造理论习题及答案.docx")
doc = docx.Document(filepath)

def clean_text(text):
    text = text.strip()
    text = text.replace('\xa0', ' ')
    text = text.replace('\u3000', ' ')
    return text

current_q_type = None
answers_text_block = []
in_answers_block = False

print("Processing paragraphs:")
for idx, p in enumerate(doc.paragraphs):
    text = clean_text(p.text)
    if not text:
        continue
        
    matched = None
    if "单项选择题" in text or "单选题" in text:
        current_q_type = "single"
        in_answers_block = False
        matched = "single"
    elif "多项选择题" in text or "多选题" in text:
        current_q_type = "multiple"
        in_answers_block = False
        matched = "multiple"
    elif "简答题" in text:
        current_q_type = "short"
        in_answers_block = False
        matched = "short"
    elif "论述题" in text:
        current_q_type = "essay"
        in_answers_block = False
        matched = "essay"
    elif "参考答案" in text or "答案要点" in text or "答案（" in text:
        current_q_type = "answers_block"
        in_answers_block = True
        matched = "answers_block"
        
    if matched:
        print(f"Index {idx} matched {matched}: {text}")
        
    if in_answers_block and not matched:
        answers_text_block.append(text)

print(f"\nTotal answers paragraphs collected: {len(answers_text_block)}")
print("First 10 paragraphs in answers_text_block:")
for x in answers_text_block[:10]:
    print(f" - {x}")
