"""Draw and check the original 0606 circular-measure problems from their stated data."""

import hashlib
import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from html import escape
from pathlib import Path

from sympy import Rational, pi, simplify, sin, sqrt, tan


ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content/original/0606"
PUBLIC = "/assets/study/0606/circular-measure"
ASSETS = ROOT / "public" / PUBLIC.lstrip("/")
WIDTH, HEIGHT = 400, 254
BLUE, TEAL, INK, MUTED = "#195795", "#11745d", "#1d3455", "#526887"
PALE, LIGHT = "#d8f0e7", "#dce9f9"
MATH = re.compile(r"\\\((.*?)\\\)")
TRACK_OLD = "with a semicircle added to each shorter edge."
TRACK_NEW = "with a semicircle added to each edge whose length is the stated width."


@dataclass(frozen=True)
class Model:
    kind: str
    dimensions: tuple
    answers: tuple
    requires_solution: bool = False


def exact(text):
    text = text.replace(r"^\circ", "").replace(" ", "").replace("−", "-")
    text = re.sub(r"\\frac\{(-?\d+)\}\{(\d+)\}", r"(\1/\2)", text)
    text = re.sub(r"\\sqrt\{(\d+)\}", r"R\1", text).replace(r"\pi", "π")
    terms = re.findall(r"[+-]?[^+-]+", text)
    total = 0
    for term in terms:
        match = re.fullmatch(r"([+-]?)(\(?\d+(?:/\d+)?\)?)?([π]|R\d+)?", term)
        if not match or not any(match.groups()[1:]):
            raise ValueError(f"Unsupported number in circular-measure record: {term}")
        sign, coefficient, constant = match.groups()
        radical = pi if constant == "π" else sqrt(int(constant[1:])) if constant else 1
        total += (-1 if sign == "-" else 1) * Rational((coefficient or "1").strip("()")) * radical
    return total


