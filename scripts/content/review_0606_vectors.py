"""Draw reviewed 0606 vector diagrams from the lesson and immutable bank data."""

import json
import re
from fractions import Fraction
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content/original/0606"
ASSETS = ROOT / "public/assets/study/0606/vectors"
ASSET_URL = "/assets/study/0606/vectors/"
WIDTH, HEIGHT = 440, 280
BLUE, GREEN, ORANGE = "#176d91", "#26754b", "#aa412d"


def add(a, b):
    return a[0] + b[0], a[1] + b[1]


def sub(a, b):
    return a[0] - b[0], a[1] - b[1]


def scale(k, a):
    return k * a[0], k * a[1]


def cross(a, b):
    return a[0] * b[1] - a[1] * b[0]


def scalar_tex(value):
    fraction = Fraction(value)
    if fraction.denominator == 1:
        return str(fraction.numerator)
    sign = "-" if fraction < 0 else ""
    return rf"{sign}\frac{{{abs(fraction.numerator)}}}{{{fraction.denominator}}}"


def column(vector):
    x, y = (scalar_tex(value) for value in vector)
    return rf"\begin{{pmatrix}}{x}\\{y}\end{{pmatrix}}"


def m(tex):
    return rf"\({tex}\)"


def p(text):
    return f"<p>{text}</p>"


def scalar(value):
    match = re.fullmatch(r"(-?)\\frac\{(\d+)\}\{(\d+)\}", value)
    if match:
        sign, numerator, denominator = match.groups()
        return Fraction(sign + numerator + "/" + denominator)
    return Fraction(value)


def columns(html):
    return [tuple(scalar(entry) for entry in match.split(r"\\"))
            for match in re.findall(r"\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}", html)]


def meeting(a, b, u, v):
    """Return independent arrival times, the crossing and the common-time outcome."""
    gap = sub(b, a)
    denominator = cross(u, v)
    arrival_a = cross(gap, v) / Fraction(denominator)
    arrival_b = cross(gap, u) / Fraction(denominator)
    point = add(a, scale(arrival_a, u))
    assert point == add(b, scale(arrival_b, v))
    return arrival_a, arrival_b, point, arrival_a == arrival_b and arrival_a >= 0


class Plot:
    def __init__(self, points):
        x, y = zip(*points)
        x_min, x_max, y_min, y_max = min(x), max(x), min(y), max(y)
        self.centre = ((x_min + x_max) / 2, (y_min + y_max) / 2)
        self.factor = min(324 / max(x_max - x_min, 1), 160 / max(y_max - y_min, 1))
        self.elements = []

    def at(self, point):
        x, y = sub(point, self.centre)
        return WIDTH / 2 + x * self.factor, HEIGHT / 2 + 11 - y * self.factor

    def line(self, start, finish, colour=BLUE, arrow=False, dashed=False):
        if start == finish:
            return
        x1, y1 = self.at(start)
        x2, y2 = self.at(finish)
        tip = f' marker-end="url(#{"green" if colour == GREEN else "blue"})"' if arrow else ""
        pattern = ' stroke-dasharray="5 5"' if dashed else ""
        self.elements.append(f'<path d="M{x1:.2f} {y1:.2f}L{x2:.2f} {y2:.2f}" '
                             f'fill="none" stroke="{colour}" stroke-width="3"{tip}{pattern}/>')

    def point(self, position, label, colour=BLUE, dy=-13, dx=0):
        x, y = self.at(position)
        self.elements.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4.6" fill="{colour}"/>')
        self.text(x + dx, y + dy, label, "middle", colour, 17)

    def text(self, x, y, label, anchor="middle", colour="#15283c", size=18):
        self.elements.append(
            f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}" fill="{colour}" '
            f'font-size="{size}">{escape(label)}</text>'
        )

    def finish(self, name, description):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
               f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title">\n'
               f'<title id="title">{escape(description)}</title>\n'
               f'<rect width="{WIDTH}" height="{HEIGHT}" rx="12" fill="#f4f8fd"/>\n'
               '<defs>\n'
               f'<marker id="blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">'
               f'<path d="M0 0L7 3.5L0 7Z" fill="{BLUE}"/></marker>\n'
               f'<marker id="green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">'
               f'<path d="M0 0L7 3.5L0 7Z" fill="{GREEN}"/></marker>\n'
               '</defs>\n<g font-family="system-ui,sans-serif" font-weight="600">\n'
               + "\n".join(self.elements) + "\n</g>\n</svg>\n")
        (ASSETS / (name + ".svg")).write_text(svg, encoding="utf-8")
        return {"src": ASSET_URL + name + ".svg", "alt": description, "width": WIDTH, "height": HEIGHT}


