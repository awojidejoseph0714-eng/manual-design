import json
import os

path = r"C:\Users\user\.gemini\antigravity\brain\a0c69107-cba9-4fe6-aad7-9f47fdd70b72\.system_generated\logs\transcript_full.jsonl"
out_path = r"c:\Users\user\Documents\Codes\Manual Design\user_code.html"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Let's search for the line that has USER_INPUT and the adjustments text to be dynamic and safe.
found_line = None
for idx, line in enumerate(lines):
    try:
        data = json.loads(line)
        if data.get("source") == "USER_EXPLICIT" and data.get("type") == "USER_INPUT":
            content = data.get("content", "")
            if "i wrote a new code with adjustments" in content:
                found_line = content
                print(f"Found match at index {idx}")
                break
    except Exception as e:
        continue

if found_line:
    # Find where the HTML actually starts
    idx = found_line.find("<!DOCTYPE html>")
    if idx == -1:
        idx = found_line.find("<!doctype html>")
    if idx != -1:
        content = found_line[idx:]
    else:
        content = found_line
    
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Extraction completed successfully!")
else:
    print("Could not find the user message with adjustments in the logs.")
