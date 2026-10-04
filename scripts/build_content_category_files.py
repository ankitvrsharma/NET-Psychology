#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content"
OUT.mkdir(exist_ok=True)

def load(name, default):
    p = ROOT / name
    if not p.exists():
        return default
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

def key(u, t, m):
    return f"{u}-{t}-{m}"

def section(text, start, end=None):
    text = str(text or "")
    if start not in text:
        return ""
    value = text.split(start, 1)[1]
    if end and end in value:
        value = value.split(end, 1)[0]
    return value.strip()

def bullets(text):
    out = []
    for line in str(text or "").splitlines():
        s = line.strip()
        if s.startswith(("-", "•", "*")):
            s = s.lstrip("-•* ").strip()
            if s:
                out.append(s)
    return out

def recall_content(m):
    notes = str(m.get("content_notes") or "")
    core = str(m.get("expert_explanation") or section(notes, "CORE CONCEPT", "\n\nKEY POINTS") or m.get("title") or "").strip()
    points = bullets(section(notes, "KEY POINTS", "\n\nDISTINCTION / CAUTION"))
    distinction = str(m.get("distinction") or section(notes, "DISTINCTION / CAUTION", "\n\nPYQ-STYLE PATTERN") or section(notes, "COMMON TRAP", "\n\n5-MINUTE TEACHING FOCUS") or "").strip()
    pattern = str(section(notes, "PYQ-STYLE PATTERN", "\n\nCOMMON TRAP") or section(notes, "PYQ-STYLE PATTERN", "\n\n5-MINUTE TEACHING FOCUS") or "").strip()
    application = str(m.get("application_question") or "").strip()
    deep = str(m.get("detailed_explanation") or m.get("deep_learning") or m.get("deep") or "").strip()
    return core, points, distinction, pattern, application, deep

def recall_prompts(m, mapped):
    core, points, distinction, pattern, application, deep = recall_content(m)
    title = str(m.get("title") or "this concept").strip()
    p = []
    if core:
        p.append({"type":"FREE RECALL","prompt":f"Without looking at your notes, what is {title}? State its meaning and central idea in your own words.","answer":core})
    for x in points[:2]:
        p.append({"type":"KEY IDEA","prompt":f"What key idea about {title} can you recall that explains or qualifies the concept? Give the point in your own words.","answer":x})
    if distinction:
        p.append({"type":"DISTINCTION","prompt":f"What distinction or caution must you keep clear for {title}? State the difference and why it matters.","answer":distinction})
    if application:
        p.append({"type":"APPLICATION","prompt":f"How would you use {title} to explain the situation or problem described in your study material? State the psychological reasoning, not just the label.","answer":application})
    if pattern and len(p) < 5:
        p.append({"type":"EXAM REASONING","prompt":f"A related NET question may test this concept through its mechanism, finding, or distinction. Without looking, what part of {title} would you retrieve to answer it correctly, and why?","answer":pattern})
    elif deep and len(p) < 3:
        p.append({"type":"EXPLAIN","prompt":f"What is the most important mechanism or relationship within {title} that you should be able to explain without notes?","answer":deep[:1200]})
    seen = set()
    clean = []
    for x in p:
        a = " ".join(str(x.get("answer") or "").split()).strip()
        q = " ".join(str(x.get("prompt") or "").split()).strip()
        k = q + "|" + a
        if a and len(a) >= 12 and k not in seen:
            seen.add(k)
            clean.append({"type":x["type"],"prompt":q,"answer":a})
    return clean[:5]

def quick_parts(m):
    d = str(m.get("deep_learning") or "")
    n = str(m.get("content_notes") or "")
    core = section(d, "ACADEMIC CORE", "\n\nKEY POINTS") or section(n, "CORE CONCEPT", "\n\nKEY POINTS") or str(m.get("title") or "")
    points = bullets(section(d, "KEY POINTS", "\n\nDISTINCTION / CAUTION") or section(n, "KEY POINTS", "\n\nPYQ-STYLE PATTERN"))
    dist = section(d, "DISTINCTION / CAUTION", "\n\nSOURCE BASIS") or section(n, "COMMON EXAM TRAP", "\n\nMEMORY CUE") or section(n, "COMMON TRAP", "\n\n5-MINUTE TEACHING FOCUS")
    exam = str(m.get("exam_takeaway") or "")
    hook = section(n, "MEMORY CUE")
    return " ".join(core.split()), [" ".join(x.split()) for x in points], " ".join(dist.split()), " ".join(exam.split()), " ".join(hook.split())

data = load("data.json", {"units":[]})
questions = load("practice_questions.json", [])
explanations = load("practice_explanations.json", {})

# Category 1: complete practice question bank, preserving IDs, mappings, options and answers.
pq = []
for q in questions:
    x = dict(q)
    if x.get("id") in explanations:
        x["explanation"] = explanations[x["id"]]
    pq.append(x)

# Category 2: one canonical learner record per micro-topic.
micro = {}
# Categories 3-5 are overlays keyed to the same syllabus micro-topic IDs.
quick = {}
deep = {}
recall = {}

for u in data.get("units", []):
    for t in u.get("topics", []):
        for m in t.get("microtopics", []):
            k = key(u["id"], t["id"], m["id"])
            micro[k] = dict(m)

            core, points, dist, exam, hook = quick_parts(m)
            angles = {
                "CORE IDEA": core,
                "KEY FEATURES": " ".join([core] + points[:3]).strip(),
                "PYQ FOCUS": ("In questions, watch this distinction: " + dist) if dist else (exam or core),
                "EXAM TRAP": dist or core,
                "SOURCE DETAIL": " ".join([core] + points[:2]).strip(),
                "RECALL CUE": " — ".join([x for x in [hook, core] if x]),
                "CONNECTION": " ".join([x for x in [core, dist] if x]),
            }
            for angle, explanation in angles.items():
                quick[f"{k}|{angle}"] = {
                    "id": f"{k}|{angle}",
                    "unit": u["id"], "topic": t["id"], "micro": m["id"],
                    "angle": angle, "title": m.get("title",""),
                    "explanation": explanation[:900],
                    "quick_card": m.get("quick_card") if isinstance(m.get("quick_card"), dict) else None
                }

            deep[k] = {
                "id": k, "title": m.get("title",""),
                "content_notes": m.get("content_notes",""),
                "deep_learning": m.get("deep_learning",""),
                "detailed_explanation": m.get("detailed_explanation",""),
                "distinction": m.get("distinction",""),
                "exam_takeaway": m.get("exam_takeaway","")
            }

            mapped = [q for q in pq if str(q.get("unit"))==str(u["id"]) and str(q.get("topic"))==str(t["id"]) and str(q.get("micro"))==str(m["id"])]
            recall[k] = {"id":k, "title":m.get("title",""), "prompts":recall_prompts(m, bool(mapped))}

files = {
    "practice_questions.json": pq,
    "microtopic_explanations.json": micro,
    "quick_learn_cards.json": quick,
    "deep_dive_explanations.json": deep,
    "active_recall.json": recall,
}
for name, value in files.items():
    with (OUT / name).open("w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write("\n")

print("Generated:", ", ".join(f"content/{x}" for x in files))
