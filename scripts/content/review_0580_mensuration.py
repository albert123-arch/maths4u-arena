"""Illustrate original 0580 mensuration models and check their existing answers."""

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from hashlib import sha256
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content/original/0580"
ASSET_PATH = "/assets/study/0580/mensuration/"
ASSETS = ROOT / ("public" + ASSET_PATH)
PREFIX = "igcse-0580-mensuration-"
WIDTH, HEIGHT = 400, 248
BLUE, INK, AQUA, WASH, ORANGE = "#255e95", "#183654", "#bfebdb", "#dfedfc", "#9b5725"
FORMULA = re.compile(r"\\\((.*?)\\\)")
FIGURE = re.compile(r'<p>(?:<strong>Part [a-z]\.</strong> )?<img\b[^>]*audit-0580-[^>]*></p>')


@dataclass(frozen=True)
class Model:
    kind: str
    dims: tuple
    result: Fraction
    with_pi: bool = False
    solution_only: bool = False


def number(text):
    value = text.strip().replace(" ", "").replace("−", "-")
    value = re.sub(r"\\(?:t|d)?frac\{(-?\d+)\}\{(\d+)\}", r"\1/\2", value)
    coefficient = value.removesuffix(r"\pi").removesuffix("*pi").strip("()")
    return Fraction(coefficient or "1"), value.endswith((r"\pi", "*pi"))


def from_prompt(prompt, uid):
    prompt = prompt.removeprefix("<p>")
    figures = tuple(int(x) for x in re.findall(r"(\d+) (?:cm|m)(?![\w²³])", prompt))
    if prompt.startswith("A rectangular exercise area"):
        a, b = figures
        return Model("rectangle", (a, b, "m"), 2 * (a + b))
    if prompt.startswith("A rectangle has length"):
        a, b = figures
        return Model("rectangle", (a, b, "m"), a * b)
    if prompt.startswith("A triangle has sides of length"):
        a, b, c = figures
        return Model("triangle-edges", figures, a + b + c)
    if prompt.startswith(("A parallelogram has base", "A triangle has base")):
        if "sloping side" in prompt:
            a, side, height = figures
            return Model("parallelogram", (a, height, side), 2 * (a + side))
        a, h = figures
        if prompt.startswith("A triangle"):
            return Model("triangle-height", figures, Fraction(a * h, 2))
        return Model("parallelogram", (a, h, None), a * h)
    if prompt.startswith(("The parallel sides of a trapezium", "A trapezium has parallel sides")):
        a, b, *remaining = figures
        if len(remaining) == 1:
            h, = remaining
            return Model("trapezium", (a, b, h, None), Fraction((a + b) * h, 2))
        side, h = remaining
        return Model("trapezium", (a, b, h, side), a + b + 2 * side)
    if prompt.startswith(("A circular sign", "A circular opening")):
        d, = figures
        result = d if "circumference" in prompt else Fraction(d, 2) ** 2
        return Model("circle", (d,), result, True)
    if prompt.startswith("A minor arc is"):
        r, = figures
        length, has_pi = number(FORMULA.search(prompt)[1])
        assert has_pi, uid
        angle = Fraction(180) * length / r
        return Model("sector", (r, angle, False), angle, solution_only=True)
    if prompt.startswith(("A sector has radius", "Two radii of a circle")):
        r, = figures
        angle = int(re.search(r"(\d+)\^\\circ", prompt)[1])
        major = "major sector" in prompt
        measured_angle = 360 - angle if major else angle
        result = Fraction(measured_angle, 360) * (r ** 2 if "area" in prompt else 2 * r)
        return Model("sector", (r, angle, major), result, True)
    if prompt.startswith("A prism has a triangular cross-section"):
        a, h, length = figures
        return Model("triangular-prism", (a, h, length), Fraction(a * h * length, 2))
    if prompt.startswith("A sealed cuboid"):
        a, b, h = figures
        return Model("cuboid", figures, 2 * (a * b + a * h + b * h))
    if prompt.startswith("A closed cylinder"):
        r, h = figures
        result = r * r * h if "volume" in prompt else 2 * r * h + 2 * r * r
        return Model("cylinder", figures, result, True)
    if prompt.startswith("A closed prism has right-angled triangular ends"):
        a, b = figures
        return Model("prism-net", (a, b, None, None), a * b)
    if prompt.startswith("The triangular ends of a prism"):
        a, b, c, length = figures
        return Model("prism-net", figures, (a + b + c) * length)
    if prompt.startswith("A closed right prism"):
        length, a, b, c = figures
        return Model("prism-net", (a, b, c, length), (a + b + c) * length + a * b)
    if prompt.startswith("A pyramid has a rectangular base"):
        a, b, h = figures
        return Model("pyramid", figures, Fraction(a * b * h, 3))
    if prompt.startswith("A square pyramid"):
        a, slant, h = figures
        return Model("pyramid-net", figures, a * a + 2 * a * slant)
    if prompt.startswith(("A cone has radius", "A solid cone has radius")):
        if len(figures) == 3:
            r, h, slant = figures
            return Model("cone", figures, Fraction(r * r * h, 3), True)
        r, slant = figures
        return Model("cone", (r, None, slant), r * r + r * slant, True)
    if prompt.startswith(("A sphere has diameter", "A ball has radius", "A solid hemisphere")):
        d, = figures
        if prompt.startswith("A sphere"):
            return Model("sphere", (d, True), Fraction(4, 3) * Fraction(d, 2) ** 3, True)
        if prompt.startswith("A ball"):
            return Model("sphere", (d, False), 4 * d * d, True)
        include = "including the flat face" in prompt
        return Model("hemisphere", (d, include), (3 if include else 2) * d * d, True)
    if "rectangular card" in prompt:
        a, b, cut_a, cut_b = figures
        return Model("corner", figures, a * b - cut_a * cut_b)
    if " rectangular notch" in prompt:
        a, b, mouth, depth = figures
        short_edge = uid == PREFIX + "notch-E1-3"
        assert (a if short_edge else b) > depth, uid
        return Model("notch", (*figures, short_edge), 2 * (a + b) + 2 * depth)
    if prompt.startswith("A circular disc"):
        outer, inner = figures
        return Model("ring", figures, outer * outer - inner * inner, True)
    if prompt.startswith("A solid is made from a cylinder"):
        r, h = figures
        return Model("dome", figures, r * r * h + Fraction(2 * r ** 3, 3), True)
    if prompt.startswith("A hemisphere sits on"):
        r, h = figures
        return Model("dome", figures, 2 * r * h + 3 * r * r, True)
    if prompt.startswith("A cylinder has radius"):
        outer, h, inner = figures
        return Model("bore", figures, (outer * outer - inner * inner) * h, True)
    if prompt.startswith("A cone of base radius"):
        r, h, small, *optional = figures
        scale = Fraction(small, r)
        if optional:
            slant, = optional
            curved = r * slant - small * scale * slant
            return Model("frustum", figures, curved + r * r + small * small, True)
        if "remaining solid" in prompt:
            return Model("frustum", figures, Fraction(h, 3) * (r * r - scale * small * small), True)
        return Model("frustum", figures, h * scale)
    raise ValueError(f"{uid}: unsupported shape in {prompt}")


