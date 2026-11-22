"""Build the three authored Cambridge Lower Secondary Mathematics courses."""

from hashlib import sha256
from html import escape
from json import dumps, loads
from pathlib import Path
from re import fullmatch

from prepare_0606_geometry_and_logs_support import (
    ROOT, Lesson, Part, Problem, Section, check, choose, example, field,
    figure_html, label, m, p, part, path, problem, quick_part, short, table,
    tex, written,
)


def figure(chapter, key, alt, body, caption, *, h=228):
    assert chapter in {"stage-7", "stage-8", "stage-9"}
    assert fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", key)
    directory = ROOT / "public/assets/study/0862" / chapter
    directory.mkdir(parents=True, exist_ok=True)
    source = f"/assets/study/0862/{chapter}/{key}.svg"
    drawing = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 {h}" role="img" aria-labelledby="title">'
        f'<title id="title">{escape(alt)}</title><rect width="360" height="{h}" rx="10" fill="#f8fbff"/>'
        f'<g stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>\n'
    )
    (directory / f"{key}.svg").write_text(drawing, encoding="utf-8")
    return dict(src=source, alt=alt, width=360, height=h, caption=p(caption))


def short_signature(task):
    row, prompt = quick_part(task)
    options = sorted(row.checker.get("options", {}).values())
    return prompt, tuple(options)


class PracticeCases:
    """Give each check a new prompt and prefer a new answer in fresh reviews."""

    def __init__(self, lesson_id):
        self.lesson_id = lesson_id
        self.used = set()

    def pick(self, make, start, previous=None):
        fallback = None
        for seed in range(start, start + 480):
            task = make(seed)
            signature = short_signature(task)
            if signature in self.used:
                continue
            descriptor, _ = quick_part(task)
            field_ = descriptor.checker
            expected = field_["expected"]
            answer = field_["options"][expected] if field_["type"] == "choice" else expected
            if answer == previous:
                if fallback is None:
                    fallback = task, signature, answer
                continue
            self.used.add(signature)
            return task, answer
        if fallback:
            task, signature, answer = fallback
            self.used.add(signature)
            return task, answer
        raise ValueError(f"Insufficient distinct practice cases in {self.lesson_id} from {make.__name__}")


def lesson_study(lesson, lesson_id, previous):
    sections, examples, extra, revision = [], [], [], []
    cases = PracticeCases(lesson_id)
    for index, section in enumerate(lesson.sections):
        example_index = len(examples)
        seed = 3 + index * 13
        for offset in (0, 1):
            case, _ = cases.pick(section.make, seed + offset)
            examples.append(example(case))
        key = f"s{index + 1}"
        inline = []
        for offset in (0, 1):
            case, _ = cases.pick(section.make, seed + 20 + offset)
            inline.append(check(f"{key}-try-{offset + 1}", case))
            case, _ = cases.pick(section.make, seed + 40 + offset)
            extra.append(check(f"{key}-more-{offset + 1}", case))
        blocks = [
            dict(kind="key", html=p(section.idea), **({"figure": section.figure} if section.figure else {})),
            dict(kind="example", index=example_index),
            inline[0],
            dict(kind="mistake", html=p(section.mistake)),
            dict(kind="example", index=example_index + 1, tryFirst=True),
            inline[1],
            dict(kind="tip", html=p(section.tip)),
        ]
        sections.append(dict(
            id=section.slug, title=section.title, label=section.slug.replace("-", " ").capitalize(),
            minutes=8, level="extension" if section.extension else "core", intro=p(section.intro), blocks=blocks,
        ))
        revision.extend([f"<h2>{section.title}</h2>", p(section.idea)])
    drawing = next((section.figure for section in lesson.sections if section.figure), None)
    if drawing:
        revision.append(figure_html(drawing).replace('width="360"', 'width="222"'))
    revision_case, _ = cases.pick(lesson.sections[0].make, 91)
    row, prompt = quick_part(revision_case)
    if row.checker["type"] == "choice":
        prompt += p(" &nbsp; ".join(f"{letter}. {option}" for letter, option in row.checker["options"].items()))
    study = dict(
        updatedOn="2026-11-22", description=lesson.objective, sections=sections, examples=examples,
        extraPractice=extra, related=[previous] if previous else [],
        glossary=[dict(term=term, definition=p(definition)) for term, definition in lesson.terms],
        revision=dict(body="".join(revision), checks=prompt + p("<strong>Check.</strong> " + row.answer),
                      examTip=p(lesson.sections[-1].tip)),
    )
    return study, cases


