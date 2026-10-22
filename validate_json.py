import json
import os

json_path = r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\questions.json"

if not os.path.exists(json_path):
    print("Error: questions.json not found!")
    exit(1)

with open(json_path, "r", encoding="utf-8") as f:
    db = json.load(f)

errors = []
total_questions = 0

for ch_id, ch_data in db.items():
    ch_name = ch_data.get("name", "")
    questions = ch_data.get("questions", [])
    
    if not ch_name:
        errors.append(f"Chapter '{ch_id}' is missing a name.")
    
    for idx, q in enumerate(questions):
        total_questions += 1
        q_id = q.get("id", f"unknown_{idx}")
        q_type = q.get("type", "")
        stem = q.get("stem", "")
        options = q.get("options", [])
        answer = q.get("answer", "")
        
        if not q_id:
            errors.append(f"Chapter '{ch_id}', question at index {idx} is missing an ID.")
        if q_type not in ["single", "multiple", "short", "essay"]:
            errors.append(f"Question '{q_id}' has invalid type: '{q_type}'.")
        if not stem:
            errors.append(f"Question '{q_id}' is missing a stem.")
            
        if q_type in ["single", "multiple"]:
            if not options:
                errors.append(f"Choice question '{q_id}' has no options.")
            elif len(options) < 2:
                errors.append(f"Choice question '{q_id}' has fewer than 2 options: {options}")
            if not answer:
                errors.append(f"Choice question '{q_id}' has no answer.")
            else:
                # Answer should contain only A, B, C, D
                invalid_chars = [c for c in answer if c not in ["A", "B", "C", "D"]]
                if invalid_chars:
                    errors.append(f"Choice question '{q_id}' has invalid characters in answer: '{answer}' (invalid: {invalid_chars})")
        elif q_type in ["short", "essay"]:
            if options:
                errors.append(f"Subjective question '{q_id}' should not have options but has: {options}")
            if not answer:
                errors.append(f"Subjective question '{q_id}' has an empty answer.")

print(f"Validation completed. Total questions checked: {total_questions}")
if errors:
    print(f"Found {len(errors)} errors:")
    for err in errors[:20]:  # print first 20 errors
        print(f" - {err}")
    if len(errors) > 20:
        print(f" ... and {len(errors) - 20} more errors.")
else:
    print("Success: All questions validated successfully! No errors found.")