def model(prompt):
    intro, rest = prompt.split("</p>", 1)
    intro = intro.removeprefix("<p>")
    numbers = [exact(term) for term in MATH.findall(intro) if re.search(r"\d", term)]
    if intro.startswith("A scanner arm"):
        r, degrees = numbers
        angle = degrees*pi/180
        return Model("turn-degrees", (r, angle, degrees, 1), (angle, r*angle, 2*pi-angle))
    if intro.startswith("A marker on the rim"):
        r, angle = numbers
        return Model("turn-radians", (r, angle, None, 1), (180*angle/pi, r*angle, 2*pi-angle))
    if intro.startswith("A control knob"):
        r, degrees, moves = numbers
        angle = degrees*pi/180
        total = moves*angle
        return Model("turn-degrees", (r, angle, degrees, moves), (total, r*total, total % (2*pi)))
    if intro.startswith("A curved edge") or intro.startswith("A complete sector boundary"):
        r, value = numbers
        perimeter = intro.startswith("A complete sector boundary")
        angle = (value-2*r)/r if perimeter else value
        longer = re.search(r"radius \\\((\d+)\\\) cm longer", rest)
        enlarged = (r+int(longer[1]))*(2+angle) if longer else None
        return Model("arc", (r, angle), (angle if perimeter else r*angle, r*(2*pi-angle), enlarged), perimeter)
    if intro.startswith("A sector of radius") or intro.startswith("The perimeter of a sector"):
        r, value, radius2 = numbers
        fixed_area = intro.startswith("The perimeter of a sector")
        if fixed_area:
            angle = (value-2*r)/r
            angle2 = angle*(r/radius2)**2
            answers = (angle, r*r*angle/2, angle2)
        else:
            angle = value
            angle2 = r*angle/radius2
            answers = (angle2, 2*radius2+r*angle, None)
        return Model("equal-area" if fixed_area else "equal-arc", (r, angle, radius2, angle2), answers, True)
    if intro.startswith("A sector has radius") or intro.startswith("A circular sector has area") or intro.startswith("The curved boundary"):
        x, y = numbers
        if intro.startswith("A sector has radius"):
            r, angle = x, y
            answer = r*r*angle/2
            inverse = False
        else:
            if intro.startswith("A circular sector has area"):
                angle = y
                r = sqrt(2*x/angle)
                answer = r
            else:
                r = 2*y/x
                angle = x/r
                answer = r
            inverse = True
        return Model("sector-area", (r, angle), (answer, r*(2+angle), 2*r*r*angle), inverse)
    if intro.startswith("A chord"):
        r, angle = numbers
        chord = 2*r*sin(angle/2)
        triangle = r*r*sin(angle)/2
        minor = r*r*angle/2-triangle
        major = r*r*pi-minor
        # Older prompts place a generic image before their first question.
        first = re.sub(r'<p><img\b[^>]*></p>', "", rest).split("</p>")[0]
        if "larger circular segment" in first:
            return Model("major", (r, angle), (major, chord, r*(2*pi-angle)+chord))
        if "smaller circular segment" in first:
            return Model("minor", (r, angle), (minor, chord, r*angle+chord))
        return Model("chord", (r, angle), (chord, triangle, minor))
    if intro.startswith("A ring sector"):
        a, b, c = numbers
        if "between radii" in intro:
            inner, outer, angle = a, b, c
            area = (outer**2-inner**2)*angle/2
            answer = area
            unknown = False
        elif "inner radius" in intro:
            inner, outer = a, b
            angle = (c-2*(outer-inner))/(outer+inner)
            area = (outer**2-inner**2)*angle/2
            answer = angle
            unknown = True
        else:
            width, angle, area = a, b, c
            inner = area/(angle*width)-width/2
            outer = inner+width
            answer = inner
            unknown = True
        perimeter = 2*(outer-inner)+(inner+outer)*angle
        return Model("ring", (inner, outer, angle), (answer, area if "total perimeter" in intro else perimeter,
                     (outer-inner)*angle), unknown)
    if intro.startswith("A running track"):
        length, width = numbers
        r = width/2
        return Model("track", (length, width), (2*length+width*pi, length*width+r*r*pi, 4*width))
    if intro.startswith("A circle has centre"):
        r, angle = numbers
        tangent = r*tan(angle/2)
        return Model("tangents", (r, angle), (tangent, r*tangent, r*tangent-r*r*angle/2))
    if intro.startswith("Two circles have equal radius"):
        r, = numbers
        return Model("lens", (r,), (2*pi/3, 4*r*pi/3, 2*r*r*pi/3-r*r*sqrt(3)/2))
    if intro.startswith("A rectangle is"):
        width, height, r = numbers
        return Model("quadrant", (width, height, r), (width*height-pi*r*r/4,
                     2*(width+height-r)+pi*r/2, 2*r-pi*r/2))
    if intro.startswith("A window is"):
        width,area = numbers
        r = width/2
        height = (area-pi*r*r/2)/width
        return Model("window", (width, height), (height, width+2*height+pi*r, height+r), True)
    return None


def point(cx, cy, radius, angle):
    return cx+radius*math.cos(angle), cy+radius*math.sin(angle)


def coordinate(position):
    return " ".join(f"{value:.4f}" for value in position)


def arc(radius, angle, destination, sweep=1):
    return f"A {radius:.4f} {radius:.4f} 0 {int(angle>math.pi)} {sweep} {coordinate(destination)}"


def path(commands, stroke=BLUE, fill="none", dashed=False):
    dash = ' stroke-dasharray="4 4"' if dashed else ""
    return f'<path d="{commands}" fill="{fill}" stroke="{stroke}" stroke-width="2"{dash}/>'


def line(a, b, **style):
    return path(f"M {coordinate(a)} L {coordinate(b)}", **style)


def circle(x, y, radius, stroke=MUTED, fill="none"):
    return f'<circle cx="{x:.4f}" cy="{y:.4f}" r="{radius:.4f}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'


def label(x, y, content, alignment="start", colour=INK):
    return f'<text x="{x:.4f}" y="{y:.4f}" text-anchor="{alignment}" fill="{colour}">{escape(str(content))}</text>'