def label(x, y, value, anchor="middle", colour=INK):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" fill="{colour}">{escape(str(value))}</text>'


def line(x1, y1, x2, y2, dashed=False, colour=BLUE):
    dash = ' stroke-dasharray="5 4"' if dashed else ""
    return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{colour}" stroke-width="2"{dash}/>'


def shape(path, fill=WASH, dashed=False):
    dash = ' stroke-dasharray="5 4"' if dashed else ""
    return f'<path d="{path}" fill="{fill}" stroke="{BLUE}" stroke-width="2" stroke-linejoin="round"{dash}/>'


def ellipse(x, y, rx, ry, fill=WASH, dashed=False):
    dash = ' stroke-dasharray="5 4"' if dashed else ""
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{BLUE}" stroke-width="2"{dash}/>'


def right_angle(x, y):
    return shape(f"M{x-10} {y}v-10h10", "none")


def centre(x, y):
    return f'<circle cx="{x}" cy="{y}" r="3" fill="{INK}"/>'


def cm(value):
    return f"{value} cm"


def circle_diagram(spec):
    if spec.kind == "circle":
        d, = spec.dims
        body = ellipse(200, 117, 80, 80) + line(120, 117, 280, 117) + centre(200, 117)
        return body + label(200, 144, f"Diameter {cm(d)}"), f"Diameter {cm(d)} across the centre of the circle."
    if spec.kind == "sector":
        r, angle, major = spec.dims
        cx, cy, radius = 198, 118, 83
        theta = math.radians(float(angle))
        x, y = cx + radius * math.cos(theta), cy - radius * math.sin(theta)
        wedge = f"M{cx} {cy}H{cx+radius}A{radius} {radius} 0 0 0 {x:.4f} {y:.4f}Z"
        body = ellipse(cx, cy, radius, radius, AQUA if major else WASH)
        body += shape(wedge, WASH if major else AQUA) + centre(cx, cy)
        arc_x, arc_y = cx + 27 * math.cos(theta), cy - 27 * math.sin(theta)
        body += shape(f"M{cx+27} {cy}A27 27 0 0 0 {arc_x:.3f} {arc_y:.3f}", "none")
        body += label(238, 139, cm(r)) + label(302, 69, f"{angle}°", "start")
        middle = theta / 2
        ax, ay = cx + 48 * math.cos(middle), cy - 48 * math.sin(middle)
        body += line(295, 65, ax, ay, colour=ORANGE)
        region = "major" if major else "minor"
        return body, f"Radius {cm(r)} and central angle {angle}°. The {region} sector is shaded green."
    if spec.kind == "ring":
        outer, inner = spec.dims
        inner_radius = min(70, max(27, 84 * inner / outer))
        body = ellipse(198, 114, 84, 84, AQUA) + ellipse(198, 114, inner_radius, inner_radius, "#f9fcff")
        body += centre(198, 114) + line(198, 114, 282, 114) + line(198, 114, 198, 114-inner_radius)
        body += line(198, 114-inner_radius, 310, 51, colour=ORANGE) + label(316, 54, cm(inner), "start")
        body += line(282, 114, 310, 164) + label(316, 169, cm(outer), "start")
        return body, f"Green circular ring. Outer radius {cm(outer)}, inner radius {cm(inner)}."
    d, diameter = spec.dims
    if spec.kind == "sphere":
        body = ellipse(200, 119, 83, 83)
        body += shape("M117 119a83 21 0 0 1 166 0", "none", True)
        body += shape("M117 119a83 21 0 0 0 166 0", "none")
        body += line(117 if diameter else 200, 119, 283, 119) + centre(200, 119)
        term = "Diameter" if diameter else "Radius"
        return body + label(200, 164, f"{term} {cm(d)}"), f"Sphere with {term.lower()} {cm(d)}."
    r, include = spec.dims
    body = shape("M104 127a96 96 0 0 1 192 0Z")
    body += ellipse(200, 127, 96, 24, AQUA if include else "#f9fcff", not include)
    body += line(200, 127, 296, 127) + centre(200, 127)
    body += line(296, 127, 311, 142) + label(318, 148, cm(r), "start")
    body += label(200, 184, "Curved and flat faces" if include else "Curved face only")
    return body, f"Hemisphere radius {cm(r)}. " + ("Include the flat circular face." if include else "Count the curved face only.")


