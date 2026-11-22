"""Illustrate reviewed 0580 transformations and vectors without rebuilding the bank."""

from collections import Counter
from copy import deepcopy
from fractions import Fraction as Q
from hashlib import sha256
from html import escape, unescape
from importlib.util import module_from_spec, spec_from_file_location
import json
from math import ceil, floor
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "content/original/0580"
ASSETS = ROOT / "public/assets/study/0580/transformations-vectors"
URL = "/assets/study/0580/transformations-vectors"
STUDY = DATA / "transformations-vectors-study.json"
MAP = DATA / "transformations-vectors-practice-diagrams.json"
spec = spec_from_file_location("transformations_authoring", Path(__file__).with_name("prepare-0580-transformations-vectors.py"))
authoring = module_from_spec(spec)
spec.loader.exec_module(authoring)
BLUE, GREEN, PURPLE = authoring.BLUE, authoring.GREEN, authoring.PURPLE
ORIGIN = (0, 0)
W, H = 440, 318
IMAGE = re.compile(r'<p><img\b[^>]*\bsrc="/(?:api/files/[^"]+|assets/study/0580/transformations-vectors/[^"]+)"[^>]*></p>')
FRACTION = re.compile(r"\\frac\{(-?\d+)\}\{(\d+)\}")
COORD = r"\((-?\d+(?:/\d+)?),\s*(-?\d+(?:/\d+)?)\)"
generated = {}


def scene(markers=(), guides=(), arrows=()):
    return dict(markers=list(markers), guides=list(guides), arrows=list(arrows), polygons=[])


def number_pairs(text):
    return [tuple(map(Q, item)) for item in re.findall(COORD, text)]


def arrow(a, b, colour):
    return [(a, b, colour)] if a != b else []


def centre_label(point):
    return "O" if point == ORIGIN else "K"


