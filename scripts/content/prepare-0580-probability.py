"""Build original Cambridge 0580 probability lessons and question families."""

from fractions import Fraction as Q
from hashlib import sha256
from html import escape
import json
from math import cos, sin, tau
from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]
COURSE="maths4u-0580"
PREFIX="igcse-0580-prob-"
DATE="2026-11-22"


def p(text):
    return f"<p>{text}</p>"


def m(value):
    return r"\("+escape(str(value),quote=False)+r"\)"


def ft(value):
    value=Q(value)
    return str(value) if value.denominator==1 else fr"\frac{{{value.numerator}}}{{{value.denominator}}}"


def fm(value):
    return m(ft(value))


def frac(n,d):
    return m(fr"\frac{{{n}}}{{{d}}}")


def task(title,stem,field,answer,solution,rule,hint,wrong=(),art=None,write=None):
    retry={str(value):p(feedback) for value,feedback in wrong if str(value)!=str(field["expected"])}
    return dict(title=title,prompt=stem,field=field,answer=answer,solution=[p(step) for step in solution],mark=p(rule),hint=p(hint),
        retry=[dict(answer=value,feedback=feedback) for value,feedback in retry.items()],art=art,write=write)


def number(title,stem,answer,solution,rule,hint,wrong=(),*,count=False,art=None,extra=""):
    key=str(Q(answer))
    shown=fm(answer)
    request="" if count else " Give an exact fraction or decimal."
    field=dict(key="answer",type="number",label="Number" if count else "Probability (fraction or decimal)",expected=key)
    return task(title,p(stem+request)+extra,field,shown,solution+[f"The answer is {shown}."],rule,hint,wrong,art=art)


def choose(seed,title,stem,answer,alternatives,solution,rule,hint,write=None):
    keys="ABCD"
    i=seed%4
    keys=keys[i:]+keys[:i]
    options=dict(sorted(zip(keys,[answer,*[v for v,_ in alternatives]])))
    assert len(set(options.values()))==4
    field=dict(key="answer",type="choice",label="Choose one answer",expected=keys[0],options=options)
    return task(title,p(stem),field,answer,solution,rule,hint,zip(keys[1:],[feedback for _,feedback in alternatives]),write=p(write) if write else None)


def tab(caption,columns,rows):
    heads="".join(f'<th scope="col">{name}</th>' for name in columns)
    values="".join('<tr><th scope="row">'+str(row[0])+"</th>"+"".join(f"<td>{cell}</td>" for cell in row[1:])+"</tr>" for row in rows)
    return f'<table><caption>{caption}</caption><thead><tr>{heads}</tr></thead><tbody>{values}</tbody></table>'


def counts(seed):
    return 3+seed%17,4+seed%13,2+seed%11


def scale_point(seed):
    # Choose an event on the probability scale, and make its data distinguishable from other examples.
    certainty=("Impossible","Certain","Equally likely to happen or not happen")[seed%3]
    labels=("Impossible","Unlikely, but possible","Equally likely to happen or not happen","Certain")
    probability=(Q(0),Q(1),Q(1,2))[seed%3]
    a=2+seed%47
    mode=seed%3
    words=(f"A machine assigns integers from 1 to {a}, each equally likely. It cannot assign {a+1}.",
           f"A machine assigns integers from 1 to {a}, each equally likely. Consider the event that the selected number is at most {a}.",
           f"A folder contains {a} green labels and {a} silver labels. One label is selected at random. Consider the event that it is green.")[mode]
    meaning=(f"There are no allowed outcomes above {a}.","Every possible outcome meets the event.","The event and its complement have the same number of equally likely outcomes.")[mode]
    options=[(word,"Compare the count for the event with the complete set of possible outcomes.") for word in labels if word!=certainty]
    q=choose(seed,"Connect a chance to a point on the scale",words+" Which description matches the event?",certainty,options,
        [meaning,f"Its position on the scale is {fm(probability)}. This means {certainty.lower()}."],
        "Link the event's outcome count to its position on the probability scale.","Use 0 for impossible, 1 for certain and one half for an even chance.",
        words+" State whether the event is impossible, equally likely to happen or not happen, or certain. Give a numerical probability and a reason.")
    q["writtenAnswer"]=f"{certainty}, probability {fm(probability)}."
    return q


def one_outcome(seed):
    a,b,c=counts(seed)
    n=a+b+c
    return number("Count favourable and total outcomes",f"A packet has {a} blue markers, {b} white markers and {c} orange markers. One marker is chosen at random. Find the probability it is blue.",Q(a,n),
        [f"There are {n} markers altogether. Each separate marker is equally likely to be chosen.",f"The favourable count is {a} blue markers, so use {frac(a,n)}."],
        "Divide the number of blue markers by the total of all three groups.","Count all individual markers in the denominator, even colours that do not meet the event.",
        [(Q(a,a+b),"Include the orange markers in the total as well."),(Q(1,3),"The equally likely outcomes are the individual markers. Do not treat each colour as one outcome.")],art=("counts",(a,b,c)))


def complement(seed):
    total=10+seed%31
    success=2+seed%(total-3)
    event=Q(success,total)
    result=1-event
    return number("Find the complement of an event",f"During one check the probability that a reading is acceptable is {fm(event)}. Find the probability that it is not acceptable.",result,
        ["The event and its complement cover every result, so their probabilities add to 1.",
         f"Subtract the given probability from 1. In a common denominator the result is {frac(total-success,total)}."],
        "Subtract the probability of acceptable from 1.","A result either is acceptable or is not acceptable. Use the total probability of 1.",
        [(event,"That is the probability of the original event. The question asks for its complement.")])


def probability_from_table(seed):
    a,b,c=counts(seed+7)
    values=tab("Number of parcels by destination",("Destination","Parcels"),(("Library",a),("Studio",b),("Sports hall",c)))
    n=a+b+c
    return number("Read a probability from a frequency table",f"One parcel from the table is selected at random. Find the probability that it does not go to the library.",Q(b+c,n),
        [f"Use {b+c} parcels from the studio and sports hall together. There are {n} parcels in all."],
        "Count both categories outside Library and divide by the grand total.","The event includes both of the other rows, since neither is Library.",
        [(Q(a,n),"This counts library parcels. Use the remaining two rows."),(Q(b,n),"The sports hall row also meets the event.")],extra=values)


def missing_probability(seed):
    first=5+seed%27
    second=11+seed%23
    third=100-first-second
    return number("Find the missing chance in an unequal probability model",
        f"Each repaired part is classified as good, adjustment needed or rejected, with no other classification. The chance of needing adjustment is {first}%. The chance of rejection is {second}%. Find the probability that a part is classified as good.",
        Q(third,100),[f"The three classifications cover all outcomes, so their chances add to 100%.",
         f"Subtract {first}% and {second}% from 100%. This gives {third}%, which is {frac(third,100)}."],
        "Subtract both given chances from the full 100%.","The figures given describe chances directly. The three outcomes do not need equal chances.",
        [(Q(1,3),"These classifications have different chances. Use the given values."),(Q(first+second,100),"This is the chance of either of the other two classifications.")])


def relative(seed):
    all_trials=46+seed%83
    correct=11+seed%31
    return number("Estimate probability from repeated observations",
        f"A paper propeller lands upright in {correct} of {all_trials} trials. Use relative frequency to estimate the probability of an upright landing.",Q(correct,all_trials),
        ["Use the observed results. Divide upright landings by the total number of trials, including unsuccessful landings.",
         "This estimates the chance in similar trials. Repeating the experiment may give a different observed relative frequency."],
        "Divide upright landings by all the trials.","Relative frequency means the fraction of trials that actually met the event.",
        [(Q(all_trials-correct,all_trials),"This is the fraction of landings that were not upright.")],art=("frequency",(correct,all_trials-correct)))


def expected_frequency(seed):
    den=4+seed%13
    num=1+seed%(den-1)
    trials=den*(5+seed%21)
    chance=Q(num,den)
    expected=trials*chance
    return number("Predict an expected number of outcomes",
        f"A calibration test fails with probability {fm(chance)} on each trial. For {trials} similar trials, find the expected number of failures.",expected,
        [f"Multiply the number of future trials by the probability on one trial. Use {m(fr'{trials}\times {ft(chance)}')}.",
         "This is an expected count, rather than a guarantee of how many failures will occur."],
        "Multiply the per-trial probability by the number of trials.","Multiply, because you want the chance applied across the whole group of trials.",
        [(chance,"This is the probability of one failure rather than the expected number of failures."),(trials-expected,"That is the expected number that pass. Count failures.")],count=True)


