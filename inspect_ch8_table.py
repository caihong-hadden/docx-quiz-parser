import docx
import os

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
doc = docx.Document(os.path.join(converted_dir, "第8章科学发展观习题和答案.docx"))

table = doc.tables[0]
print("Table 0 columns count:", len(table.rows[0].cells))
for idx, cell in enumerate(table.rows[0].cells):
    q_num = cell.text.strip()
    ans_num = table.rows[1].cells[idx].text.strip()
    print(f"Col {idx}: Q={q_num}, A={ans_num}")
