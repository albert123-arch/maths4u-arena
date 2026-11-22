"""Illustrate reviewed 0580 probability models without regenerating bank records."""

from fractions import Fraction
from hashlib import sha256
from html import escape
from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path
import re


HERE = Path(__file__).resolve().parent
SPEC = spec_from_file_location("probability_authoring", HERE / "prepare-0580-probability.py")
AUTHOR = module_from_spec(SPEC)
SPEC.loader.exec_module(AUTHOR)
ROOT = HERE.parents[1]
SOURCE = ROOT / "content/original/0580"
ASSETS = ROOT / "public/assets/study/0580/probability"
IMAGE_ROOT = "/assets/study/0580/probability/"
TITLE = "Quick worked example"
PATTERNS = {"counts", "frequency", "spinners", "tree", "bag-tree", "venn2", "venn3"}


def p(text):
    return f"<p>{text}</p>"


def tree_art(model, for_prompt):
    kind, values = model["art"]
    if kind == "tree":
        first, second, rows, *optional = values
        stages = (first, second)
        outcomes = stages
        headings = ("First draw", "Second draw")
    else:
        rows = values
        optional = []
        stages = ("Bag A", "Bag B")
        outcomes = ("Copper", "Other")
        headings = ("Bag chosen", "Tile drawn")
    blank = optional[0] if optional and for_prompt else None
    text = model["prompt"]
    if for_prompt and "Find the probability that the next disc is blue" in text:
        blank = (1, 0) if "A blue disc is taken" in text else (2, 0)
    if for_prompt and "It is known that bag A was chosen" in text:
        blank = (1, 0)
    for a, b, whole in rows:
        assert whole > 0 and a >= 0 and b >= 0 and a + b == whole, rows
    width, height = 400, 268
    ink, blue, orange, background = "#183660", "#156880", "#925116", "#f4f8fc"
    root, middle, ends = (26, 143), ((151, 76), (151, 208)), ((303, 53), (303, 114), (303, 177), (303, 239))
    text_tag = AUTHOR.txt
    draw = [
        f'<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="12" fill="{background}"/>',
        text_tag(128, 25, headings[0], ink, 16),
        text_tag(329, 25, headings[1], ink, 16),
    ]
    descriptions = []
    for row, alternatives in enumerate((stages, outcomes, outcomes)):
        from_point = root if row == 0 else middle[row - 1]
        branches = middle if row == 0 else ends[(row - 1)*2:row*2]
        origin = "First stage" if row == 0 else f"After {stages[row-1]}"
        summary = []
        for col, ((x2, y2), label) in enumerate(zip(branches, alternatives)):
            x1, y1 = from_point
            colour = blue if col == 0 else orange
            draw.append(AUTHOR.line(x1, y1, x2, y2, colour))
            x, y = (x1+x2)//2, (y1+y2)//2 + (-7 if col == 0 else 8)
            if blank == (row, col):
                draw.append(AUTHOR.box(x-13, y-15, 26, 28, background, colour))
                draw.append(text_tag(x, y+6, "?", ink, 20))
                summary.append(f"{label}: missing probability")
            else:
                top, bottom = rows[row][col], rows[row][2]
                draw.extend((AUTHOR.box(x-14, y-20, 28, 40, background),
                             text_tag(x, y-5, top, ink, 15), AUTHOR.line(x-10, y, x+10, y, ink, 1),
                             text_tag(x, y+16, bottom, ink, 15)))
                summary.append(f"{label}: {top} out of {bottom}")
        descriptions.append(f"{origin}, " + ", ".join(summary))
    for i, (x, y) in enumerate(middle):
        draw.extend((AUTHOR.circ(x,y,3,ink,ink),
                     text_tag(x, y + (-16 if i == 0 else 20), stages[i], ink, 15)))
    for i, (x, y) in enumerate(ends):
        draw.append(text_tag(x+8, y+5, outcomes[i%2], ink, 15, "start"))
    draw.append(AUTHOR.circ(*root, 3, ink, ink))
    alt = ". ".join(descriptions) + "."
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"'
           f' role="img" aria-label="{escape(alt, quote=True)}"><title>{escape(alt)}</title>'
           '<g font-family="Inter,Arial,sans-serif">' + "".join(draw) + '</g></svg>')
    return svg, alt, width, height, blank


