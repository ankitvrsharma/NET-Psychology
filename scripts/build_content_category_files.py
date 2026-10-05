#!/usr/bin/env python3
"""Build the browser-facing canonical content layer from the single source of truth."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content"
SOURCE = ROOT / "content-source.json"
OUT.mkdir(exist_ok=True)

def load_required(path: Path):
    if not path.exists():
        raise SystemExit(f"Required canonical source is missing: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc

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
    core = str(
        m.get("expert_explanation")
        or section(notes, "CORE CONCEPT", "\n\nKEY POINTS")
        or m.get("title")
        or ""
    ).strip()
    points = bullets(section(notes, "KEY POINTS", "\n\nDISTINCTION / CAUTION"))
    distinction = str(
        m.get("distinction")
        or section(notes, "DISTINCTION / CAUTION", "\n\nPYQ-STYLE PATTERN")
        or section(notes, "COMMON TRAP", "\n\n5-MINUTE TEACHING FOCUS")
        or ""
    ).strip()
    pattern = str(
        section(notes, "PYQ-STYLE PATTERN", "\n\nCOMMON TRAP")
        or section(notes, "PYQ-STYLE PATTERN", "\n\n5-MINUTE TEACHING FOCUS")
        or ""
    ).strip()
    application = str(m.get("application_question") or "").strip()
    deep = str(m.get("detailed_explanation") or m.get("deep_learning") or m.get("deep") or "").strip()
    return core, points, distinction, pattern, application, deep

def recall_prompts(m):
    core, points, distinction, pattern, application, deep = recall_content(m)
    title = str(m.get("title") or "this concept").strip()
    prompts = []
    if core:
        prompts.append({
            "type": "FREE RECALL",
            "prompt": f"Without looking at your notes, what is {title}? State its meaning and central idea in your own words.",
            "answer": core,
        })
    for point in points[:2]:
        prompts.append({
            "type": "KEY IDEA",
            "prompt": f"What key idea about {title} can you recall that explains or qualifies the concept? Give the point in your own words.",
            "answer": point,
        })
    if distinction:
        prompts.append({
            "type": "DISTINCTION",
            "prompt": f"What distinction or caution must you keep clear for {title}? State the difference and why it matters.",
            "answer": distinction,
        })
    if application:
        prompts.append({
            "type": "APPLICATION",
            "prompt": f"How would you use {title} to explain the situation or problem described in your study material? State the psychological reasoning, not just the label.",
            "answer": application,
        })
    if pattern and len(prompts) < 5:
        prompts.append({
            "type": "EXAM REASONING",
            "prompt": f"A related NET question may test this concept through its mechanism, finding, or distinction. Without looking, what part of {title} would you retrieve to answer it correctly, and why?",
            "answer": pattern,
        })
    elif deep and len(prompts) < 3:
        prompts.append({
            "type": "EXPLAIN",
            "prompt": f"What is the most important mechanism or relationship within {title} that you should be able to explain without notes?",
            "answer": deep[:1200],
        })

    seen, clean = set(), []
    for item in prompts:
        answer = " ".join(str(item.get("answer") or "").split()).strip()
        prompt = " ".join(str(item.get("prompt") or "").split()).strip()
        marker = prompt + "|" + answer
        if answer and len(answer) >= 12 and marker not in seen:
            seen.add(marker)
            clean.append({"type": item["type"], "prompt": prompt, "answer": answer})
    return clean[:5]

def quick_parts(m):
    deep = str(m.get("deep_learning") or "")
    notes = str(m.get("content_notes") or "")
    core = (
        section(deep, "ACADEMIC CORE", "\n\nKEY POINTS")
        or section(notes, "CORE CONCEPT", "\n\nKEY POINTS")
        or str(m.get("title") or "")
    )
    points = bullets(
        section(deep, "KEY POINTS", "\n\nDISTINCTION / CAUTION")
        or section(notes, "KEY POINTS", "\n\nPYQ-STYLE PATTERN")
    )
    distinction = (
        section(deep, "DISTINCTION / CAUTION", "\n\nSOURCE BASIS")
        or section(notes, "COMMON EXAM TRAP", "\n\nMEMORY CUE")
        or section(notes, "COMMON TRAP", "\n\n5-MINUTE TEACHING FOCUS")
    )
    return (
        " ".join(core.split()),
        [" ".join(point.split()) for point in points],
        " ".join(distinction.split()),
        " ".join(str(m.get("exam_takeaway") or "").split()),
        " ".join(section(notes, "MEMORY CUE").split()),
    )

def build():
    data = load_required(SOURCE)
    if not isinstance(data, dict) or not isinstance(data.get("units"), list) or not data["units"]:
        raise SystemExit("content-source.json must contain a non-empty units list")

    questions = load_required(ROOT / "practice_questions.json")
    explanations = load_required(ROOT / "practice_explanations.json")
    if not isinstance(questions, list):
        raise SystemExit("practice_questions.json must contain a list")

    practice = []
    for question in questions:
        item = dict(question)
        if item.get("id") in explanations:
            item["explanation"] = explanations[item["id"]]
        practice.append(item)

    micro, quick, deep, recall = {}, {}, {}, {}
    micro_count = 0

    for unit in data["units"]:
        for topic in unit.get("topics", []):
            for item in topic.get("microtopics", []):
                micro_count += 1
                k = key(unit["id"], topic["id"], item["id"])
                micro[k] = dict(item)

                core, points, distinction, exam, hook = quick_parts(item)
                angles = {
                    "CORE IDEA": core,
                    "KEY FEATURES": " ".join([core] + points[:3]).strip(),
                    "PYQ FOCUS": (
                        "In questions, watch this distinction: " + distinction
                        if distinction else (exam or core)
                    ),
                    "EXAM TRAP": distinction or core,
                    "SOURCE DETAIL": " ".join([core] + points[:2]).strip(),
                    "RECALL CUE": " — ".join(x for x in [hook, core] if x),
                    "CONNECTION": " ".join(x for x in [core, distinction] if x),
                }
                for angle, explanation in angles.items():
                    quick[f"{k}|{angle}"] = {
                        "id": f"{k}|{angle}",
                        "unit": unit["id"],
                        "topic": topic["id"],
                        "micro": item["id"],
                        "angle": angle,
                        "title": item.get("title", ""),
                        "explanation": explanation[:900],
                        "quick_card": item.get("quick_card") if isinstance(item.get("quick_card"), dict) else None,
                    }

                deep[k] = {
                    "id": k,
                    "title": item.get("title", ""),
                    "content_notes": item.get("content_notes", ""),
                    "deep_learning": item.get("deep_learning", ""),
                    "detailed_explanation": item.get("detailed_explanation", ""),
                    "distinction": item.get("distinction", ""),
                    "exam_takeaway": item.get("exam_takeaway", ""),
                }
                recall[k] = {
                    "id": k,
                    "title": item.get("title", ""),
                    "prompts": recall_prompts(item),
                }

    expected = {
        "microtopic_explanations.json": micro,
        "quick_learn_cards.json": quick,
        "deep_dive_explanations.json": deep,
        "active_recall.json": recall,
        "practice_questions.json": practice,
    }
    for name, value in expected.items():
        (OUT / name).write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(
        f"Built canonical content: {micro_count} micro-topics, "
        f"{len(quick)} quick cards, {len(deep)} deep dives, "
        f"{len(recall)} recall sets, {len(practice)} practice questions."
    )

if __name__ == "__main__":
    build()
