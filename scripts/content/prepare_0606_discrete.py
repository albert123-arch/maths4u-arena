"""Build the Arena 0606 trigonometry, counting, series and vectors packages."""

from dataclasses import dataclass
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "content/original/0606"
COURSE = {
    "slug": "maths4u-0606",
    "title": "Cambridge IGCSE Additional Mathematics (0606)",
    "code": "0606",
    "direction": "additional",
}
LESSON_PREFIX = {
    "permutations-combinations": "count",
    "trigonometry": "trig",
    "series": "series",
    "vectors": "vectors",
}


def tex(value):
    if isinstance(value, Fraction):
        if value.denominator == 1:
            return str(value.numerator)
        sign = "-" if value < 0 else ""
        return rf"{sign}\frac{{{abs(value.numerator)}}}{{{value.denominator}}}"
    return str(value)


def inline(value):
    return rf"\({tex(value)}\)"


def paragraph(value):
    return f"<p>{value}</p>"


def paragraphs(*values):
    return "".join(paragraph(v) for v in values)


def table(headers, rows):
    headings = "".join(f'<th scope="col">{h}</th>' for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{x}</td>" for x in row) + "</tr>" for row in rows)
    return f"<table><thead><tr>{headings}</tr></thead><tbody>{body}</tbody></table>"


@dataclass
class Problem:
    title: str
    prompt: str
    answer: str
    steps: tuple
    hint: str
    method: str
    mark: int = 3
    field: dict | None = None
    retry: list | None = None
    criterion: str | None = None

    @property
    def solution(self):
        return paragraphs(*self.steps, f"Answer: {self.answer}.")


def graded(title, question, value, steps, hint, method, *, kind="number", shown=None,
           label=None, wrong=None, mark=3, options=None, variables=None, criterion=None):
    if shown is None:
        shown = inline(value)
    field = {
        "key": "answer",
        "label": label or {
            "choice": "Choose one answer", "pairs": "Ordered components (x, y)",
            "set": "All solutions", "equation": "Equation", "expression": "Exact expression",
        }.get(kind, "Exact value"),
        "type": kind,
        "expected": str(value),
    }
    if options:
        field["options"] = options
    if variables:
        field["variables"] = variables
    retry = [{"answer": str(wrong[0]), "feedback": paragraph(wrong[1])}] if wrong else []
    return Problem(title, paragraph(question), shown, tuple(steps), hint, method, mark, field, retry, criterion)


def written(title, question, answer, steps, hint, method, mark=3, criterion=None):
    return Problem(title, paragraph(question), answer, tuple(steps), hint, method, mark, criterion=criterion)


@dataclass
class Section:
    id: str
    title: str
    idea: str
    explain: str
    mistake: str
    models: tuple
    figure: dict | None = None
    level: str = "core"


@dataclass
class Lesson:
    key: str
    title: str
    objective: str
    sections: tuple
    gloss: tuple
    families: int
    exams: tuple
    tip: str


def render_example(problem):
    return {
        "title": problem.title,
        "question": problem.prompt,
        "solution": [paragraph(x) for x in (*problem.steps, f"Answer: {problem.answer}.")],
    }


def render_check(problem, check_id):
    assert problem.field is not None, check_id
    return {
        "id": check_id, "kind": "check", "title": problem.title,
        "prompt": problem.prompt, "field": problem.field,
        "hint": paragraph(problem.hint), "solution": problem.solution,
        **({"retry": problem.retry} if problem.retry else {}),
    }


def short_item(chapter, lesson, family, part, variant):
    assert part.field is not None, family
    return {
        "id": f"{family}-{variant}", "family_uid": family, "lesson": lesson.key,
        "title": part.title, "collection": "variant" if variant else "short",
        "difficulty": 2, "marks": 1,
        "prompt_html": part.prompt, "answer_html": paragraph(part.answer),
        "solution_html": part.solution, "hint_html": paragraph(part.hint),
        "fields": [part.field],
        "parts": [{"label": "a", "marking_criteria": [
            {"code": "B1", "marks": 1, "description_html": paragraph(part.answer)},
        ]}],
        "verification": f"0606-{chapter}-{lesson.key}-recomputed",
    }


def exam_item(chapter, lesson, family, variant, title, parts):
    assembled = []
    for index, part in enumerate(parts):
        label = chr(ord("a") + index)
        criteria = []
        if part.mark > 1:
            method_marks = part.mark - 1
            criteria.append({
                "code": "M1", "marks": 1, "description_html": paragraph(part.method),
            })
            for i in range(method_marks - 1):
                description = part.criterion if i == method_marks - 2 and part.criterion else part.steps[min(i, len(part.steps)-1)]
                criteria.append({
                    "code": "M1", "marks": 1, "description_html": paragraph(description),
                })
        criteria.append({
            "code": "A1" if part.mark > 1 else "B1", "marks": 1,
            "description_html": paragraph(part.answer),
        })
        assembled.append({"label": label, "marking_criteria": criteria})

    return {
        "id": f"{family}-{variant}", "family_uid": family, "lesson": lesson.key,
        "title": title, "collection": "exam", "variant_index": variant,
        "difficulty": 3 if sum(p.mark for p in parts) < 7 else 4,
        "marks": sum(p.mark for p in parts),
        "prompt_html": '<ol class="parts" type="a">' + "".join(
            f'<li>{p.prompt}<span class="marks">[{p.mark}]</span></li>' for p in parts
        ) + "</ol>",
        "answer_html": "".join(paragraph(f"({chr(97+i)}) {p.answer}") for i, p in enumerate(parts)),
        "solution_html": "".join(f"<h4>({chr(97+i)})</h4>{p.solution}" for i, p in enumerate(parts)),
        "hint_html": "".join(paragraph(f"({chr(97+i)}) {p.hint}") for i, p in enumerate(parts)),
        "parts": assembled, "fields": [],
        "verification": f"0606-{chapter}-{lesson.key}-recomputed",
    }


def figure(chapter, filename, caption, alt, graphic, width=420, height=280):
    assets = ROOT / f"public/assets/study/0606/{chapter}"
    assets.mkdir(parents=True, exist_ok=True)
    body = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" role="img" aria-labelledby="figure-title">'
        f'<title id="figure-title">{escape(alt)}</title>'
        f'<rect width="{width}" height="{height}" rx="12" fill="#f4f8fd"/>'
        f'{graphic}</svg>\n'
    )
    (assets / f"{filename}.svg").write_text(body, encoding="utf-8")
    return {
        "src": f"/assets/study/0606/{chapter}/{filename}.svg",
        "alt": alt, "caption": paragraph(caption), "width": width, "height": height,
    }