def quantity(x, y, prefix, coefficient, unit, constant=""):
    """Stack fractions in SVGs, using centred figures and fixed reading order."""
    n, d = Rational(coefficient).as_numer_denom()
    if d == 1:
        magnitude = "" if n == 1 and constant else str(n)
        return label(x, y, f"{prefix}{magnitude}{constant}{unit}")
    digit_width = max(len(str(n)), len(str(d)))*10
    start = x + len(prefix)*9
    centre = start + digit_width/2
    return (label(x, y, prefix) + label(centre, y-10, n, "middle") +
            line((start-1, y-5), (start+digit_width+1, y-5), stroke=INK) +
            label(centre, y+12, d, "middle") + label(start+digit_width+8, y, constant+unit))


def angle_label(x, y, angle, degrees=None, prefix="θ = "):
    if degrees is not None:
        return label(x,y,f"{prefix}{degrees}°")
    return quantity(x,y,prefix,angle/pi," rad","π")


def sector(cx, cy, radius, angle, mode):
    f = float(angle)
    if not 0 < f < 2*math.pi:
        raise ValueError(f"Unplottable angle {angle}")
    first, last = (point(cx, cy, radius, direction) for direction in (-f/2,f/2))
    centre = coordinate((cx,cy))
    a, b = coordinate(first), coordinate(last)
    boundary = arc(radius,f,last)
    small = min(21,radius*.26)
    origin, destination = (point(cx,cy,small,direction) for direction in (-f/2,f/2))
    marker = path(f"M {coordinate(origin)} {arc(small,f,destination)}", TEAL)
    reference = circle(cx,cy,radius)
    if mode in {"minor","major","chord"}:
        shade = ""
        if mode == "minor":
            shade = path(f"M {a} {boundary} Z",TEAL,PALE)
        elif mode == "major":
            shade = path(f"M {b} {arc(radius,2*math.pi-f,first)} Z",TEAL,PALE)
        mid_x = first[0]
        bisect = line((cx,cy),(mid_x,cy),stroke=MUTED,dashed=True)
        if mid_x-cx >= 14:
            bisect += path(f"M {mid_x-8:.4f} {cy:.4f} v -8 h 8",MUTED)
        return (reference + shade + path(f"M {a} L {centre} L {b}",MUTED) +
                line(first,last) + bisect + marker +
                label(first[0]+8,first[1]-4,"A") + label(last[0]+8,last[1]+18,"B") +
                label(cx-9,cy+16,"O","end"))
    fill = PALE if mode in {"sector-area","equal-area"} else "none"
    return (reference + path(f"M {centre} L {a} {boundary} Z",BLUE,fill) +
            path(f"M {a} {boundary}",TEAL) + marker + circle(cx,cy,2.4,INK,INK))


def ring(inner, outer, angle):
    cx,cy,radius = 184,114,90
    r = float(inner/outer)*radius
    f = float(angle)
    a,b = (point(cx,cy,radius,value) for value in (-f/2,f/2))
    c,d = (point(cx,cy,r,value) for value in (f/2,-f/2))
    return (path(f"M {coordinate(a)} {arc(radius,f,b)} L {coordinate(c)} {arc(r,f,d,0)} Z",TEAL,PALE) +
            line((cx,cy),a,stroke=MUTED,dashed=True) + line((cx,cy),b,stroke=MUTED,dashed=True) +
            label(cx-7,cy+5,"O","end") + line((cx+radius,cy),(303,cy),stroke=TEAL) +
            label(308,cy+5,"Outer arc",colour=TEAL) + line((cx+r,cy),(cx+max(28,r-20),cy-37),stroke=MUTED) +
            label(cx+max(28,r-20),cy-45,"Inner arc","middle",MUTED))


