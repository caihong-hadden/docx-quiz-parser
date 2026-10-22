import json

with open(r"C:\Users\SunnyRainbow\.gemini\antigravity\scratch\maogai-quiz\questions.json", "r", encoding="utf-8") as f:
    db = json.load(f)

print("Intro Questions:")
for q in db["intro"]["questions"]:
    print(f"ID: {q['id']}")
    print(f"Stem: {q['stem']}")
    print(f"Options: {q['options']}")
    print(f"Answer: {q['answer']}")
    print("-" * 40)