def verify_tree(model):
    kind, values = model["art"]
    rows = values[2] if kind == "tree" else values
    text = model["prompt"]
    branch = [[Fraction(a, whole), Fraction(b, whole)] for a, b, whole in rows]
    weights = [[branch[0][i] * p for p in branch[i+1]] for i in range(2)]
    assert sum(map(sum, weights)) == 1
    if kind == "bag-tree":
        if "It is known that bag A was chosen" in text:
            required = branch[1][0]
        elif "The drawn tile is not copper" in text:
            required = weights[1][1] / (weights[0][1] + weights[1][1])
        else:
            copper = weights[0][0] + weights[1][0]
            required = weights[0][0] / copper if "the tile is copper. Find" in text else copper
    elif len(values) == 4:
        row, column = values[-1]
        required = branch[row][column]
    elif "the next disc is blue" in text:
        required = branch[1 if "A blue disc is taken" in text else 2][0]
    elif "expected number" in text:
        trials = int(re.search(r"each of (\d+) draws", text)[1])
        required = trials * weights[0][0]
    elif "both discs are blue" in text:
        required = weights[0][0]
    elif "both discs have the same colour" in text:
        required = weights[0][0] + weights[1][1]
    elif "exactly one disc is blue" in text:
        required = weights[0][1] + weights[1][0]
    elif "at least one disc is blue" in text:
        required = 1 - weights[1][1]
    else:
        raise ValueError(f"Unrecognised event in {text}")
    assert required == Fraction(model["field"]["expected"]), text


def draw(model, for_prompt):
    kind = model["art"][0]
    if kind in {"tree", "bag-tree"}:
        verify_tree(model)
        svg, alt, width, height, blank = tree_art(model, for_prompt)
    else:
        svg, alt = AUTHOR.diagrams(model["art"])
        width, height, blank = AUTHOR.W, AUTHOR.H, None
    uid = sha256((svg + "\n").encode("utf-8")).hexdigest()[:12]
    if kind not in {"tree", "bag-tree"}:
        background = f'<rect x="1" y="1" width="{width-2}" height="{height-2}" rx="12" fill="#f4f8fc"/>'
        svg = svg.replace("</title>", "</title>" + background, 1)
    name = f"audit-{kind}-{uid}.svg"
    (ASSETS / name).write_bytes((svg + "\n").encode("utf-8"))
    return {"src": IMAGE_ROOT+name, "alt": alt, "width": width, "height": height}, blank


def image(figure):
    return '<img ' + " ".join(f'{key}="{escape(str(value), quote=True)}"' for key, value in figure.items()) + ">"


def clear_added(html):
    return re.sub(r'<p>\s*<img src="/assets/study/0580/probability/audit-[^"]+"[^>]*>\s*</p>', "", html)


def study_figures(item, model, worked=False):
    kind = model["art"][0]
    # The worked solution shows constructed Venn regions when the stem gives whole-set totals.
    into_solution = kind.startswith("venn")
    figure, blank = draw(model, not into_solution)
    key = "question" if worked else "prompt"
    item[key] = clear_added(item[key])
    steps = item["solution"]
    if worked:
        steps = [step for step in steps if clear_added(step)]
    else:
        steps = clear_added(steps)
    if not into_solution:
        item[key] += p(image(figure))
    if into_solution or blank:
        complete = figure if into_solution else draw(model, False)[0]
        if worked:
            steps.insert(0, p(image(complete)))
        else:
            steps = p(image(complete)) + steps
    item["solution"] = steps


def legacy_src(art):
    svg, _ = AUTHOR.diagrams(art)
    return "/api/files/pkg_igprob_" + sha256(svg.encode("utf-8")).hexdigest()


def bank_figures(record, models):
    statements, solutions, notes = {}, {}, []
    for index, model in enumerate(models):
        if not model["art"] or model["art"][0] not in {"tree", "bag-tree"}:
            continue
        old_src = legacy_src(model["art"])
        assert old_src in record["prompt_html"], record["id"]
        figure, blank = draw(model, True)
        statements[old_src] = image(figure)
        if blank:
            complete = draw(model, False)[0]
            if "solutionArt" in model:
                old_solution = legacy_src(model["solutionArt"])
                assert old_solution in record["solution_html"], record["id"]
                solutions[old_solution] = image(complete)
            else:
                label = p(f"<strong>Part ({chr(ord('a')+index)})</strong>") if len(models) > 1 else ""
                notes.append(label + p(image(complete)))
    if statements:
        return {"promptImages": statements,
                **({"solutionImages": solutions} if solutions else {}),
                **({"solution": "".join(notes)} if notes else {})}
    return None