def build(chapter, title, position, source_file, lessons):
    source_digest = sha256(Path(source_file).read_bytes()).hexdigest()
    package = {
        "schema_version": 1, "key": f"0606-{chapter}", "version": "1.0.0",
        "marking_status": "DRAFT", "course": COURSE,
        "chapter": {
            "id": "addmaths_0606_" + chapter.replace("-", "_"), "slug": chapter,
            "title": title, "position": position,
        },
        "source": {"sha256": source_digest, "supplied": 0, "held": []},
        "lessons": [], "questions": [],
    }
    study = {}
    prefix = f"addmaths-0606-{LESSON_PREFIX[chapter]}"
    for lindex, lesson in enumerate(lessons):
        root_id = f"{prefix}-{lesson.key}"
        e = []
        study_sections = []
        extra = []
        all_models = tuple(model for s in lesson.sections for model in s.models)
        adjacent = [l for l in lessons[max(0, lindex-1):lindex+2] if l.key != lesson.key]
        for sindex, section in enumerate(lesson.sections):
            first, second = section.models
            seed = 2 + 13 * lindex + 5 * sindex
            blocks = [
                {"kind": "key", "html": paragraph(section.idea),
                 **({"figure": section.figure} if section.figure else {})},
                {"kind": "text", "title": "Practise the method", "html": paragraph(section.explain)},
                {"kind": "example", "index": len(e)},
                render_check(first(seed + 19), f"{root_id}-{section.id}-a"),
                {"kind": "mistake", "html": paragraph(section.mistake)},
                {"kind": "example", "index": len(e) + 1, "tryFirst": True},
                render_check(second(seed + 23), f"{root_id}-{section.id}-b"),
                {"kind": "tip", "html": paragraph(lesson.tip)},
            ]
            e.extend([render_example(first(seed)), render_example(second(seed + 5))])
            study_sections.append({
                "id": section.id, "title": section.title, "label": section.id.replace("-", " ").capitalize(),
                "minutes": 8, "level": section.level, "blocks": blocks,
            })
            extra += [
                render_check(first(seed + 41), f"{root_id}-{section.id}-review-a"),
                render_check(second(seed + 59), f"{root_id}-{section.id}-review-b"),
            ]

        revision_body = "".join(f"<h2>{s.title}</h2>{paragraph(s.idea)}" for s in lesson.sections)
        revision_checks = "".join(
            f"<li>{s.models[0](8+i).prompt}<p><strong>Answer.</strong> {s.models[0](8+i).answer}.</p></li>"
            for i, s in enumerate(lesson.sections)
        )
        study[root_id] = {
            "updatedOn": "2026-11-22", "description": lesson.objective,
            "sections": study_sections, "examples": e, "extraPractice": extra,
            "glossary": [{"term": term, "definition": paragraph(definition)} for term, definition in lesson.gloss],
            "related": [{"title": l.title, "href": f"/courses/maths4u-0606/topics/{prefix}-{l.key}"} for l in adjacent],
            "revision": {"body": revision_body, "checks": f"<ol>{revision_checks}</ol>", "examTip": paragraph(lesson.tip)},
        }
        package["lessons"].append({
            "key": lesson.key, "id": root_id, "title": lesson.title, "summary": lesson.objective,
            "objective": lesson.objective, "before": paragraph(f"Use this lesson to {lesson.objective[0].lower() + lesson.objective[1:]}"),
            "ideas": paragraphs(*(s.idea for s in lesson.sections)),
            "method": paragraphs(*(s.explain for s in lesson.sections)),
            "mistakes": [s.mistake for s in lesson.sections],
            "examples": [
                {"title": item["title"], "question": item["question"],
                 "solution": "".join(item["solution"]), "verification": f"{root_id}-example-{i+1}"}
                for i, item in enumerate(e[::2][:4])
            ],
        })

        for i in range(5):
            model = all_models[i % len(all_models)]
            family = f"M4U-0606-{chapter}-{lesson.key}-P{i+1}"
            for variant in range(2):
                part = model(101 + 13 * lindex + i * 19 + variant * 7)
                package["questions"].append(short_item(chapter, lesson, family, part, variant))

        for i in range(lesson.families):
            family = f"M4U-0606-{chapter}-{lesson.key}-W{i+1}"
            for variant in range(4):
                model = lesson.exams[i % len(lesson.exams)]
                heading, parts = model(4 * (i // len(lesson.exams)) + variant, i, variant)
                package["questions"].append(exam_item(chapter, lesson, family, variant, heading, parts))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, data in (("v1", package), ("study", study)):
        path = OUTPUT / f"{chapter}-{name}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{chapter}: {len(lessons)} lessons, {sum(l.families for l in lessons)} written starters, "
          f"{len(package['questions'])} total questions.")
