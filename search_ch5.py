import docx
import os

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
doc = docx.Document(os.path.join(converted_dir, "第5章中国特色社会主义理论体系的形成发展.docx"))

for idx, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if "成就" in text or "成果" in text:
        print(f"Index {idx}: {repr(text)}")
