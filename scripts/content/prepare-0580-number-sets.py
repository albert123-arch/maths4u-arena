"""Build the independently authored Cambridge 0580 C1.2/E1.2 chapter."""

from hashlib import sha256
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
COURSE = "maths4u-0580"
PREFIX = "igcse-0580-sets-"
DATE = "2026-11-22"


def p(text):
    return "<p>" + text + "</p>"


def m(tex):
    return r"\(" + escape(str(tex), quote=False) + r"\)"


def entries(values):
    values = sorted(values)
    return "{" + ",".join(map(str, values)) + "}" if values else "empty"


def set_tex(values):
    return m(r"\{" + ", ".join(map(str, sorted(values))) + r"\}") if values else m(r"\varnothing")


def table(headers, rows):
    head = "".join(f'<th scope="col">{value}</th>' for value in headers)
    body = "".join(f'<tr><th scope="row">{row[0]}</th>' + "".join(f"<td>{value}</td>" for value in row[1:]) + "</tr>" for row in rows)
    return f'<div class="table-scroll"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def question(title, given, label, expected, steps, hint, retry=None, choices=None):
    if choices:
        kind = "choice"
        response = choices[expected]
    elif isinstance(expected, (set, frozenset)):
        kind = "set"
        response, expected = set_tex(expected), entries(expected)
    else:
        kind = "number"
        response = m(expected)
    field = dict(key="answer", label=label, type=kind, expected=str(expected))
    if choices:
        field["options"] = choices
    return dict(title=title, prompt=given, field=field, answer=response, steps=list(map(p, steps)), hint=p(hint),
        retry=[dict(answer=str(bad), feedback=p(message)) for bad, message in (retry or [])])


def list_rule(i):
    lo, hi = i % 9 - 6, i % 9 + 1
    values = set(range(lo + 1, hi + 1))
    definition = fr"A=\{{x:x\text{{ is an integer}},\;{lo}<x\leq {hi}\}}"
    return question("List the integers in a set", p(f"Write all the elements of {m(definition)}."), "Elements of A", values,
        [f"Read the condition from left to right. Begin at the first integer greater than {m(lo)}, which is {m(lo+1)}.",
         f"The sign {m(r'\leq')} includes the upper endpoint {m(hi)}. The set is {set_tex(values)}."],
        "Look at each boundary sign on its own before writing the list.",
        [(entries(values | {lo}), f"The strict inequality excludes {m(lo)}. Start one integer later."),
         (entries(values - {hi}), f"The upper inequality includes {m(hi)}. Add this endpoint.")])


def count_elements(i):
    values = [i+2, i+5, i+8, i+10][:3+i%2]
    mixed = ",".join(map(str, [values[-1], values[0], *values[1:-1], values[-1]]))
    return question("Count distinct elements", p(f"{m(fr'D=\{{{mixed}\}}')}. Find {m('n(D)')}."), "Number of elements", len(values),
        [f"The repeated entry {m(values[-1])} is the same element each time. Write the distinct elements as {set_tex(values)}.",
         f"Count the members of that set. {m(f'n(D)={len(values)}')}."],
        "Count each distinct element once. The order of the list has no effect.",
        [(len(values)+1, "This counts the repeated element twice. Cross out its second appearance before counting.")])


def subset_symbols(i):
    a, b, c = i+2, i+4, i+7
    symbols = "ABCD"
    wrong_set, right, absent, empty = symbols[i % 4:] + symbols[:i % 4]
    options = {wrong_set: m(rf"\{{{a},{c}\}}\subseteq B"), right: m(rf"\{{{a},{b}\}}\subseteq B"),
               absent: m(rf"{b}\notin B"), empty: m(r"B=\varnothing")}
    return question("Choose the true subset statement", p(f"Let {m(fr'B=\{{{a},{b}\}}')}. Which statement is true?"),
        "True statement", right, [f"Check the members of each candidate set. {m(c)} is not in {m('B')}, so option {wrong_set} is false.",
         f"Both {m(a)} and {m(b)} belong to {m('B')}. A set is a subset of itself, so {right} is correct."],
        "A subset can be equal to the set that contains it.",
        [(wrong_set, f"Check every member of the set on the left. {m(c)} is absent from {m('B')}."),
         (absent, f"The symbol {m(r'\notin')} says that {m(b)} is absent. Look for it in the list again."),
         (empty, f"The set {m('B')} has two elements. The empty set has none.")], choices=dict(sorted(options.items())))


def member_or_subset(i):
    a,b,c = i+3,i+6,i+9
    present = i % 2 == 0
    target = a if present else c
    choices = {"A": m(r"\in"), "B": m(r"\notin"), "C": m(r"\subseteq"), "D": m(r"\nsubseteq")}
    right = "A" if present else "B"
    return question("Choose the membership symbol",
        p(f"Let {m(fr'A=\{{{a},{b}\}}')}. Complete {m(fr'{target}\;\square\;A')} with the correct symbol."),
        "Membership symbol", right, [f"The object on the left is the number {m(target)}, so we need a membership symbol.",
         f"The number is {'in' if present else 'absent from'} the list. Use {choices[right]}."],
        "Decide first whether the left side is a single element or a set.",
        [("C", "The subset symbol compares two sets. The number on the left is a single element."),
         ("D", "The not-a-subset symbol also compares two sets. Check whether the number belongs to A.")], choices=choices)


PAIR_MASKS = ((1,2,3,0,1,3,2,0), (3,0,1,2,1,2,3,0), (0,1,2,1,0,3,2,3))


def pair_sets(i):
    board = tuple(range(i+4, i+12))
    flags = dict(zip(board, PAIR_MASKS[i % len(PAIR_MASKS)]))
    universe = set(board)
    a = {n for n, flag in flags.items() if flag & 1}
    b = {n for n, flag in flags.items() if flag & 2}
    opening = p(f"The universal set {m(r'\mathcal{E}')} contains the integers from {m(board[0])} to {m(board[-1])}, inclusive.")
    opening += p(f"{m('A')} = {set_tex(a)} and {m('B')} = {set_tex(b)}.")
    return universe, a, b, opening