def figure_html(figure):
    alt = escape(figure["alt"], quote=True)
    return p(f'<img src="{figure["src"]}" alt="{alt}" width="{WIDTH}" height="{HEIGHT}">')


def displacement_picture(name, a, b):
    corner = (b[0], a[1])
    plot = Plot([a, b, corner])
    plot.line(a, corner, "#61788d", dashed=True)
    plot.line(corner, b, "#61788d", dashed=True)
    plot.line(a, b, arrow=True)
    plot.point(a, "A", dy=5, dx=-15)
    plot.point(b, "B", dy=5, dx=15)
    plot.text(WIDTH / 2, 29, "Horizontal and vertical components")
    x, y = sub(b, a)
    description = f"Arrow from A to B. The horizontal component is {x} and the vertical component is {y}."
    if all(Fraction(value).denominator == 1 for value in (x, y)):
        label = f"Horizontal {int(x):+}     Vertical {int(y):+}".replace("-", "−")
        plot.text(WIDTH / 2, 254, label)
    return plot.finish(name, description)


def ratio_picture(name, a, b, c, last="C"):
    plot = Plot([a, b, c])
    plot.line(a, b)
    plot.line(a, c, GREEN, arrow=True)
    plot.point(a, "A", dy=22)
    plot.point(b, "B", dy=22)
    plot.point(c, last, GREEN)
    plot.text(WIDTH / 2, 29, "A common starting point")
    return plot.finish(name, f"Collinear points A, B and {last}. The blue and green arrows share their start at A.")


def length_picture(name, vector, numerical_legs=False):
    x, y = vector
    a, b, corner = (0, 0), vector, (x, 0)
    plot = Plot([a, b, corner])
    plot.line(a, corner, "#61788d", dashed=True)
    plot.line(corner, b, "#61788d", dashed=True)
    plot.line(a, b, arrow=True)
    plot.point(a, "O", dy=5, dx=-16 if x > 0 else 16)
    plot.point(b, "P", dy=-13 if y > 0 else 23)
    if x and y:
        px, py = plot.at(corner)
        nx, ny = (-10 if x > 0 else 10), (-10 if y > 0 else 10)
        plot.elements.append(f'<path d="M{px+nx} {py}v{ny}h{-nx}" stroke="#61788d" fill="none" stroke-width="2"/>')
    plot.text(WIDTH / 2, 29, "Length of the diagonal")
    if numerical_legs:
        plot.text(WIDTH / 2, 254, f"Horizontal leg {abs(x)}     Vertical leg {abs(y)}")
    return plot.finish(name, f"The arrow from O to P is the diagonal of the component triangle. Leg lengths are {abs(x)} and {abs(y)}.")