def statics(task):
    """Calculate the two scenes directly from the exact authoring inputs."""
    title = task["title"]
    text = FRACTION.sub(r"\1/\2", unescape(task["prompt"]))
    points = number_pairs(text)
    expected = task["field"]["expected"]
    answers = number_pairs(expected)
    columns = [
        (Q(x), Q(y))
        for x, y in re.findall(r"\\begin\{pmatrix\}(-?\d+(?:/\d+)?)\\\\(-?\d+(?:/\d+)?)\\end\{pmatrix\}", text)
    ]
    if task["art"]:
        before, after = deepcopy(task["art"])
        if title in {"Use a route through the origin", "Write the position vector of an internal point",
                     "Relate corresponding sides of similar triangles"}:
            return before, after, True
        for drawing in (before, after):
            drawing["markers"] = [
                (centre_label(at) if name == "O" and at != ORIGIN else name, at)
                for name, at in drawing.get("markers", [])
            ]
        center = [at for name, at in after["markers"] if name in ("K", "O")]
        source = after["polygons"][0][0] if after["polygons"] else []
        final = after["polygons"][-1][0] if len(after["polygons"]) > 1 else []
        if center and source and final:
            at = center[0]
            a, b = next((x, y) for (_, x), (_, y) in zip(source, final) if x != at)
            if "enlarge" in title.lower() or "scale" in title.lower():
                after["guides"] += [(at, a), (at, b)]
            if "rotation" in title.lower() or "rotate" in title.lower():
                after["arrows"] = arrow(at, a, BLUE) + arrow(at, b, GREEN)
        elif "reflect" in title.lower() and source and final:
            a, b = source[0][1], final[0][1]
            if a != b:
                after["guides"].append((a, b))
        return before, after, False
    if title == "Read the translation from corresponding points":
        a, b = points
        assert [authoring.subtract(b, a)] == answers
        before = scene([("P", a), ("P′", b)])
        return before, dict(before, arrows=arrow(a, b, GREEN)), False
    if title == "Find the point before a translation":
        (b,), (shift,) = points, columns
        a = authoring.subtract(b, shift)
        assert [a] == answers
        return scene([("P′", b)]), scene([("P", a), ("P′", b)], arrows=arrow(a, b, GREEN)), False
    if title in {"Find the position of the mirror line", "Recognise a point that stays fixed"}:
        axis, k = re.search(r"([xy])=(-?\d+)", text if len(points) == 1 else task["answer"]).groups()
        line = mirror(axis, Q(k))
        if len(points) == 1:
            (a,) = points
            assert [a] == answers
            assert a[0 if axis == "x" else 1] == Q(k)
            return scene([("P", a)], [line]), scene([("P′/P", a)], [line]), False
        a, b = points
        assert (a[axis == "y"] + b[axis == "y"]) / 2 == Q(k)
        known = [("P", a), ("P′", b)]
        return scene(known), scene(known, [line, (a, b)]), False
    if title == "Use the perpendicular foot to reflect across a line":
        a, foot = points
        b = authoring.subtract(authoring.times(2, foot), a)
        assert [b] == answers
        dx, dy = authoring.subtract(a, foot)
        along = (-dy, dx)
        guide = (authoring.subtract(foot, along), authoring.add(foot, along))
        return scene([("P", a), ("M", foot)], [guide]), scene([("P", a), ("M", foot), ("P′", b)], [guide, (a, b)]), False
    if "enlargement factor" in title:
        k, a, b = points
        assert authoring.enlarge(a, k, Q(expected)) == b
        known = [(centre_label(k), k), ("A", a), ("A′", b)]
        return scene(known), scene(known, [(k, a), (k, b)]), False
    if title == "Locate the centre of an enlargement":
        a, b, c, d, e, f = points
        (k,) = answers
        scale = Q(re.search(r"scale factor \\\(([^)\\]+)\\\)", text)[1])
        assert tuple(authoring.enlarge(x, k, scale) for x in (a, b, c)) == (d, e, f)
        known = authoring.shapes((a, b, c), (d, e, f))[1]
        return known, dict(known, markers=[(centre_label(k), k)], guides=[(k, a), (k, b), (k, d), (k, e)]), False
    if title in {"Find the single movement from two parallel reflections", "Recognise a single equivalent transformation"}:
        lines = list(map(int, re.findall(r"x=(-?\d+)", text)))
        a = lines[0]
        p = (a - 2, 1)
        midway = (2 * a - p[0], p[1])
        if columns:
            (move,) = columns
            final = authoring.add(midway, move)
            k = a + move[0] / 2
            assert f"x={authoring.fraction(k)}" in task["answer"]
            guides = [mirror("x", a), mirror("x", k)]
        else:
            b = lines[1]
            final = (2 * b - midway[0], p[1])
            assert [authoring.subtract(final, p)] == answers
            guides = [mirror("x", a), mirror("x", b)]
        solved = scene([("P", p), ("P₁", midway), ("P′", final)], guides,
                       arrow(p, midway, BLUE) + arrow(midway, final, GREEN))
        solved["note"] = "A sample point follows both steps"
        return None, solved, False
    if title in {"Add or subtract matching components", "Scale both vectors before combining"}:
        a, b = columns
        if title.startswith("Scale"):
            k, n = re.search(r"(\d+)\\mathbf a-(\d*)\\mathbf b", text).groups()
            first, second = authoring.times(int(k), a), authoring.times(-int(n or "1"), b)
        else:
            first, second = a, authoring.times(-1 if r"\mathbf a-\mathbf b" in text else 1, b)
        final = authoring.add(first, second)
        assert [final] == answers
        before = scene([("O", ORIGIN), ("a", a), ("b", b)], arrows=arrow(ORIGIN, a, BLUE) + arrow(ORIGIN, b, PURPLE))
        solved = scene([("O", ORIGIN), ("P", first), ("Q", final)], arrows=arrow(ORIGIN, first, BLUE)
                       + arrow(first, final, PURPLE) + arrow(ORIGIN, final, GREEN))
        solved["note"] = "Follow the arrows from O to P to Q"
        return before, solved, False
    if title == "Multiply both components by a scalar":
        (a,) = columns
        k = Q(re.search(r"find \\\((-?\d+(?:/\d+)?)\\mathbf a", text)[1])
        out = authoring.times(k, a)
        assert [out] == answers
        before = scene([("O", ORIGIN), ("a", a)], arrows=arrow(ORIGIN, a, BLUE))
        return before, scene([("O", ORIGIN), ("a", a), ("ka", out)], arrows=arrow(ORIGIN, a, BLUE) + arrow(ORIGIN, out, GREEN)), False
    if title in {"Use Pythagoras for the magnitude", "Find the length of a directed line segment",
                 "Scale a magnitude with a negative scalar", "Find a missing component from the magnitude"}:
        start, end = points if points else (ORIGIN, columns[0] if columns else None)
        if end is None:
            a = int(re.search(r"pmatrix\}(-?\d+)\\\\t", text)[1])
            end = (a, Q(expected))
        v = authoring.subtract(end, start)
        result_vector = v
        if title.startswith("Scale"):
            k = int(re.search(r"\|(-\d+)\\mathbf u\|", text)[1])
            result_vector = authoring.times(k, v)
        if columns or points:
            assert expected == authoring.square_root(authoring.dot(result_vector, result_vector))[1]
        leg = (end[0], start[1])
        name_a, name_b = ("P", "Q") if points else ("O", "U")
        known = scene([(name_a, start), (name_b, end)], arrows=arrow(start, end, BLUE))
        solved = dict(known, guides=[(start, leg), (leg, end)])
        return known if columns or points else None, solved, False
    if title == "Use a route through the origin":
        start, end = ("B", "A") if "Start at B" in text else ("A", "B")
        known = authoring.ratio_art(Q(1, 2))[0]
        known["markers"] = []
        coordinates = dict(known["polygons"][0][0])
        return known, dict(known, arrows=arrow(coordinates[start], ORIGIN, BLUE)
                           + arrow(ORIGIN, coordinates[end], PURPLE)
                           + arrow(coordinates[start], coordinates[end], GREEN)), True
    if title == "Find a midpoint position vector":
        a, b = points
        m = authoring.times(Q(1, 2), authoring.add(a, b))
        assert [m] == answers
        return scene([("A", a), ("B", b)], [(a, b)]), scene([("O", ORIGIN), ("A", a), ("B", b), ("M", m)], [(a, b)], arrow(ORIGIN, m, GREEN)), False
    if title == "Show how two vectors are parallel":
        a, b = columns
        assert authoring.times(Q(expected), a) == b
        known = scene([("O", ORIGIN), ("u", a), ("v", b)], arrows=arrow(ORIGIN, a, BLUE) + arrow(ORIGIN, b, GREEN))
        return known, known, False
    if title == "Check the scalar multiple and the common point":
        a, b, c = points
        ab, ac = authoring.subtract(b, a), authoring.subtract(c, a)
        assert ab[0] * ac[1] == ab[1] * ac[0]
        known = scene([("A", a), ("B", b), ("C", c)])
        return known, dict(known, arrows=arrow(a, b, BLUE) + arrow(a, c, GREEN)), False
    if title == "Recover a line ratio from a position vector":
        a, b = map(int, re.search(r"(\d+):(\d+)", task["answer"]).groups())
        before, after = authoring.ratio_art(Q(a, a + b))
        return None, after, True
    return None