def pool_trials(seed):
    x=27+seed%29
    y=53+seed%31
    a=3+seed%11
    b=19+seed%17
    probability=Q(a+b,x+y)
    values=tab("Two runs of the same test",("Run","Successes","Trials"),(("Morning",a,x),("Afternoon",b,y)))
    return number("Combine trial results before estimating",f"Both runs use the same method. Use all the trials in the table to estimate the probability of success.",probability,
        [f"Add the success counts to get {a+b}. Add the trial counts to get {x+y}.","Divide total successes by total trials. The two runs have different sizes."],
        "Pool the success and trial counts separately before dividing.","The runs have different trial counts, so pool the trials to give each trial equal weight.",
        [((Q(a,x)+Q(b,y))/2,"A simple average gives the two runs equal weight. Here the individual trials should have equal weight."),
         (Q(a,x),"Include the afternoon run as well.")],extra=values)


def fairness(seed):
    red=27+seed%43
    black=red+1+seed%11
    stem=f"A counter-making test has two possible results. The supplier claims the results are equally likely. In one run there are {red} red results and {black} black results."
    answer="Different observed counts can occur even when the two chances are equal."
    return choose(seed,"Distinguish random variation from evidence of bias",stem+" Which conclusion is justified from this single run?",answer,
        [("The different counts prove the supplier is wrong.","A fair process does not make the observed results exactly equal each time."),
         ("The red result has no chance of occurring again.","A red result occurred, and both outcomes can still occur on the next trial."),
         ("Each future run must have the same counts as this one.","Observed counts can vary between runs even when the chance stays fixed.")],
        ["Fair means equal probabilities for the two outcomes, not fixed observed counts.","A single nonmatching count does not prove bias. More comparable trials can improve an estimate."],
        "Use the difference between theoretical fairness and observed frequencies.","A random result can vary even when the rules and chances do not change.",stem+" Explain why the unequal counts alone do not prove bias.")


def sample_model(seed):
    left=tuple(range(1+seed%5,4+seed%5))
    right=tuple(range(1+seed%8,5+seed%8))
    return left,right


def sample_sum(seed):
    a,b=sample_model(seed)
    target=a[0]+b[0]+1+seed%4
    values=[(x,y) for x in a for y in b if x+y==target]
    count=len(values)
    grid=tab("Totals from the two spinners",("First / second",*b),[(x,*[x+y for y in b]) for x in a])
    return number("Count equal outcomes in an ordered sample space",
        f"A fair spinner is numbered {a[0]} to {a[-1]}. A second fair spinner is numbered {b[0]} to {b[-1]}. The spins are independent. Find the probability that the two numbers add to {target}.",Q(count,len(a)*len(b)),
        [f"There are {len(a)} choices for the first spinner and {len(b)} for the second, giving {len(a)*len(b)} equally likely pairs.",
         f"Exactly {count} ordered pairs give the required total. Count those cells in the grid."],
        "Count the cells showing the target sum and divide by the number of ordered pairs.","Different ordered pairs can give the same total. Count the cells, not the distinct sums.",
        [(Q(1,len(a)+len(b)-1),"The distinct totals are not equally likely. Use the ordered pairs."),(Q(count,len(a)+len(b)),"Multiply the number of choices for the two spinners; do not add them.")],
        art=("spinners",(a,b)),extra=grid)


def sample_product(seed):
    a,b=sample_model(seed+5)
    cutoff=a[1]*b[1]
    total=len(a)*len(b)
    hits=sum(x*y>cutoff for x in a for y in b)
    stem=f"The numbers {a[0]} to {a[-1]} are equally likely on one spinner. The numbers {b[0]} to {b[-1]} are equally likely on another. Spin each once independently. Find the probability that the product is greater than {cutoff}."
    return number("Use a strict condition on a sample-space grid",stem,Q(hits,total),
        [f"List the {total} possible pairs. Multiply the numbers in each pair.",
         f"Count only products greater than {cutoff}. There are {hits} successful pairs."],
        "Count ordered pairs whose product is strictly above the stated value and divide by all pairs.","The two labels form one cell of the grid. Leave out products exactly equal to the boundary.",
        [(Q(sum(x*y>=cutoff for x in a for y in b),total),"The question says greater than. Do not include pairs with an equal product.")])


def returned_outcomes(seed):
    # Use two draws from one set so that reversing an ordered pair can represent another outcome.
    n=4+seed%13
    threshold=2*n-3+seed%4
    start=n-2
    values=range(start,n+1)
    hits=sum(x+y>=threshold for x in values for y in values)
    return number("List outcomes from two draws with replacement",
        f"Three chips numbered {start}, {n-1} and {n} are equally likely on each draw. A chip is drawn and replaced before a second draw. Find the probability that the sum is at least {threshold}.",Q(hits,9),
        ["There are three choices for each draw because the first chip is returned. Draw a row and column for each number.",
         f"Mark the {hits} pairs that meet the condition, including pairs with a repeated number if their sum qualifies."],
        "Use all nine ordered outcomes and count the ones meeting the given inclusive boundary.","Replacement allows the same chip to appear twice and leaves nine ordered possibilities.",
        [(Q(sum(x+y>threshold for x in values for y in values),9),"At least includes equality at the boundary."),(Q(hits,6),"Some pairs repeat the same value, and the draws have an order. Use all nine pairs.")])


def venn_counts(seed):
    return 3+seed%17,2+seed%11,4+seed%13,1+seed%9


def venn_problem(seed,mode):
    only_a,both,only_b,out=venn_counts(seed)
    n=only_a+both+only_b+out
    a,b=only_a+both,only_b+both
    target,selected={"union":("at least one of these clubs",a+b-both),"outside":("neither club",out),"one":("exactly one of these clubs",only_a+only_b),"overlap":("both clubs",both)}[mode]
    stem=(f"At a school, {a} students attend Art, {b} attend Coding and {both} attend both clubs. There are {n} students altogether. "
          f"One is chosen at random. Find the probability that this student attends {target}.")
    examples={
        "union":[f"Adding the two group totals counts the {both} students in both groups twice. Subtract their overlap once.",f"Use {selected} students who attend at least one club out of {n}."],
        "outside":[f"The number in at least one club is {a}+{b}−{both}. Subtract this from {n}.",f"There are {out} students outside both sets."],
        "one":[f"Remove those in both clubs from each club's total, leaving {only_a} in Art only and {only_b} in Coding only.",f"Exactly one includes those two single-club groups."],
        "overlap":[f"The overlap is the group of {both} students who attend both clubs.",f"The selection comes from all {n} students."]}[mode]
    return number("Read the required regions of two overlapping sets",stem,Q(selected,n),examples,
        "Identify the correct regions and divide their combined count by the whole survey total.","Separate the overlap, the two single-club regions and the outside region before counting.",
        [(Q(both,n),"That is the overlap alone. Read the exact event in the question."),(Q(a+b,n),"The overlap has been counted twice."),
         (Q(only_a+only_b,n),"This counts exactly one club. Check whether the overlap or outside region is needed too.")],art=("venn2",(only_a,both,only_b,out)))


def venn_union(seed): return venn_problem(seed,"union")
def venn_neither(seed): return venn_problem(seed,"outside")
def venn_exactly_one(seed): return venn_problem(seed,"one")
def venn_overlap(seed): return venn_problem(seed,"overlap")


def jar(seed):
    return 3+seed%13,4+seed%17


def tree_data(a,b,replaced):
    n=a+b
    return ((a,b,n),(a,b,n),(a,b,n)) if replaced else ((a,b,n),(a-1,b,n-1),(a,b-1,n-1))