def meeting_picture(name, a, b, u, v, *, clocks=True):
    arrival_a, arrival_b, point, together = meeting(a, b, u, v)
    end_a = add(point, scale((abs(arrival_a) + 1) / 5, u))
    end_b = add(point, scale((abs(arrival_b) + 1) / 5, v))
    start_a, start_b = a, b
    if arrival_a < 0:
        start_a, end_a = point, add(a, u)
    if arrival_b < 0:
        start_b, end_b = point, add(b, v)
    plot = Plot([a, b, point, end_a, end_b])
    plot.line(start_a, end_a, BLUE, arrow=True, dashed=arrival_a < 0)
    plot.line(start_b, end_b, GREEN, arrow=True, dashed=arrival_b < 0)
    plot.point(a, "A", BLUE, dy=22)
    plot.point(b, "B", GREEN, dy=22)
    plot.point(point, "C", ORANGE, dy=-12, dx=7)
    if clocks:
        mark = "Crossing and collision" if together else "Crossing at different times"
        plot.text(WIDTH / 2, 24, mark)
        if all(t.denominator == 1 and abs(t) < 100 for t in (arrival_a, arrival_b)):
            plot.text(WIDTH / 2, 49, f"At C: A at {arrival_a} s · B at {arrival_b} s".replace("-", "−"), size=16)
        description = f"Blue route starts at A and green route starts at B at t = 0. They reach C at {arrival_a} and {arrival_b} seconds respectively."
        if all(Fraction(value).denominator == 1 for vel in (u, v) for value in vel):
            label = f"A: ({u[0]}, {u[1]}) m/s · B: ({v[0]}, {v[1]}) m/s".replace("-", "−")
            plot.text(WIDTH / 2, 261, label, size=16)
    else:
        plot.text(WIDTH / 2, 29, "Two line parameters, one crossing")
        description = "The blue line through A and green line through B meet at C. Each line has its own parameter."
    return plot.finish(name, description)


def example(title, question, solution, figure=None):
    return {"title": title, "question": p(question),
            "solution": [p(text) for text in solution] + ([figure_html(figure)] if figure else [])}


def show_figure(section, figure, caption):
    key = next(block for block in section["blocks"] if block["kind"] == "key")
    key["figure"] = {**figure, "caption": p(caption)}


def revise_components(lesson):
    route = displacement_picture("components-route", (5, 0), (9, -5))
    show_figure(lesson["sections"][0], route,
                f"From {m('A=(5,0)')} to {m('B=(9,-5)')}, move four units right and five down.")
    lesson["examples"][0]["solution"] = [
        p("Take the finish position minus the start position. This keeps the direction from A to B."),
        p(m(r"\overrightarrow{AB}=\begin{pmatrix}9-5\\-5-0\end{pmatrix}=\begin{pmatrix}4\\-5\end{pmatrix}.")),
        p("Check by adding the displacement to A. The result is B."),
    ]
    lesson["revision"]["body"] = lesson["revision"]["body"].split("<h2>Worked recap</h2>")[0] + (
        "<h2>Worked recap</h2>" + p("Subtract the coordinates of A from those of B to find " + m(r"\overrightarrow{AB}") + ".")
        + figure_html(route)
    )


def revise_length(lesson):
    vector = (-3, 4)
    triangle = length_picture("length-component-triangle", vector, numerical_legs=True)
    show_figure(lesson["sections"][0], triangle,
                f"The arrow {m(column(vector))} has perpendicular leg lengths 3 and 4.")
    lesson["examples"][0] = example("Find the length of a sloping arrow",
        "Find the magnitude of " + m(column(vector)) + ".",
        ["Take the absolute values of the components for the leg lengths.",
         m(r"|\mathbf v|=\sqrt{(-3)^2+4^2}=\sqrt{25}=5."),
         "The arrow points left and up. Its magnitude is the positive number 5."])
    lesson["examples"][2] = example("Scale the arrow to unit length",
        "Find a unit vector in the direction of " + m(column(vector)) + ".",
        ["The component triangle gives a magnitude of 5.",
         "Divide both components by 5 to keep the direction. " + m(column((Fraction(-3, 5), Fraction(4, 5)))) + ".",
         "Check " + m(r"\left(-\frac35\right)^2+\left(\frac45\right)^2=1") + "."])
    lesson["examples"][3] = example("Build a new length from a unit vector",
        "Find a vector with magnitude 26 in the same direction as " + m(column((-5, 12))) + ".",
        ["The component triangle gives a magnitude of " + m(r"\sqrt{25+144}=13") + ".",
         "Divide by 13 to obtain the unit vector " + m(column((Fraction(-5, 13), Fraction(12, 13)))) + ".",
         "Scale that unit vector by 26. The answer is " + m(column((-10, 24))) + "."])
    lesson["examples"][4] = example("Use a scale factor to reach a target length",
        "Give a vector of magnitude 15 in the same direction as " + m(column((6, 8))) + ".",
        ["The original magnitude is " + m(r"\sqrt{6^2+8^2}=10") + ". Use a positive scale factor to keep its direction.",
         "The scale factor is " + m(r"\frac{15}{10}=\frac32") + ". Multiply both components by it.",
         "The result is " + m(column((9, 12))) + ". Its magnitude is " + m(r"\sqrt{81+144}=15") + "."])
    lesson["revision"]["body"] = lesson["revision"]["body"].split("<h2>Worked recap</h2>")[0] + (
        "<h2>Worked recap</h2>" + p(m(r"|(-3,4)|=\sqrt{9+16}=5") + ". Divide the original vector by 5 for a unit vector.")
        + figure_html(triangle)
    )