def planar(spec):
    dims = spec.dims
    a, b = dims[:2]
    if spec.kind == "rectangle":
        unit = dims[2]
        body = shape("M100 54H293V182H100Z") + label(197, 42, f"{a} {unit}") + label(304, 124, f"{b} {unit}", "start")
        return body, f"Rectangle {a} {unit} by {b} {unit}."
    if spec.kind == "triangle-edges":
        c = dims[2]
        body = shape("M91 174H310L186 48Z") + label(200, 200, cm(a)) + label(119, 106, cm(b))
        body += label(283, 105, cm(c))
        return body, f"Triangle sides {cm(a)}, {cm(b)} and {cm(c)}."
    if spec.kind in {"triangle-height", "parallelogram", "trapezium"}:
        height = b if spec.kind != "trapezium" else dims[2]
        body = line(169, 53, 169, 174, True) + right_angle(169, 174)
        body += label(181, 143, cm(height), "start")
        if spec.kind == "triangle-height":
            outline = shape("M77 174H320L169 53Z")
            body = outline + body + label(202, 199, cm(a))
            return body, f"Triangle base {cm(a)} and dashed perpendicular height {cm(height)}."
        if spec.kind == "parallelogram":
            outline = shape("M76 174H270L363 53H169Z")
            side = dims[2]
            edge = label(289, 117, cm(side)) if side else ""
            return outline + body + label(177, 199, cm(a)) + edge, \
                f"Parallelogram base {cm(a)} and dashed perpendicular height {cm(height)}." + (f" The sloping side is {cm(side)}." if side else "")
        top, bottom = sorted((a, b))
        outline = shape("M57 174H343L278 53H122Z")
        side = dims[3]
        edges = label(70, 107, cm(side)) + label(334, 107, cm(side)) if side else ""
        return outline + body + label(200, 42, cm(top)) + label(201, 201, cm(bottom)) + edges, \
            f"Trapezium parallel sides {cm(top)} and {cm(bottom)}. Perpendicular height {cm(height)}." + (f" Both sloping sides are {cm(side)}." if side else "")
    if spec.kind == "corner":
        cut_a, cut_b = dims[2:]
        body = shape("M70 56H235V104H322V178H70Z") + shape("M235 56H322V104H235Z", "none", True)
        body += label(192, 41, cm(a)) + label(59, 124, cm(b), "end")
        body += label(279, 79, cm(cut_a)) + label(334, 92, cm(cut_b), "start")
        return body, f"{cm(a)} by {cm(b)} rectangle with {cm(cut_a)} by {cm(cut_b)} removed from the top-right corner."
    mouth, depth, short = dims[2:]
    if short:
        body = shape("M61 64H322V94H257V126H322V158H61Z")
        body += line(322, 94, 322, 126, True) + label(288, 82, cm(depth))
        body += label(330, 119, cm(mouth), "start") + label(192, 52, cm(a)) + label(49, 118, cm(b), "end")
    else:
        body = shape("M78 64H154V122H240V64H328V177H78Z")
        body += line(154, 64, 240, 64, True) + label(196, 80, cm(mouth))
        body += label(145, 105, cm(depth), "end") + label(206, 202, cm(a)) + label(338, 124, cm(b), "start")
    edge = "short" if short else "long"
    return body, f"Rectangle {cm(a)} by {cm(b)}. The notch in a {edge} edge is {cm(mouth)} wide and {cm(depth)} deep."