def two_draws(seed,mode,replaced=True):
    a,b=jar(seed)
    n=a+b
    after=n if replaced else n-1
    b_after_blue=b
    a_after_amber=a
    a_after_blue=a if replaced else a-1
    b_after_amber=b if replaced else b-1
    blue_blue=Q(a,n)*Q(a_after_blue,after)
    blue_amber=Q(a,n)*Q(b_after_blue,after)
    amber_blue=Q(b,n)*Q(a_after_amber,after)
    amber_amber=Q(b,n)*Q(b_after_amber,after)
    targets={
        "both":("both discs are blue",blue_blue),
        "different":("exactly one disc is blue",blue_amber+amber_blue),
        "atleast":("at least one disc is blue",1-amber_amber),
        "same":("both discs have the same colour",blue_blue+amber_amber),
    }
    wording,result=targets[mode]
    handling="The first is replaced before the second draw." if replaced else "The first is set aside and is not replaced before the second draw."
    stem=f"A bag contains {a} blue discs and {b} amber discs. Two discs are drawn at random. {handling} Find the probability that {wording}."
    switch="The first disc is put back. The branch counts stay the same." if replaced else f"The second draw has {after} discs. Reduce the count of the first colour by one."
    paths={
        "both":f"The blue-then-blue path is {frac(a,n)} multiplied by {frac(a_after_blue,after)}.",
        "different":f"Blue then amber gives {frac(a,n)} multiplied by {frac(b,after)}. Amber then blue gives {frac(b,n)} multiplied by {frac(a,after)}. Add the two path probabilities.",
        "atleast":f"Its complement is two amber discs, with probability {frac(b,n)} multiplied by {frac(b_after_amber,after)}. Subtract that product from 1.",
        "same":f"Add the blue-then-blue and amber-then-amber path probabilities. They are {fm(blue_blue)} and {fm(amber_amber)} respectively.",
    }
    wrong={
        "both":[(Q(a,n),"That is the chance for the first draw only. Follow both branches."),(Q(a,n)**2,"The first blue disc is removed before the second draw.")],
        "different":[(blue_amber,"That is one order. Add the amber-then-blue path too."),(amber_blue,"That is one order. Add the blue-then-amber path too.")],
        "atleast":[(amber_amber,"This is the complement. Subtract it from 1."),(blue_amber+amber_blue,"Exactly one excludes two blue discs. At least one includes them.")],
        "same":[(blue_blue,"This is only two blue discs. Include two amber discs as well."),(blue_amber+amber_blue,"That counts different colours, not the same colour.")]
    }
    return number("Follow and combine paths on a tree",stem,result,[switch,paths[mode]],
        "Multiply along each relevant path and combine the mutually exclusive complete outcomes for the stated event.",
        "List the complete first-and-second outcomes that meet the event. Use the correct branch counts for the second draw.",
        wrong[mode],art=("tree",("Blue","Amber",tree_data(a,b,replaced))))


def replaced_both(seed): return two_draws(seed,"both")
def replaced_difference(seed): return two_draws(seed,"different")
def replaced_at_least(seed): return two_draws(seed,"atleast")
def replaced_same(seed): return two_draws(seed,"same")
def without_both(seed): return two_draws(seed,"both",False)
def without_difference(seed): return two_draws(seed,"different",False)
def without_at_least(seed): return two_draws(seed,"atleast",False)
def without_same(seed): return two_draws(seed,"same",False)