def apply():
    ASSETS.mkdir(parents=True, exist_ok=True)
    study = json.loads((SOURCE / "probability-study.json").read_text(encoding="utf-8"))
    bank = json.loads((SOURCE / "probability-v1.json").read_text(encoding="utf-8"))
    indexed = {q["id"]: q for q in bank["questions"]}
    projections, used = {}, set()
    counts = {"examples": 0, "checks": 0, "practice": 0, "statementImages": 0, "solutionImages": 0}
    for i, (key, _, _, _, rows, _, _, representative) in enumerate(AUTHOR.LESSONS):
        lesson = study[AUTHOR.PREFIX+key]
        for j, (_, _, _, _, _, _, first, second) in enumerate(rows):
            seed = 4 + 37*i + 11*j
            models = [AUTHOR.distinct(first, seed, used), AUTHOR.distinct(second, seed+2, used)]
            current_examples = lesson["examples"][2*j:2*j+2]
            for example, model in zip(current_examples, models):
                assert example["title"] == model["title"], key
                if model["art"] and model["art"][0] in PATTERNS:
                    study_figures(example, model, True)
                    counts["examples"] += 1
            section = lesson["sections"][j]
            core = [block for block in section["blocks"] if block["kind"] == "check"]
            checks = [AUTHOR.distinct(first, seed+1, used), AUTHOR.distinct(second, seed+3, used),
                      AUTHOR.distinct(first, seed+5, used), AUTHOR.distinct(second, seed+8, used)]
            for item, model in zip(core + lesson["extraPractice"][2*j:2*j+2], checks):
                assert item["field"]["expected"] == model["field"]["expected"], item["id"]
                if model["art"] and model["art"][0] in PATTERNS:
                    study_figures(item, model)
                    counts["checks"] += 1
            if j == representative and models[0]["art"] and models[0]["art"][0] in {"tree", "bag-tree"}:
                # The exact figure is already part of the worked example, including in Examples view.
                section["blocks"][0].pop("figure", None)
                revision = lesson["revision"]
                intro, heading, _ = revision["body"].partition(f"<h2>{TITLE}</h2>")
                assert heading, key
                example = current_examples[0]
                short_diagram = example["question"].replace('width="400" height="268"', 'width="300" height="201"')
                revision["body"] = intro + heading + short_diagram + "".join(example["solution"])
        short, written = AUTHOR.BANK[i]
        for j, make in enumerate(short, 1):
            for version in range(2):
                model = AUTHOR.distinct(make, 91+i*59+j*17+version, used)
                uid = f"M4U-0580-PR-{key}-P{j}-{version}"
                record = indexed[uid]
                assert record["fields"][0]["expected"] == model["field"]["expected"], uid
                data = bank_figures(record, [model])
                if data:
                    projections[uid] = data
        for j, (_, methods) in enumerate(written, 1):
            for version in range(4):
                models = [AUTHOR.distinct(make, 179+i*101+j*13+version+k*9, used) for k, make in enumerate(methods)]
                uid = f"M4U-0580-PR-{key}-W{j}-{version}"
                record = indexed[uid]
                for part, model in zip(record["parts"], models, strict=True):
                    assert part["marking_criteria"][-1]["description_html"] == p(model.get("writtenAnswer", model["answer"])), uid
                data = bank_figures(record, models)
                if data:
                    projections[uid] = data
    counts["practice"] = len(projections)
    counts["statementImages"] = sum(len(row["promptImages"]) for row in projections.values())
    counts["solutionImages"] = sum(len(row.get("solutionImages", {})) + row.get("solution", "").count("<img ") for row in projections.values())
    for name, data in (("probability-study.json", study), ("probability-practice-diagrams.json", projections)):
        (SOURCE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(counts))


if __name__ == "__main__":
    apply()