def prism(spec):
    a, b, *remaining = spec.dims
    if spec.kind == "cuboid":
        h, = remaining
        body = shape("M72 88l54-39h201v101l-54 40H72Z")
        body += shape("M72 88h201v102M273 88l54-39", "none")
        body += label(171, 214, cm(a)) + label(319, 183, cm(b)) + label(62, 144, cm(h), "end")
        return body, f"Cuboid dimensions {cm(a)} by {cm(b)} by {cm(h)}."
    if spec.kind == "triangular-prism":
        length, = remaining
        body = shape("M58 174l76-124 118-19 89 124-118 19Z")
        body += shape("M58 174l76-124 89 124Z", AQUA) + line(134, 50, 134, 174, True) + right_angle(134, 174)
        body += label(137, 200, cm(a)) + label(143, 127, cm(b), "start")
        body += label(220, 20, f"Prism length {cm(length)}")
        return body, f"Triangular prism with base {cm(a)}, perpendicular height {cm(b)} and prism length {cm(length)}."
    c, length = remaining
    if c is None:
        body = shape("M182 134V27l124 107Z", WASH) + shape("M107 164V57l124 107Z", AQUA)
        body += shape("M107 154h10v10", "none")
        body += label(157, 189, cm(a)) + label(98, 117, cm(b), "end") + label(248, 213, "Two matching ends")
        return body, f"Two matching right-angled triangular ends with perpendicular sides {cm(a)} and {cm(b)}."
    body = shape("M99 91h192v61H99Z") + line(147, 91, 147, 152) + line(211, 91, 211, 152)
    body += shape("M99 91v-64l48 64Z", AQUA) + shape("M99 81h10v10", "none")
    body += shape("M99 152h48l-48 64Z", AQUA) + shape("M99 162h10v-10", "none")
    body += label(123, 123, cm(a)) + label(179, 123, cm(b)) + label(251, 123, cm(c))
    body += line(297, 91, 297, 152) + line(294, 91, 300, 91) + line(294, 152, 300, 152)
    body += label(305, 126, cm(length), "start")
    return body, f"Prism net. Side-panel widths {cm(a)}, {cm(b)}, {cm(c)}. Each panel is {cm(length)} long."