def tangents(angle):
    f = float(angle)
    r = min(87,255/(1+1/math.cos(f/2)))
    cx,cy = 127,116
    a,b = (point(cx,cy,r,value) for value in (-f/2,f/2))
    t = (cx+r/math.cos(f/2),cy)
    result = (circle(cx,cy,r) + path(f"M {coordinate(a)} L {coordinate(t)} L {coordinate(b)} {arc(r,f,a,0)} Z",TEAL,PALE) +
              path(f"M {coordinate(a)} L {cx} {cy} L {coordinate(b)}",MUTED) +
              line((cx,cy),t,stroke=MUTED,dashed=True))
    for vertex, name, offset in ((a,"A",-8),(b,"B",21)):
        u = tuple((end-start)/r*8 for start,end in zip(vertex,(cx,cy)))
        length = math.dist(vertex,t)
        v = tuple((end-start)/length*8 for start,end in zip(vertex,t))
        corner,first,last = [tuple(coord+addition for coord, addition in zip(vertex,delta))
                             for delta in (tuple(x+y for x,y in zip(u,v)),u,v)]
        result += (path(f"M {coordinate(first)} L {coordinate(corner)} L {coordinate(last)}",INK) +
                   label(vertex[0],vertex[1]+offset,name,"middle"))
    small = 22
    a,b = (point(cx,cy,small,value) for value in (-f/2,f/2))
    return (result + path(f"M {coordinate(a)} {arc(small,f,b)}",TEAL) +
            label(cx-8,cy+16,"O","end") + label(t[0]+12,t[1]+5,"T"))


def track(length, width):
    scale = min(310/float(length+width),164/float(width))
    r = float(width)*scale/2
    straight = float(length)*scale
    left,right = 200-straight/2,200+straight/2
    high,low = 115-r,115+r
    boundary = (f"M {left} {high} H {right} {arc(r,math.pi,(right,low))}"
                f" H {left} {arc(r,math.pi,(left,high))} Z")
    return (path(boundary,TEAL,PALE) + line((left,high),(left,low),stroke=MUTED,dashed=True) +
            line((right,high),(right,low),stroke=MUTED,dashed=True) +
            label(200,high-10,f"{length} m","middle") + label((left+right)/2,122,f"{width} m","middle"))


def lens():
    x1,x2,y,r = 161,239,113,78
    a,b = ((200,y+r*math.sin(f*math.pi/3)) for f in (-1,1))
    return (circle(x1,y,r) + circle(x2,y,r) +
            path(f"M {coordinate(a)} {arc(r,2*math.pi/3,b)} {arc(r,2*math.pi/3,a)} Z",TEAL,PALE) +
            line(a,b,stroke=MUTED,dashed=True) +
            path(f"M {coordinate(a)} L {x1} {y} L {coordinate(b)} L {x2} {y} Z",MUTED,dashed=True) +
            line((x1,y),(x2,y),stroke=MUTED,dashed=True) +
            label(200,a[1]-9,"A","middle") + label(200,b[1]+21,"B","middle") +
            label(x1-7,y-4,"O₁","end") + label(x2+7,y-4,"O₂"))


def cut_corner(width, height, radius):
    scale = min(284/float(width),148/float(height))
    half = float(width)*scale/2
    x,right,y = 200-half,200+half,42
    bottom,r = y+float(height)*scale,float(radius)*scale
    cut = (x+r,y)
    return (path(f"M {coordinate(cut)} H {right} V {bottom} H {x} V {y+r} {arc(r,math.pi/2,cut,0)} Z",TEAL,PALE) +
            path(f"M {x} {y+r} V {y} H {x+r}",MUTED,dashed=True) +
            label(17,228,f"{width} cm by {height} cm") + quantity(201,228,"Cut-out radius = ",radius," cm"))


def window(width, height):
    scale = min(220/float(width),157/float(height+width/2))
    r = float(width)*scale/2
    x,right = 200-r,200+r
    seam,y = 39+r,39+r+float(height)*scale
    return (path(f"M {x} {y} V {seam} {arc(r,math.pi,(right,seam))} V {y} Z",TEAL,PALE) +
            line((x,seam),(right,seam),stroke=MUTED,dashed=True) +
            quantity(16,229,"Width = ",width," cm") + quantity(215,229,"Height = ",height," cm"))