def overlap_entries(i):
    _, a, b, text = pair_sets(i)
    both = a & b
    return question("Find the entries in the overlap", text + p(f"List the elements of {m(r'A\cap B')}."), "Elements in both sets", both,
        [f"Compare each entry in {m('A')} with the list for {m('B')}.",
         f"Only {set_tex(both)} appears in both lists. Write these elements once in the overlap."],
        "Test each number against both sets. Keep it only if both tests pass.",
        [(entries(a | b), "The union includes both circles. For the intersection use only the shared lens."),
         (entries(a - b), "These entries are in A only. The overlap contains entries in both A and B.")])


def overlap_or_disjoint(i):
    if i%2:
        return overlap_entries(i)
    a,b={i,i+2,i+4},{i+1,i+3,i+5}
    return question("Decide whether sets overlap", p(f"Let {m('A')} = {set_tex(a)} and {m('B')} = {set_tex(b)}. List the elements of {m(r'A\cap B')}."),
        "Elements in both sets", set(), [f"All entries of A are even. All entries of B are odd. No entry belongs to both.",
         f"There is no overlap, so the intersection is {m(r'\varnothing')}. Its size is zero."],
        "Look for a shared entry. On Arena you can type ‘empty’ if there are none.",
        [(entries(a|b),"This is the union. To enter the intersection, keep only elements appearing in both lists.")])


def union_entries(i):
    _, a, b, text = pair_sets(i)
    either = a | b
    return question("List the union", text + p(f"List the elements of {m(r'A\cup B')}."), "Elements in the union", either,
        [f"Take the elements in {m('A')} then add any elements of {m('B')} that do not appear in that list.",
         f"Include the shared elements once. {m(r'A\cup B')} is {set_tex(either)}."],
        "Here ‘or’ includes entries that are in both sets.",
        [(entries(a ^ b), "Include the overlap as well. The union is everything in either circle."),
         (entries(a & b), "The overlap is part of the union. Add the A-only and B-only entries.")])


def complement_entries(i):
    universe, a, b, text = pair_sets(i)
    complement = universe - a
    return question("Find a complement", text + p(f"List the elements of {m('A\u2032')}."), "Elements outside A", complement,
        [f"Start with every element in {m(r'\mathcal{E}')}. Cross out those inside {m('A')}, including its overlap with {m('B')}.",
         f"The remaining B-only and outside entries form {set_tex(complement)}."],
        "Look at every region in the rectangle outside the A boundary.",
        [(entries(b-a), "Include the region outside both circles, because it is also outside A."),
         (entries(universe-(a|b)), "The B-only region lies outside A. Include those entries too.")])


def bracket_entries(i):
    universe, a, b, text = pair_sets(i)
    outside = universe - (a | b)
    return question("Find the complement of the union", text + p(f"List the elements of {m(r'(A\cup B)\prime')}."),
        "Elements outside both sets", outside,
        [f"Work inside the brackets first. {m(r'A\cup B')} contains {set_tex(a|b)}.",
         f"Remove all of these from the rectangle. The elements outside both circles are {set_tex(outside)}."],
        "The prime outside the brackets applies to the whole union.",
        [(entries(universe-a), "Both circles were in the brackets. Remove B-only entries as well as the entire A circle."),
         (entries(a|b), "This is the set inside the brackets. Now take its complement.")])


CONTEXTS = (("library loans", "a graphic novel", "an audiobook"),
            ("activity sign-ups", "fencing", "orienteering"),
            ("canteen orders", "fruit", "soup"),
            ("workshop bookings", "ceramics", "woodwork"))


def two_counts(i):
    a, b, both, none = 5+i%8, 6+(i*3)%9, 2+(i*5)%7, 3+(i*2)%8
    context, first, second = CONTEXTS[i % len(CONTEXTS)]
    text = p(f"A record of {context} groups the entries into {m('A')} for {first} and {m('B')} for {second}.")
    return (a, b, both, none), text


def count_regions(i):
    (a,b,both,none), text = two_counts(i)
    text += table(["Region", "Entries"], [["A only",a],["Both",both],["B only",b],["Neither",none]])
    return question("Find the size of a union", text + p(f"Find {m(r'n(A\cup B)')}."), "Number of entries in the union", a+b+both,
        [f"Include A only, both and B only. Leave the {none} entries outside the circles.",
         f"Add the three separate regions. {m(f'{a}+{both}+{b}={a+b+both}')}."],
        "These are region values, so the overlap has already been separated from both single-circle counts.",
        [(a+b+2*both,"The overlap is one region. Count it once."),(a+b,"Add the overlaps as well. ‘At least one’ includes both.")])


def circle_totals(i):
    (a,b,both,none), text = two_counts(i)
    whole = a+b+both+none
    text += p(f"There are {whole} entries altogether. {m(f'n(A)={a+both}')}, {m(f'n(B)={b+both}')} and {both} entries belong to both sets.")
    return question("Recover the outside count", text + p("How many entries belong to neither set?"), "Neither A nor B", none,
        [f"Adding the whole circles gives {m(f'{a+both}+{b+both}={a+b+2*both}')}. This counts the {both} shared entries twice.",
         f"Subtract the overlap once. The union contains {m(f'{a+b+2*both}-{both}={a+b+both}')} entries.",
         f"Subtract the union from the total to find neither. {m(f'{whole}-{a+b+both}={none}')}."],
        "The circle totals include the overlap. Find the number in the union before finding neither.",
        [(none-both,"The circle totals double-count those in both. Subtract the overlap once before finding neither.")])


def recover_overlap(i):
    (a,b,both,none), text = two_counts(i)
    total = sum([a,b,both,none])
    text += p(f"There are {total} entries. {a+both} are in {m('A')}, {b+both} are in {m('B')} and {none} are in neither.")
    return question("Work backwards to find both", text + p("How many entries belong to both sets?"), "Number of entries in both sets", both,
        [f"The union has {m(f'{total}-{none}={a+b+both}')} entries. It counts everyone in at least one group once.",
         f"The two circle totals add to {m(a+b+2*both)}. The extra count is the overlap: {m(f'{a+b+2*both}-{a+b+both}={both}')}."],
        "Compare the total counted once (the union) with the sum of the two circle totals.",
        [(a+b+both,"This is the union. Find the excess when both circle totals are added."),
         (a+b,"This counts exactly one set. The question asks for the shared region.")])


