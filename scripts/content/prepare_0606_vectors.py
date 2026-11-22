"""Author the 0606 two-dimensional vectors chapter and its new question families."""

from fractions import Fraction as F
from math import isqrt

from prepare_0606_discrete import Lesson, Section, build, figure, graded, inline as m, table, tex, written


CHAPTER = "vectors"
ARCHIVE = "E:/my folder/questions_data/0606 Additional Mathematics/13 Vectors.json"
TRIPLES = ((3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (9, 40, 41), (20, 21, 29))


def column(v):
    return rf"\begin{{pmatrix}}{tex(v[0])}\\{tex(v[1])}\end{{pmatrix}}"


def pair(v):
    return f"({v[0]},{v[1]})"


def add(a, b):
    return a[0] + b[0], a[1] + b[1]


def sub(a, b):
    return a[0] - b[0], a[1] - b[1]


def scale(k, v):
    return k * v[0], k * v[1]


def point(n):
    return (n + 3, 2 - n % 19)


def direction(n):
    return (2 + n % 11, -(3 + n % 5))


def triple(n):
    a, b, c = TRIPLES[n % len(TRIPLES)]
    sign = -1 if n % 2 else 1
    return n + a, (a * sign, -b), c


def components(title, question, value, steps, hint, method, wrong=None, mark=3):
    return graded(title, question, pair(value), steps, hint, method,
                  kind="pairs", shown=m(column(value)), mark=mark,
                  wrong=(pair(wrong[0]), wrong[1]) if wrong else None)


def displacement(n):
    a = point(n)
    delta = direction(n)
    b = add(a, delta)
    edge = m(r"\overrightarrow{AB}")
    return components("End position minus start position",
        f"The position vectors of {m('A')} and {m('B')} are {m(column(a))} and {m(column(b))}. Find {edge}.",
        delta, [f"Start with the target position {m(column(b))}. Subtract the start position {m(column(a))}.",
                f"Subtract first components and then second components to obtain {m(column(delta))}."],
        "Write the destination first. Check the direction by adding the result to the start position.",
        f"Subtract the position vector of {m('A')} from that of {m('B')}.",
        (scale(-1, delta), "The components describe the reverse journey. Subtract the position of A from the position of B."))


def route(n):
    a = point(n)
    b = (1 - n % 17, n + 5)
    factor = 2 + n % 4
    value = sub(scale(factor, a), b)
    return components("Combine two directions",
        f"Two vectors are {m(r'\mathbf a=' + column(a))} and {m(r'\mathbf b=' + column(b))}. "
        f"Find {m(rf'{factor}\mathbf a-\mathbf b')}.", value,
        [f"Scale both components of {m(r'\mathbf a')} to get {m(column(scale(factor, a)))}.",
         f"Subtract {m(column(b))} component by component."],
        "Do the multiplication before subtracting. A negative second component in the subtracted vector must be subtracted as a negative.",
        "Multiply the first vector by the stated scalar and subtract corresponding components.",
        (add(scale(factor, a), b), "This is the result when the second vector is added. Reverse both of its components before adding."))


def unknown_component(n):
    a = point(n)
    k = 2 + n % 4
    b = (n % 5 - 4, n + 8)
    v = sub(scale(k, a), b)
    return graded("Match the bottom components",
        f"{m(column((a[0], 'p')))} scaled by {m(k)} and then decreased by {m(column(b))} gives {m(column(v))}. Find {m('p')}.",
        a[1], [f"The bottom entry gives {m(rf'{k}p-({b[1]})={v[1]}')}.",
               f"Add {m(b[1])} and divide both sides by {m(k)}."],
        "Equate bottom entries. Solve the value before checking the other entry.",
        f"Solve the bottom-component equation for {m('p')}.")


def position_after(n):
    start = point(n)
    delta = direction(n)
    count = 3 + n % 5
    target = add(start, scale(count, delta))
    return components("Recover a starting position",
        f"After {count} equal displacements of {m(column(delta))}, a marker arrives at {m(column(target))}. "
        "Give the starting position as a column vector.", start,
        [f"The total displacement is {m(column(scale(count, delta)))}.",
         f"The arrival position is the start plus total displacement, so subtract the displacement from {m(column(target))}."],
        "Work backwards from the final position using the opposite of the total displacement.",
        "Multiply the fixed displacement by the number of steps and subtract it from the final position.")


def magnitude(n):
    k, primitive, length = triple(n)
    v = scale(k, primitive)
    return graded("Measure the length of an arrow",
        f"Find the magnitude of {m(column(v))}.", k * length,
        [f"The legs of the component triangle have lengths {m(abs(v[0]))} and {m(abs(v[1]))}.",
         f"The square of the length is {m(rf'{v[0]}^2+({v[1]})^2={k*k*length*length}')}.",
         "Take the positive square root."],
        "A displacement component can be negative. Both squared contributions to a length are non-negative.",
        "Apply Pythagoras to the two perpendicular components.",
        wrong=(abs(v[0]) + abs(v[1]), "Adding the lengths gives the route along the legs. The vector is the direct diagonal."))


def unit(n):
    k, primitive, length = triple(n)
    v = scale(k, primitive)
    value = scale(F(1, length), primitive)
    return components("A unit vector in the same direction",
        f"Find a unit vector in the direction of {m(column(v))}.", value,
        [f"The magnitude of the given vector is {m(k*length)}.",
         f"Divide each component by {m(k*length)}. The scale factor is positive, so the arrow keeps its direction."],
        "Use the magnitude as the divisor for both components.",
        "Calculate the magnitude and divide the whole column vector by that magnitude.",
        (scale(-1, value), "This arrow has unit length but is pointing the opposite way."))


def set_length(n):
    k, primitive, length = triple(n)
    v = scale(k, primitive)
    target_scale = 2*k + 3
    target_length = target_scale * length
    value = scale(target_scale, primitive)
    return components("Choose a vector of the required length",
        f"Find the vector with magnitude {m(target_length)} that points in the same direction as {m(column(v))}.",
        value, [f"Divide the original vector by {m(k*length)} to get {m(column(scale(F(1, length), primitive)))} of length one.",
               f"Multiply the resulting vector by {m(target_length)} for the required length."],
        "Think of the original vector in two steps: first give it length one, then give it the requested length.",
        "Find a unit vector in the required direction and scale it by the required magnitude.",
        (scale(-1, value), "The length is right but the direction is opposite."))


def missing_leg(n):
    k, v, length = triple(n)
    missing = abs(k * v[1])
    h = k * v[0]
    return graded("Find a specified component from a magnitude",
        f"The magnitude of {m(column((h, 'q')))} is {m(k*length)} and its second component is negative. Find {m('q')}.",
        -missing, [f"Use {m(rf'({h})^2+q^2={k*k*length*length}')}.",
                   f"This gives {m(rf'q^2={missing**2}')}. The stated direction selects the negative value."],
        "A squared component has two candidate signs. Read the direction before choosing one.",
        "Find the squared component by subtraction and use the specified sign.",
        wrong=(missing, "Both signs give the correct length. The question requires a negative second component."))


def segment_data(n):
    a = point(n)
    delta = direction(n)
    r, s = 2 + n % 5, 1 + n % 3
    v = scale(r + s, delta)
    end = add(a, v)
    middle = add(a, scale(r, delta))
    return a, end, middle, r, s


def section_point(n):
    a, b, c, r, s = segment_data(n)
    return components("Locate a point at a given ratio",
        f"The position vectors of {m('A')} and {m('B')} are {m(column(a))} and {m(column(b))}. "
        f"{m('C')} lies on {m('AB')} with {m(f'AC:CB={r}:{s}')}. Give the position vector of {m('C')}.",
        c, [f"First calculate {m(r'\overrightarrow{AB}='+column(sub(b, a)))}.",
            f"The fraction completed is {m(F(r, r+s))}. Add that fraction of the displacement to {m(column(a))}."],
        "Divide the first part by the total number of parts. Find the displacement from A, then add the position of A.",
        "Find the position of the dividing point by adding the appropriate part of AB to the starting position.",
        (sub(c, a), "That is the displacement from A. Add the position vector of A to obtain the position of C."))


def ratio_from_position(n):
    a, b, c, r, s = segment_data(n)
    k = F(r, r+s)
    return graded("Read a fraction along a segment",
        f"Points {m('A,B,C')} have positions {m(column(a))}, {m(column(b))} and {m(column(c))}. "
        f"Given {m(r'\overrightarrow{AC}=k\overrightarrow{AB}')}, find {m('k')}.",
        k, [f"The route vectors from {m('A')} are {m(column(sub(c,a)))} and {m(column(sub(b,a)))}.",
            f"Divide a component of the first route by the corresponding component of the second. The other components give the same {m('k')}."],
        "Subtract the origin at A from both target positions before comparing the component pairs.",
        "Find the two displacements from the common point and calculate a scalar multiple.",
        wrong=(F(r+s,r), "The vectors were compared the other way round. AC is shorter than AB, so the factor is below one."))


def extend(n):
    a, b, _, _, _ = segment_data(n)
    t = F(3 + n % 4, 2)
    c = add(a, scale(t, sub(b, a)))
    return components("Continue the line beyond the endpoint",
        f"{m('A')} and {m('B')} have positions {m(column(a))} and {m(column(b))}. "
        f"Find the position of {m('D')} if {m(r'\overrightarrow{AD}='+tex(t)+r'\overrightarrow{AB}')}.",
        c, [f"{m(r'\overrightarrow{AB}='+column(sub(b,a)))}. Multiply both components by {m(t)}.",
            f"Add the resulting displacement to the start at {m(column(a))}."],
        "A positive fraction greater than one keeps the direction and takes the point past B.",
        "Calculate the extended displacement using the given scalar and add the initial position.",
        (sub(c, a), "That gives the displacement from A. Add the position of A."))


def parallel_parameter(n):
    a = direction(n)
    k = (-1 if n % 2 else 1) * (2+n%4)
    b = scale(k, a)
    return graded("Compare corresponding components",
        f"Find {m('p')} such that {m(column(a))} and {m(column((b[0], 'p')))} are parallel.",
        b[1], [f"The first entries determine the scalar multiplier {m(k)}.",
               f"Multiply the second entry {m(a[1])} by the same scalar."],
        "Parallel vectors may point in opposite directions. Keep the sign of the multiplier.",
        "Find the scalar from the first components and apply it to the second component.")


def collinear(n):
    a, b, c, _, _ = segment_data(n)
    altered = n % 2 == 0
    if altered:
        c = add(c, (0, 1))
    value = "no" if altered else "yes"
    return graded("Check whether three points lie on a line",
        f"{m('A,B,C')} have positions {m(column(a))}, {m(column(b))}, {m(column(c))}. "
        "Are the three points collinear?", value,
        [f"The routes from A are {m(r'\overrightarrow{AB}='+column(sub(b,a)))} and {m(r'\overrightarrow{AC}='+column(sub(c,a)))}.",
         "Both components have the same ratio. The two vectors have the same start, so the points are collinear." if not altered
         else "The ratios from the two components differ, so the two routes do not lie on the same line."],
        "Compare two displacements that share a starting point. Use both components.",
        "Test whether the two displacements from A are scalar multiples.",
        kind="choice", options={"yes": "Yes", "no": "No"},
        shown="Yes, they are collinear" if not altered else "No, they are not collinear",
        wrong=("yes" if altered else "no", "Use the ratio from one component to predict the other, then check it."))


def intersection_data(n):
    a = point(n)
    u = direction(n)
    v = (2 + n % 3, 4 + n % 5)
    r, s = F(3+n%7, 2), F(2+n%9, 3)
    p = add(a, scale(r, u))
    b = sub(p, scale(s, v))
    determinant = u[0]*v[1] - u[1]*v[0]
    assert determinant != 0
    return a, b, u, v, r, s, p


def crossing_parameter(n):
    a, b, u, v, r, s, _ = intersection_data(n)
    return graded("Match positions on two lines",
        f"One line contains the points {m(column(a)+r'+r'+column(u))}. The other contains "
        f"{m(column(b)+r'+s'+column(v))}. Find {m('r')} at the intersection.",
        r, [f"Equate top and bottom entries separately. The displacement {m(column(sub(b,a)))} equals "
            f"{m(r'r'+column(u)+r'-s'+column(v))}.",
            f"Eliminate {m('s')} by cross-multiplying its two coefficients. The compatible second parameter is {m(s)}."],
        "Set one equation per component. Do not assume the two line parameters are the same.",
        "Equate the coordinate components and solve two simultaneous linear equations.",
        wrong=(s, "That is the parameter of the second line. Substitute for it to find the first parameter.") if r != s else None)


def crossing_point(n):
    a, b, u, v, r, s, p = intersection_data(n)
    return components("Find where two routes cross",
        f"Line positions are {m(column(a)+r'+r'+column(u))} and {m(column(b)+r'+s'+column(v))}. "
        "Give the position vector where the lines meet.",
        p, [f"Compare both components at once. Solving the linear equations gives {m(rf'r={tex(r)},\ s={tex(s)}')}.",
            f"Put either parameter back into its own expression to obtain {m(column(p))}."],
        "The parameters belong to different lines. Solve by equating positions and substitute into one expression.",
        "Solve the two component equations and substitute one parameter into its line to obtain the position.")


def velocity_data(n):
    ground = direction(n)
    drift = (1-n%7, n+9)
    still = sub(ground, drift)
    return ground, drift, still


def ground_velocity(n):
    ground, drift, still = velocity_data(n)
    return components("Combine engine and current velocities",
        f"A survey buoy has velocity {m(column(still))} relative to the water. The water flows at {m(column(drift))} "
        f"relative to the ground. Both are in {m(r'\mathrm{m\,s^{-1}}')}. Find the ground velocity.",
        ground, [f"Follow the chain from buoy to water and water to ground. Add {m(column(still))} and {m(column(drift))}.",
                 "Combine corresponding components, preserving their signs."],
        "Add the two arrows to connect the moving object to the ground reference.",
        "Sum the velocity relative to the water and the current relative to the ground.")


def still_velocity(n):
    ground, drift, still = velocity_data(n)
    return components("Choose a velocity that cancels the drift",
        f"A floating instrument needs ground velocity {m(column(ground))}. Its current has velocity {m(column(drift))}. "
        f"All velocities are in {m(r'\mathrm{m\,s^{-1}}')}. Find the required velocity relative to the water.",
        still, [f"Ground velocity equals the relative-to-water velocity plus {m(column(drift))}.",
                f"Subtract the current from {m(column(ground))}, component by component."],
        "Make the displayed component equation before deciding which direction to subtract.",
        "Subtract the current from the required ground velocity.",
        (add(ground,drift), "This includes the current a second time. Subtract the current to get the required still-water vector."))


def position_at(n):
    ground, drift, still = velocity_data(n)
    start = point(n)
    t = 3 + n % 8
    target = add(start, scale(t, ground))
    return components("Move a starting position for a fixed time",
        f"A raft starts at {m(column(start))} metres. Its velocity relative to the water is {m(column(still))} and "
        f"the current is {m(column(drift))} in {m(r'\mathrm{m\,s^{-1}}')}. Find the position after {t} seconds.",
        target, [f"Ground velocity is {m(column(ground))}. The displacement after {t} seconds is {m(column(scale(t,ground)))}.",
                 f"Add the displacement to the starting position {m(column(start))}."],
        "Add the velocity components first. Multiply by the time to get a displacement.",
        "Add the two velocities, multiply by the elapsed time, then add the initial position.")


def collision_data(n, clash=True):
    a = point(n)
    u = direction(n)
    v = (2 + n % 3, 3 + n % 7)
    delta = sub(u, v)
    t = 4 + n % 11
    b = add(a, scale(t, delta))
    if not clash:
        b = add(b, (0, 3))
    return a, b, u, v, t


def collision_setup(n, clash=True):
    a,b,u,v,t = collision_data(n,clash)
    q = (f"Two inspection robots have initial positions {m(column(a))} m and {m(column(b))} m. "
         f"Their constant velocities are {m(column(u))} and {m(column(v))} "
         f"{m(r'\mathrm{m\,s^{-1}}')} respectively.")
    return q,a,b,u,v,t


def meet_time(n):
    q,a,b,u,v,t = collision_setup(n)
    dx,dy = sub(u,v)
    difference = sub(b,a)
    chosen = "vertical" if dx == 0 else "horizontal"
    return graded("Find when two moving objects meet",
        f"{q} After how many seconds do they meet?", t,
        [f"At a meeting, {m(column(a)+r'+t'+column(u)+r'='+column(b)+r'+t'+column(v))}.",
         f"Using the {chosen} entries gives {m(rf't={t}')}. Both equations agree because {m(rf'{t}'+column((dx,dy))+r'='+column(difference))}."],
        "Compare both positions at the same time. One component can give a candidate time, but it must work in the other.",
        "Equate the two positions at a shared time and check both component equations.")


def meet_place(n):
    q,a,b,u,v,t = collision_setup(n)
    p = add(a,scale(t,u))
    return components("Locate the meeting point",
        f"{q} Find their meeting position.",
        p, [f"The equation for equal positions gives a common time of {t} seconds. Both components satisfy it.",
            f"Substitute that time into the first position vector. This gives {m(column(a)+rf'+{t}'+column(u))}."],
        "A meeting position is the initial position plus the velocity multiplied by the common time.",
        "Find a common time from the component equations and substitute into one position vector.")


def collision_decision(n):
    clash = n % 2 != 0
    q,a,b,u,v,t = collision_setup(n, clash)
    delta = sub(u,v)
    change = sub(b,a)
    requirement = (f"The vertical equation gives {m(rf't={tex(F(change[1],delta[1]))}')}.")
    if delta[0]:
        requirement += f" The horizontal equation gives {m(rf't={tex(F(change[0],delta[0]))}') }."
    else:
        requirement += " The horizontal positions already agree for all times."
    # A zero horizontal difference makes the shifted case meet at a different time; avoid it.
    if delta[0] == 0 and not clash:
        q,a,b,u,v,t = collision_setup(n+2, clash)
        delta = sub(u,v)
        change = sub(b,a)
        if delta[0] == 0:
            q,a,b,u,v,t = collision_setup(n+4, clash)
            delta = sub(u,v)
            change = sub(b,a)
        assert delta[0] != 0
        requirement = (f"The vertical equation gives {m(rf't={tex(F(change[1],delta[1]))}')}. "
                       f"The horizontal equation gives {m(rf't={tex(F(change[0],delta[0]))}')}.")
    value = "yes" if clash else "no"
    return graded("Decide whether two moving objects meet",
        f"{q} Do the robots meet after the timing starts?", value,
        [requirement, "The same non-negative time satisfies both equations." if clash else "The times differ, so there is no collision."],
        "Two routes can cross without a collision. Test whether the times agree as well.",
        "Equate the position expressions component by component and compare the candidate times.",
        kind="choice", options={"yes": "Yes", "no": "No"},
        shown="Yes, at the same time" if clash else "No, the component times differ",
        wrong=("no" if clash else "yes", "Find the candidate time in each component. A collision needs agreement."))


def same_path_exam(n, index, variant):
    return "Compare two vector expressions", (route(n), unknown_component(n + index))


def segment_exam(n, index, variant):
    return "Divide and extend a segment", (section_point(n), extend(n + index + 5), ratio_from_position(n + index))


def collision_exam(n, index, variant):
    return "Compare possible inspection-robot collisions", (meet_time(n), meet_place(n), collision_decision(n + index))


def motion_exam(n, index, variant):
    return "Plan two journeys through a current", (position_at(n), still_velocity(n + index + 9))


def from_normalise(n, index, variant):
    return "Use the length and direction of a vector", (magnitude(n), unit(n), set_length(n))


def line_exam(n, index, variant):
    return "Intersection and collinearity of vector routes", (crossing_parameter(n), crossing_point(n), collinear(n + index))


def pair_exam(first, second):
    def model(n, index, variant):
        item = first(n)
        return item.title, (item, second(n+index+5))
    return model


def model_figure(name, caption, alt, graphic, width=430, height=245):
    labels = '<g fill="#15283c" font-family="system-ui,sans-serif" font-size="18" font-weight="600">'
    arrows = '<defs><marker id="head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#176d91"/></marker></defs>'
    return figure(CHAPTER, name, caption, alt, arrows + graphic.replace("<lab>",labels).replace("</lab>","</g>"), width,height)


def variants_visuals():
    components_figure = model_figure("components-route",
        "The horizontal and vertical moves add to the displacement from A to B.",
        "An arrow from A to B with dotted horizontal and vertical legs, labelled horizontal and vertical moves.",
        '<path d="M76 174H338V64" stroke="#64798b" stroke-width="2.5" stroke-dasharray="6 6" fill="none"/>'
        '<path d="M78 173L335 66" stroke="#176d91" stroke-width="4" marker-end="url(#head)"/>'
        '<circle cx="76" cy="174" r="6" fill="#176d91"/><lab><text x="59" y="170">A</text><text x="347" y="65">B</text>'
        '<text x="103" y="203">horizontal move</text><text x="350" y="116">vertical</text><text x="350" y="139">move</text></lab>')
    ratio_figure = model_figure("segment-ratio",
        "The same start point can reach B, C or D by scaling the direction to C.",
        "Four equally spaced collinear points A, B, C and D, with an arrow from A to D.",
        '<path d="M52 165L365 72" stroke="#176d91" stroke-width="3" marker-end="url(#head)"/>'
        '<g fill="#176d91"><circle cx="52" cy="165" r="6"/><circle cx="154" cy="135" r="6"/>'
        '<circle cx="256" cy="105" r="6"/><circle cx="359" cy="74" r="6"/></g>'
        '<lab><text x="42" y="193">A</text><text x="145" y="165">B</text><text x="249" y="137">C</text><text x="362" y="104">D</text></lab>')
    motion_figure = model_figure("meeting-time",
        "Both robots must reach the crossing at the same time for a collision.",
        "Two different straight trajectories cross at a point C. Both arrows show the directions of motion.",
        '<path d="M67 180L353 61M64 52L355 184" stroke="#176d91" stroke-width="3" marker-end="url(#head)"/>'
        '<circle cx="208" cy="121" r="7" fill="#bd482f"/><lab>'
        '<text x="46" y="200">A</text><text x="43" y="45">B</text><text x="216" y="112">C</text></lab>')
    return components_figure, ratio_figure, motion_figure


def main():
    arrow, split, paths = variants_visuals()
    a, b = m(r"\overrightarrow{AB}"), m(r"\overrightarrow{BA}")
    unit_rule = m(r"\widehat{\mathbf v}=\frac{\mathbf v}{|\mathbf v|}")
    length_rule = m(r"\left|\mathbf v\right|=\sqrt{x^2+y^2}")
    rules = table(("Question asks for", "Useful operation"),
        (("The displacement between two points", f"Finish minus start: {m(r'\overrightarrow{AB}=\overrightarrow{OB}-\overrightarrow{OA}')}"),
         ("The length of a vector", length_rule), ("A unit vector in the same direction", unit_rule)))
    lessons = (
        Lesson("components", "Column vectors and journeys",
            "Read a column vector, reverse a displacement and combine horizontal and vertical components.", (
            Section("direction", "What do two components tell me?",
                "A column vector records two signed moves. The top entry is the horizontal move and the bottom entry is the vertical move.",
                f"Start on a set of axes. Count one component at a time. Positive horizontal means right and positive vertical means up. The figure draws the separate moves as dotted lines. "
                f"The arrow connects the same starting and finishing points. {a} goes from A to B. {b} returns from B to A and has both signs reversed. "
                "The numbers in the vector describe the move, so a copy of the same arrow starting elsewhere describes the same vector.",
                "The bottom entry gives a vertical displacement. It only gives a y-coordinate when the arrow starts at the origin.",
                (displacement, position_after), arrow),
            Section("operations", "How do I add, subtract or scale a vector?",
                "Add or subtract matching entries. Scaling multiplies both entries by the same number.",
                "Draw the first arrow. Put the tail of the next arrow at the first arrowhead. The resultant runs from the initial tail to the final arrowhead. "
                "A negative multiplier reverses direction as well as changing size. To subtract, put the arrow in reverse before adding it. "
                "On paper, draw the arrows first when their order is easy to confuse. Multiply any scalar before adding or subtracting the two columns.",
                "Multiplying only one component will usually change the angle. Keep the same scale factor in both components.", (route, displacement)),
            Section("matching", "How can I recover a missing entry?",
                "Two column vectors are equal exactly when both matching entries are equal.",
                "Copy the two columns on opposite sides of the page. Read across each row to build two scalar equations. If a row has no unknown, "
                "it gives a quick check of signs. In a journey, the same comparison works for the initial position plus a number of equal displacements. "
                "After finding a parameter in one row, put it back into the other row before you finish.",
                "Adding the two components together does not test equality. Equal totals can come from different arrows.", (unknown_component, position_after)),
        ), (("Component", "One signed horizontal or vertical move."), ("Displacement", "The change in position."), ("Resultant", "The single vector equal to the combined moves.")),
           12, (same_path_exam, pair_exam(displacement, position_after), pair_exam(unknown_component, route)),
           "If a vector points in the wrong direction, reverse both signs and check the start and finish."),
        Lesson("length", "Magnitudes and unit vectors",
            "Use a right triangle to find a magnitude, a direction vector of length one or a required signed component.", (
            Section("magnitude", "Why is finding the length a right-triangle problem?",
                f"The two components form the perpendicular legs, so the length rule is {length_rule}.",
                f"Mark the legs parallel to the axes. A leg length is always positive, even when the arrow points left or down. Squaring already removes a negative sign, provided it is inside brackets. "
                f"Keep exact square roots for surds. The denominator in the normalising factor in the next model is this same length.</p>{rules}<p>",
                "Adding the two component lengths gives a route along the sides of the triangle. The vector length runs across the diagonal.", (magnitude, missing_leg), arrow),
            Section("unit", "How can I keep only the direction?",
                f"Divide by the magnitude to make the length one: {unit_rule}.",
                f"The vector from its tail to its tip points in the required direction. Find its magnitude with Pythagoras. Dividing by that positive length scales the arrow down or up to unit length. "
                f"Keep two exact fractions in the column vector. Check the result by squaring and adding the two new entries. "
                f"The basis vectors {m(r'\mathbf i')} and {m(r'\mathbf j')} are unit vectors along the positive horizontal and vertical axes.",
                "A vector of length one can point in any direction. Check the signs against the original arrow.", (unit, set_length)),
            Section("target", "What if a length is given instead?",
                "Scale a unit direction by the requested length. If one component is missing, solve for its square and use the direction to choose its sign.",
                "For a reverse calculation, put the length squared on one side and both squared components on the other. Isolate the square of the unknown. "
                "Both square-root signs are possible until a direction restriction fixes one. When a full direction is given, the unit-vector method avoids working with the two signs separately.",
                "The magnitude does not distinguish upward from downward. Read the stated sign or quadrant before deciding.", (set_length, missing_leg)),
        ), (("Magnitude", "The non-negative length of a vector."), ("Unit vector", "A vector with magnitude one."), ("Perpendicular", "Two directions at right angles.")),
           8, (from_normalise, pair_exam(missing_leg, unit), pair_exam(set_length, magnitude)),
           "Use brackets around negative components when you square them."),
        Lesson("ratios", "Position vectors and dividing a segment",
            "Find a midpoint or dividing point with a position vector and interpret positions beyond a segment.", (
            Section("fraction", "How far along a line is the dividing point?",
                f"For {m('AC:CB=r:s')}, the distance from A to C is the fraction {m(r'\frac{r}{r+s}')} of the full distance.",
                "Mark the start, target and finish. Treat the whole arrow as all the parts, not just the parts still to go. Multiply the displacement by the required fraction. "
                "Because this is a displacement from A, add the position of A afterwards to obtain the position from the origin. "
                f"A midpoint is the ratio {m('1:1')}, so its position is also the mean of the two endpoint positions.",
                "The ratio of the distance already covered to the distance still to go is different from the fraction of the whole segment covered.",
                (section_point, ratio_from_position), split),
            Section("given-point", "Can I find the scale factor from the positions?",
                f"Build both displacements from A, then find the scale factor in {m(r'\overrightarrow{AC}=k\overrightarrow{AB}')} by comparing components.",
                "Draw both journeys with a single common tail. Compute the two differences. If a component of the longer journey is non-zero, dividing the corresponding components gives the scale factor. "
                "Check it in the other row. For a point between the ends, the scale factor is between zero and one.",
                "A ratio of position vectors compares arrows from the origin. Start both route arrows at A to compare how far along AB each point lies.",
                (ratio_from_position, section_point)),
            Section("beyond", "What happens outside the segment?",
                f"A scale above {m(1)} carries a point past the target. A negative scale places it on the other side of the start.",
                "Use the same journey calculation for a line extension. First build the displacement to the reference point and take the required multiple of it. "
                "A question may describe that multiple directly instead of giving lengths. Keep the origin separate from your starting point. "
                "Draw an approximate check of the answer. A factor between zero and one would leave the point on the original segment.",
                "The factor scales the displacement between the points. Scaling the destination's position from the origin starts from the wrong place.",
                (extend, section_point)),
        ), (("Position vector", "The displacement from the origin to a point."), ("Internal division", "Splitting a segment at a point between its endpoints."), ("Scalar multiple", "A vector made by multiplying every component by one number.")),
           14, (segment_exam, pair_exam(extend, section_point), pair_exam(ratio_from_position, extend)),
           "In a ratio problem, label the two smaller segments before writing the fraction of the whole."),
        Lesson("lines", "Parallel lines and intersections",
            "Compare direction vectors, prove collinearity and find the meeting position of intersecting lines.", (
            Section("parallel", "Do two arrows have the same line direction?",
                "Two non-zero directions are parallel if one is a scalar multiple of the other.",
                "Find the scalar from a pair of non-zero components. Apply it to the second entries and compare. A negative factor is allowed because it gives an antiparallel direction. "
                "If both first entries are zero, use the second entries. If only one first entry is zero, the vectors cannot be aligned unless one whole vector is zero.",
                "Parallel directions can point the opposite way. The test is a common scalar and the sign can be negative.",
                (parallel_parameter, route)),
            Section("same-line", "When are three points on the same line?",
                "Compare two non-zero displacements with a common starting point. If one is a scalar multiple of the other, the three points are collinear.",
                f"From three positions, subtract the position of A from the other two. This gives {a} and the displacement from A to C. "
                "Show the same multiplier works horizontally and vertically. Both arrows pass through A, so their parallel directions put all three points on one line. "
                "If the directions come from separate origins, parallel arrows alone cannot prove the lines coincide.",
                "Comparing the distance from the origin alone does not test whether three points lie on one line.", (collinear, parallel_parameter), split),
            Section("crossing", "How do I meet a second route?",
                "At a crossing, two journeys lead to exactly the same position. Their separate journey lengths can differ.",
                f"Write each position as start plus a multiple of its direction. Use different letters for the two multiples, such as {m('r')} and {m('s')}. "
                "Equate first components and then second components. Solve the two scalar equations by elimination. Put one parameter into the route that uses it and use the other route to verify the final column vector.",
                "Using one letter for both route parameters can force an extra condition. The positions agree, but the journey lengths need not.",
                (crossing_parameter, crossing_point), paths, "extension"),
        ), (("Parallel", "Directions on straight lines with the same orientation up to reversal."), ("Collinear", "Points that lie on one straight line."), ("Intersection", "A position shared by two routes.")),
           15, (line_exam, pair_exam(parallel_parameter, collinear), pair_exam(crossing_point, crossing_parameter)),
           "A collinearity proof needs a common point as well as a parallel direction."),
        Lesson("motion", "Velocity, drift and collisions",
            "Combine or resolve constant velocities and decide whether moving objects reach the same position at the same time.", (
            Section("drift", "Which two velocities should I add?",
                "Velocity relative to the ground equals velocity relative to the water plus the water velocity relative to the ground.",
                "Draw a path between reference frames. First follow the object's movement through the water, then the movement of the water over the ground. "
                "The signed components show which direction the current helps and which direction it opposes. Work backwards by subtracting the current when the desired ground velocity is specified. "
                "The magnitude of the resulting velocity is its speed, if asked.",
                "Adding speeds as plain numbers gives the wrong answer unless both velocities point the same way.",
                (ground_velocity, still_velocity)),
            Section("positions", "How do I reach a position after a time?",
                "For constant velocity, displacement equals elapsed time multiplied by velocity. Add the start to get a position.",
                f"Check the units first. In {m(r'\mathrm{m\,s^{-1}}')}, multiply by the time in seconds to get a displacement in metres. "
                "To compare two moving objects, use the time measured from the same instant. Read across the columns to get the equation in each coordinate. "
                "Use the row with a non-zero difference in velocities to identify the candidate collision time.",
                "Equal horizontal positions only guarantee that the objects are level in one direction. Check the vertical positions too.", (position_at, meet_time), paths),
            Section("collision", "When is a crossing a collision?",
                "A collision needs the same place at the same time, with a non-negative time counted from the given start.",
                "Solve the two component equations independently when both relative velocity components are non-zero. If the candidate times differ, the routes cross at different times or they do not meet. "
                "If a component has equal velocities, compare initial positions for that coordinate. Equal starts make that equation true for all times. "
                "Unequal starts make a meeting impossible.",
                "A crossing drawn without times shows a shared point on the routes. It cannot confirm both objects reach it together.",
                (meet_place, collision_decision)),
        ), (("Velocity", "Rate of change of position with direction."), ("Speed", "Magnitude of velocity."), ("Relative velocity", "Velocity measured from a named moving reference."), ("Collision", "Two positions are equal at the same time.")),
           25, (collision_exam, motion_exam, pair_exam(collision_decision, ground_velocity), pair_exam(still_velocity, meet_time)),
           "Give the units with a velocity, and check both components when finding a collision time."),
    )
    for n in range(160):
        a, b, c, r, s = segment_data(n)
        assert scale(F(r,r+s), sub(b,a)) == sub(c,a)
        length, vector, hypotenuse = triple(n)
        assert sum(value**2 for value in vector) == hypotenuse**2
        assert isqrt(sum(value**2 for value in scale(length, vector))) == length*hypotenuse
        a, b, u, v, r, s, p = intersection_data(n)
        assert add(a, scale(r, u)) == add(b, scale(s, v)) == p
        for function in (displacement, route, unit, extend, crossing_point, collision_decision):
            assert function(n).steps
    build(CHAPTER, "Vectors", 12, ARCHIVE, lessons)


if __name__ == "__main__":
    main()