def revise_ratios(lesson):
    a, b, c = (1, 2), (7, 5), (5, 4)
    picture = ratio_picture("segment-ratio", a, b, c)
    show_figure(lesson["sections"][0], picture, "From A to C is two parts. From C to B is one part.")
    lesson["examples"][0] = example("Use the fraction of the whole segment",
        f"Points A and B have position vectors {m(column(a))} and {m(column(b))}. C divides AB in the ratio {m('AC:CB=2:1')}. Find the position of C.",
        ["The full journey covers three parts, and C is two parts from A.",
         m(r"\overrightarrow{AB}=\begin{pmatrix}6\\3\end{pmatrix},\quad \overrightarrow{AC}=\frac23\overrightarrow{AB}=\begin{pmatrix}4\\2\end{pmatrix}."),
         "Add this displacement to the position of A. The position of C is " + m(column(c)) + "."])
    lesson["examples"][2] = example("Recover the fraction on a reversed horizontal direction",
        f"Let {m('A=(6,3)')}, {m('B=(-3,9)')} and {m('C=(0,7)')}. Find {m('k')} if {m(r'\overrightarrow{AC}=k\overrightarrow{AB}')}.",
        [m(r"\overrightarrow{AB}=(-9,6)") + " and " + m(r"\overrightarrow{AC}=(-6,4)") + ". Use displacements from A.",
         "Compare the horizontal components. " + m(r"k=\frac{-6}{-9}=\frac23") + ".",
         "Check the vertical component. " + m(r"\frac23(6)=4") + ", so the same fraction works in both directions."],
        ratio_picture("segment-reverse-horizontal", (6, 3), (-3, 9), (0, 7)))
    lesson["revision"]["body"] = lesson["revision"]["body"].split("<h2>Worked recap</h2>")[0] + (
        "<h2>Worked recap</h2>" + p("For " + m("AC:CB=2:1") + ", use " + m(r"\overrightarrow{OC}=\overrightarrow{OA}+\frac23\overrightarrow{AB}") + ".")
        + figure_html(picture)
    )
    return picture


def revise_lines(lesson, ratio):
    show_figure(lesson["sections"][1], ratio, "The two displacements have the same tail at A and lie on the same line.")
    a, b, u, v = (0, 1), (10, 0), (2, 1), (-1, 2)
    plot = meeting_picture("independent-line-parameters", a, b, u, v, clocks=False)
    r, s, _, _ = meeting(a, b, u, v)
    assert r == Fraction(19, 5) and s == Fraction(12, 5)
    show_figure(lesson["sections"][2], plot,
                f"The line through A reaches C at {m(r'r=\frac{19}{5}')}. The line through B reaches it at {m(r's=\frac{12}{5}')}.")
    lesson["examples"][4] = example("Solve for a separate parameter on each line",
        f"The two lines are {m(column(a) + '+r' + column(u))} and {m(column(b) + '+s' + column(v))}. Find r where they meet.",
        [f"Equate the horizontal components to get {m('2r=10-s')}. The vertical components give {m('1+r=2s')}.",
         f"Substitute {m(r's=\frac{1+r}{2}')} into the horizontal equation. Multiplying by 2 gives {m('4r=20-(1+r)')}.",
         f"Then {m(r'5r=19')} and {m(r'r=\frac{19}{5}')}. The other parameter is {m(r's=\frac{12}{5}')}. "
         f"Substitution gives {m(column((Fraction(38, 5), Fraction(24, 5))))} on each line."])
    lesson["revision"]["body"] = lesson["revision"]["body"].split("<h2>Worked recap</h2>")[0] + (
        "<h2>Worked recap</h2>" + p("Solve the two component equations for " + m("r") + " and " + m("s") + " separately.")
        + figure_html(plot)
    )