REGIONS = ["A only", "B only", "C only", "A and B only", "A and C only", "B and C only", "All three", "None"]


def three_counts(i):
    r = tuple(2+(i*k+d) % n for k,d,n in [(3,1,7),(5,2,8),(2,1,9),(2,3,7),(3,4,8),(4,3,9),(1,2,6),(4,1,11)])
    worlds = (("A community centre lists sessions", "bouldering, printmaking and coding"),
              ("A nursery records garden plots", "sage, mint and thyme"),
              ("A technician lists testing stations", "light, noise and temperature"))
    context, items = worlds[i % len(worlds)]
    text = p(f"{context}. Sets {m('A')}, {m('B')} and {m('C')} record entries for {items}, in that order.")
    return r, text


def exactly_two(i):
    r, text = three_counts(i)
    text += table(["Region", "Entries"], zip(REGIONS,r))
    total = sum(r[3:6])
    return question("Count entries in exactly two sets", text + p("How many entries are in exactly two sets?"), "Entries in exactly two sets", total,
        ["Use the three regions labelled ‘and … only’. Exclude the central region because those entries are in three sets.",
         f"Add those regions: {m(f'{r[3]}+{r[4]}+{r[5]}={total}')}."],
        "Exactly two rules out the centre. At least two would include it.",
        [(total+r[6], "You included the centre. Remove the entries in all three sets.")])


def pair_with_triple(i):
    r, text = three_counts(i)
    text += p(f"{m(fr'n(A\cap C)={r[4]+r[6]}')}. There are {r[6]} entries in all three sets.")
    return question("Recover a pair-only region", text + p(f"Find the number of entries in both {m('A')} and {m('C')}, but outside {m('B')}."),
        "A and C only", r[4],
        [f"The {r[4]+r[6]} entries in {m(r'A\cap C')} include those in {m('B')} as well.",
         f"Remove the centre once. The pair-only count is {m(f'{r[4]+r[6]}-{r[6]}={r[4]}')}."],
        "A pair intersection includes the triple intersection. Remove it to find the pair-only region.",
        [(r[4]+r[6],"The pair total includes the centre. Subtract the entries in all three sets.")])


def bracket_count(i):
    r, text = three_counts(i)
    text += table(["Region", "Entries"], zip(REGIONS,r))
    value = r[4]+r[5]+r[6]
    return question("Apply a bracketed set operation", text + p(f"Find {m(r'n((A\cup B)\cap C)')}."), "Number in the requested region", value,
        [f"First identify all regions in {m(r'A\cup B')}. Then keep only the ones inside {m('C')}.",
         f"Use A-and-C only, B-and-C only and all three. {m(f'{r[4]}+{r[5]}+{r[6]}={value}')}."],
        "Reading the brackets first gives two eligible circles. Keep their parts inside C.",
        [(r[4]+r[5],"The centre is included. It belongs to C and also to the union of A and B."),
         (value+r[2],"C only is inside C, but it lies outside the union in brackets.")])


