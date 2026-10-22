import os
import win32com.client as win32

src_dir = r"E:\Desktop\2026毛概论题库\2026毛概论题库"
output_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
os.makedirs(output_dir, exist_ok=True)

word = win32.gencache.EnsureDispatch('Word.Application')
word.Visible = False

try:
    for filename in os.listdir(src_dir):
        full_path = os.path.join(src_dir, filename)
        if filename.endswith(".doc") or filename.endswith(".docx"):
            dest_name = filename.replace(".doc", ".docx") if filename.endswith(".doc") else filename
            dest_path = os.path.join(output_dir, dest_name)
            
            # If it's already docx, copy it or convert it if we want to standardize, let's just convert/save it
            if filename.endswith(".doc"):
                print(f"Converting {filename}...")
                doc = word.Documents.Open(full_path)
                doc.SaveAs2(dest_path, FileFormat=16)
                doc.Close()
            else:
                # docx - copy or open/save
                print(f"Copying/Saving {filename}...")
                doc = word.Documents.Open(full_path)
                doc.SaveAs2(dest_path, FileFormat=16)
                doc.Close()
    print("All files processed successfully!")
finally:
    word.Quit()
