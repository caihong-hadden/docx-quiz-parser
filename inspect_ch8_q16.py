import docx
import os

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
doc = docx.Document(os.path.join(converted_dir, "第8章科学发展观习题和答案.docx"))

with open("ch8_q16_out.txt", "w", encoding="utf-8") as f:
    for idx in range(35, 60):
        f.write(f"Index {idx}: {repr(doc.paragraphs[idx].text)}\n")
print("Written successfully!")