LESSONS = (
    ("notation", "Read and write sets",
     "List the elements of a set, count distinct members and use Cambridge's Extended membership and subset symbols.", (
        ("list-elements", "How do I turn a rule into a list?", "Core", 6,
         "A set groups objects that pass a test. The objects can be numbers, cards or anything else named in the question. A rule after a colon tells you which objects belong.",
         r"In \(\{x:x\text{ is an integer},\;-3<x\leq2\}\), the part before the colon tells you what to list. The conditions after it tell you which integers to keep.",
         "Read one boundary at a time. A strict sign excludes its endpoint. Write the candidates in order so you can check that every allowed integer is present.",
         "A list of integers stops at the next integer. If the rule allows all real numbers, the interval contains more than the integers you can list.",
         list_rule, list_rule, "rule"),
        ("count-members", "How do I count the members?", "Core", 5,
         "A set may be listed in any order. Each distinct element belongs just once, even if a list repeats it. Compare which entries appear before comparing counts.",
         r"\(n(A)\) asks how many distinct elements are in \(A\). It gives a number. A list of the elements gives a set.",
         "Cross out repeated copies. Count each remaining entry once and give the count as a number.",
         "A set with one member is not the same answer as a count of one. In a question asking for the set, keep the braces even around one entry.",
         count_elements, count_elements, None),
        ("membership-and-subsets", "Extended: Is it a member or a subset?", "Extended", 8,
         "To test membership, look up an individual entry. To test a subset, check every member of a whole set. Use the object on the left of the symbol to decide what kind of test to make.",
         r"\(3\in B\) says that the number 3 belongs to \(B\). \(\{3\}\subseteq B\) says that all members of the set \(\{3\}\) are in \(B\). Their negative forms are \(\notin\) and \(\nsubseteq\).",
         r"One missing element is enough to rule out a subset. The empty set \(\varnothing\) has no members and is a subset of every set. Equal sets are subsets of each other.",
         r"\(\varnothing\) and \(\{0\}\) mean different things. The first set has no elements. The second has one element, the number zero.",
         member_or_subset, subset_symbols, "subset"),
    )),
    ("two-regions", "Two-set Venn diagrams",
     "Place each element in a two-set Venn diagram and read union, intersection, complement and bracketed expressions.", (
        ("draw-and-intersect", "Where does each element go?", "Core", 7,
         "Start with the rectangle, which sets the universe. Each circle stands for one property. An entry has a single position even when it belongs to both circles.",
         r"The rectangle represents \(\mathcal{E}\), the universal set. The shared lens represents \(A\cap B\). The corner outside both circles is still part of \(\mathcal{E}\).",
         "Place shared entries in the lens first. Then fill the A-only and B-only parts. Every remaining entry in the universe belongs outside both circles. If the sets have no shared entries, they are called disjoint.",
         "A shared number appears once in the lens. Writing it separately in A and B creates two copies of one element.",
         overlap_entries, overlap_or_disjoint, "two-regions"),
        ("read-the-union", "Which regions belong to ‘A or B’?", "Core", 6,
         "In set notation, ‘or’ includes the case where both descriptions are true. To find the union, follow the outer edges of the two circles.",
         r"\(A\cup B\) includes A only, both and B only. \(A\cap B\) includes the overlap only.",
         "Take every entry in at least one circle. Make a single list and check that a shared entry appears only once.",
         "If the question says ‘exactly one’, leave the lens out. If it says ‘at least one’, include the lens.",
         union_entries, union_entries, "union"),
        ("find-complements", "How do I find the complement?", "Core", 7,
         "A complement keeps the elements excluded by a named set, within the chosen rectangle. Changing the universal set can change the complement even if a circle keeps the same entries.",
         r"\(A'\) contains everything in \(\mathcal{E}\) outside \(A\). That includes the B-only part and the space outside both circles.",
         "Trace the boundary of A. Keep every entry within the rectangle but outside that boundary. Reject entries in the lens because they are inside A.",
         "A complement is tied to its rectangle. Do not write numbers or objects that were never in the universal set.",
         complement_entries, complement_entries, "complement"),
        ("combine-regions", "Extended: What do the brackets change?", "Extended", 7,
         "Do the inner operation first. A prime on an entire bracket reverses membership of the whole bracketed region. Compare this with putting the prime on just one circle.",
         r"\((A\cup B)'=A'\cap B'\) is outside both circles. \((A\cap B)'=A'\cup B'\) is everything except the lens.",
         r"Sketch the region named in brackets, then keep the rest of the rectangle. To represent ‘A only’ directly use \(A\cap B'\).",
         "Look at what the prime touches. A prime after a closing bracket acts on everything in the brackets.",
         bracket_entries, bracket_entries, None),
    )),
    ("two-counts", "Solve problems with two-set totals",
     "Read counts from four regions, reconstruct an overlap or a missing outside count, and check that the numbers fit.", (
        ("read-region-counts", "Do the numbers name entries or count them?", "Core", 6,
         "A list of song numbers inside a circle shows which songs meet a rule. A single region value in a survey can stand for several people. Read the context before doing any arithmetic.",
         "With counts, add the numbers in the requested regions. Each person, response or object belongs to one region.",
         r"For \(n(A\cup B)\), add A only, the overlap and B only. For \(n(A)\), add A only and the overlap. For the total, also add neither.",
         "A number printed in a region might be a label, such as code 12. A label counts as one element. A region count of 12 already represents twelve elements.",
         count_regions, count_regions, "counts"),
        ("subtract-the-overlap", "Why do whole-circle totals double-count?", "Core", 7,
         "Consider one entry in the overlap. It is present in both circle counts. It should contribute once to the size of the union.",
         r"\(n(A\cup B)=n(A)+n(B)-n(A\cap B)\). The subtraction removes the extra copy of the overlap.",
         "Fill in the overlap first. From each circle total subtract the overlap to get its exclusive part. Then find the outside by subtracting the union from the overall total.",
         "The given value of n(A) belongs to all of the A circle. Putting it into A only and then adding the lens changes the stated circle total.",
         circle_totals, circle_totals, None),
        ("work-backwards", "How can I recover a missing overlap?", "Core", 7,
         "The total and neither give the number with at least one property. You can compare that once-counted number with the two whole-circle totals.",
         r"\(n(A\cap B)=n(A)+n(B)-n(A\cup B)\). When neither is given, first find \(n(A\cup B)\) by subtracting neither from \(n(\mathcal{E})\).",
         "Fill all four regions and recombine them to verify both original circle totals. All four entries must be whole numbers and at least zero.",
         "A negative number of people signals that the information or your interpretation is inconsistent. Check whether a value describes ‘only’ or a whole circle.",
         recover_overlap, recover_overlap, None),
    )),
    ("three-regions", "Three-set Venn diagrams (Extended)",
     "Use all eight regions of a three-set diagram, reconstruct pair-only counts and combine operations in the correct order.", (
        ("read-eight-regions", "Where are the eight regions?", "Extended", 7,
         "Three sets give eight possible membership patterns. Each entry can be inside or outside each of the three circles. The centre belongs to all three.",
         "Exactly two gives the three pair-only regions. At least two also includes the centre. None of the sets contains the outside region.",
         "Name a region before entering a value. Use one circle label for an exclusive single region, two labels for a pair-only region, and all three for the centre.",
         "The outside is a valid region inside the rectangle. Include it when checking the total or finding the entries in none.",
         exactly_two, exactly_two, "three-regions"),
        ("recover-pair-only", "Why start with the triple intersection?", "Extended", 7,
         "A total for A and C includes the centre because the centre is in both. Fill the centre first to avoid counting it again when reconstructing each pair-only value.",
         r"\(n(A\cap C\cap B')=n(A\cap C)-n(A\cap B\cap C)\). The same method works for the other pairs.",
         "Complete the three pair-only regions next. In each whole circle, subtract its two pair-only regions and the centre to get only that circle. Fill the outside last.",
         "‘A and C’ allows B as well. ‘A and C only’ places those entries outside B.",
         pair_with_triple, pair_with_triple, None),
        ("combine-three-sets", "How do I read a longer expression?", "Extended", 8,
         "An expression gives a sequence of membership tests. Work through the brackets, then match the result to the requested part of the rectangle.",
         r"For \((A\cup B)\cap C\), first allow A or B. Keep only regions inside C. The centre passes both tests.",
         "Mark the eligible regions with a finger or a little tick. Compare each region with the whole expression before adding counts. If a whole bracket has a prime, keep precisely the other regions.",
         "C only passes the C test. It fails the A-or-B test, so leave it out of the expression above.",
         bracket_count, bracket_count, None),
    )),
)


def svg_text(x,y,text, size=16, weight=600):
    return f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-size="{size}" font-weight="{weight}">{escape(text)}</text>'


def svg_circle(x,y,r,fill="none",stroke="#284566"):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'


def figure(name, alt, caption, body, height):
    directory = ROOT / "public/assets/study/0580/sets"
    directory.mkdir(parents=True, exist_ok=True)
    payload = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 {height}" role="img" aria-label="{escape(alt, quote=True)}">'
    payload += f'<rect width="380" height="{height}" rx="12" fill="#f8fafc"/>'
    payload += f'<g font-family="Arial, sans-serif" fill="#17324f">{body}</g></svg>\n'
    (directory / f"{name}.svg").write_text(payload, encoding="utf-8")
    return dict(src=f"/assets/study/0580/sets/{name}.svg", alt=alt, caption=p(caption), width=380, height=height)


