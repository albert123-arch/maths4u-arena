from itertools import combinations, permutations
from math import comb, factorial, perm, prod
from pathlib import Path

from prepare_0606_discrete import Lesson, Section, build, figure, graded, inline as m


ARCHIVE = Path(r"E:\my folder\questions_data\0606 Additional Mathematics\10 Permutations and combinations.json")
CHAPTER = "permutations-combinations"


def p(n, r):
    return rf"{{}}^{{{n}}}P_{{{r}}}"


def c(n, r):
    return rf"\binom{{{n}}}{{{r}}}"


def factorial_cancel(seed, mode=0):
    n = 6 + seed % 13
    k = 2 + (seed // 13) % 4
    lower = n - k
    if mode == 1:
        question = rf"\frac{{({n}+1)!}}{{{n}!}}+0!"
        return graded("Simplify a factorial expression", f"Evaluate {m(question)}.", n + 2,
                      (f"Write {m(f'({n}+1)!=({n}+1){n}!')}. Cancel the common factorial.",
                       f"The remaining terms are {m(f'{n+1}+1')}, since {m('0!=1')}."),
                      "Expand only the longer factorial. Remember the empty arrangement.",
                      "Cancel the factorial factor and replace zero factorial by one.",
                      wrong=(n+1, "The factorial ratio is correct. The additional term is one."), mark=2)
    if mode == 2:
        total = (n+2)*(n+1)
        return graded("Find the integer in a factorial equation",
                      f"Find the non-negative integer {m('r')} for which {m(rf'\frac{{(r+2)!}}{{r!}}={total}')}.", n,
                      (f"Expand and cancel to obtain {m(f'(r+2)(r+1)={total}')}.",
                       f"The two consecutive factors are {m(n+1)} and {m(n+2)}. The other algebraic root is negative."),
                      "The factorial ratio leaves two consecutive factors.",
                      "Cancel the common factorial and solve the resulting quadratic in the stated domain.",
                      wrong=(n+1, "The smaller factor is one more than the requested value."), mark=3)
    value = perm(n, k)
    factors = r"\times".join(str(j) for j in range(n, lower, -1))
    assert value == prod(range(lower+1, n+1))
    return graded("Cancel a factorial quotient", f"Evaluate {m(rf'\frac{{{n}!}}{{{lower}!}}')}.", value,
                  (f"The common factor is {m(f'{lower}!')}. Cancel it.",
                   f"Multiply the remaining factors: {m(factors)}."),
                  "Expand the numerator only as far as the factorial in the denominator.",
                  "Cancel the common factorial and multiply the remaining consecutive factors.",
                  wrong=(value * lower, "The factor immediately below the last required factor belongs to the cancelled denominator."), mark=2)


LINE_CONTEXTS = (
    ("Distinct posters are hung in a row.", "The harbour and forest posters"),
    ("Distinct tiles are placed in a row.", "The amber and cobalt tiles"),
    ("Distinct books are placed on a shelf from left to right.", "The bird and tree books"),
    ("Distinct radio jingles are scheduled in a list.", "The opening-theme and chime recordings"),
    ("Distinct flags are displayed along a straight rail.", "The coral and plum flags"),
    ("Distinct instruments are arranged in a straight display.", "The lute and flute"),
    ("Distinct plant pots are placed in a line.", "The mint and thyme pots"),
    ("Distinct prints are displayed in a straight line.", "The waterfall and lighthouse prints"),
    ("Distinct labelled jars are placed in a row.", "The honey and pepper jars"),
    ("Distinct teaching cards are put in a row.", "The tangent and chord cards"),
    ("Distinct lesson clips are placed in a playlist.", "The warm-up and summary clips"),
    ("Distinct model boats are lined up on a table.", "The ferry and yacht models"),
)


def line_count(seed, mode=0, context=None):
    n = 5 + seed % 8
    intro, pair = LINE_CONTEXTS[(seed // 8 + (context or 0)) % len(LINE_CONTEXTS)]
    stem = f"{intro} There are {n} objects."
    whole = factorial(n)
    together = 2 * factorial(n-1)
    if mode == 1:
        a = graded("Keep two positions adjacent", f"{stem} {pair} must be adjacent. How many orders are possible?", together,
                   (f"Treat the two named objects as a block. Arrange this block and the {n-2} remaining objects.",
                    f"Multiply {m(f'{n-1}!')} by two because the order inside the block can be reversed."),
                   "Treat the two named objects as one block, then restore their internal order.",
                   "Arrange the block and the remaining objects, and allow both orders inside the block.",
                   wrong=(factorial(n-1), "This counts each block only once. Both internal orders are allowed."), mark=3)
    elif mode == 2:
        a = graded("Count only separated pairs", f"{stem} {pair} must not be next to one another. How many orders are possible?", whole-together,
                   (f"All orders give {m(f'{n}!')}. The adjacent pair can be treated as one item, with two possible internal orders.",
                    f"Subtract {m(f'2\\times {n-1}!')} from the unrestricted count."),
                   "Work out the number of adjacent arrangements and subtract it.",
                   "Subtract the two internal orders of the block from the unrestricted count.",
                   wrong=(together, "That counts the excluded arrangements with the pair adjacent."), mark=3)
        a.method = "Use the complement and subtract the adjacent block count from all arrangements."
    elif mode == 3:
        a = graded("Use the two outside positions", f"{stem} {pair} occupy the two ends, in either order. How many orders are possible?",
                   2*factorial(n-2),
                   (f"Choose one of the two named objects for the first end. The second end is then fixed.",
                    f"Arrange the other {n-2} objects in the intervening positions."),
                   "Choose which named object is on each end, then arrange the middle.",
                   "Allow the two end assignments and arrange the middle positions.",
                   wrong=(factorial(n-2), "The named objects can swap ends."), mark=3)
    else:
        a = graded("Use the product rule to arrange distinct objects", f"{stem} How many orders are possible with no restriction?", whole,
                   (f"There are {n} choices for the first place, {n-1} for the next, and so on down to one.",
                    f"Multiply these choices to obtain {m(f'{n}!')}."),
                   "After each position is filled there is one fewer choice.",
                   "Use a descending product for the choices of positions.",
                   wrong=(n*n, "There are different numbers of choices at each stage. The supply shrinks after each choice."), mark=2)
    if seed < 8:
        ordered = list(permutations(range(n))) if n <= 7 else ()
        if ordered:
            flag = (lambda xs: True, lambda xs: abs(xs.index(0)-xs.index(1)) == 1,
                    lambda xs: abs(xs.index(0)-xs.index(1)) > 1,
                    lambda xs: {xs[0], xs[-1]} == {0,1})[mode]
            assert sum(flag(xs) for xs in ordered) == int(a.field["expected"])
    return a


ROLE_CONTEXTS = (
    ("A workshop has {n} distinct speaker applications.", "assign the {r} numbered speaking slots"),
    ("A design studio has {n} distinct mock-ups.", "fill {r} labelled places in a display"),
    ("There are {n} entrants in a school challenge.", "record the first {r} places, with no ties"),
    ("A library has {n} distinct posters.", "fill {r} numbered panels"),
    ("A museum has {n} different objects available.", "place objects in {r} numbered cases"),
    ("A community centre has {n} distinct volunteer applicants.", "appoint people to {r} different posts"),
    ("A festival has {n} distinct short films.", "fill {r} consecutive times labelled in order"),
    ("A panel considers {n} different performances.", "publish the ordered top {r} places"),
    ("There are {n} distinctive trails in a park.", "set {r} numbered stops on an information board"),
    ("A gardener has {n} distinct plants for a display.", "fill {r} labelled planting positions"),
)


def role_count(seed, mode=0, context=None):
    n = 7 + seed % 10
    r = 2 + (seed // 10) % 4
    description, instructions = ROLE_CONTEXTS[(seed // 40 + (context or 0)) % len(ROLE_CONTEXTS)]
    desc = description.format(n=n)
    action = instructions.format(r=r)
    whole = perm(n,r)
    if mode == 1:
        count = perm(n-1,r-1)
        return graded("Fill a fixed named slot", f"{desc} To {action}, one particular candidate or item must fill the first slot. How many results are possible?", count,
                      (f"Fill the first slot in exactly one way. Choose and order the remaining {r-1} slots from {n-1} options.",
                       f"Use {m(p(n-1,r-1))}."),
                      "Reserve the first slot before counting the remaining slots.",
                      "Fix the specified item, then use a permutation of the remaining distinct items.",
                      wrong=(whole, "That allows any choice in the slot that must be fixed."), mark=3)
    if mode == 2:
        count = whole - perm(n-1,r-1)
        return graded("Exclude one assignment to a slot", f"{desc} To {action}, one particular candidate or item cannot fill the first slot but may fill another slot. How many results are possible?", count,
                      (f"Count all results with {m(p(n,r))}. There are {m(p(n-1,r-1))} results with the restricted item first.",
                       "Subtract the restricted results only. The restricted item is allowed in the other slots."),
                      "Separate the forbidden first-slot assignment from the allowed later assignments.",
                      "Subtract only the arrangements with the restricted object in the first position.",
                      wrong=(perm(n-1,r), "That removes the item from all positions."), mark=3)
    if mode == 3:
        count = r * perm(n-1, r-1)
        return graded("Include a specified item somewhere in an order", f"{desc} To {action}, a named item or candidate must be used. How many results are possible?", count,
                      (f"Choose one of the {r} positions for the specified item.",
                       f"Order the remaining {r-1} positions in {m(p(n-1,r-1))} ways and multiply."),
                      "Decide where the required item goes before filling the other places.",
                      "Choose the place for the required object, then order the remaining objects.",
                      wrong=(perm(n-1,r-1), "That assumes the required choice is in one particular position."), mark=3)
    assert whole == prod(range(n-r+1,n+1))
    return graded("Count ordered selections", f"{desc} In how many ways can the organiser {action}? A candidate or item may be used only once.", whole,
                  (f"The slots are different, so use {m(p(n,r))}.",
                   f"Compute {m(rf'\frac{{{n}!}}{{{n-r}!}}')}."),
                  "Swapping two occupied places produces a different result.",
                  "Use a permutation because the chosen places are different.",
                  wrong=(comb(n,r), "That counts sets of choices. Changing the order here changes the result."), mark=2)


GROUPS = (
    ("art portfolios", "ceramic pieces", "drawings"),
    ("circuit kits", "resistors", "lamps"),
    ("library sets", "biographies", "novels"),
    ("garden trials", "herbs", "shrubs"),
    ("display boxes", "wood carvings", "stone carvings"),
    ("booklet designs", "photographs", "diagrams"),
    ("music packs", "choral tracks", "solo tracks"),
    ("science sets", "water samples", "soil samples"),
    ("news collections", "interviews", "reports"),
    ("recipe bundles", "starters", "desserts"),
    ("activity packs", "trail maps", "identification cards"),
    ("classroom exhibits", "paper models", "wooden models"),
)


def selection(seed, mode=0, context=None):
    a = 4 + seed % 8
    b = 5 + (seed // 8) % 8
    k = 4 + (seed // 64) % 3
    h = 2 if k < 6 else 3
    spec, ac, bc = GROUPS[(seed // 17 + (context or 0)) % len(GROUPS)]
    stem = f"To make {spec}, a curator may choose from {a} distinct {ac} and {b} distinct {bc}. Selections of {k} items are unordered."
    unrestricted = comb(a+b,k)
    exact = comb(a,h)*comb(b,k-h)
    if mode == 1:
        return graded("Meet an exact two-group quota", f"{stem} How many selections contain exactly {h} of the {ac}?", exact,
                      (f"Choose {h} of the {ac}, then {k-h} of the {bc}.",
                       f"Both choices are needed, so multiply {m(c(a,h))} by {m(c(b,k-h))}."),
                      "Split the selection into independent choices from the two groups.",
                      "Use a combination for each group. Multiply because both choices are required.",
                      wrong=(comb(a,h)+comb(b,k-h), "Adding would describe either one choice or the other. The selection needs both."), mark=3)
    if mode == 2:
        missing = comb(b,k)
        count = unrestricted-missing
        return graded("Require at least one from a group", f"{stem} How many selections contain at least one of the {ac}?", count,
                      (f"All selections: {m(c(a+b,k))}. Those with none of the {ac}: {m(c(b,k))}.",
                       "Discard just that single excluded class."),
                      "Count selections with no member of the required group.",
                      "Subtract selections from the other group alone from the total.",
                      wrong=(comb(a,1)*comb(b,k-1), "At least one also includes selections with two or more from the required group."), mark=3)
    if mode == 3:
        take = (h-1,h)
        total = sum(comb(a,j)*comb(b,k-j) for j in take)
        low = comb(a,h-1)*comb(b,k-h+1)
        return graded("Add disjoint selection cases", f"{stem} How many selections contain either {h-1} or {h} of the {ac}?", total,
                      (f"Count the two disjoint cases as {m(c(a,h-1)+c(b,k-h+1))} and {m(c(a,h)+c(b,k-h))}.",
                       f"Add the counts {m(low)} and {m(exact)}."),
                      "For each exact number, multiply group choices. Then add the disjoint cases.",
                      "Count the two disjoint choices separately and add them.",
                      wrong=(exact, "This gives one of the two allowed cases."), mark=4)
    if seed < 22:
        assert unrestricted == sum(1 for _ in combinations(range(a+b),k))
    return graded("Count unordered selections", f"{stem} How many different selections are possible with no further restriction?", unrestricted,
                  (f"Choose {k} of the {a+b} distinct items. Use {m(c(a+b,k))}.",
                   f"Divide the ordered count by {m(f'{k}!')} to account for all the descriptions of the same set."),
                  "Switching the order in which two objects are chosen leaves the same set.",
                  "Use a combination for an unordered choice.",
                  wrong=(perm(a+b,k), "That counts different orders for the same collection."), mark=2)


def reverse(seed, mode=0):
    n = 7 + seed % 34
    if mode == 1:
        target = comb(n,2)
        question = f"A mixer organiser chooses two different people from a group of {m('n')}. There are {target} different unordered pairs. Determine {m('n')}."
        return graded("Recover the group size from pair counts", question, n,
                      (f"Set {m(rf'\frac{{n(n-1)}}{{2}}={target}')}.",
                       f"The roots of the resulting quadratic are {m(n)} and {m(1-n)}. The group size must be positive."),
                      "Pairs are unordered. Divide the two-place ordered count by two.",
                      "Set a combination equal to the data and keep the positive integer solution.",
                      wrong=(n-1, "The product gives consecutive integers. The greater one is the number available."), mark=3)
    if mode == 2:
        r = 1 + (seed//5) % 6
        n += r + 7
        question = f"Find the value of {m(r'\frac{\binom{'+str(n)+r'}{'+str(r+1)+r'}}{\binom{'+str(n)+r'}{'+str(r)+r'}}')} in simplest form."
        from fractions import Fraction
        value = Fraction(n-r,r+1)
        assert value == Fraction(comb(n,r+1),comb(n,r))
        return graded("Compare successive combination counts", question, value,
                      (f"Write both combinations using factorials. The common {m(f'{n}!')} cancels.",
                       f"The ratio reduces to {m(rf'\frac{{{n-r}}}{{{r+1}}}')}."),
                      "Cancel common factorials before multiplying large numbers.",
                      "Replace both combinations by factorial quotients and cancel.",
                      mark=3)
    target = perm(n,2)
    return graded("Recover the group size from ordered pairs", f"There are {target} ways to name a first and second person from a group of {m('n')} distinct people. Determine {m('n')}.", n,
                  (f"Use {m(f'n(n-1)={target}')}.",
                   f"The roots are {m(n)} and {m(1-n)}. Only the first is a possible group size."),
                  "There are n choices first and one fewer second.",
                  "Use the ordered product and reject the non-physical root.",
                  wrong=(n-1, "The smaller factor is the number of options after the first person is chosen."), mark=3)


def bind(func, *args):
    return lambda seed: func(seed, *args)


def factorial_exam(seed, i, variant):
    return "Factorial cancellation and reverse counting", (
        factorial_cancel(seed + 2*(i%3), i % 2),
        factorial_cancel(seed + 9 + i % 5, 2),
    )


def arrangement_exam(seed, i, variant):
    modes = [(0,1,2),(0,3,1),(0,2,3),(1,3,2)][i%4]
    return "Compare restrictions on a straight line", tuple(line_count(seed+4, mode, 2*i) for mode in modes)


def ordered_exam(seed, i, variant):
    modes = [(0,1,2),(0,2,3),(1,2,3),(0,3,1)][i%4]
    return "Count assignments to different places", tuple(role_count(seed+5, mode, i) for mode in modes)


def selection_exam(seed, i, variant):
    modes = [(1,2),(0,3),(1,3),(0,2),(2,3)][i%5]
    return "Select a group under two conditions", tuple(selection(seed+3, mode, i) for mode in modes)


def reverse_exam(seed, i, variant):
    return "Determine a missing group size and check a counting ratio", (
        reverse(seed + 4, i%2), reverse(seed + i + 7, 2),
    )


def diagram():
    boxes = "".join(f'<rect x="{33+111*i}" y="76" width="96" height="87" rx="8" fill="#e0effe" stroke="#365e83"/>' for i in range(3))
    labels = "".join(f'<text x="{81+111*i}" y="109" text-anchor="middle">Slot {i+1}</text>'
                     f'<text x="{81+111*i}" y="139" text-anchor="middle">{6-i} choices</text>' for i in range(3))
    graphic = boxes + '<g font-family="system-ui" font-size="17" fill="#15314a">' + labels + '</g>'
    return figure(CHAPTER,"shrinking-choices",
                  "Six distinct objects fill three labelled slots. Each choice removes one object from the supply.",
                  "Slot 1 has six choices, slot 2 has five choices, and slot 3 has four choices.",graphic,420,215)


def lessons():
    tip = "Name what is being counted in each factor. Multiply successive choices and add only disjoint alternatives."
    glossary = (("Factorial", f"{m('n!')} is the product of the positive integers up to n."),
                ("Permutation","An ordered selection of distinct objects."),
                ("Combination","An unordered selection of distinct objects."),
                ("Complement","All outcomes for which the stated condition fails."))
    return (
        Lesson("factorial-notation","Factorials and the product rule","Simplify factorial ratios and justify the product rule.",
               (Section("successive-places","What changes when a place is filled?",
                        "Multiply the number of options at each stage. Filling a position removes one option from the remaining supply.",
                        f"Write the choices for each position over a row of empty boxes. If all n positions are filled with distinct objects, the product is {m('n!')}.",
                        "Adding the numbers of options misses the combinations of consecutive choices.",
                        (bind(line_count,0),bind(role_count,0)),diagram()),
                Section("cancel-factors","How much of a factorial do I expand?",
                        "Expand only to the largest common factorial, then cancel it.",
                        f"Treat {m('0!')} as one empty arrangement. For a longer numerator, step down one factor at a time.",
                        "Cancel factors of the whole product. A factorial does not distribute over addition.",
                        (bind(factorial_cancel,0),bind(factorial_cancel,1))),
                Section("work-back","How can I solve a factorial equation?",
                        "Cancel first, then solve the smaller polynomial equation.",
                        "Check that each resulting factorial argument is a non-negative integer. Use the context to choose a valid root.",
                        "An algebraic root may lie outside the factorial domain.",
                        (bind(factorial_cancel,2),bind(reverse,0)))),
               glossary,8,(factorial_exam,),tip),
        Lesson("arrangements","Arrangements in a row","Count arrangements of distinct objects with position and adjacency restrictions.",
               (Section("end-places","How do fixed places affect an arrangement?",
                        "Fill restricted positions first. The remaining places use the objects that remain.",
                        "If two named objects occupy both ends in either order, count both left–right choices and arrange the middle.",
                        "Filling both end positions uses two objects. They cannot reappear in the middle.",
                        (bind(line_count,0),bind(line_count,3))),
                Section("blocks","How does making a block help?",
                        "A required adjacent group acts as one item when counting its position.",
                        "Count the internal arrangements separately and multiply. Put the distinct members back into their block after moving it.",
                        "Treating the pair as a block removes an outside position, not an internal order.",
                        (bind(line_count,1),bind(line_count,3))),
                Section("separated","How do I count when two objects must be apart?",
                        "Count all arrangements, then subtract those where the pair is adjacent.",
                        "The complement is useful because a single block count covers every forbidden adjacent position.",
                        "The words 'not together' describe the complement of the block count.",
                        (bind(line_count,2),bind(line_count,1)))),
               glossary,14,(arrangement_exam,),tip),
        Lesson("ordered-selections","Permutations and ordered selections","Choose and order a smaller set of distinct objects.",
               (Section("different-slots","When does order change the outcome?",
                        f"Use {m(r'{}^nP_r=\frac{n!}{(n-r)!}')} for r different roles from n distinct items.",
                        "List the roles in a fixed sequence. The second selection has one fewer choice than the first.",
                        "A selection rule counts a set only once. It cannot distinguish first place from second place.",
                        (bind(role_count,0),bind(role_count,1))),
                Section("specified-slot","How does a one-position ban work?",
                        "A candidate barred from the first slot may still be used later.",
                        "Find the total and subtract the orders with that candidate first. Check each permitted later slot still has the right options.",
                        "Removing a candidate from the pool entirely is a stronger restriction.",
                        (bind(role_count,2),bind(role_count,0))),
                Section("must-use","How do I include a required item?",
                        "Place the required item in one available slot, then order the remaining choices.",
                        "A count for one possible position must be multiplied by the number of legal positions. All these cases are disjoint.",
                        "A required item is not necessarily fixed in the first slot.",
                        (bind(role_count,3),bind(role_count,2)))),
               glossary,14,(ordered_exam,),tip),
        Lesson("group-choices","Combinations and group quotas","Count selections by group, using exact quotas and complements.",
               (Section("no-order","What does an unordered choice count?",
                        f"Use {m(r'\binom nr=\frac{n!}{r!(n-r)!}')} when the chosen objects form one set.",
                        "Decide whether a different order produces a different outcome. If the set is unchanged, divide the ordered count by the internal orders.",
                        "Using an ordered formula counts the same selection several times.",
                        (bind(selection,0),bind(selection,1))),
                Section("exact-quota","How do I count a selection with a quota?",
                        "Pick the required number from each group and multiply.",
                        "Use a row of group sizes above the row of numbers required. Check the required counts add to the size of the selection.",
                        "The order of choices within each group has no effect.",
                        (bind(selection,1),bind(selection,3))),
                Section("at-least","When is a complement shorter?",
                        "For at least one, count all selections except those containing none of the required group.",
                        "For two exact quotas, count each separately and add. For at least one, a single forbidden case may be quicker.",
                        "At least one includes every allowed positive quota.",
                        (bind(selection,2),bind(selection,3)))),
               glossary,19,(selection_exam,),tip),
        Lesson("reverse-counts","Recovering an unknown count","Translate a stated count into an equation and check the domain.",
               (Section("order-equation","How do I model a reported number of orders?",
                        "Two different labelled positions give n times one fewer than n.",
                        "Use the two factors to build a quadratic. The number of people or objects is a positive whole number.",
                        "The value of the smaller factor is the supply after the first choice.",
                        (bind(reverse,0),bind(factorial_cancel,2))),
                Section("pair-equation","Why does an unordered pair give half the count?",
                        "Every unordered pair has two descriptions if you write its members in order.",
                        "Divide by two, form the equation, multiply through, then solve for the positive integer.",
                        "An ordered pair count is double the number of two-element sets.",
                        (bind(reverse,1),bind(reverse,2))),
                Section("compare-formulas","How can I compare two combinations efficiently?",
                        "Write adjacent combination counts as factorial quotients and cancel before evaluating.",
                        f"The ratio of {m(r'\binom n{r+1}')} to {m(r'\binom nr')} is {m(r'\frac{n-r}{r+1}')} where both are defined.",
                        "Preserve the order of the ratio. Reversing numerator and denominator reverses the result.",
                        (bind(reverse,2),bind(factorial_cancel,0)))),
               glossary,15,(reverse_exam,),tip),
    )


if __name__ == "__main__":
    build(CHAPTER, "Permutations and combinations", 9, ARCHIVE, lessons())