def start_from_motion(a, b, u, v):
    return (f"Two robots start at {m(column(a))} and {m(column(b))} metres, with constant velocities "
            f"{m(column(u))} and {m(column(v))} metres per second.")


def revise_motion(lesson):
    a, b, u, v = (1, 1), (9, 1), (2, 1), (-2, 1)
    plot = meeting_picture("meeting-time", a, b, u, v)
    show_figure(lesson["sections"][1], plot,
                f"At {m('t=0')} the robots are at {m('A=(1,1)')} and {m('B=(9,1)')}. Both reach {m('C=(5,3)')} after 2 seconds.")
    lesson["examples"][0] = example("Combine velocities relative to different frames",
        f"A boat moves at {m(column((3, 4)))} relative to water, and the current is {m(column((1, -1)))} relative to land. Both are measured in metres per second. Find the velocity relative to land.",
        ["Follow the frames in order. Add the boat's velocity through the water to the water's velocity relative to land.",
         m(r"\mathbf v_{\mathrm{land}}=\begin{pmatrix}3+1\\4-1\end{pmatrix}=\begin{pmatrix}4\\3\end{pmatrix}\ \mathrm{m\,s^{-1}}."),
         "The current increases the horizontal component and decreases the vertical one."])
    lesson["examples"][1] = example("Work backwards from the desired ground velocity",
        f"A boat needs ground velocity {m(column((4, 1)))}. The current is {m(column((1, -2)))}. Both are measured in metres per second. Find the required velocity relative to water.",
        ["Ground velocity is the result after adding the current. Subtract the current to undo that addition.",
         m(r"\mathbf v_{\mathrm{water}}=\begin{pmatrix}4-1\\1-(-2)\end{pmatrix}=\begin{pmatrix}3\\3\end{pmatrix}\ \mathrm{m\,s^{-1}}."),
         "Add the current back to check that the ground velocity is the intended one."])
    lesson["examples"][2] = example("Turn a ground velocity into a displacement",
        f"A boat starts at {m(column((1, 2)))} metres. Its velocity through the water is {m(column((2, 1)))} and the current is {m(column((-1, 1)))} metres per second. Find its position after 3 seconds.",
        ["The ground velocity is " + m(column((1, 2))) + " metres per second.",
         "Multiply by 3 seconds to get displacement " + m(column((3, 6))) + " metres.",
         "Add this to the start position. The position is " + m(column((4, 8))) + " metres."])
    lesson["examples"][3] = example("Find the common arrival time",
        start_from_motion(a, b, u, v) + " When do they meet?",
        [f"At the same time t, their horizontal positions are {m('1+2t')} and {m('9-2t')}.",
         f"Equate them. {m('1+2t=9-2t')} gives {m('4t=8')}, so {m('t=2')}.",
         f"Both vertical positions equal {m('1+t')}, so they also agree at 2 seconds."])
    lesson["examples"][4] = example("Find the point of contact",
        start_from_motion((2, 1), (7, 6), (1, 2), (-4, -3)) + " Where do they meet?",
        [f"Use {m('2+t=7-4t')} to find {m('t=1')}. The vertical expressions agree because {m('1+2(1)=6-3(1)=3')}.",
         "Substitute into either whole position vector. The meeting position is " + m(column((3, 3))) + " metres."])
    early, late, _, together = meeting((0, 0), (10, 0), (2, 1), (-1, 2))
    assert (early, late, together) == (4, 2, False)
    crossing = meeting_picture("different-arrival-times", (0, 0), (10, 0), (2, 1), (-1, 2))
    lesson["examples"][5] = example("Same crossing, different arrival times",
        start_from_motion((0, 0), (10, 0), (2, 1), (-1, 2)) + " Their routes cross at " + m("(8,4)") + ". Do the robots collide?",
        [f"Robot A reaches that point when {m('2t=8')}, so it arrives after 4 seconds.",
         f"Robot B reaches it when {m('10-t=8')}, so it arrives after 2 seconds.",
         "A collision must occur at a shared point and a shared time. The arrival times differ."], crossing)
    blocks = lesson["sections"][2]["blocks"]
    check = {
        "kind": "check", "id": "addmaths-0606-vectors-motion-audit-shared-clock",
        "title": "Compare arrival times at one point",
        "prompt": p(start_from_motion((0, 0), (6, 0), (1, 1), (-1, 2))
                    + " Their routes cross at " + m("(4,4)") + ". Do they arrive together?"),
        "field": {"key": "answer", "label": "Choose one answer", "type": "choice",
                  "expected": "no", "options": {"yes": "Yes", "no": "No"}},
        "hint": p("Work out how long each robot takes to reach the same horizontal coordinate."),
        "solution": p("Robot A arrives after 4 seconds. Robot B arrives after 2 seconds. The different times mean there is no collision."),
        "retry": [{"answer": "yes", "feedback": p("Both pass through the crossing. Compare their separate times there before deciding.")}],
    }
    existing = next((index for index, block in enumerate(blocks) if block.get("id") == check["id"]), None)
    if existing is None:
        blocks.insert(next(index for index, block in enumerate(blocks) if block.get("index") == 5) + 1, check)
    else:
        blocks[existing] = check
    lesson["revision"]["body"] = lesson["revision"]["body"].split("<h2>Worked recap</h2>")[0] + (
        "<h2>Worked recap</h2>" + p("When the horizontal positions agree at " + m("t=2") + ", compare the vertical positions at that same time.")
        + figure_html(plot)
    )
    recap_checks = [
        ("Velocity through water " + m("(10,-23)") + ", current " + m("(0,17)") + ". Find ground velocity.", "(10,-6)"),
        ("Start " + m("(12,-7)") + " m, velocity through water " + m("(12,-25)") + ", current " + m("(-1,18)") + ". Find the position after 4 s.", "(56,-35)"),
        ("Robots start at " + m("(13,-8)") + " and " + m("(139,-134)") + " m. Velocities are " + m("(12,-3)") + " and " + m("(3,6)") + ". Where do they meet?", "(181,-50)"),
    ]
    lesson["revision"]["checks"] = (
        p("All velocities are in metres per second.")
        + "<ol>"
        + "".join("<li>" + p(prompt) + p("<strong>Answer.</strong> " + m(answer) + ".") + "</li>"
                  for prompt, answer in recap_checks)
        + "</ol>"
    )