def box(height, fill="#fff"):
    return f'<rect x="13" y="13" width="354" height="{height-26}" rx="5" fill="{fill}" stroke="#284566" stroke-width="2"/>' + svg_text(28,29,"ℰ",18)


def two_circles(mode, labels):
    bg = "#fce5ab" if mode == "complement" else "#ffffff"
    output = box(210,bg)
    filled = {"normal":("#fff", "#fff"), "union":("#c7e8f6", "#c7e8f6"), "complement":("#fff", "none"), "blank":("#fff", "#fff")}
    a_fill,b_fill = filled[mode]
    output += svg_circle(145,105,69,a_fill) + svg_circle(235,105,69,b_fill)
    output += '<path d="M 190 52.69 A 69 69 0 0 1 190 157.31 A 69 69 0 0 1 190 52.69Z" fill="' + ("#c7e8f6" if mode=="union" else "#fff") + '" stroke="#284566" stroke-width="2"/>'
    output += svg_text(116,54,"A",20) + svg_text(263,54,"B",20)
    output += "".join(svg_text(x,y,text,14) for x,y,text in zip([119,190,262,304],[110,110,110,174],labels))
    return output


def three_circles(labels):
    output=box(328)
    output += svg_circle(135,128,78) + svg_circle(245,128,78) + svg_circle(190,219,78)
    output += svg_text(101,67,"A",20)+svg_text(278,67,"B",20)+svg_text(190,274,"C",20)
    positions=((104,123),(278,123),(190,250),(190,113),(137,184),(245,184),(190,161),(325,266))
    output += "".join(svg_text(x,y,text,17) for (x,y),text in zip(positions,labels))
    return output


def make_figures():
    number_line='<path d="M33 91H347" fill="none" stroke="#284566" stroke-width="2"/>'
    for x,n in zip(range(50,345,40),range(-4,4)):
        in_set=-3<n<=2
        number_line+=f'<path d="M{x} 85v12" stroke="#284566" stroke-width="2"/>'+svg_text(x,119,str(n).replace("-","−"),15)
        if in_set:
            number_line+=f'<circle cx="{x}" cy="91" r="5" fill="#117b71"/>'
    number_line+=svg_circle(90,91,5,"#fff","#117b71")
    number_line+=svg_text(192,42,"Included integers are filled",18)
    subset=box(205)+svg_circle(189,106,75,"#d8ecff")+svg_circle(171,114,38,"#bde7dc")
    subset+=svg_text(177,107,"A",19)+svg_text(229,140,"B",19)
    three_labels=["4","5","6","3","2","6","1","8"]
    return {
        "rule": figure("integer-members", "Number line. The filled integer points are −2, −1, 0, 1 and 2. The point −3 is open.",
            "The rule allows integers greater than −3 up to and including 2.",number_line,155),
        "subset": figure("subset", "Set A is drawn fully inside B, which is inside the universal set rectangle.",
            "Every member of A also lies in B, so "+m(r"A\subseteq B")+".",subset,205),
        "two-regions": figure("two-set-regions","Set A on the left and B on the right. The three inside regions are A only, both and B only. Neither is inside the rectangle outside the circles.",
            "Place shared entries in the lens. Every element belongs in exactly one of these four regions.",two_circles("normal",["A only","Both","B only","Neither"]),210),
        "union": figure("two-set-union","Both circles are shaded all the way through the overlap. The outside region is unshaded.",
            "The blue area includes both circles and their overlap. It represents "+m(r"A\cup B")+".",two_circles("union",["A only","Both","B only","Neither"]),210),
        "complement": figure("two-set-complement","The amber shaded region is the part of the rectangle outside circle A. This includes B only and the area outside both circles.",
            "The complement "+m("A'")+" is outside A and inside the rectangle.",two_circles("complement",["A only","Both","B only","Neither"]),210),
        "counts": figure("two-set-counts","Region counts: 7 in A only, 4 in both, 6 in B only and 9 outside both.",
            "The total is "+m("7+4+6+9=26")+". The union contains "+m("7+4+6=17")+" entries.",two_circles("normal",["7","4","6","9"]),210),
        "three-regions": figure("three-set-counts","Region counts: A only 4, B only 5, C only 6, A and B only 3, A and C only 2, B and C only 6, all three 1 and outside all 8.",
            "Exactly two includes the three counts "+m("3,2,6")+". At least two also includes the centre, whose count is 1.",three_circles(three_labels),328),
        "exam-two": figure("exam-two-blank","Blank universal set rectangle containing overlapping circles A and B.",
            "The lens is the shared region.",two_circles("blank",["","","",""]),210),
        "exam-three": figure("exam-three-blank","Blank Venn diagram with three labelled, overlapping circles and a universal set rectangle.",
            "Start with the centre shared by all three circles.",three_circles([""]*8),328),
    }


def diagram_html(figure, width=290):
    return f'<p><img width="{width}" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'


def plain_question(q):
    if q["field"]["type"]!="choice":
        return q["prompt"]
    return q["prompt"]+p(" &nbsp; ".join(f"{k}. {v}" for k,v in q["field"]["options"].items()))


def quick_check(uid, q):
    return dict(kind="check",id=uid,title=q["title"],prompt=q["prompt"],field=q["field"],hint=q["hint"],
        solution="".join(q["steps"]),**({"retry":q["retry"]} if q["retry"] else {}))


def short_question(uid, family, lesson, q, variant, difficulty):
    return dict(id=uid,family_uid=family,lesson=lesson,title=q["title"],collection="variant" if variant else "short",
        prompt_html=q["prompt"],answer_html=p(q["answer"]),solution_html="".join(q["steps"]),hint_html=q["hint"],
        marks=1,difficulty=difficulty,fields=[q["field"]],parts=[dict(label="a",marking_criteria=[award("B1",q["answer"])])],verification=uid)


def award(code, line, guidance=None):
    return dict(code=code,marks=int(code[-1]),description_html=p(line),**({"guidance_html":p(guidance)} if guidance else {}))