def solid(spec):
    a, b, *tail = spec.dims
    if spec.kind == "pyramid":
        h, = tail
        body = shape("M198 27L70 159l68 34h193l-69-34Z")
        body += shape("M198 27l-60 166M198 27l133 166M70 159h192l69 34", "none")
        body += line(198, 27, 198, 176, True) + centre(198, 176)
        body += line(198, 101, 289, 92) + label(299, 97, cm(h), "start")
        body += label(226, 216, cm(a)) + label(93, 195, cm(b))
        return body, f"Rectangular pyramid base {cm(a)} by {cm(b)}. Dashed perpendicular height {cm(h)}."
    if spec.kind == "pyramid-net":
        h, = tail
        body = shape("M155 79H235V159H155Z", AQUA)
        body += shape("M155 79l40-61 40 61ZM235 79l61 40-61 40ZM155 159l40 61 40-61ZM155 79l-61 40 61 40Z")
        body += line(195, 18, 195, 79, True) + right_angle(195, 79)
        body += line(195, 59, 260, 49) + label(268, 54, cm(b), "start") + label(195, 126, cm(a))
        return body, f"Square pyramid net. Each base edge is {cm(a)}. Face slant height {cm(b)}. The internal height {cm(h)} is not part of the net."
    if spec.kind == "cone":
        slant, = tail
        body = shape("M195 28L102 168a93 21 0 0 0 186 0Z")
        body += ellipse(195, 168, 93, 21, AQUA)
        body += line(195, 28, 195, 168, True) + line(195, 168, 288, 168) + shape("M195 158h10v10", "none")
        body += line(288, 168, 302, 193) + label(309, 198, cm(a), "start") + label(267, 79, cm(slant), "start")
        if b is not None:
            body += label(182, 136, cm(b), "end")
        alt = f"Cone radius {cm(a)}, slant height {cm(slant)}."
        return body, alt + (f" Dashed perpendicular height {cm(b)}." if b is not None else "")
    if spec.kind == "frustum":
        small, *slant = tail
        body = shape("M172 88H226L284 184q-85 44-170 0Z", AQUA)
        body += shape("M172 88l27-50 27 50", "none", True)
        body += ellipse(199, 88, 27, 10, WASH)
        body += ellipse(199, 184, 85, 20, "none", True)
        body += line(199, 38, 199, 184, True) + line(199, 184, 284, 184)
        body += line(199, 88, 226, 88) + line(226, 88, 277, 60)
        body += label(288, 66, cm(small), "start") + line(284, 184, 298, 202)
        body += label(306, 208, cm(a), "start")
        body += line(108, 38, 108, 184) + line(103, 38, 113, 38) + line(103, 184, 113, 184)
        body += label(98, 125, cm(b), "end")
        if slant:
            body += label(295, 128, cm(slant[0]), "start")
        return body, f"Original cone radius {cm(a)}, height {cm(b)}. The dashed removed cone has radius {cm(small)}." + (f" Original slant height {cm(slant[0])}." if slant else "")
    body = shape("M112 84H282v89a85 22 0 0 1-170 0Z")
    if spec.kind == "dome":
        body = shape("M112 84a85 61 0 0 1 170 0v89a85 22 0 0 1-170 0Z")
        body += ellipse(197, 84, 85, 20, "none", True)
    else:
        body += ellipse(197, 84, 85, 22, AQUA)
    body += line(197, 84, 282, 84) + centre(197, 84)
    body += line(282, 84, 304, 69) + label(312, 74, cm(a), "start")
    body += line(292, 84, 292, 173) + line(289, 84, 295, 84) + line(289, 173, 295, 173)
    body += label(300, 138, cm(b), "start")
    if spec.kind == "bore":
        inner, = tail
        body += ellipse(197, 84, 33, 11, "#f9fcff")
        body += line(164, 84, 164, 172, True) + line(230, 84, 230, 172, True)
        body += line(197, 84, 230, 84) + line(223, 77, 276, 40, colour=ORANGE)
        body += label(282, 44, cm(inner), "start")
        return body, f"Cylinder outer radius {cm(a)} and height {cm(b)}. Through-hole radius {cm(inner)}."
    if spec.kind == "dome":
        return body, f"Cylinder height {cm(b)} and hemisphere have common radius {cm(a)}. The dashed seam is internal."
    return body, f"Cylinder radius {cm(a)} and perpendicular height {cm(b)}."


