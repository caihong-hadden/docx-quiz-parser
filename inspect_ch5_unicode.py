import docx
import os

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
doc = docx.Document(os.path.join(converted_dir, "第5章中国特色社会主义理论体系的形成发展.docx"))

with open("ch5_unicode_out.txt", "w", encoding="utf-8") as f:
    for idx in range(86, 93):
        p_text = doc.paragraphs[idx].text
        f.write(f"Index {idx}: {repr(p_text)}\n")
        f.write(f"  Hex points: {' '.join(hex(ord(c)) for c in p_text)}\n")
print("Written successfully!")