def written_part(prompt, answer, steps, hint, criteria):
    return dict(prompt=p(prompt),answer=answer,steps=list(map(p,steps)),hint=p(hint),criteria=criteria)


def written(uid, family, lesson, title, context, parts, index, difficulty):
    detail = []
    marks = []
    for k, part in enumerate(parts):
        count = sum(c["marks"] for c in part["criteria"])
        mark = f'<span class="marks">[{count}]</span>'
        detail.append(f'<li>{part["prompt"]}{mark}</li>')
        marks.append(dict(label=chr(97+k),marking_criteria=part["criteria"]))
    return dict(id=uid,family_uid=family,lesson=lesson,title=title,collection="exam",fields=[],variant_index=index,
        prompt_html=context+'<ol class="parts" type="a">'+"".join(detail)+"</ol>",
        answer_html="".join(p(f"({chr(97+k)}) {part['answer']}") for k,part in enumerate(parts)),
        solution_html="".join(f'<section class="solution-part"><h4>({chr(97+k)})</h4>'+"".join(part["steps"])+"</section>" for k,part in enumerate(parts)),
        hint_html="".join(p(f"({chr(97+k)})")+part["hint"] for k,part in enumerate(parts)),
        marks=sum(c["marks"] for part in parts for c in part["criteria"]),difficulty=difficulty,parts=marks,verification=uid)


def notation_exam(style,i):
    lo, hi = -5+i%6, 2+i%5
    vals = set(range(lo,hi+1))
    only = {x for x in vals if (x+style)%2==0}
    parity = "even" if style%2==0 else "odd"
    opening = p(f"A stockroom uses every integer from {m(lo)} to {m(hi)} as a tray number. Set {m('T')} contains their {parity} tray numbers.")
    parts = [
        written_part(f"List the members of {m('T')}.", set_tex(only),
            [f"Scan the tray numbers between {m(lo)} and {m(hi)}, including both endpoints.", f"Keep the {parity} entries. The list is {set_tex(only)}."],
            "Write the allowed integers before testing their parity.", [award("B1", "All and only "+set_tex(only)+".")]),
        written_part(f"Find {m('n(T)')}.",m(len(only)),[f"There are {len(only)} distinct tray numbers in T."],
            "Count the members of your list.",[award("B1", m(len(only))+". Accept the count of a correctly formed list from (a).")]),
    ]
    if style>=2:
        outsider = next(n for n in sorted(vals) if n not in only)
        target = {min(only), outsider}
        parts.append(written_part(f"Use a subset symbol to compare {set_tex(target)} with {m('T')}. Give a reason.",
            m(r"\{"+",".join(map(str,sorted(target)))+r"\}\nsubseteq T"),
            [f"The member {m(outsider)} lies in the small set. It has the other parity, so it does not belong to T.",
             "One missing member rules out a subset."],
            "To be a subset, every member of the first set must appear in T.",
            [award("B1",f"Identifies {m(outsider)} as a member missing from T."),award("B1",m(r"\nsubseteq")+" between the sets.")]))
    return ("Tray labels and the number of elements" if style<2 else "Tray labels and the subset test (Extended)",opening,parts)


def region_exam(style,i,diagrams):
    universe,a,b,opening = pair_sets(i)
    either, both = a|b, a&b
    outside = universe-either
    if style==0 or style==2:
        opening+=diagram_html(diagrams["exam-two"])
        areas=[set_tex(s) for s in [a-b,both,b-a,outside]]
        description="A only, both, B only, neither"
        part1=written_part("Copy and complete the Venn diagram. Place every element once.",
            description+" &nbsp; "+"; ".join(areas)+".",
            [f"Start with the elements in both sets: {areas[1]}.",f"The A-only and B-only parts are {areas[0]} and {areas[2]}.",
             f"The remaining elements {areas[3]} are outside both circles."],
            "Place the overlap first. When finished, count the entries and check that all appear once.",
            [award("B1", f"Overlap {areas[1]} and both exclusive regions {areas[0]} and {areas[2]} correct."),
             award("B1", f"Outside region {areas[3]} correct with no entries outside the rectangle.")])
    else:
        part1=written_part(f"List the elements of {m(r'A\cap B')}.", set_tex(both),
            [f"Scan both lists for their shared values. The intersection is {set_tex(both)}."],
            "The intersection requires both memberships.",[award("B1", "All and only "+set_tex(both)+".")])
    second = written_part(f"Find {m(r'n(A\cup B)')}.",m(len(either)),
        [f"Include A only, both and B only. Their combined list is {set_tex(either)}.",f"It has {len(either)} distinct members."],
        "The shared region belongs to the union, but count it once.", [award("B1",m(len(either))+".")])
    if style>=3:
        expr,result = ((r"(A\cup B)'",outside) if style==3 else (r"(A\cap B)'",universe-both))
        region_words="both circles" if style==3 else "the lens"
        third=written_part(f"Shade the region {m(expr)} on a new Venn diagram and list its elements.",set_tex(result),
            [f"The bracket selects {region_words}. The prime selects everything else in the rectangle.",f"Those entries are {set_tex(result)}."],
            "Identify the bracketed region before applying the prime.",
            [award("B1",f"Shades the rectangle except {region_words}."),award("B1",set_tex(result)+".")])
    else:
        result=universe-a
        third=written_part(f"List the elements of {m("A'")}.", set_tex(result),
            [f"Keep everything in the rectangle outside A. This gives {set_tex(result)}."],
            "The B-only region and outside-both region are both outside A.", [award("B1",set_tex(result)+".")])
    return ("From a set list to a diagram" if style<3 else "Shade a bracketed complement (Extended)", opening, [part1,second,third])