def save_figure(kind, shapes, alt, height=HEIGHT):
    contents = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{height}" viewBox="0 0 {WIDTH} {height}" role="img" aria-labelledby="t">'
                f'<title id="t">{escape(alt)}</title><rect width="{WIDTH}" height="{height}" rx="12" fill="#f4f7fc"/>'
                f'<g font-family="system-ui, sans-serif" font-size="15" stroke-linecap="round" stroke-linejoin="round">{shapes}</g></svg>\n')
    # Several variants have the same geometric data. Reuse one byte-identical asset.
    suffix = hashlib.sha256(contents.encode("utf-8")).hexdigest()[:12]
    filename = f"audit-{kind}-{suffix}.svg"
    (ASSETS/filename).write_text(contents,encoding="utf-8", newline="\n")
    return f'<p><img src="{PUBLIC}/{filename}" alt="{escape(alt, quote=True)}" width="{WIDTH}" height="{height}"></p>'


def drawing(spec):
    kind, values = spec.kind, spec.dimensions
    if kind == "ring":
        inner,outer,angle = values
        shapes = (ring(*values) + quantity(17,226,"r = ",inner," cm") +
                  quantity(137,226,"R = ",outer," cm") + angle_label(270,226,angle))
        alt = f"Ring sector with inner radius {inner} cm, outer radius {outer} cm and common angle {angle/pi} times pi radians."
    elif kind == "track":
        length,width = values
        shapes = track(*values) + label(200,231,"Each dashed seam is a diameter.","middle")
        alt = f"Track with two straight sides of {length} m. Each semicircle has diameter {width} m."
    elif kind == "lens":
        r, = values
        shapes = lens() + quantity(16,228,"Radius = ",r," cm") + label(390,228,"Lens shaded","end",TEAL)
        alt = f"Two circles of radius {r} cm, each centre lying on the other circle. The lens between their arcs is shaded."
    elif kind == "quadrant":
        width,height,r = values
        shapes = cut_corner(*values)
        alt = f"Rectangle {width} cm by {height} cm with a quadrant of radius {r} cm removed from the upper left corner."
    elif kind == "window":
        width,height = values
        shapes = window(*values)
        alt = f"Window with a {width} cm wide semicircle above a rectangular {height} cm tall pane."
    elif kind in {"equal-arc","equal-area"}:
        r,angle,r2,angle2 = values
        scale = 68/float(max(r,r2))
        shapes = (sector(100,105,float(r)*scale,angle,kind) + sector(300,105,float(r2)*scale,angle2,kind) +
                  quantity(16,194,"r₁ = ",r," cm") + quantity(216,194,"r₂ = ",r2," cm") +
                  angle_label(16,237,angle,prefix="θ₁ = ") + angle_label(216,237,angle2,prefix="θ₂ = "))
        same = "equal arcs" if kind == "equal-arc" else "equal areas"
        alt = f"Sectors on the same scale have {same}. Their radii are {r} cm and {r2} cm, and their angles are {angle/pi} and {angle2/pi} times pi radians."
    else:
        r, angle, *extra = values
        shapes = tangents(angle) if kind == "tangents" else sector(191,112,86,angle,kind)
        degrees = extra[0] if extra else None
        moves = extra[1] if extra else 1
        shapes += quantity(16,230,"r = ",r," cm")
        shapes += angle_label(142,230,angle,degrees)
        if moves>1:
            shapes += label(389,230,f"{moves} equal moves","end")
        alt = {
            "tangents":"Gap between tangents at A and B, meeting at T, and minor arc AB.",
            "minor":"Smaller region between chord AB and its arc is shaded.",
            "major":"Larger region between chord AB and its arc is shaded.",
            "chord":"Chord AB is bisected by the perpendicular from the centre O.",
            "arc":"The chosen arc is highlighted.",
            "sector-area":"The sector is shaded.",
            "turn-degrees":"The traced arc shows one movement.",
            "turn-radians":"The traced arc shows the given rotation.",
        }[kind]
        alt += f" Radius {r} cm. Angle {degrees} degrees." if degrees is not None else f" Radius {r} cm. Angle {angle/pi} times pi radians."
        if moves>1:
            alt += f" Repeat the illustrated movement {moves} times in the same direction."
    return save_figure(kind,shapes,alt)