def practice_diagrams(questions):
    length_kinds = {"Measure the length of an arrow", "A unit vector in the same direction", "Choose a vector of the required length"}
    ratio_kinds = {"Locate a point at a given ratio", "Read a fraction along a segment", "Continue the line beyond the endpoint"}
    meeting_kinds = {"Find when two moving objects meet", "Locate the meeting point", "Match positions on two lines"}
    supported = length_kinds | ratio_kinds | meeting_kinds | {"End position minus start position"}
    drawings = {}
    for question in questions:
        if question["collection"] not in {"short", "variant"}:
            continue
        uid = question["id"]
        name = "practice-" + uid.lower()
        prompt = question["prompt_html"]
        kind = question["title"]
        if kind not in supported:
            continue
        vectors = columns(prompt)
        expected = question["fields"][0]["expected"]
        if kind == "End position minus start position":
            a, b = vectors
            assert sub(b, a) == tuple(map(Fraction, expected[1:-1].split(",")))
            picture = displacement_picture(name, a, b)
        elif kind in length_kinds:
            v, = vectors
            magnitude_squared = sum(entry ** 2 for entry in v)
            if kind == "Measure the length of an arrow":
                assert Fraction(expected) ** 2 == magnitude_squared
            else:
                result = tuple(map(Fraction, expected[1:-1].split(",")))
                assert cross(v, result) == 0 and sum(x * y for x, y in zip(v, result)) > 0
                target = 1 if kind.startswith("A unit") else int(re.search(r"magnitude \\\((\d+)\\\)", prompt)[1])
                assert sum(entry ** 2 for entry in result) == target ** 2
            picture = length_picture(name, v, numerical_legs=True)
        elif kind in ratio_kinds:
            if kind == "Locate a point at a given ratio":
                a, b = vectors
                left, right = map(int, re.search(r"AC:CB=(\d+):(\d+)", prompt).groups())
                c = add(a, scale(Fraction(left, left + right), sub(b, a)))
                assert c == tuple(map(Fraction, expected[1:-1].split(",")))
            elif kind == "Read a fraction along a segment":
                a, b, c = vectors
                assert sub(c, a) == scale(Fraction(expected), sub(b, a))
            else:
                a, b = vectors
                multiplier = re.search(r"AD}=([0-9\\frac{}]+)\\overrightarrow", prompt)[1]
                c = add(a, scale(scalar(multiplier), sub(b, a)))
                assert c == tuple(map(Fraction, expected[1:-1].split(",")))
            picture = ratio_picture(name, a, b, c, "D" if kind.startswith("Continue") else "C")
        else:
            a, b, u, v = vectors
            is_line = kind == "Match positions on two lines"
            if is_line:
                a, u, b, v = vectors
            r, _, point, together = meeting(a, b, u, v)
            if kind == "Locate the meeting point":
                assert together and point == tuple(map(Fraction, expected[1:-1].split(",")))
            else:
                assert (is_line or together) and r == Fraction(expected)
            picture = meeting_picture(name, a, b, u, v, clocks=not is_line)
        drawings[uid] = {"solution": figure_html(picture)}
    return drawings