def illustration(spec, part="", width=WIDTH):
    if spec.kind in {"circle", "sector", "ring", "sphere", "hemisphere"}:
        diagram, alt = circle_diagram(spec)
    elif spec.kind in {"rectangle", "triangle-edges", "triangle-height", "parallelogram", "trapezium", "corner", "notch"}:
        diagram, alt = planar(spec)
    elif spec.kind in {"triangular-prism", "cuboid", "prism-net"}:
        diagram, alt = prism(spec)
    else:
        diagram, alt = solid(spec)
    checksum = sha256((alt + diagram).encode()).hexdigest()[:12]
    name = f"audit-0580-{spec.kind}-{checksum}.svg"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title">'
        f'<title id="title">{escape(alt)}</title><rect width="{WIDTH}" height="{HEIGHT}" rx="12" fill="#f9fcff"/>'
        f'<g font-size="16" font-weight="600" font-family="system-ui, sans-serif">{diagram}'
        f'<text x="200" y="235" text-anchor="middle" font-size="13" fill="#455c73">Sketch not to scale</text></g></svg>\n'
    )
    (ASSETS / name).write_text(svg, encoding="utf-8", newline="\n")
    prefix = f"<p><strong>Part {part}.</strong></p>" if part else ""
    height = round(width / WIDTH * HEIGHT)
    return f'{prefix}<p><img src="{ASSET_PATH + name}" alt="{escape(alt, quote=True)}" width="{width}" height="{height}"></p>'


def check_result(model, expected, uid):
    assert (model.result, model.with_pi) == number(expected), (uid, model, expected)


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main():
    study_path = CONTENT / "mensuration-study.json"
    study = json.loads(study_path.read_text(encoding="utf-8"))
    bank = json.loads((CONTENT / "mensuration-v1.json").read_text(encoding="utf-8"))
    methods = set(study) - {PREFIX + name for name in ("metric", "units")}
    counts = Counter()
    for uid in sorted(methods):
        topic = study[uid]
        for entry in topic["examples"]:
            prompt = FIGURE.sub("", entry["question"])
            model = from_prompt(prompt.split("</p>", 1)[0], uid)
            final = FORMULA.search(entry["solution"][-1])[1]
            check_result(model, final, uid)
            figure = illustration(model)
            entry["solution"] = [step for step in entry["solution"] if not FIGURE.search(step)]
            entry["question"] = prompt
            if model.solution_only:
                entry["solution"].insert(-1, figure)
            else:
                entry["question"] += figure
            counts["worked examples"] += 1
        checks = [b for section in topic["sections"] for b in section["blocks"] if b["kind"] == "check"] + topic["extraPractice"]
        for entry in checks:
            prompt = FIGURE.sub("", entry["prompt"])
            model = from_prompt(prompt.split("</p>", 1)[0], entry["id"])
            check_result(model, entry["field"]["expected"], entry["id"])
            figure = illustration(model)
            entry["solution"] = FIGURE.sub("", entry["solution"])
            entry["prompt"] = prompt
            if model.solution_only:
                entry["solution"] += figure
            else:
                entry["prompt"] += figure
            counts["study checks"] += 1
        topic["updatedOn"] = "2026-11-22"
        revision = topic["revision"]
        revision["body"] = re.sub(r'<p><img\b[^>]*></p>', "", revision["body"])
        prompt, answer = FIGURE.sub("", revision["checks"]).split("</p>", 1)
        model = from_prompt(prompt, uid)
        check_result(model, FORMULA.search(answer)[1], uid)
        revision["checks"] = prompt + "</p>" + illustration(model, width=240) + answer
        counts["revision checks"] += 1
    projection = {}
    for entry in bank["questions"]:
        uid = entry["id"]
        if uid.rsplit("-", 2)[0] not in methods:
            continue
        prompt = entry["prompt_html"]
        if entry["collection"] == "exam":
            parts = re.findall(r"<li>\s*(<p>.*?)</p>", prompt)
        else:
            parts = [prompt.split("</p>", 1)[0]]
        answers = FORMULA.findall(entry["answer_html"])
        assert len(parts) == len(answers), uid
        models = [from_prompt(part.removeprefix("<p>"), uid) for part in parts]
        for model, answer in zip(models, answers, strict=True):
            check_result(model, answer, uid)
            counts["bank answer parts"] += 1
        if entry["fields"]:
            check_result(models[0], entry["fields"][0]["expected"], uid)
        placement = "solution" if len(parts) > 1 or any(spec.solution_only for spec in models) else "prompt"
        projection[uid] = {placement: "".join(
            illustration(model, chr(97 + i) if len(parts) > 1 else "") for i, model in enumerate(models)
        )}
        counts[f"bank {placement} entries"] += 1
    write(study_path, study)
    write(CONTENT / "mensuration-practice-diagrams.json", projection)
    print(dict(counts))


if __name__ == "__main__":
    main()