def mirror(axis, k):
    return ((k, -60), (k, 60)) if axis == "x" else ((-60, k), (60, k))


def render(drawing, schematic):
    coordinates = authoring.collect_points(drawing)
    bounds_points = coordinates if schematic else [*coordinates, ORIGIN]
    xx, yy = zip(*bounds_points)
    xmin, xmax = floor(min(xx)) - 2, ceil(max(xx)) + 2
    ymin, ymax = floor(min(yy)) - 2, ceil(max(yy)) + 2
    factor = min(340 / (xmax - xmin), 228 / (ymax - ymin))
    left = (W - (xmax - xmin) * factor) / 2
    top = 22 + (252 - (ymax - ymin) * factor) / 2
    right, bottom = left + (xmax - xmin) * factor, top + (ymax - ymin) * factor

    def xy(p):
        return left + float(p[0] - xmin) * factor, bottom - float(p[1] - ymin) * factor

    art = [f'<defs><clipPath id="plot"><rect x="{left:.2f}" y="{top:.2f}" width="{right-left:.2f}" height="{bottom-top:.2f}"/></clipPath></defs>']
    occupied = []

    def label(x, y, content, colour="#163953", size=14, stroke=False):
        occupied.append((x - 3.8 * len(content), y - size, x + 3.8 * len(content), y + 3))
        element = authoring.diagram_text(x, y, content, colour, size)
        return element.replace("<text ", '<text stroke="#fbfdff" stroke-width="3" paint-order="stroke" ', 1) if stroke else element

    if not schematic:
        step = next(n for n in (1, 2, 5, 10, 20, 25, 50, 100) if n * factor >= 19)
        for v in range(xmin, xmax + 1):
            if v % step:
                continue
            a, b = xy((v, ymin)), xy((v, ymax))
            art += [authoring.drawn_line(a, b, "#dce7ef" if v else "#607e92", 1 if v else 1.8),
                    label(a[0], bottom + 17, str(v), size=12)]
        for v in range(ymin, ymax + 1):
            if v % step:
                continue
            a, b = xy((xmin, v)), xy((xmax, v))
            art += [authoring.drawn_line(a, b, "#dce7ef" if v else "#607e92", 1 if v else 1.8),
                    label(left - 20, a[1] + 5, str(v), size=12)]
        art += [label(right + 17, bottom + 17, "x"), label(xy((0, ymax))[0], top - 9, "y")]
    if drawing.get("note"):
        art.append(label(W / 2, H - 11, drawing["note"], size=13))
    for a, b in drawing.get("guides", []):
        art.append(authoring.drawn_line(xy(a), xy(b), PURPLE, 1.55, True).replace("<line ", '<line clip-path="url(#plot)" ', 1))
    markers = {}
    for vertices, colour in drawing.get("polygons", []):
        svg_points = " ".join(f"{x:.2f},{y:.2f}" for x, y in [xy(v) for _, v in vertices])
        art.append(f'<polygon points="{svg_points}" fill="{colour}" fill-opacity=".06" stroke="{colour}" stroke-width="2.2" stroke-linejoin="round"/>')
        for name, at in vertices:
            markers.setdefault(at, ([], colour))[0].append(name)
    for a, b, colour in drawing.get("arrows", []):
        if a != b:
            art.append(authoring.mapped_vector(xy(a), xy(b), colour))
    for name, at in drawing.get("markers", []):
        markers.setdefault(at, ([], PURPLE))[0].append(name)
    marker_pixels = [xy(at) for at in markers]
    for at, (names, colour) in markers.items():
        x, y = xy(at)
        art.append(authoring.dot_mark(x, y, colour))
        name = "/".join(dict.fromkeys(names))
        centre_pad = 5 + 4 * len(name)
        candidates = [(dx, dy) for dy in (-10, 17, -24, 32, -40, 45)
                      for dx in (centre_pad, -centre_pad, 0, centre_pad + 15, -centre_pad - 15)]
        for dx, dy in candidates:
            px, py = x + dx, y + dy
            box = px - 4 * len(name), py - 14, px + 4 * len(name), py + 3
            x0, y0, x1, y1 = box
            if x0 < 4 or y0 < 4 or x1 > W - 4 or y1 > H - 6:
                continue
            if any(x0 < ox1 + 2 and ox0 - 2 < x1 and y0 < oy1 + 1 and oy0 - 1 < y1 for ox0, oy0, ox1, oy1 in occupied):
                continue
            if any(x0 - 2 < px0 < x1 + 2 and y0 - 2 < py0 < y1 + 2 for px0, py0 in marker_pixels):
                continue
            art.append(label(px, py, name, colour, stroke=True))
            break
        else:
            raise ValueError(f"Cannot place {name} at {at} in {drawing}")
    alt = "Schematic vector diagram." if schematic else "Coordinate grid with labelled axes."
    alt += " " + " ".join(
        f"{'/'.join(dict.fromkeys(names))}." if schematic else f"{'/'.join(dict.fromkeys(names))} at {authoring.point(at, False)}."
        for at, (names, _) in markers.items()
    )
    if drawing.get("guides"):
        alt += " Dashed lines show the construction guides."
    if drawing.get("arrows"):
        alt += " Arrowheads indicate the directions."
    if drawing.get("note"):
        alt += f' {drawing["note"]}.'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{escape(alt, quote=True)}">'
           f'<rect width="{W}" height="{H}" rx="10" fill="#fbfdff"/>{"".join(art)}</svg>\n')
    digest = sha256(svg.encode("utf-8")).hexdigest()[:14]
    name = f"audit-grid-{digest}.svg"
    generated[name] = svg.encode("utf-8")
    return f'<p><img src="{URL}/{name}" width="{W}" height="{H}" alt="{escape(alt, quote=True)}"></p>'


