"""Runs every snippet of the coding test series in real Python and checks the
answer key against the actual output. Usage (from backend/):
    node -e "process.stdout.write(JSON.stringify(require('./config/series/coding').allCodingQuestions()))" > coding.json
    python scripts/verifyCodingSeries.py coding.json
"""
import io
import json
import sys
from contextlib import redirect_stdout

questions = json.load(open(sys.argv[1], encoding="utf-8"))
ran = failed = 0
for q in questions:
    if not q["code"] or q["prompt"] != "What does this Python code print?":
        continue  # complexity questions have no output to run
    buf = io.StringIO()
    with redirect_stdout(buf):
        exec(q["code"], {"__name__": "__main__"})
    actual = buf.getvalue().strip()
    expected = q["options"][q["correctIndex"]]
    ran += 1
    if actual != expected:
        failed += 1
        print(f"MISMATCH [{q['where']}] expected {expected!r} got {actual!r}\n{q['code']}\n")
print(f"ran {ran} snippets, {failed} mismatches")
sys.exit(1 if failed else 0)