FIGURE = re.compile(r'<p>(?:<img\b[^>]*src="' + re.escape(PUBLIC) + r'/[^">]+"[^>]*>)+</p>')


def attach(prompt, figure):
    prompt = FIGURE.sub("",prompt)
    first,rest = prompt.split("</p>",1)
    return first + "</p>" + figure + rest


def p(math_or_text):
    return f"<p>{math_or_text}</p>"


def first_step(spec):
    kind, values = spec.kind, spec.dimensions
    if kind == "arc":
        return r"Use \(s=r\theta\) for the curved edge. A complete sector perimeter adds two straight radii."
    if kind in ("equal-arc","equal-area"):
        return (r"Compare \(r\theta\) on both circles." if kind == "equal-arc" else
                r"Compare \(r^2\theta\) on both circles. The common factor \(\frac12\) cancels.")
    if kind == "sector-area":
        return (r"Set \(A=\frac12r^2\theta\). If the problem gives the arc, substitute \(s=r\theta\) to get \(A=\frac12rs\)." if spec.requires_solution else
                r"The fraction of the circle is \(\frac{\theta}{2\pi}\). Multiply it by the whole area \(\pi r^2\).")
    if kind == "minor":
        return r"The two radii and the chord enclose a triangle. Subtract that triangle from the sector."
    if kind == "major":
        return r"Use the smaller angle to find the minor segment first. Subtract that area from the entire disc."
    if kind == "chord":
        return r"Bisect the chord through \(O\). The half-chord is opposite the half-angle in a right triangle."
    if kind == "ring":
        return (r"Each straight end is \(R-r\). Add both arcs, each using the common central angle."
                if spec.requires_solution else r"Subtract two sector areas with the same angle. Subtract the squares of the radii.")
    if kind == "track":
        return r"The dashed diameters lie inside the track. Count the two straight lengths and the two semicircles on the outline."
    if kind == "tangents":
        return r"The right angles are at \(A\) and \(B\). Work in triangle \(OAT\), where \(OT\) bisects angle \(AOB\)."
    if kind == "lens":
        return r"Join both centres to \(A\) and \(B\). Each triangle with two centres has three sides equal to the radius."
    if kind == "turn-degrees":
        return r"Total the degrees across the movements. Use \(180^\circ=\pi\) radians to convert the total." if values[-1]>1 else r"Write the given angle as a fraction of \(180^\circ\), then multiply that fraction by \(\pi\)."
    return r"Cancel the factor of \(\pi\) by multiplying the given angle by \(\frac{180^\circ}{\pi}\)."


def check_exact(actual, expected, identity):
    if simplify(actual-expected) != 0:
        raise ValueError(f"{identity}: model gives {actual}, source gives {expected}")


def authored_field(expected):
    # Published scalar fields express constants with explicit pi and sqrt(n).
    normalized = expected.replace("*","").replace("pi",r"\pi")
    normalized = re.sub(r"sqrt\((\d+)\)",r"\\sqrt{\1}",normalized)
    normalized = normalized.replace("(","").replace(")","")
    return exact(normalized)


