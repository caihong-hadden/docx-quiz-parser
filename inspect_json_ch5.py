import json

with open(r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\questions.json", "r", encoding="utf-8") as f:
    db = json.load(f)

print("Chapter 5 Questions:")
for q in db["ch5"]["questions"]:
    print(f"ID: {q['id']}, Type: {q['type']}")
    print(f"Stem: {repr(q['stem'])}")
    print(f"Answer: {repr(q['answer'])}")
    print("-" * 40)
