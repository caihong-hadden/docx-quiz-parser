import os
import win32com.client as win32
import docx

doc_path = r"E:\Desktop\2026毛概论题库\2026毛概论题库\导论和第1章毛泽东思想及其历史地位习题及答案.doc"
output_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
os.makedirs(output_dir, exist_ok=True)
docx_path = os.path.join(output_dir, "chapter1.docx")

# Convert doc to docx
word = win32.gencache.EnsureDispatch('Word.Application')
word.Visible = False
try:
    doc = word.Documents.Open(doc_path)
    doc.SaveAs2(docx_path, FileFormat=16) # 16 is wdFormatXMLDocument (.docx)
    doc.Close()
    print("Conversion successful!")
except Exception as e:
    print("Error during conversion:", e)
finally:
    word.Quit()

# Read paragraphs
if os.path.exists(docx_path):
    doc_docx = docx.Document(docx_path)
    with open("chapter1_content.txt", "w", encoding="utf-8") as f:
        f.write(f"Paragraph count: {len(doc_docx.paragraphs)}\n")
        for i, p in enumerate(doc_docx.paragraphs):
            f.write(f"{i}: {p.text}\n")
    print("Written to chapter1_content.txt")