def drawing_pair(task):
    pair = statics(task)
    if pair is None:
        raise ValueError(f'No trace for {task["title"]}')
    before, after, schematic = pair
    prompt_svg = render(before, schematic) if before else ""
    solution_svg = render(after, schematic) if after != before else prompt_svg
    return prompt_svg, solution_svg


def strip_images(html):
    return IMAGE.sub("", html)


def project():
    studies = json.loads(STUDY.read_text(encoding="utf-8"))
    bank = json.loads((DATA / "transformations-vectors-v1.json").read_text(encoding="utf-8"))
    questions = {q["id"]: q for q in bank["questions"]}
    visual_bank = {}
    counts = Counter()
    used = set()

    def model(make, seed):
        return authoring.distinct(make, seed, used)[0]

    def check(task, authored):
        assert strip_images(authored["prompt"]) == task["prompt"], authored["id"]
        assert authored["field"] == task["field"], authored["id"]
        prompt, solution = drawing_pair(task)
        authored["prompt"] = task["prompt"] + prompt
        authored["solution"] = strip_images(authored["solution"]) + (solution if solution != prompt else "")
        counts["checkPrompts"] += bool(prompt)
        counts["checkSolutions"] += bool(solution and solution != prompt)

    for i, (key, _, _, _, _, rows, _, _) in enumerate(authoring.LESSONS):
        study = studies[authoring.PREFIX + key]
        worked_figures = []
        for j, row in enumerate(rows):
            first, second = row[-2:]
            seed = 4 + 37 * i + 11 * j + (1 if i == 9 and j == 2 else 0)
            for offset, task in enumerate((model(first, seed), model(second, seed + 2))):
                authored = study["examples"][2 * j + offset]
                assert strip_images(authored["question"]) == authoring.choices(task), (key, j, offset)
                prompt, solution = drawing_pair(task)
                authored["question"] = strip_images(authored["question"]) + prompt
                authored["solution"] = [line for line in authored["solution"] if strip_images(line)]
                if solution and solution != prompt:
                    authored["solution"].append(solution)
                worked_figures.append(solution)
                counts["worked"] += bool(prompt or solution)
            section = study["sections"][j]
            if section["blocks"][0].get("figure"):
                del section["blocks"][0]["figure"]
            first_check, second_check = [b for b in section["blocks"] if b["kind"] == "check"]
            check(model(first, seed + 1), first_check)
            check(model(second, seed + 3), second_check)
            check(model(first, seed + 5), study["extraPractice"][2 * j])
            check(model(second, seed + 8), study["extraPractice"][2 * j + 1])
        representative = 4 if key == "vector-proofs" else 0
        revision = study["revision"]
        revision["body"] = strip_images(revision["body"]) + worked_figures[representative].replace(f'width="{W}" height="{H}"', 'width="235"')
        study["updatedOn"] = "2026-11-22"

        short, written = authoring.BANK[i]
        for j, make in enumerate(short, 1):
            for version in range(2):
                uid = f"M4U-0580-TV-{key}-P{j}-{version}"
                question = questions[uid]
                task = model(make, 91 + i * 59 + j * 17 + version)
                assert strip_images(question["prompt_html"]) == task["prompt"] and question["fields"] == [task["field"]], uid
                prompt, solution = drawing_pair(task)
                supplements = {}
                if prompt and not IMAGE.search(question["prompt_html"]):
                    supplements["prompt"] = prompt
                if solution and solution != prompt and not IMAGE.search(question["solution_html"]):
                    supplements["solution"] = solution
                if supplements:
                    visual_bank[uid] = supplements

        for j, (_, methods) in enumerate(written, 1):
            for version in range(4):
                uid = f"M4U-0580-TV-{key}-W{j}-{version}"
                question = questions[uid]
                parts = re.findall(r'<li>(.+?)<span class="marks">', question["prompt_html"])
                answer_parts = re.split(r"<h4>\([a-z]\)</h4>", question["solution_html"])[1:]
                assert len(parts) == len(answer_parts) == len(methods), uid
                solutions = []
                for k, (make, part, answer_part) in enumerate(zip(methods, parts, answer_parts, strict=True)):
                    task = model(make, 179 + i * 101 + j * 13 + version + k * 9)
                    assert strip_images(part) == (task["write"] or authoring.choices(task)), (uid, k)
                    assert strip_images(answer_part) == "".join(task["solution"]), (uid, k)
                    _, solution = drawing_pair(task)
                    if solution and not IMAGE.search(answer_part) and not (task["art"] and task["art"][0] == task["art"][1]):
                        solutions.append(f"<h4>Construction for part ({chr(97 + k)})</h4>{solution}")
                if solutions:
                    visual_bank[uid] = {"solution": "".join(solutions)}

    methods = {
        "translations": ("read-the-column", "A vertex gives one location. The complete image needs every vertex and a straight edge between each matching pair."),
        "rotations": ("hold-the-centre", r"The coordinate axes still meet at the origin. When the centre is elsewhere, count relative steps from that centre. The diagrams label it \(K\)."),
        "positive-enlargements": ("scale-along-a-ray", r"Find the displacement from the marked centre \(K\) to each original vertex. Scale that displacement and then measure it from \(K\) again."),
        "vector-routes": ("separate-starts-and-ends", "On the grid, a point names a location. An arrow between distinct points shows the movement from its tail to its head."),
    }
    for key, (anchor, note) in methods.items():
        study = studies[authoring.PREFIX + key]
        section = next(s for s in study["sections"] if s["id"] == anchor)
        method = next(b for b in section["blocks"] if b.get("title") == "Practise the method")
        addition = authoring.p(note)
        if not method["html"].endswith(addition):
            method["html"] += addition

    study_json = json.dumps(studies, ensure_ascii=False, indent=2) + "\n"
    map_json = json.dumps(visual_bank, ensure_ascii=False, indent=2) + "\n"
    filenames = set(re.findall(r"audit-grid-[a-f\d]+\.svg", study_json + map_json))
    for name in sorted(filenames):
        (ASSETS / name).write_bytes(generated[name])
    STUDY.write_text(study_json, encoding="utf-8")
    MAP.write_text(map_json, encoding="utf-8")
    print(dict(counts, practice=len(visual_bank), practicePrompts=sum("prompt" in q for q in visual_bank.values()),
               practiceSolutions=sum("solution" in q for q in visual_bank.values()), svg=len(filenames)))


if __name__ == "__main__":
    project()