def complete_branch(seed,replaced=True):
    a,b=jar(seed+33)
    data=tree_data(a,b,replaced)
    row=1+seed%2
    col=(seed//2)%2
    names=("Blue","Amber")
    first,second=names[row-1].lower(),names[col].lower()
    first_disc="a blue" if first=="blue" else "an amber"
    second_disc="a blue" if second=="blue" else "an amber"
    count,other,size=data[row][col],data[row][1-col],data[row][2]
    handling="The first disc is put back." if replaced else "The first disc is left out."
    q=number("Supply a missing branch probability",
        f"A jar contains {a} blue discs and {b} amber discs. Two discs are drawn at random. {handling} Find the missing probability of drawing {second_disc} disc second, given that {first_disc} disc was drawn first.",
        Q(count,size),[f"On the chosen second split, there are {count} {second} discs and {other} of the other colour.",
        f"The two outgoing probabilities add to 1. Subtract {frac(other,size)} from 1."],
        "Use the complementary branch or the remaining counts in the correct second split.","Keep the second split after the stated first colour. Find the new count for the requested colour.",
        [(Q(other,size),"That value is on the other branch. The two outgoing branch probabilities add to 1.")],art=("tree",(*names,data,(row,col))))
    q["solutionArt"]=("tree",(*names,data))
    return q


def replace_branch(seed): return complete_branch(seed)
def remove_branch(seed): return complete_branch(seed,False)


def branch_after_removal(seed):
    a,b=jar(seed+9)
    first="blue" if seed%2 else "amber"
    first_disc="a blue" if first=="blue" else "an amber"
    a_left=a-int(first=="blue")
    n=a+b
    return number("Update the counts on the second branch",
        f"A jar has {a} blue discs and {b} amber discs. {first_disc.capitalize()} disc is taken without replacement. Find the probability that the next disc is blue.",Q(a_left,n-1),
        [f"After one {first} disc is removed there are {n-1} discs in all and {a_left} blue discs.",
         "The new branch probability uses the remaining blue count over the remaining total."],
        "Update the total and blue count using the colour removed, then form their ratio.","On the second draw the denominator is the number left in the jar.",
        [(Q(a,n),"This would keep the first disc in the jar. Recalculate with one fewer disc."),
         (Q(a_left,n),"Reduce the total count as well as adjusting the blue count.")],art=("tree",("Blue","Amber",tree_data(a,b,False))))


def formal_two_sets(seed):
    a,over,b,out=venn_counts(seed+17)
    total=a+over+b+out
    want=seed%3
    notation,correct,explain=(
        (r"P(A\cap B)",over,"The intersection contains only people in both sets."),
        (r"P(A\cup B)",a+over+b,"The union contains any person in at least one of A and B. Include the overlap once."),
        (r"P(A')",b+out,"The complement of A contains B-only and the outside region."),
    )[want]
    text=f"Of {total} people, {a} are in A only, {over} are in both A and B, and {b} are in B only. The rest are in neither. Find {m(notation)} for one person selected at random."
    return number("Read intersection, union or complement notation",text,Q(correct,total),
        [explain,f"There are {correct} people in the requested region or regions. Divide by the full total {total}."],
        "Interpret the event notation, combine its regions and divide by the universal count.","Decide which region or regions the symbol names before counting.",
        [(Q(over,total),"This is the intersection only. Check which event was requested."),(Q(a+over+b,total),"This is the union of A and B. Read the stated symbol.")],art=("venn2",((a,over,b,out),("A","B"),None)))


def three_counts(seed):
    return (2+seed%7,2+seed%13,3+seed%11,1+seed%17,2+seed%5,1+seed%7,2+seed%9,1+seed%3)


REGIONS=("None","A only","B only","C only","A and B only","A and C only","B and C only","All three")


def venn_three(seed,case):
    c=three_counts(seed)
    total=sum(c)
    if case=="intersect":
        label=r"P(A\cap B)"
        count=c[4]+c[7]
        detail="Everyone in both A and B also includes those in all three sets. Add the two relevant regions."
        wrong=[(Q(c[4],total),"The triple overlap is also inside A and B.")]
    elif case=="exact-one":
        label="the probability that the person is in exactly one set"
        count=sum(c[1:4])
        detail="Use the three regions labelled A only, B only or C only. Do not include any overlap."
        wrong=[(Q(1)-Q(c[0],total),"This includes people in more than one set. Only the three single-set regions qualify.")]
    else:
        label=r"P(A\cup C)"
        count=total-c[0]-c[2]
        detail="Use every region belonging to A or C. Only the outside region and the B-only region are left out."
        wrong=[(Q(1)-Q(c[0],total),"This also includes the B-only region, which is outside the requested union.")]
    prompt=f"One person is selected at random from the groups in the table. Find {m(label) if label.startswith('P(') else label}."
    grid=tab("Numbers in the separate regions",("Region","People"),tuple(zip(REGIONS,c)))
    return number("Interpret combined events in three sets",prompt,Q(count,total),
        [detail,f"There are {count} people in the stated event out of {total}."],
        "Identify all separate regions that satisfy the event, including the triple overlap when appropriate.","List which of the eight distinct regions meet the condition. Add a person only once.",wrong,
        art=("venn3",c),extra=grid)


def triple_overlap(seed): return venn_three(seed,"intersect")
def triple_single(seed): return venn_three(seed,"exact-one")
def triple_union(seed): return venn_three(seed,"union")


def conditional_venn(seed):
    only_a,over,only_b,out=venn_counts(seed+25)
    pov="Art" if seed%2 else "Coding"
    test="Coding" if seed%2 else "Art"
    total=only_a+over+only_b+out
    a=only_a+over
    b=only_b+over
    chosen=a if pov=="Art" else b
    reversed_chosen=b if pov=="Art" else a
    wording=f"A group has {total} students. {a} attend Art, {b} attend Coding and {over} attend both. One student is chosen at random from the group. It is known that this student attends {pov}. Find the probability the student also attends {test}."
    return number("Change the denominator in a Venn diagram",wording,Q(over,chosen),
        [f"Keep only the {pov} circle. It has {chosen} possible students.",f"Within that circle, {over} attend {test} as well."],
        "Use the stated group as the new denominator and its overlap with the requested event as numerator.","Read the condition first. It tells you which circle still contains the possible pupils.",
        [(Q(over,total),"This uses the whole group. Restrict to students meeting the condition."),
         (Q(over,reversed_chosen),"The denominator is the group you are given, not the group you are looking for.")],
         art=("venn2",((only_a,over,only_b,out),("Art","Coding"),0 if pov=="Art" else 1)))


def conditional_table(seed,reverse=False):
    a,b,c,d=venn_counts(seed+29)
    n=a+b+c+d
    table=tab("Club sessions and badges",("Session","Has badge","No badge","Total"),
        (("Morning",a,b,a+b),("Afternoon",c,d,c+d),("Total",a+c,b+d,n)))
    if reverse:
        desc="The person chosen has a badge. Find the probability they attend the afternoon session."
        denominator=a+c
        other=c+d
        guide="Keep the Has badge column. Its total contains every person who meets the condition."
    else:
        desc="The person chosen attends the afternoon session. Find the probability they have a badge."
        denominator=c+d
        other=a+c
        guide="Keep the Afternoon row. The whole row contains everyone who meets the condition."
    return number("Restrict a two-way table to the given group","A person from the table is chosen at random. "+desc,Q(c,denominator),
        [guide,f"The requested cell is {c}. The correct subtotal is {denominator}."],
        "Use the subtotal of the row or column named in the condition and the cell satisfying both descriptions.","Decide whether the given description names a row or a column. Then read its subtotal.",
        [(Q(c,n),"The condition means you should use one row or column total instead of the grand total."),
         (Q(c,other),"This uses the subtotal for the other part of the question. Use the known description.")],extra=table,art=("table-filter",reverse))


def given_session(seed): return conditional_table(seed)
def given_badge(seed): return conditional_table(seed,True)


def conditional_neither(seed):
    a,over,b,out=venn_counts(seed+52)
    n=a+over+b+out
    a_count=a+over
    b_count=b+over
    base=b+out
    stem=(f"In a group of {n}, {a_count} attend Art, {b_count} attend Coding and {over} attend both. Someone is chosen at random. "
          "They do not attend Art. Find the probability they attend neither club.")
    return number("Use a complement as the condition",stem,Q(out,base),
        [f"Exclude the Art circle first. That leaves {b} members of Coding only and {out} people in neither club.",
         f"Of the {base} allowed people, use only the {out} outside both circles."],
        "Restrict the denominator to everyone outside Art, then use the outside-both region as the numerator.","The given information keeps both regions outside Art. Only one of those regions meets neither.",
        [(Q(out,n),"Use the group not in Art, not the whole group."),(Q(b,base),"That counts members of Coding. The event asks for neither.")],art=("venn2",(a,over,b,out)))


def bag_model(seed):
    first_total=5+seed%13
    first_x=1+seed%(first_total-1)
    group_a=6+seed%17
    group_b=7+seed%19
    amber_a=2+seed%(group_a-2)
    amber_b=3+seed%(group_b-3)
    return first_x,first_total-first_x,group_a,group_b,amber_a,amber_b


def bag_probability(seed,mode):
    a,b,pn,qn,x,y=bag_model(seed)
    first=Q(a,a+b)
    second=1-first
    from_a=Q(x,pn)
    from_b=Q(y,qn)
    hit=first*from_a+second*from_b
    stem=(f"A selector chooses bag A with probability {fm(first)} and bag B otherwise. "
        f"Bag A contains {x} copper tiles out of {pn}. Bag B contains {y} copper tiles out of {qn}. Once a bag is chosen, a tile is drawn at random from it.")
    if mode=="reverse":
        prompt=" It is known that the tile is copper. Find the probability the selector chose bag A."
        result=first*from_a/hit
        steps=[f"The two ways to reach copper are bag A then copper and bag B then copper. Their probabilities are {fm(first*from_a)} and {fm(second*from_b)}.",
               f"Only copper outcomes are still possible. The total weight of those two paths is {fm(hit)}. Divide the bag A copper path's weight by that total."]
        wrong=[(from_a,"This is copper given bag A. The question gives copper and asks for bag A."),
               (first*from_a,"This is the probability of bag A and copper in the whole sample. Divide by the total weight of the copper paths.")]
    elif mode=="given-a":
        prompt=" It is known that bag A was chosen. Find the probability that the tile is copper."
        result=from_a
        steps=[f"Keep the branch for bag A. Within that branch there are {x} copper tiles out of {pn} in total.",
               "The probability written on that outgoing branch gives the required chance."]
        wrong=[(first*from_a,"Multiplying would require the selection of bag A as part of the chance. Here A is already given."),(hit,"This combines both bags. The condition restricts the problem to bag A.")]
    elif mode=="given-not":
        prompt=" The drawn tile is not copper. Find the probability the selector chose bag B."
        no_x,no_y=first*(1-from_a),second*(1-from_b)
        result=no_y/(no_x+no_y)
        steps=[f"The not-copper paths from bags A and B have probabilities {fm(no_x)} and {fm(no_y)}.",
               f"Use the combined weight {fm(no_x+no_y)} of the two not-copper paths as the denominator. Only the second of the paths begins in bag B."]
        wrong=[(no_y,"This is the joint probability. Divide by the total weight of the not-copper paths."), (1-from_b,"This is not copper given bag B. The condition in the question is the other way around.")]
    else:
        prompt=" Find the probability the drawn tile is copper."
        result=hit
        steps=["A copper tile can come from either bag. Multiply the chance of choosing each bag by its own copper probability.",
               f"The path probabilities are {fm(first*from_a)} and {fm(second*from_b)}. Add those two distinct ways to reach copper."]
        wrong=[(first*from_a,"This counts copper from bag A only. Include the other path."),(from_a+from_b,"Weight each copper chance by how likely the bag is to be selected.")]
    return number("Use the given event to select the relevant tree branches",stem+prompt,result,steps,
        "Use the appropriate branch weights and restrict to any known event before forming a conditional proportion.",
        "If a result is given, keep only paths that satisfy it. Compare the relevant path weight with the total weight you kept.",wrong,
        art=("bag-tree",((a,b,a+b),(x,pn-x,pn),(y,qn-y,qn))))


def bag_reverse(seed): return bag_probability(seed,"reverse")
def bag_forward(seed): return bag_probability(seed,"given-a")
def bag_not_copper(seed): return bag_probability(seed,"given-not")
def bag_total(seed): return bag_probability(seed,"total")


def unknown_experiment_size(seed):
    each=3+seed%21
    numerator=2+seed%5
    denominator=numerator+3+seed%19
    chance=Q(numerator,denominator)
    expected=numerator*each
    return number("Recover the number of trials from an expected count",
        f"A packaging machine rejects each box with probability {fm(chance)}. The expected number of rejected boxes in a run is {expected}. Find the number of boxes in the run.",
        denominator*each,[f"The expected count is the product of the number of boxes and {fm(chance)}.",
        f"Divide {expected} by {fm(chance)} to recover the number in the whole run."],
        "Divide the expected count by the chance per trial.","Decide which factor is missing in the expected-frequency calculation.",
        [(expected*chance,"Multiplying the expected count by the chance makes it smaller. The number of boxes is the unknown factor.")],count=True)


def recover_population(seed):
    a,over,b,out=venn_counts(seed+46)
    union=a+over+b
    pop=union+out
    chance=Q(out,pop)
    return number("Find the total population from a Venn probability",
        f"In a survey, {a+over} people choose the early bus, {b+over} choose the late bus and {over} choose both. A randomly chosen person in the survey chooses neither with probability {fm(chance)}. Find the number of people in the survey.",
        pop,[f"There are {union} people who choose at least one of the buses.",
        f"The probability of choosing at least one is {fm(1-chance)}. Thus {union} represents that fraction of the full survey."],
        "Find the union count and divide by the complementary probability of the union.","Match the known number of people and its probability to the same event.",
        [(union,"This is the number who choose at least one of the buses. Also count those who choose neither."),
         (Q(union)/chance,"The stated fraction is neither, but the known count is the union.")],count=True)


def expected_from_replacement(seed):
    a,b=jar(seed+71)
    size=a+b
    trials=size**2*(2+seed%13)
    path=Q(a,size)**2
    return number("Use a two-stage probability to predict a frequency",
        f"A draw consists of choosing one of {a} blue and {b} amber discs at random, putting it back, then choosing again. The jar is reset before each of {trials} draws. Find the expected number of draws with two blue discs.",
        trials*path,[f"The chance of two blues is {frac(a,size)} multiplied by itself because the disc is replaced.",
        f"Multiply the chance {fm(path)} by the stated {trials} draws."],
        "Find the complete two-blue path probability before scaling to the trial count.","Find a probability for one pair of selections first. Then convert it to a predicted frequency.",
        [(trials*Q(a,size),"This is based on blue on just one of the two selections."),(path,"This is the chance for one draw. Multiply it by the number of draws.")],count=True,
        art=("tree",("Blue","Amber",tree_data(a,b,True))))


W,H=400,250
INK="#163953"
TEAL="#035e64"
AMBER="#7d4312"


def txt(x,y,value,colour=INK,size=16,anchor="middle"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" fill="{colour}">{escape(str(value))}</text>'


def line(x1,y1,x2,y2,colour=INK,size=2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" stroke-width="{size}"/>'


def box(x,y,width,height,fill,stroke="none"):
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="3" fill="{fill}" stroke="{stroke}"/>'


def circ(x,y,r,stroke=INK,fill="none"):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'


def diagrams(art):
    kind,values=art
    drawing=[]
    if kind=="scale":
        drawing.append(line(40,120,360,120,INK,3))
        for i in range(11):
            x=40+i*32
            drawing.append(line(x,112 if i%5 else 107,x,128 if i%5 else 133))
        for x,number_,name in ((40,"0","Impossible"),(200,"0.5","Even chance"),(360,"1","Certain")):
            drawing.extend((txt(x,154,number_,TEAL,19),txt(x,182,name,INK,14)))
        alt="A probability scale from zero, impossible, to one, certain, via one half, an even chance."
    elif kind in {"counts","frequency"}:
        labels=("Blue","White","Orange") if kind=="counts" else ("Upright","Other")
        scale=245/max(values)
        for i,(label,count) in enumerate(zip(labels,values)):
            y=(66 if len(labels)==3 else 87)+i*55
            width=round(count*scale,3)
            drawing.extend((txt(12,y+20,label,anchor="start"),
                box(89,y,width,28,["#aedce8","#e4e9f0","#ffdaa9"][i],TEAL),txt(round(102+width,3),y+20,count,anchor="start")))
        alt="; ".join(f"{label}: {count}" for label,count in zip(labels,values))
    elif kind=="spinners":
        for x,labels,name in zip((105,295),values,("First spinner","Second spinner")):
            for i,label in enumerate(labels):
                a,b=(i/len(labels)-0.25)*tau,((i+1)/len(labels)-0.25)*tau
                mid=(a+b)/2
                j,k=(round(x+70*cos(a),4),round(110+70*sin(a),4)),(round(x+70*cos(b),4),round(110+70*sin(b),4))
                drawing.append(f'<path d="M{x} 110 L{j[0]} {j[1]} A70 70 0 0 1 {k[0]} {k[1]} Z" fill="{["#bce4e8","#ffe2b7","#d5e1fb","#f6cad9"][i]}" stroke="{INK}" stroke-width="2"/>')
                drawing.append(txt(round(x+44*cos(mid),4),round(115+44*sin(mid),4),label,INK,18))
            drawing.append(txt(x,211,name))
        alt="Two fair spinners. First: "+", ".join(map(str,values[0]))+". Second: "+", ".join(map(str,values[1]))+"."
    elif kind=="venn2":
        numbers,labels,highlight=values if len(values)==3 else (values,("Art","Coding"),None)
        a,over,b,out=numbers
        drawing.append(box(18,24,362,208,"#fff",INK))
        for i,(x,label,col) in enumerate(((152,labels[0],TEAL),(246,labels[1],AMBER))):
            fill=("#d2ecef","#ffebc9")[i] if highlight==i else "none"
            drawing.extend((circ(x,127,78,col,fill),txt(x-20 if i==0 else x+20,69,label,col)))
        if highlight is not None:
            x=152 if highlight==0 else 246
            drawing.append(circ(246 if highlight==0 else 152,127,78,AMBER if highlight==0 else TEAL))
            drawing.append(circ(x,127,78,TEAL if highlight==0 else AMBER))
        for x,y,count in ((110,138,a),(199,138,over),(288,138,b),(340,209,out)):
            drawing.append(txt(x,y,count,INK,20))
        alt=f"{labels[0]} only {a}; both {over}; {labels[1]} only {b}; neither {out}."+(f" The {labels[highlight]} circle is highlighted." if highlight is not None else "")
    elif kind=="venn3":
        drawing.append(box(14,13,372,224,"#fff",INK))
        for x,y,r,label,lx,ly,col in ((154,97,79,"A",94,67,TEAL),(246,97,79,"B",306,67,AMBER),(200,150,79,"C",199,224,"#55508e")):
            drawing.extend((circ(x,y,r,col),txt(lx,ly,label,col,17)))
        positions=((353,217),(108,91),(292,91),(200,199),(200,64),(148,153),(252,153),(200,125))
        drawing.extend(txt(x,y,count,INK,17) for (x,y),count in zip(positions,values))
        alt="; ".join(f"{name}: {n}" for name,n in zip(REGIONS,values))
    elif kind in {"tree","bag-tree"}:
        if kind=="tree":
            first,second,rows,*optional=values
            names=(first,second)
            ends=names
        else:
            rows=values
            names=("Bag A","Bag B")
            ends=("Copper","Other")
            optional=[]
        blank=optional[0] if optional else None
        layout=((26,126,165,62,108,81),(26,126,165,191,108,183),
                (165,62,317,30,233,33),(165,62,317,90,235,95),
                (165,191,317,159,233,161),(165,191,317,219,235,222))
        for i,(x,y,xe,ye,tx,ty) in enumerate(layout):
            row,col=divmod(i,2)
            show="?" if blank==(row,col) else f"{rows[row][col]} of {rows[row][2]}"
            drawing.extend((line(x,y,xe,ye,TEAL if col==0 else AMBER),txt(tx,ty,show,INK,16)))
        drawing.extend([circ(26,126,3,INK,INK),circ(165,62,3,INK,INK),circ(165,191,3,INK,INK),
            txt(164,49,names[0],TEAL,15),txt(164,211,names[1],AMBER,15),
            *[txt(324,y+5,ends[i%2],TEAL if i%2==0 else AMBER,15,"start") for i,y in enumerate((30,90,159,219))]])
        descriptions=[]
        for row,categories in enumerate((names,ends,ends)):
            group="First stage" if row==0 else f"After {names[row-1]}"
            entries=(", ".join(f"{label}: "+("missing" if blank==(row,col) else f"{rows[row][col]} out of {rows[row][2]}") for col,label in enumerate(categories)))
            descriptions.append(f"{group}, {entries}")
        alt=". ".join(descriptions)+"."
    elif kind=="table-filter":
        reverse=values
        drawing.extend([box(62,71,282,102,"#fff",INK),box(62,122,282,51,"#d3eae9") if not reverse else box(62,71,141,102,"#d3eae9"),
            line(62,122,344,122),line(203,71,203,173),txt(129,55,"Has badge"),txt(277,55,"No badge"),
            txt(31,105,"AM",size=14),txt(31,153,"PM",size=14),circ(129,147,13,TEAL,"#fff"),
            txt(204,204,"Highlighted group supplies the denominator",INK,15)])
        alt=("The Has badge column" if reverse else "The Afternoon row")+" is highlighted. The lower left cell satisfies both descriptions."
    else:
        raise ValueError(f"Unknown diagram {kind}")
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="{escape(alt,quote=True)}"><title>{escape(alt)}</title><g font-family="Inter, Arial, sans-serif">'+''.join(drawing)+'</g></svg>'
    return svg,alt


def study_art(name,art,caption):
    graphic,description=diagrams(art)
    folder=ROOT/"public/assets/study/0580/probability"
    folder.mkdir(parents=True,exist_ok=True)
    (folder/f"{name}.svg").write_bytes(graphic.encode("utf-8"))
    return dict(src=f"/assets/study/0580/probability/{name}.svg",alt=description,caption=p(caption),width=W,height=H)


def attach(uid,art,role,assets):
    svg,description=diagrams(art)
    data=svg.encode("utf-8")
    digest=sha256(data).hexdigest()
    path=Path("content/original/0580/probability-assets")/f"{digest}.svg"
    (ROOT/path).parent.mkdir(parents=True,exist_ok=True)
    (ROOT/path).write_bytes(data)
    file=f"pkg_igprob_{digest}"
    if not any(a["question_uid"]==uid and a["file_id"]==file and a["role"]==role for a in assets):
        assets.append(dict(question_uid=uid,file_id=file,path=path.as_posix(),sha256=digest,size=len(data),width=W,height=H,
            mime="image/svg+xml",role=role,caption=description))
    return f'<p><img src="/api/files/{file}" width="{W}" height="{H}" alt="{escape(description,quote=True)}"></p>'


LESSONS=(
  ("single-events","Probability scales, single events and complements","Locate a probability on the zero-to-one scale, count equally likely outcomes and find the chance that an event does not happen.",
    ("probability-scale",("scale",None),"Zero is impossible. One half separates events less and more likely than not. One is certain."),
    (
      ("scale","Where can a probability sit?",5,
       "A probability measures how likely one named event is. A value of 0 means impossible, "+fm(Q(1,2))+" means an even chance, and 1 means certain.",
       "Check the outcome described before judging its chance. The same probability can be written in different ways, such as "+m(r"\frac{1}{4}=0.25=25\%")+".",
       "An event with a small positive probability can still happen.",scale_point,one_outcome),
      ("equally-likely","What goes in the denominator?",6,
       "When the individual outcomes are equally likely, use "+m(r"\frac{\text{number of favourable outcomes}}{\text{number of all possible outcomes}}")+".",
       "Count everything that might be chosen. Then count the items that match the event. Read each relevant row of a frequency table.",
       "Colour groups may have different sizes. Three colours do not automatically give each colour a chance of "+fm(Q(1,3))+".",one_outcome,probability_from_table),
      ("complements","How can I find the chance of the opposite?",6,
       "An event and its complement cover every outcome. Their probabilities add to 1.",
       "Find the chance of the easier event, then subtract it from 1 where the question asks for its complement. If a table of distinct outcomes has one missing probability, subtract all the given probabilities from 1.",
       "Write the event precisely first. ‘Not blue’ includes every colour other than blue.",complement,missing_probability),
    ),
    (("Outcome","One possible result."),("Event","One or more outcomes meeting a particular description."),("Complement","Every way the named event does not occur."),("Equally likely","The same chance for each individual outcome.")),
    "Check that your answer is between 0 and 1, or between 0% and 100%.",0),
  ("relative-frequency","Relative frequency, expected frequency and fairness","Use trial results to estimate a probability, predict a future count and interpret random variation, fairness and bias.",
    ("observed-frequency",None,"The total includes outcomes that did and did not meet the event."),
    (
      ("observations","How do the results estimate probability?",6,
       "Relative frequency is the proportion of actual trials in which an event occurred. It estimates the chance under similar conditions.",
       "Divide the observed success count by the number of trials. To pool comparable results, add the successes and add the trial totals before dividing.",
       "Unequal groups should not automatically get the same weight. Count every trial once.",relative,pool_trials),
      ("prediction","How do I turn a chance into an expected count?",6,
       "The expected frequency is "+m(r"\text{number of trials}\times\text{probability per trial}")+".",
       "Identify the event, check which trials are being predicted, then multiply the future trial count by the chance per trial.",
       "An expected frequency is a prediction. An actual run can produce a different count.",expected_frequency,relative),
      ("fair-experiments","Do unequal counts prove a process is biased?",6,
       "A fair two-outcome model gives the two named outcomes equal chances. Random outcomes can still produce different observed counts.",
       "Use randomly chosen trials under consistent conditions. Collect comparable evidence before concluding that one outcome is favoured.",
       "A random process can be biased. ‘Random’ describes the uncertain result, and ‘fair’ compares chances.",fairness,pool_trials),
    ),
    (("Trial","One run of an experiment."),("Relative frequency","Observed successes divided by total trials."),("Expected frequency","Long-run model prediction scaled to the stated trial count."),("Bias","A systematic preference for outcomes relative to the proposed fair model.")),
    "For an estimate, name the event and use the observed denominator. For an expected count, identify the future number of trials.",0),
  ("sample-spaces","Possibility diagrams and ordered outcomes","List every ordered outcome once, read a possibility diagram and count results meeting a condition.",
    ("spinner-sample-space",None,"Each sector on one spinner can be paired with every sector on the other."),
    (
      ("grid","How do I make a sample-space grid?",6,
       "Write first outcomes down the side and second outcomes across the top. Each cell represents one ordered pair.",
       "Enter the sum or product in every cell if the question asks for one. When the pairs have equal chances, count matching cells and divide by all cells.",
       "Several pairs can give the same sum. Counting distinct sums gives the wrong denominator.",sample_sum,sample_product),
      ("conditions","Which outcomes meet the wording?",6,
       "‘Greater than’ leaves out equality. ‘At least’ includes equality.",
       "Mark all satisfying cells before counting. Leave unmatched cells in the total number of outcomes.",
       "One pair may satisfy the condition in each order. Keep both when they represent different draws.",sample_product,sample_sum),
      ("repeat","Can the same label occur twice?",6,
       "Replacing the first item makes it available again for the second draw.",
       "List the same choices for both draws. Include the diagonal of equal labels when suitable, then test the condition.",
       "Removing the diagonal changes the experiment from drawing with replacement to drawing without replacement.",returned_outcomes,sample_sum),
    ),
    (("Sample space","The full collection of outcomes for the experiment."),("Possibility diagram","A grid organising paired outcomes."),("Ordered pair","First and second outcomes in their order."),("Boundary","The value at which the inequality changes.")),
    "Count cells, not the list of different numbers printed in the cells.",0),
  ("two-set-venn","Probability from two-set Venn diagrams","Use the overlap, single-set and outside regions to calculate probabilities for one randomly selected person or item.",
    ("two-set-regions",None,"The two circles share one region. The rectangle includes people outside both circles."),
    (
      ("regions","What belongs in each of the four regions?",6,
       "The overlap holds people belonging to both sets. Each single-set region contains only members who are absent from the other set.",
       "Put the given shared count in the overlap first. Subtract it from each full set total to get the two single-set regions.",
       "Do not put the whole group total in a single-set region. That total includes the overlap.",venn_union,venn_overlap),
      ("outside","Where does ‘neither’ go?",6,
       "The area inside the rectangle and outside both circles represents members of neither named set.",
       "Count all three occupied circle regions once each. Subtract their combined number from the survey total.",
       "‘Not in Art’ includes Coding-only as well as neither. ‘Neither’ names just the outside region.",venn_neither,venn_union),
      ("exactly-one","How is exactly one different from at least one?",6,
       "Exactly one keeps the two single-set regions. At least one includes the overlap as well.",
       "Mark every qualifying region first, then add its counts and use the total population as the denominator.",
       "Adding both circle totals counts the overlap twice. A person still represents one outcome.",venn_exactly_one,venn_union),
    ),
    (("Set","A group whose members meet one description."),("Overlap","The region of shared members."),("Outside both","The region for people in neither set."),("Universal set","Everyone included in the stated survey or selection.")),
    "Add your four disjoint region counts. The result must match the given population.",0),
  ("trees-with-replacement","Probability trees with replacement","Complete a tree for two draws with replacement and use multiplication and addition to combine complete outcomes.",
    ("replacement-tree",None,"Both second-stage splits repeat the original group counts."),
    (
      ("reset","What changes when I put the first item back?",6,
       "With replacement, the first item is returned before the next selection. The second draw uses the original counts.",
       "Draw two first branches. From the end of each branch, draw the next possibilities. Each split shows chances out of the full count for that draw.",
       "A second-draw probability belongs to a branch from its first result. Make both second splits.",replaced_both,replace_branch),
      ("multiply","Where do I multiply the branch probabilities?",6,
       "A complete outcome is a path from the start of the tree to one end.",
       "Choose the required first branch and second branch. Multiply their probabilities. Read both results in order.",
       "Adding the probabilities along a path would mix separate stages. One full path uses multiplication.",replaced_same,replaced_both),
      ("combine","When do I add path probabilities?",6,
       "Two different complete paths cannot both occur on one run. Add their probabilities when either path qualifies.",
       "List blue then amber and amber then blue separately for exactly one blue. For at least one blue you can subtract the all-amber path from 1.",
       "‘At least one’ still allows two of that colour. Exactly one has a different set of paths.",replaced_difference,replaced_at_least),
    ),
    (("Replacement","Putting a drawn object back before the next draw."),("Branch","One result of the current stage."),("Path","A complete sequence of branches."),("Mutually exclusive outcomes","Outcomes that cannot both occur on the same run.")),
    "The probabilities leaving any one split must add to 1. Then multiply along paths and add the distinct paths you need.",0),
  ("extended-venn","Extended: event notation and three-set Venn diagrams","Interpret intersection, union and complement probabilities, and combine correctly separated regions of three sets.",
    ("three-set-regions",None,"The A-and-B intersection contains the A-and-B-only region and the central region."),
    (
      ("notation","How do the symbols tell me which regions to use?",6,
       m(r"A\cap B")+" means in both A and B. "+m(r"A\cup B")+" means in A or B or both. "+m("A'")+" means outside A.",
       "Read the symbol as words, select the regions, then divide their counts by everyone in the universal set.",
       "Within a union each selected member counts once, including the overlap.",formal_two_sets,venn_neither),
      ("three","How do I read an overlap when there are three sets?",7,
       "The region inside all three circles also belongs to each pairwise intersection.",
       "Trace both requested boundaries. Every part inside both circles is included unless the question adds ‘only’.",
       "An entry for A and B only does not include the central region. The intersection "+m(r"A\cap B")+" does.",triple_overlap,triple_union),
      ("regions","Which regions meet a longer event description?",7,
       "With three sets, use the eight separate regions, including the outside and the central regions.",
       "Translate the description into a list of qualifying regions before adding. Exactly one keeps three single-set regions.",
       "‘At least one’ is about three circles together. ‘In A or C’ can leave out B-only even when B is a named set.",triple_single,triple_union),
    ),
    (("Intersection","Members in all sets named by the intersection."),("Union","Members in any of the named sets."),("Complement","Members outside the named set but in the universal set."),("Triple overlap","The central region in all three sets.")),
    "Write a region list first. You can check the complementary regions add to the remaining part of the population.",1),
  ("trees-without-replacement","Extended: probability trees without replacement","Update second-stage counts, complete an incomplete tree and combine paths for draws without replacement.",
    ("removal-tree",None,"The second-stage total drops by one. The colour removed differs from split to split."),
    (
      ("remove","How do I change the counts on each branch?",6,
       "If the first item stays out, the next draw is from one fewer item. Only the count for the colour drawn drops.",
       "After blue, reduce the blue count and the total. After amber, reduce the amber count and the total.",
       "The second-stage denominator changes even when the count of the requested colour stays the same.",without_both,branch_after_removal),
      ("fill","How do I complete an incomplete split?",6,
       "The two outgoing branches from one node describe all results for the next draw from that state.",
       "Use the remaining counts, or subtract the other probability at the same split from 1.",
       "The other second-stage split starts from a different first result. Its probability is not the missing branch's complement.",remove_branch,branch_after_removal),
      ("path","Does the order change which paths to keep?",7,
       "Exactly one blue can occur as blue then amber or amber then blue. Both count.",
       "Calculate each ordered path with the appropriate updated row. For at least one blue, the all-amber path gives a quicker complement.",
       "Even when reversed paths have equal overall probabilities, they still represent two different outcomes.",without_difference,without_at_least),
    ),
    (("Without replacement","The first item remains out before the second selection."),("State","The items still available from the current point of the tree."),("Remaining total","The number of items after the reported removal."),("Complete path","The whole ordered outcome for both draws.")),
    "Mark the first colour beside each second-stage split, then check the two second-stage numerators sum to the new denominator.",0),
  ("conditional-groups","Extended: conditional probability from Venn diagrams and tables","Restrict a random selection to a given group and find the probability of a further characteristic within that group.",
    ("given-venn",None,"The highlighted circle is the given group. The overlap satisfies both descriptions."),
    (
      ("given","How does known information change the total?",6,
       "‘It is known that’ gives information about the selected person. Restrict the possible outcomes to everyone who meets that information.",
       "In a Venn diagram, keep the whole circle for the given group. Count the qualifying region inside that circle.",
       "The condition chooses the denominator. The event you are asked to find chooses the numerator inside it.",conditional_venn,conditional_neither),
      ("table","Which row or column becomes the new sample space?",6,
       "One cell of a two-way table meets both a row description and a column description. The margin of the given group is the denominator.",
       "Underline the information already known. Follow its row or column to the margin, then read the shared cell.",
       "Swapping the given information can leave the numerator unchanged while changing the denominator.",given_session,given_badge),
      ("outside","What if the condition says ‘not’?",6,
       "The new total can comprise more than one region. Given ‘not in Art’, every region outside Art remains possible.",
       "Trace or list the regions that survive the condition. Within that list, count only the regions answering the question.",
       "‘Not in Art’ is a restriction on the possible people, not an instruction to subtract the final answer from 1.",conditional_neither,conditional_venn),
    ),
    (("Condition","Information already known about the result."),("Restricted sample space","All outcomes that are still possible after using the condition."),("Subtotal","The total of the relevant row, column or set of regions."),("Joint event","Both descriptions apply to the same outcome.")),
    "Underline what is given. Use only those outcomes in the denominator, and check your numerator is part of that group.",0),
  ("conditional-trees","Extended: conditional probability from trees","Read a given starting branch and work backwards from a known outcome by comparing complete path probabilities.",
    ("conditional-paths",None,"Copper can be reached from either bag. The two complete copper paths have different weights."),
    (
      ("known-first","What if I already know the first branch?",6,
       "When the first result is given, work from that node. The probabilities leaving it describe the possible next results.",
       "Ignore the branch leading to the other node. Read the second-stage proportion from the given group.",
       "Multiplying by the first-stage probability would count the chance of a first event that the question already gives.",bag_forward,bag_total),
      ("known-last","How do I work backwards from the outcome?",7,
       "If the final result is known, keep every complete path with that result. These paths can have different probabilities.",
       "Multiply along the retained paths. Divide the relevant path probability by the sum of the retained path probabilities.",
       "The chance of copper from bag A answers a different question from the chance of bag A when copper is known.",bag_reverse,bag_not_copper),
      ("compare","How do I tell a joint event from a condition?",7,
       "A joint event names what must happen at both stages of the original trial. A condition limits what still counts as possible.",
       "For a joint event use the full path's probability. If a final event is known, use its total probability as the new denominator.",
       "Counting branches without their weights assumes the retained paths have equal chances. Calculate each path probability.",bag_not_copper,bag_reverse),
    ),
    (("Path probability","Product of the probabilities along an ordered route."),("Given first result","Start from the corresponding second-stage split."),("Given final result","Keep every complete path that ends with that result."),("Joint probability","Probability of both specified events occurring in the original experiment.")),
    "When the end result is given, write the retained path probabilities before dividing. Cambridge does not require conditional probability notation.",1),
)


BANK=(
    ((scale_point,one_outcome,complement,probability_from_table,missing_probability),(
      ("Explain a position on the probability scale",(scale_point,)),
      ("Read a single selection from counts",(one_outcome,)),
      ("Find a probability from a frequency table",(probability_from_table,)),
      ("Use a named complement",(complement,probability_from_table)),
      ("Use unequal chances and explain an event's position",(missing_probability,scale_point)))),
    ((relative,expected_frequency,pool_trials,fairness,unknown_experiment_size),(
      ("Estimate a chance from observations",(relative,)),
      ("Predict a count of failed checks",(expected_frequency,)),
      ("Combine samples of different sizes",(pool_trials,)),
      ("Assess a fairness claim",(fairness,relative)),
      ("Work backwards from an expected frequency",(unknown_experiment_size,expected_frequency)))),
    ((sample_sum,sample_product,returned_outcomes,sample_sum,sample_product),(
      ("Count cells on a sum grid",(sample_sum,)),
      ("Apply a strict boundary to products",(sample_product,)),
      ("Allow repeated outcomes",(returned_outcomes,)),
      ("Compare two different paired outcomes",(sample_sum,sample_product)),
      ("Apply two kinds of boundary to paired outcomes",(returned_outcomes,sample_product)))),
    ((venn_union,venn_neither,venn_exactly_one,venn_overlap,recover_population),(
      ("Find the probability of belonging to a club",(venn_union,)),
      ("Read the overlap and outside regions",(venn_overlap,venn_neither)),
      ("Explain exactly one membership",(venn_exactly_one,)),
      ("Choose the correct population for a probability",(venn_neither,venn_union)),
      ("Recover the universal-set count",(recover_population,venn_exactly_one)))),
    ((replace_branch,replaced_both,replaced_same,replaced_difference,replaced_at_least),(
      ("Complete a probability branch",(replace_branch,)),
      ("Multiply along a path with replacement",(replaced_both,)),
      ("Combine two paths with replacement",(replaced_same,replaced_difference)),
      ("Use an all-amber complement",(replaced_at_least,replaced_difference)),
      ("Use a probability tree to predict a count",(expected_from_replacement,replaced_at_least)))),
    ((formal_two_sets,triple_overlap,triple_single,triple_union,formal_two_sets),(
      ("Translate a probability event symbol",(formal_two_sets,)),
      ("Include a relevant triple overlap",(triple_overlap,)),
      ("Identify the exactly-one regions",(triple_single,)),
      ("Use a union of two of three sets",(triple_union,triple_overlap)),
      ("Combine precise event descriptions",(triple_overlap,triple_single,triple_union)))),
    ((branch_after_removal,remove_branch,without_both,without_difference,without_at_least),(
      ("Update the count after removing one disc",(branch_after_removal,)),
      ("Complete a missing probability without replacement",(remove_branch,)),
      ("Find the chance of repeating a colour",(without_both,without_same)),
      ("Keep both orders of a two-colour draw",(without_difference,)),
      ("Choose an efficient path or complement",(without_at_least,without_difference)))),
    ((conditional_venn,given_session,given_badge,conditional_neither,conditional_venn),(
      ("Select a restricted population in a Venn diagram",(conditional_venn,)),
      ("Choose a row denominator",(given_session,)),
      ("Choose a column denominator",(given_badge,)),
      ("Use the outside of a given set",(conditional_neither,conditional_venn)),
      ("Compare row, column and Venn conditions",(given_session,given_badge,conditional_neither)))),
    ((bag_forward,bag_total,bag_reverse,bag_not_copper,bag_reverse),(
      ("Read a tree below a known first split",(bag_forward,)),
      ("Find the total probability of one outcome",(bag_total,)),
      ("Compare copper paths for a given result",(bag_reverse,)),
      ("Compare the not-copper paths",(bag_not_copper,bag_total)),
      ("Distinguish a given starting branch from a given endpoint",(bag_forward,bag_reverse,bag_not_copper)))),
)


def distinct(make,seed,used):
    for extra in range(1200):
        q=make(seed+extra)
        sentences={q["prompt"]}
        if q["write"]:
            sentences.add(q["write"])
        if used.isdisjoint(sentences):
            used.update(sentences)
            return q
    raise ValueError(f"No distinct question available for {make.__name__}")


def example_prompt(q):
    if not q["field"].get("options"):
        return q["prompt"]
    return q["prompt"]+'<ol type="A">'+"".join(f"<li>{v}</li>" for v in q["field"]["options"].values())+"</ol>"


def check(uid,q):
    return dict(id=uid,kind="check",title=q["title"],prompt=q["prompt"],field=q["field"],hint=q["hint"],
                solution="".join(q["solution"]),retry=q["retry"])


def short_q(uid,family,key,q,difficulty,variant,assets):
    prompt=q["prompt"]+(attach(uid,q["art"],"STATEMENT",assets) if q["art"] else "")
    answer_picture=attach(uid,q["solutionArt"],"SOLUTION",assets) if q.get("solutionArt") else ""
    return dict(id=uid,family_uid=family,title=q["title"],lesson=key,collection="variant" if variant else "short",difficulty=difficulty,
        marks=1,prompt_html=prompt,answer_html=p(q["answer"]),solution_html="".join(q["solution"])+answer_picture,hint_html=q["hint"],fields=[q["field"]],
        parts=[dict(label="a",marking_criteria=[dict(code="B1",marks=1,description_html=p(q["answer"]))])],verification=uid)


def written_q(uid,family,key,title,data,difficulty,variant,assets):
    prompts,answers,solutions,hints,parts=[],[],[],[],[]
    for j,q in enumerate(data):
        label=chr(97+j)
        trace=q["art"]
        picture=attach(uid,trace,"STATEMENT",assets) if trace else ""
        answer_picture=attach(uid,q["solutionArt"],"SOLUTION",assets) if q.get("solutionArt") else ""
        shown=q.get("writtenAnswer",q["answer"])
        rewards=[dict(code="M1",marks=1,description_html=q["mark"]),dict(code="A1",marks=1,description_html=p(shown))]
        if q["field"]["label"]=="Probability (fraction or decimal)":
            rewards[-1]["guidance_html"]=p("Accept an equivalent fraction, decimal or percentage.")
        question=q["write"] or q["prompt"].replace(" Give an exact fraction or decimal.","")
        prompts.append(f'<li>{question}{picture}<span class="marks">[{len(rewards)}]</span></li>')
        answers.append(p(f"({label}) {shown}"))
        solutions.append(f"<h4>({label})</h4>"+"".join(q["solution"])+answer_picture)
        hints.append(p(f"({label})")+q["hint"])
        parts.append(dict(label=label,marking_criteria=rewards))
    return dict(id=uid,family_uid=family,title=title,lesson=key,collection="exam",variant_index=variant,difficulty=difficulty,
        marks=sum(len(v["marking_criteria"]) for v in parts),prompt_html='<ol class="parts" type="a">'+"".join(prompts)+"</ol>",
        answer_html="".join(answers),solution_html="".join(solutions),hint_html="".join(hints),fields=[],parts=parts,verification=uid)


def build():
    metadata,study,questions,assets=[],{},[],[]
    used=set()
    for i,(key,title,summary,figure_setup,rows,terms,tip,representative) in enumerate(LESSONS):
        uid=PREFIX+key
        sections,examples,extra=[],[],[]
        figure=None
        for j,(anchor,heading,minutes,idea,method,mistake,first,second) in enumerate(rows):
            seed=4+37*i+11*j
            e1=distinct(first,seed,used)
            e2=distinct(second,seed+2,used)
            offset=len(examples)
            for q in (e1,e2):
                examples.append(dict(title=q["title"],question=example_prompt(q),solution=q["solution"]))
            drawing=None
            if j==representative:
                name,art,caption=figure_setup
                figure=study_art(name,art or e1["art"],caption)
                drawing=figure
            if (key,j)==("conditional-groups",1):
                drawing=study_art("given-group",e1["art"],"The highlighted row supplies the total. The circled cell meets both descriptions.")
            if (key,j)==("single-events",1):
                drawing=study_art("single-event-counts",e1["art"],"The blue bar gives part of the collection. The denominator includes every bar.")
            if (key,j)==("trees-without-replacement",1):
                drawing=study_art("missing-branch",e1["art"],"The missing branch belongs to the second-stage split shown by the first colour.")
            first_check=distinct(first,seed+1,used)
            second_check=distinct(second,seed+3,used)
            blocks=[dict(kind="key",html=p(idea),**({"figure":drawing} if drawing else {})),dict(kind="text",title="Practise the method",html=p(method)),
                dict(kind="example",index=offset),check(f"{uid}-{anchor}-a",first_check),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=offset+1,tryFirst=True),check(f"{uid}-{anchor}-b",second_check)]
            if j==len(rows)-1:
                blocks.append(dict(kind="tip",html=p(tip)))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=minutes,level="core" if i<5 else "extension",blocks=blocks))
            extra.extend([check(f"{uid}-{anchor}-extra-a",distinct(first,seed+5,used)),check(f"{uid}-{anchor}-extra-b",distinct(second,seed+8,used))])
        reference=examples[2*representative]
        revision="".join(f"<h2>{row[1]}</h2>"+p(row[3])+p(row[4]) for row in rows)
        revision+="<h2>Quick worked example</h2>"+reference["question"]+"".join(reference["solution"])
        revision+=f'<p><img src="{figure["src"]}" width="260" alt="{escape(figure["alt"],quote=True)}"></p>'
        related=[dict(title=LESSONS[i-1][1],href=f"/courses/{COURSE}/topics/{PREFIX}{LESSONS[i-1][0]}")] if i else []
        study[uid]=dict(updatedOn=DATE,description=summary,sections=sections,examples=examples,extraPractice=extra,related=related,
            glossary=[dict(term=term,definition=p(comment)) for term,comment in terms],
            revision=dict(body=revision,checks="<ul><li>Write the requested event in words.</li><li>Identify the relevant denominator.</li><li>Check your probability is between 0 and 1.</li></ul>",examTip=p(tip)))
        metadata.append(dict(key=key,id=uid,title=title,summary=summary,objective=summary,
            before=p("For Core and Extended. Use fractions to describe parts of a whole." if i<5 else "For Extended. Revise how to count outcomes and read sets and trees."),
            ideas="".join(p(row[3]) for row in rows),method="".join(f"<h4>{row[1]}</h4>"+p(row[4]) for row in rows),mistakes=[row[5] for row in rows],
            examples=[dict(question=e["question"],title=e["title"],solution="".join(e["solution"]),verification=f"{uid}-example-{j}") for j,e in enumerate(examples[::2],1)]))
        short,written=BANK[i]
        for j,make in enumerate(short,1):
            family=f"M4U-0580-PR-{key}-P{j}"
            for version in range(2):
                q=distinct(make,91+i*59+j*17+version,used)
                questions.append(short_q(f"{family}-{version}",family,key,q,1+(j-1)//2,version,assets))
        for j,(name,methods) in enumerate(written,1):
            family=f"M4U-0580-PR-{key}-W{j}"
            for version in range(4):
                data=[distinct(make,179+i*101+j*13+version+k*9,used) for k,make in enumerate(methods)]
                questions.append(written_q(f"{family}-{version}",family,key,name,data,min(4,j),version,assets))
    manifest=dict(schema_version=1,key="0580-probability",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_probability",slug="probability",title="Probability",position=36),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=metadata,questions=questions,assets=assets)
    output=ROOT/"content/original/0580"
    for name,data in (("probability-v1.json",manifest),("probability-study.json",study)):
        (output/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(metadata)} lessons, {len(questions)} questions, {len(assets)} graphical placements")


if __name__=="__main__":
    build()