def examples_and_checks(data):
    counts = Counter()
    for lesson_id, lesson in data.items():
        for example in lesson["examples"]:
            prompt = example["question"].replace(TRACK_OLD,TRACK_NEW)
            spec = model(prompt)
            figure = drawing(spec)
            cue = p(first_step(spec))
            example["solution"] = [step for step in example["solution"] if step != cue and not FIGURE.fullmatch(step)]
            example["solution"].insert(0,cue)
            if spec.requires_solution:
                example["solution"].append(figure)
            else:
                prompt = attach(prompt,figure)
            example["question"] = prompt
            numeric_answers = re.findall(r"<p>\\\((.+?)\\\) (?:cm²|m²|cm|rad|°|m)\.</p>","".join(example["solution"]))
            expected = [answer for answer in spec.answers if answer is not None]
            if len(numeric_answers) != len(expected):
                raise ValueError(f"Unexpected number of final results in {lesson_id}: {numeric_answers} / {expected}")
            for correct, source in zip(expected,numeric_answers):
                check_exact(correct,exact(source),lesson_id)
            counts["examples"] += 1
            counts["worked number checks"] += len(expected)
        checks = [b for sec in lesson["sections"] for b in sec["blocks"] if b["kind"]=="check"] + lesson["extraPractice"]
        for check in checks:
            prompt = check["prompt"].replace(TRACK_OLD,TRACK_NEW)
            spec = model(prompt)
            check_exact(spec.answers[0],authored_field(check["field"]["expected"]),check["id"])
            figure = drawing(spec)
            check["solution"] = FIGURE.sub("",check["solution"])
            if spec.requires_solution:
                check["solution"] += figure
            else:
                prompt = attach(prompt,figure)
            check["prompt"] = prompt
            check["hint"] = p(first_step(spec))
            counts["checks"] += 1
        body = lesson["revision"]["body"]
        if lesson_id.endswith("chords-and-segments"):
            angle = pi/3
            figures = (sector(102,108,69,angle,"minor") + sector(298,108,69,angle,"major") +
                       label(102,22,"Minor segment","middle") + label(298,22,"Major segment","middle") +
                       quantity(83,201,"r = ",18," cm") + angle_label(234,201,angle))
            caption = "The two shaded segments are separated by the same chord AB. Radius 18 cm and angle pi over 3 radians."
            body = body.replace("The larger segment perimeter uses the major arc and the same chord. Neither radius is on the segment boundary.",
                                "Subtract the minor segment from the disc for the major area. Trace the major arc and the same chord for the perimeter.")
            lesson["revision"]["body"] = FIGURE.sub("",body) + save_figure("segment-comparison",figures,caption,218)
        elif lesson_id.endswith("compound-circular-shapes"):
            diagram = drawing(Model("track",(10,14),())).replace('width="400" height="254"','width="250" height="159"')
            lesson["revision"]["body"] = FIGURE.sub("",body) + diagram
    return counts


def practice_diagrams(questions):
    diagrams = {}
    counts = Counter()
    for question in questions:
        prompt = question["prompt_html"]
        spec = model(prompt)
        if not spec:
            raise ValueError(question["id"])
        answers = [exact(answer) for answer in MATH.findall(question["answer_html"])]
        expected = [answer for answer in spec.answers if answer is not None] if question["collection"]=="exam" else spec.answers[:1]
        if len(answers) != len(expected):
            raise ValueError(f"{question['id']}: unexpected worked answer count")
        for actual, source in zip(expected,answers):
            check_exact(actual,source,question["id"])
        if question["fields"]:
            check_exact(spec.answers[0],authored_field(question["fields"][0]["expected"]),question["id"])
        counts["practice number checks"] += len(answers)
        figure = drawing(spec)
        # Written answers belong in the worked solution. Keep original question IDs, keys and marks.
        with_solution = spec.requires_solution or question["collection"] == "exam"
        diagrams[question["id"]] = {"solution" if with_solution else "prompt":figure}
        counts["practice solution figures" if with_solution else "practice prompt figures"] += 1
        if TRACK_OLD in prompt:
            counts["track wording"] += 1
    return diagrams,counts


def write(path, data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")


def main():
    study = CONTENT / "circular-measure-study.json"
    authored = json.loads(study.read_text(encoding="utf-8"))
    questions = json.loads((CONTENT/"circular-measure-v1.json").read_text(encoding="utf-8"))["questions"]
    counts = examples_and_checks(authored)
    diagrams, practice_counts = practice_diagrams(questions)
    write(study,authored)
    write(CONTENT/"circular-measure-practice-diagrams.json",diagrams)
    print(dict(counts+practice_counts))


if __name__ == "__main__":
    main()