def two_count_exam(style,i,diagrams):
    (a,b,both,none),text=two_counts(i)
    n=a+b+both+none
    union=a+b+both
    alternate_overlap = both + (1 if i%2 else -1)
    if style>=3:
        # Starting from exactly one separates the overlap from the count of neither.
        text+=p(f"In total there are {n} entries. {a+both} are in A, {b+both} are in B and {a+b} are in exactly one set.")
        detail=[f"The exactly-one total is {m(a+b)}. The whole-circle sum {m(a+b+2*both)} counts every shared entry twice.",
                f"The overlap is {m(fr'\frac{{{a+b+2*both}-{a+b}}}{{2}}={both}') }."]
        scheme=award("M1", "Subtracts the exactly-one total from the sum of the circle totals, then divides by 2.")
    else:
        text+=p(f"In total there are {n} entries. {a+both} are in A, {b+both} are in B and {none} are in neither set.")
        detail=[f"There are {m(f'{n}-{none}={union}')} in at least one set.",
                f"Subtract this union count from the whole-circle sum to find {m(f'{a+both}+{b+both}-{union}={both}') } in both."]
        scheme=award("M1", "Finds the union from the total and neither, then subtracts it from the circle-total sum.")
    first=written_part("Find the number in both sets. Show how you found it.",m(both),detail,
        "Separate the count in exactly one or neither from the whole-circle counts.", [scheme,award("A1",m(both)+".")])
    text+=diagram_html(diagrams["exam-two"])
    second=written_part("Copy the Venn diagram and enter the count in all four regions.",
        f"A only {m(a)}, both {m(both)}, B only {m(b)} and neither {m(none)}.",
        [f"Put {m(both)} in the overlap. Subtract it from each whole-circle total to get {m(a)} and {m(b)} in the exclusive parts.",
         f"The inside total is {m(union)}. The outside is {m(f'{n}-{union}={none}')}.",
         "The four separate regions add to the overall total."], "Put the answer from (a) into the overlap before filling the other regions.",
        [award("B1",f"Both exclusive regions {m(a)} and {m(b)} shown consistently with (a).", "Accept follow-through from a non-negative overlap that gives non-negative counts."),
         award("B1",f"Outside region {m(none)} shown. No contradictory repeated values.")])
    if style%2:
        third=written_part(f"A learner claims the overlap could be {alternate_overlap}. Check this claim against the figures in the question.",
            "The claim contradicts the stated counts.",
            [f"On that assumption the whole-circle counts stay the same. The union would be {m(a+b+2*both-alternate_overlap)}.",
             (f"The exactly-one count would be {m(a+b+2*both-2*alternate_overlap)}, which differs from {m(a+b)}."
              if style>=3 else f"The outside would be {m(n-(a+b+2*both-alternate_overlap))}, which differs from {m(none)}.")],
            "Take the proposed overlap as trial data and recompute a quantity the question provides.",
            [award("B1", "Shows a recalculated count which contradicts the given exactly-one or outside count.")])
    else:
        target = a+b if style<3 else none
        goal = ("How many entries are in exactly one set?" if style<3 else "How many entries are in neither set?")
        support = (f"Use only the exclusive parts: {m(f'{a}+{b}={a+b}')}.", "Leave the overlap and outside out of an exactly-one count.") if style<3 else (f"Subtract the union from the overall total. The result is {m(f'{n}-{union}={none}')}.", "Neither means outside both circles.")
        third = written_part(goal,m(target),[support[0]],support[1],[award("B1",m(target)+". Accept consistent follow-through from the four regions.")])
    return ("Use exactly one to recover the overlap" if style>=3 else "Reconstruct a two-set Venn diagram",text,[first,second,third])


def three_count_exam(style,i,diagrams):
    r,text=three_counts(i)
    a,b,c,ab,ac,bc,t,none=r
    sizes = [a+ab+ac+t,b+ab+bc+t,c+ac+bc+t]
    text+=p(f"There are {sum(r)} entries in the whole record. The numbers in A, B and C are {sizes[0]}, {sizes[1]} and {sizes[2]}, respectively.")
    text+=p(f"The pair totals {m(r'n(A\cap B)')}, {m(r'n(A\cap C)')} and {m(r'n(B\cap C)')} are {ab+t}, {ac+t} and {bc+t}. There are {t} entries in all three.")
    text+=diagram_html(diagrams["exam-three"],300)
    first=written_part("Copy the Venn diagram and enter the numbers in all eight regions.",
        ", ".join(f"{region} {m(value)}" for region,value in zip(REGIONS,r))+".",
        [f"Use {m(t)} in the centre. Subtract it from each pair total to find {m(ab)}, {m(ac)} and {m(bc)} in the three pair-only regions.",
         f"Subtract the known regions from each whole circle to find {m(a)}, {m(b)} and {m(c)} in A only, B only and C only.",
         f"The seven regions in the circles add to {m(sum(r)-none)}. The outside is {m(none)}."],
        "Start at the centre. Work outwards to the pair regions, the single regions and then the outside.",
        [award("B1",f"The centre {m(t)} and all pair-only values {m(ab)}, {m(ac)}, {m(bc)} are correct."),
         award("B1",f"Three exclusive single regions {m(a)}, {m(b)}, {m(c)} correct.","Accept consistent follow-through from pair-only values giving valid counts."),
         award("B1",f"Outside {m(none)} correct.","Accept consistent follow-through from seven inside regions summing to at most the whole total.")])
    region_labels = (
        ("How many entries are in exactly two sets?",ab+ac+bc,"Add AB only, AC only and BC only. Leave out the centre."),
        ("How many entries are in at least two sets?",ab+ac+bc+t,"Add the three pair-only regions and the centre."),
        (f"Find {m(r'n((A\cup B)\cap C)')}.",ac+bc+t,"Inside C, include AC only, BC only and the centre. Leave out C only."),
        (f"Find {m(r'n(A\cap B\cap C\prime)')}.",ab,"Use AB only. The prime on C rules out the centre."),
        (f"Find {m(r'n((A\cup C)\prime)')}.",b+none,"Remove A and C. The remaining regions are B only and outside all three."),
    )
    label,value,instruction=region_labels[style]
    second=written_part(label,m(value),[instruction+f" The count is {m(value)}."],
        "Name the relevant regions before adding their counts.",[award("B1",m(value)+". Accept follow-through from the same regions of the diagram.")])
    third=written_part(f"A learner says {m('n(C)')} is the same as the number in C only. Use the diagram to explain the difference.",
        f"{m(f'n(C)={sizes[2]}')} and C only contains {m(c)}.",
        [f"C includes the AC-only, BC-only and centre regions. Adding them to C only gives {m(f'{c}+{ac}+{bc}+{t}={sizes[2]}')}.",
         f"C only is the one part of C that excludes A and B. It contains {m(c)} entries."],
        "Follow the C boundary and name every region within it.",
        [award("B1","Explains that n(C) includes all shared C regions, with correct counts or consistent use of the student's diagram.")])
    return "Reconstruct and read three overlapping sets (Extended)",text,[first,second,third]