def revise_hints(lessons):
    changes = {
        "components-operations-a": "Multiply both entries of a first. Then subtract both entries of b separately. In the top row, subtracting a negative number increases the result.",
        "length-unit-a": "Both given entries are negative. A positive divisor keeps both signs and preserves the direction.",
        "length-target-a": "Compare the required length with the length of the given vector. Multiply both components by that positive ratio.",
        "ratios-given-point-b": "The two parts have the same length. You can average the two endpoint positions, component by component.",
        "ratios-beyond-b": "Here C lies between A and B. Use three parts out of the total of five parts to find its displacement from A.",
        "lines-parallel-b": "Double the complete first column, then subtract the second column row by row. Watch the negative top entry in b.",
        "lines-crossing-a": "Keep a separate parameter for each line. The horizontal equations share the same constant term, so start by cancelling it.",
        "motion-drift-b": "The current helps the vertical component, but the required ground component is negative. Subtract the current in both rows.",
        "motion-positions-b": "Set the horizontal positions equal using the same time for both robots. Substitute that time into their vertical positions.",
        "motion-collision-a": "Use the horizontal component to find the shared time, then substitute it into both entries of either original position vector.",
        "motion-collision-b": "Both robots start moving at the same time. Find the time when their horizontal positions agree, then check their vertical positions at that same time.",
    }
    prefix = "addmaths-0606-vectors-"
    for lesson in lessons.values():
        for section in lesson["sections"]:
            for block in section["blocks"]:
                suffix = block.get("id", "").removeprefix(prefix)
                if block["kind"] == "check" and suffix in changes:
                    block["hint"] = p(changes[suffix])


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    study_path = CONTENT / "vectors-study.json"
    study = json.loads(study_path.read_text(encoding="utf-8"))
    lessons = {key.removeprefix("addmaths-0606-vectors-"): value for key, value in study.items()}
    bank = json.loads((CONTENT / "vectors-v1.json").read_text(encoding="utf-8"))
    diagrams = practice_diagrams(bank["questions"])
    revise_components(lessons["components"])
    revise_length(lessons["length"])
    ratio = revise_ratios(lessons["ratios"])
    revise_lines(lessons["lines"], ratio)
    revise_motion(lessons["motion"])
    revise_hints(lessons)
    write_json(CONTENT / "vectors-practice-diagrams.json", diagrams)
    write_json(study_path, study)
    print(f"{len(diagrams)} immutable bank solutions get verified diagrams.")


if __name__ == "__main__":
    main()
