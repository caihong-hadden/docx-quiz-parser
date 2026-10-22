import os
import docx

converted_dir = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\converted"
out_path = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\structure_summary.txt"

with open(out_path, "w", encoding="utf-8") as f:
    for filename in os.listdir(converted_dir):
        if not filename.endswith(".docx") or filename == "chapter1.docx":
            continue
        
        full_path = os.path.join(converted_dir, filename)
        doc = docx.Document(full_path)
        
        f.write(f"\n======================================\n")
        f.write(f"File: {filename}\n")
        f.write(f"Paragraphs: {len(doc.paragraphs)}, Tables: {len(doc.tables)}\n")
        
        # Check headers (first few paragraphs)
        headers = [doc.paragraphs[i].text.strip() for i in range(min(15, len(doc.paragraphs))) if doc.paragraphs[i].text.strip()]
        f.write(f"Headers: {headers}\n")
        
        # Check if tables exist and display their shape
        for idx, table in enumerate(doc.tables):
            f.write(f"  Table {idx}: Rows={len(table.rows)}, Cols={len(table.rows[0].cells) if table.rows else 0}\n")
            # Print first row of the table
            if table.rows:
                first_row = [cell.text.strip().replace("\n", " ") for cell in table.rows[0].cells]
                f.write(f"    Row 0: {first_row[:12]}\n")
                if len(table.rows) > 1:
                    second_row = [cell.text.strip().replace("\n", " ") for cell in table.rows[1].cells]
                    f.write(f"    Row 1: {second_row[:12]}\n")
                if len(table.rows) > 2:
                    third_row = [cell.text.strip().replace("\n", " ") for cell in table.rows[2].cells]
                    f.write(f"    Row 2: {third_row[:12]}\n")
                if len(table.rows) > 3:
                    fourth_row = [cell.text.strip().replace("\n", " ") for cell in table.rows[3].cells]
                    f.write(f"    Row 3: {fourth_row[:12]}\n")

        # Check for text patterns of "参考答案" or "答案"
        ans_p_indices = []
        for idx, p in enumerate(doc.paragraphs):
            text = p.text.strip()
            if "参考答案" in text or "答案" in text:
                # check if it is a heading or section
                if len(text) < 50:
                    ans_p_indices.append((idx, text))
        f.write(f"Possible Answer sections: {ans_p_indices}\n")
print("Written structure summary successfully!")
