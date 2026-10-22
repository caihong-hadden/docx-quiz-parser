import docx
import os

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
doc = docx.Document(os.path.join(converted_dir, "第8章科学发展观习题和答案.docx"))

# Search for single choice questions 15 and 16
for idx, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if "15." in text or "16." in text:
        print(f"Index {idx}: {text}")