def lesson_bank(lesson, lesson_id, cases):
    questions = []
    for index in range(12):
        family = f"{lesson_id}-P{index + 1:02}"
        make = lesson.sections[index % len(lesson.sections)].make
        start = 500 + index * 37
        main, answer = cases.pick(make, start)
        fresh, _ = cases.pick(make, start + 11, previous=answer)
        questions.extend([short(family + "-0", family, lesson.slug, main),
                          short(family + "-1", family, lesson.slug, fresh, fresh=True)])

    used = set()
    methods = lesson.methods or tuple(section.make for section in lesson.sections)
    for index in range(lesson.exam_families):
        family = f"{lesson_id}-E{index + 1:02}"
        make = methods[index % len(methods)]
        start = 10000 + index * 43
        for variant in range(4):
            uid = f"{family}-{variant}"
            for seed in range(start + variant, start + variant + 480):
                row = written(uid, family, lesson.slug, make(seed), variant)
                if row["prompt_html"] not in used:
                    used.add(row["prompt_html"])
                    questions.append(row)
                    break
            else:
                raise ValueError(f"Insufficient distinct written cases for {uid} from {make.__name__}")
    assert all(len(q["id"]) <= 80 for q in questions), lesson_id
    return questions


def build_stage(stage, chapters, filename, *, start_position=0, study_suffix="study", versions=None):
    """Generate a chapter manifest per unit and one teaching bundle per stage."""
    assert stage in {7, 8, 9}
    stage_slug = f"stage-{stage}"
    course_slug = f"maths4u-0862-{stage_slug}"
    directory = ROOT / "content/original/0862"
    directory.mkdir(parents=True, exist_ok=True)
    course = dict(slug=course_slug, title=f"Cambridge Lower Secondary Maths 0862 · Stage {stage}",
                  code="0862", direction="school")
    study = {}
    previous = None
    checksum = sha256(b"\n".join(Path(file).read_bytes() for file in (filename, __file__))).hexdigest()
    for position, (slug, title, lessons) in enumerate(chapters, start=start_position):
        manifest_lessons, questions = [], []
        for lesson in lessons:
            lesson_id = f"lower-0862-s{stage}-{lesson.slug}"
            assert lesson_id not in study, lesson_id
            assert 3 <= len(lesson.sections) <= 4, lesson_id
            assert 1 <= lesson.exam_families <= 30, lesson_id
            study[lesson_id], cases = lesson_study(lesson, lesson_id, previous)
            examples = [dict(title=e["title"], question=e["question"], solution="".join(e["solution"]),
                             verification=f"{lesson_id}-example-{i + 1}")
                        for i, e in enumerate(study[lesson_id]["examples"][::2])]
            manifest_lessons.append(dict(
                id=lesson_id, key=lesson.slug, title=lesson.title, summary=lesson.objective, objective=lesson.objective,
                before=p(lesson.sections[0].intro), ideas="".join(p(s.idea) for s in lesson.sections),
                method="".join(p(s.tip) for s in lesson.sections), mistakes=[s.mistake for s in lesson.sections], examples=examples,
            ))
            questions.extend(lesson_bank(lesson, lesson_id, cases))
            previous = dict(title=lesson.title, href=f"/courses/{course_slug}/topics/{lesson_id}")
        key = f"0862-s{stage}-{slug}"
        assert len(key) <= 36, key
        manifest = dict(
            schema_version=1, key=key, version=(versions or {}).get(slug, "1.0.0"), course=course,
            chapter=dict(id=f"lower_0862_s{stage}_{slug.replace('-', '_')}", slug=slug, title=title, position=position),
            source=dict(sha256=checksum, supplied=0, held=[]), lessons=manifest_lessons,
            questions=questions, marking_status="DRAFT",
        )
        destination = directory / f"{stage_slug}-{slug}-v1.json"
        if destination.exists():
            previous_manifest = loads(destination.read_text(encoding="utf-8"))
            previous_source = previous_manifest.pop("source")
            # Editing another chapter's generator should not invalidate this installed manifest.
            if previous_manifest == {key: value for key, value in manifest.items() if key != "source"}:
                manifest["source"] = previous_source
        destination.write_text(dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(key, len(lessons), len(questions))
    (directory / f"{stage_slug}-{study_suffix}.json").write_text(dumps(study, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