BANK_FACTORIES = (
    (list_rule,count_elements,member_or_subset,list_rule,subset_symbols),
    (overlap_entries,union_entries,complement_entries,overlap_or_disjoint,bracket_entries),
    (count_regions,circle_totals,recover_overlap,count_regions,recover_overlap),
    (exactly_two,pair_with_triple,bracket_count,exactly_two,bracket_count),
)


def build():
    diagrams = make_figures()
    study, questions, lessons = {}, [], []
    for index, (key,title,summary,methods) in enumerate(LESSONS):
        uid = PREFIX+key
        sections, examples, alternatives = [], [], []
        for order, section in enumerate(methods):
            anchor, heading, tier, minutes, intro, idea, method, mistake, factory, related_factory, image = section
            example_index = len(examples)
            seed = 4*order+(index+1)*17
            examples.extend(dict(title=q["title"],question=plain_question(q),solution=q["steps"]) for q in (factory(seed),related_factory(seed+3)))
            blocks=[dict(kind="key",html=p(idea),**({"figure":diagrams[image]} if image else {})),
                dict(kind="text",title="How to do it",html=p(method)),dict(kind="example",index=example_index),
                quick_check(f"{uid}-{anchor}-a",factory(seed+1)),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=example_index+1,tryFirst=True),quick_check(f"{uid}-{anchor}-b",related_factory(seed+4))]
            if order==len(methods)-1:
                blocks.append(dict(kind="tip",html=p("In a written question, label the sets and the universal rectangle. Check every listed element or region against the question.")))
            sections.append(dict(id=anchor,title=heading,label=tier+" · "+anchor.replace("-"," ").capitalize(),minutes=minutes,
                level="core" if tier=="Core" else "extension",intro=p(intro),blocks=blocks))
            for k, fn in enumerate((factory,related_factory),1):
                alternatives.append(quick_check(f"{uid}-{anchor}-extra-{k}",fn(seed+7+2*k)))
        revision_intro = ["Know what the answer represents before you start.", "Read a region, then check what the set operation asks for.",
            "Keep whole-circle totals and separate region counts apart.", "Fill the three-set diagram from the centre outwards."][index]
        revision_body = p(revision_intro)+"".join(f"<h2>{section[1]}</h2>"+p(section[5])+p(section[6]) for section in methods)
        print_diagram = ["rule","two-regions","counts","three-regions"][index]
        revision_body += diagram_html(diagrams[print_diagram],210 if index==3 else 252)
        reminders = ["A strict boundary excludes its endpoint.", "A shared entry appears once in the lens.",
            "Use the sum of the four regions to check the overall total.", "Exactly two excludes the centre. At least two includes it."]
        glossary = {
            "notation": [("Element","An individual member of a set."),("Number of elements",r"\(n(A)\) counts the distinct members of \(A\)."),("Subset",r"\(A\subseteq B\) means every element of \(A\) belongs to \(B\).")],
            "two-regions": [("Universal set","All entries under consideration. Its boundary is the rectangle."),("Intersection","The part inside both circles."),("Union","The part inside one or more circles."),("Complement","All entries in the rectangle outside the named set.")],
            "two-counts": [("Region count","The number of entries whose memberships match one region."),("Circle total","The count in the whole named set, including shared regions."),("Neither","Entries outside both circles within the universal set.")],
            "three-regions": [("Pair intersection","Entries in a given pair of sets, which may also be in the third."),("Pair-only region","Entries in a given pair and outside the remaining set."),("Triple intersection","Entries belonging to all three sets.")],
        }
        if index==0:
            related=[dict(title="Integers, rational numbers and place value",href=f"/courses/{COURSE}/topics/igcse-0580-number-classify")]
        else:
            related=[dict(title=LESSONS[index-1][1],href=f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[index-1][0]}")]
        study[uid] = dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=alternatives,related=related,
            glossary=[dict(term=term,definition=p(definition)) for term,definition in glossary[key]],
            revision=dict(body=revision_body,checks=f"<ul><li>{reminders[index]}</li></ul>",examTip=p(methods[-1][7])))
        lessons.append(dict(key=key,id=uid,title=title,summary=summary,objective=summary,before=p(revision_intro),
            ideas="".join(p(section[5]) for section in methods),method="".join(f"<h4>{section[1]}</h4>"+p(section[6]) for section in methods),
            mistakes=[section[7] for section in methods],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{uid}-worked-{n}") for n,e in enumerate(examples[::2],1)]))
        for j, factory in enumerate(BANK_FACTORIES[index],1):
            family=f"M4U-0580-SETS-{key}-P{j}"
            for k in range(2):
                generated=factory(170+index*13+8*j+k)
                questions.append(short_question(f"{family}-{k}",family,key,generated,k>0,1+min(2,j//2)))
        for j in range(5):
            family=f"M4U-0580-SETS-{key}-W{j+1}"
            for k in range(4):
                args=(j,258+index*19+11*j+k)
                title_,intro_,parts=(notation_exam(*args) if index==0 else (region_exam,two_count_exam,three_count_exam)[index-1](*args,diagrams))
                questions.append(written(f"{family}-{k}",family,key,title_,intro_,parts,k,1+min(3,j)))
    manifest=dict(schema_version=1,key="0580-number-sets",version="1.0.0",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_number_sets",slug="sets-and-venn-diagrams",title="Sets and Venn diagrams",position=1),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=questions,marking_status="DRAFT")
    destination=ROOT/"content/original/0580"
    destination.mkdir(parents=True,exist_ok=True)
    for filename,data in [("number-sets-v1.json",manifest),("number-sets-study.json",study)]:
        (destination/filename).write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons, {sum(len(s['sections']) for s in study.values())} sections, {len(questions)} bank tasks and {len(diagrams)} SVG diagrams")


if __name__=="__main__":
    build()
