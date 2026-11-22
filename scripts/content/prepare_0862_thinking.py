"""Original mixed lessons for the Cambridge Thinking and Working Mathematically strand."""

from fractions import Fraction

from prepare_0862_support import Lesson, Section, build_stage, field, figure, label, m, part, path, problem, table, tex


def route(seed):
    start = -(2 + seed % 8)
    up = 7 + seed // 8 % 14
    down = 3 + seed // 13 % 6
    end = start + up - down
    return problem("A route between floors", f"A lift starts on level {start}. It goes up {up} levels and then down {down} levels. Level 0 is the entrance.",
        part("Which level does the lift reach?", m(end),
             (f"A move up adds {up}. After that move the lift is on level {start + up}.",
              f"A move down subtracts {down}. {m(f'{start+up}-{down}={end}')}"),
             "Use the sign of each move and add it to the current level.", field(end, label="Final level"),
             (str(start + up + down), "The last move is down. Subtract its distance from the level reached after the first move.")),
        part("How many levels does the lift travel in total?", m(up + down),
             (f"Both moves add to the distance travelled. Add the lengths {up} and {down}.",),
             "Add the positive lengths of the two moves."),
        part("Describe one move that returns the lift to its starting level.", f"Go down {up-down} levels." if up > down else (f"Go up {down-up} levels." if down > up else "Stay on this level."),
             (f"Compare the finishing level {end} with the starting level {start}.",),
             "Use the difference between the two levels and give a direction."))


def coloured_bands(seed):
    a = 2 + seed % 4
    b = a + 1 + seed // 4 % 4
    scale = 3 + seed // 12 % 15
    total = (a+b)*scale
    return problem("Two colours, one batch", f"Each batch for a school event has {a} blue bands and {b} yellow bands. The organisers pack {total} bands using whole batches.",
        part("How many bands are blue?", m(a*scale),
             (f"Each batch has {a+b} bands. There are {m(f'{total}\\div {a+b}={scale}')} batches.",
              f"There are {a} blue bands in each batch. Multiply by {scale}."),
             "Divide by the total in one batch. Then count the blue bands.", field(a*scale, label="Blue bands"),
             (str(b*scale), "You counted the yellow bands. Use the blue part of each batch.")),
        part("What fraction of the whole batch is blue? Give your answer in simplest form.", m(tex(Fraction(a,a+b))),
             (f"Use {a} blue bands over {a+b} bands altogether, then simplify.",),
             "Use the total number of parts as the denominator."),
        part(f"A volunteer packs {b*(scale+1)} yellow bands. How many blue bands should go with them?", m(a*(scale+1)),
             (f"Divide the yellow count by {b} to find the new number of batches. Each batch needs {a} blue bands.",),
             f"Scale both colours by {scale+1}."))


def pairs_and_spare(seed):
    pairs = 5 + seed % 23
    extra = 1 + 2*(seed // 23 % 6)
    objects = ('books', 'cones', 'mugs', 'counters')[seed // 71 % 4]
    total = 2*pairs+extra
    return problem("Pairs and spares", f"A display has {pairs} pairs of {objects} and {extra} single {objects} on a shelf.",
        part(f"How many {objects} are in the display?", m(total),
             (f"There are two in each pair. Multiply {pairs} by 2, then add the {extra} singles.",),
             "Count two objects per pair before adding the singles.", field(total, label="Total objects"),
             (str(pairs+extra), "A pair has two objects. Double the number of pairs first.")),
        part("The number of pairs changes but the number of singles stays the same. Explain why the total is always odd.",
             "Pairs make an even total. The fixed number of singles is odd, so the total is odd.",
             ("Group all the items into twos. The singles also leave one unmatched object when put into twos.",),
             "Use the fact that twice a whole number is even."),
        part(f"Another display of this kind has {total+12} items. How many pairs are there?", m(pairs+6),
             (f"Remove the {extra} singles, then divide the rest by 2.",),
             "Subtract the singles and then divide by 2."))


def growing_rows(seed):
    gap = 3 + seed % 7
    end = 1 + seed // 7 % 8
    term = 7 + seed // 13 % 10
    rows = table(["Row number", "1", "2", "3"],[["Tiles", *(str(gap*k+end) for k in (1,2,3))]])
    formula = f"{gap}n+{end}"
    return problem("A growing row of tiles", f"Build row {m('n')} with {gap} tiles for each group and {end} extra tiles at the end. Row {m('n')} has {m('n')} groups.",
        part(f"How many tiles are in row {term}?", m(gap*term+end),
             (f"Row {term} has {term} groups. Multiply {term} by {gap} and add the {end} tiles at the end.",),
             "Multiply the row number by the number in one group, then add the end tiles.", field(gap*term+end, label="Number of tiles"),
             (str(gap*term), "The groups are correct. Include the fixed tiles at the end of the row.")),
        part(f"Write a rule for the number of tiles in row {m('n')}.", m(formula),
             (f"The groups contribute {m(f'{gap}n')}. The other {end} tiles do not change.",),
             f"Use the term for {m('n')} equal groups and add the fixed amount."),
        part(f"Which row uses {gap*(term+3)+end} tiles?", m(term+3),
             (f"Take off the fixed {end} tiles to leave whole groups of size {gap}.",),
             "Subtract the fixed amount and divide by the group size."), figure_html=rows)


def same_fence(seed):
    half = 19 + seed % 19
    width = 3 + seed // 19 % 5
    new_width = width + 2
    first = width*(half-width)
    second = new_width*(half-new_width)
    assert 2*new_width < half
    return problem("Rearranging a fixed fence", f"A gardener uses {2*half} metres of fencing around a rectangle. The first design has width {width} m. The second has width {new_width} m.",
        part("Find the length of the second rectangle in metres.", m(half-new_width)+" m",
             (f"Length plus width is half the perimeter, which is {half} m. Subtract the new width {new_width} m.",),
             "Halve the perimeter to get length plus width.", field(half-new_width, label="Length in metres"),
             (str(2*half-new_width), "The fence includes both lengths and both widths. Halve the perimeter before subtracting the width.")),
        part("Work out how much the area increases, in square metres.", m(second-first)+" square metres",
             (f"The first area is {width} times {half-width}, giving {first}. The second area is {new_width} times {half-new_width}, giving {second}.",
              f"Subtract {first} from {second}."),
             "Find each area from its own length and width, then take the difference."),
        part("Someone says that equal perimeters always give equal areas. Does this example support the claim? Explain.",
             "No. The two perimeters are equal, but the areas differ.",
             (f"The area changed by {second-first} square metres, even though the fence length stayed fixed.",),
             "Use the two area calculations to test the claim."))


def round_trip(seed):
    initial = 100 + 25*(seed % 31)
    percent = (4 + seed // 7 % 15)*5
    scale = Fraction(percent, 100)
    first, final = initial*(1+scale), initial*(1+scale)*(1-scale)
    return problem("Up, then down by the same percentage", f"A machine setting is {initial} units. It rises by {percent}% and then falls by {percent}%. Each percentage is taken from the current setting.",
        part("Find the final setting in units.", m(tex(final))+" units",
             (f"After the rise, multiply the starting value by {m(tex(1+scale))} to get {m(tex(first))}.",
              f"The fall uses that new value. Multiply it by {m(tex(1-scale))} to get {m(tex(final))}."),
             "Use a multiplier for each of the two changes.", field(final, label="Final setting"),
             (str(initial), "The rise and fall use different starting amounts. Apply the second percentage to the new setting.")),
        part("How many units smaller is the final setting than the original?", m(tex(initial-final))+" units",
             (f"The original is {initial}. Take away {m(tex(final))} using exact values.",),
             "Subtract the final setting from the starting setting."),
        part("Explain why the rise and fall do not cancel.", "The fall takes the same percentage of the larger amount, so it removes more units than the rise added.",
             (f"Compare the first percentage of {initial} with the second percentage of {m(tex(first))}.",),
             "Compare the quantity on which each percentage is based."))


def combined_mean(seed):
    small = 5 + seed % 10
    large = small + 3 + seed // 10 % 13
    a, b = 3 + seed // 5 % 8, 13 + seed // 31 % 14
    count = small+large
    total = small*a + large*b
    mean = Fraction(total,count)
    rows = table(["Club", "Members", "Mean visits"],[["North",str(small),str(a)],["South",str(large),str(b)]])
    return problem("Combining two groups fairly", "The table gives the numbers of library visits made by the members of two clubs.",
        part("Find the mean number of visits per person for both clubs combined. Give an exact answer.", m(tex(mean)),
             (f"Find the two totals. The North total is {small} times {a}. The South total is {large} times {b}.",
              f"Together there are {total} visits and {count} people. Divide visits by people."),
             "Work out the two totals before finding the combined mean.", field(mean, label="Exact mean visits"),
             (str(Fraction(a+b,2)), "The clubs have different sizes. Add all visits and divide by all the people.")),
        part("Find the total number of visits by members of the larger club.", m(large*b),
             (f"Each member contributes {b} visits on average. Multiply by {large} members.",),
             "Multiply the larger club’s mean by its membership."),
        part("One member changes clubs but keeps the same number of visits. Explain what happens to the combined mean.",
             "It stays the same. The total number of visits and the total number of people are unchanged.",
             ("The move changes the groups. The inputs to the combined mean stay fixed.",),
             "Check the numerator and denominator of the combined mean."), figure_html=rows)


def two_draws(seed):
    blue = 2 + seed % 7
    total = blue + 3 + seed // 7 % 11
    white = total-blue
    chance = Fraction(2*blue*white,total*(total-1))
    return problem("Two draws without replacement", f"A bag holds {blue} blue counters and {white} white counters. Two counters are drawn one after the other. The first counter is kept out of the bag.",
        part("Find the probability of getting one counter of each colour, in either order.", m(tex(chance)),
             (f"List the orders BW and WB. The first draw is from {total} counters. The second draw is from {total-1} counters.",
              f"Each order has probability {m(tex(chance/2))}. Add the two probabilities."),
             "Multiply along each order and then add the probabilities for both orders.", field(chance, label="Probability"),
             (str(chance/2), "Your calculation gives one order. Include both BW and WB.")),
        part("Find the probability of two blue counters.", m(tex(Fraction(blue*(blue-1),total*(total-1)))),
             (f"After drawing one blue counter, there are {blue-1} blue counters left out of {total-1}.",),
             "Multiply the probability of a blue counter on the first draw by the changed probability on the second draw."),
        part("Explain why the probability of blue usually changes between the first and second draws.",
             "One counter has been removed. If it was blue, both the number of blue counters and the total fall. If it was white, only the total falls.",
             ("The first draw determines which counts are used in the fraction for the second draw.",),
             "Explain the change to the counts in each possible first draw."))


def scaled_area(seed):
    width = 3+seed%10
    length = width+2+seed//10%10
    scale = 2+seed//23%4
    area = width*length
    return problem("A larger copy of a display", f"A rectangular design is {width} cm by {length} cm. A larger copy is made with length scale factor {m(tex(scale))}.",
        part("Find the area of the larger design in square centimetres.", m(tex(area*scale**2))+" square centimetres",
             (f"Both side lengths are multiplied by {m(tex(scale))}. The area is multiplied by {m(tex(scale**2))}.",
              f"The old area is {area} square centimetres. Multiply it by the area factor."),
             "Square the length scale factor to get the area scale factor.", field(area*scale**2,label="Area in square centimetres"),
             (str(area*scale), "The factor is applied to both dimensions. Multiply the original area by the square of the factor.")),
        part("Find the perimeter of the larger design in centimetres.", m(tex(2*(width+length)*scale))+" cm",
             (f"The perimeter is a length. Multiply the original perimeter {2*(width+length)} cm by {m(tex(scale))} once.",),
             "Use the length scale factor for the perimeter."),
        part("Explain why the same multiplier cannot be used for both perimeter and area.",
             "The perimeter adds scaled lengths. The area multiplies two scaled lengths, so the factor occurs twice.",
             ("Writing each calculation using the two side lengths shows how often the scale factor appears.",),
             "Use addition of lengths for perimeter and multiplication for area."))


def number_line():
    coordinates = [(34 + 36*i, 118) for i in range(9)]
    marks = ''.join(path([(x,110),(x,126)], '#35506b', width=1.6)+label(x,150,i-4) for i,(x,_) in enumerate(coordinates))
    moves = (path([(70,105),(70,70),(250,70),(250,105)], '#19628d', width=3)
             +path([(250,99),(250,90),(142,90),(142,105)], '#af492d', width=3)
             +label(160,60,'+5',colour='#19628d')+label(199,84,'−3',colour='#af492d'))
    return figure('stage-7','signed-moves','A number line showing a move from −3 to 2 and then to −1.',
                  path([(22,118),(338,118)])+marks+moves,'The route has length 8. It finishes 2 levels above the start.',h=178)


def bands_diagram():
    body = ''.join(f'<rect x="{40+i*56}" y="66" width="52" height="43" rx="5" fill="{color}"/>'
                   +label(66+i*56,94,text,colour='#fff') for i,(color,text) in enumerate([('#246393','B')]*2+[('#975e11','Y')]*3))
    return figure('stage-7','whole-batch-share','A strip with two blue and three yellow blocks of equal size.',body,
                  'Count all five equal parts before finding the fraction that is blue.',h=150)


def pairing_diagram():
    body = ''.join(path([(x-21,60),(x+21,60),(x+21,116),(x-21,116)],'#437594',closed=True,width=2)
                   +f'<circle cx="{x}" cy="76" r="7" fill="#2e79a9"/><circle cx="{x}" cy="100" r="7" fill="#2e79a9"/>' for x in (58,128,198))
    body += '<circle cx="284" cy="88" r="9" fill="#9f6016"/>'+label(284,130,'spare')
    return figure('stage-7','pairing-counterexample','Three pairs of blue counters and one unpaired amber counter.',body,
                  'Making another pair leaves the single counter unpaired.',h=150)


def groups_diagram():
    body = ''
    for row in range(1,4):
        body += label(32,48+36*row,f'Row {row}',size=12)
        for item in range(3*row+2):
            offset = (item//3)*8 if item<3*row else row*8
            x = 68+item*19+offset
            colour = '#26729b' if item<3*row else '#a96620'
            body += f'<rect x="{x}" y="{32+36*row}" width="16" height="20" rx="3" fill="{colour}"/>'
    return figure('stage-8','growing-groups','Rows with one, two and three blue triples and two amber tiles at each end.',body,
                  'Each new row adds one blue triple. The two amber tiles stay fixed.',h=163)


def fence_diagram():
    body = ('<rect x="22" y="55" width="144" height="36" rx="2" fill="#d9ebf9" stroke="#245b83" stroke-width="2"/>'
            '<rect x="218" y="47" width="108" height="72" rx="2" fill="#daeecf" stroke="#32743b" stroke-width="2"/>'
            +label(94,47,'8 m')+label(94,114,'2 m wide')+label(272,40,'6 m')+label(272,142,'4 m wide'))
    return figure('stage-8','same-fence-different-areas','An 8 by 2 rectangle and a 6 by 4 rectangle share the same outline length.',body,
                  'Both designs use a 20 m fence. The 4 m wide rectangle covers more ground.',h=170)


def percentage_diagram():
    body = ('<rect x="110" y="28" width="160" height="24" rx="4" fill="#26729b"/>'
            '<rect x="110" y="66" width="192" height="24" rx="4" fill="#26729b"/>'
            '<rect x="264" y="66" width="38" height="24" rx="4" fill="#a96620"/>'
            '<rect x="110" y="104" width="154" height="24" rx="4" fill="#26729b"/>'
            +label(50,44,'Start')+label(50,82,'+20%')+label(50,120,'−20%')
            +label(292,45,100)+label(322,83,120)+label(282,122,96))
    return figure('stage-8','two-percentage-bases','A bar for 100 grows to 120. Taking 20 per cent of 120 leaves 96.',body,
                  'The rise adds 20. The fall removes 24 because the reference amount is now 120.',h=155)


def weighted_diagram():
    body = ''.join(f'<circle cx="{31+i*27}" cy="{y}" r="9" fill="{colour}"/>' for n,y,colour in ((4,57,'#26729b'),(9,109,'#a96620')) for i in range(n))
    body += label(315,62,'4 people')+label(315,114,'9 people')
    return figure('stage-9','unequal-groups','One group of four people and another group of nine.',body,
                  'A person in either group counts once. Use the group sizes to combine group means.',h=149)


def outcome_diagram():
    body = path([(72,84),(156,45)],'#246393')+path([(72,84),(156,125)],'#a96620')
    for y in (45,125):
        body += path([(180,y),(288,y-20)],'#246393')+path([(180,y),(288,y+20)],'#a96620')
    body += label(51,89,'Start')+label(168,50,'B')+label(168,130,'W')
    for y,text in ((27,'BB'),(70,'BW'),(108,'WB'),(150,'WW')):
        body += label(315,y,text)
    return figure('stage-9','ordered-colour-outcomes','The two possible colours on each of two draws give BB, BW, WB and WW.',body,
                  'BW and WB have different orders. Add their probabilities to count one of each colour.',h=173)


def scale_diagram():
    body = ('<rect x="32" y="78" width="62" height="42" fill="#d9ebf9" stroke="#245b83" stroke-width="2"/>'
            '<rect x="196" y="54" width="124" height="84" fill="#daeecf" stroke="#32743b" stroke-width="2"/>'
            +path([(196,96),(320,96)],'#32743b')+path([(258,54),(258,138)],'#32743b')
            +label(63,104,'1')+label(227,82,'1')+label(289,82,'1')+label(227,128,'1')+label(289,128,'1')
            +label(145,102,'×2'))
    return figure('stage-9','scale-and-square-units','A rectangle is doubled in both directions and contains four copies of the original area.',body,
                  'Doubling both lengths gives four original areas.',h=170)


def stage_lessons():
    return {
        7: Lesson('explain-with-models','Show how you know','Use a number line, a bar and pairs of counters to explain a short calculation.',(
            Section('trace-a-move','Where did you finish?','Mark the starting level first. For each lift move, find a new level on the line. Then compare the route with the distance between its ends.',
                    'Going up adds to the current level. Going down subtracts. To count the total distance, add the lengths of all moves.',
                    'The last level can be negative even when the distance travelled is positive. These numbers answer different questions.',
                    'Show one calculation for the finishing level and another for the distance travelled.',route,number_line()),
            Section('count-the-whole','Which parts make the whole?','Draw one block for each part and make all blocks the same size. Label colours before counting.',
                    'A fraction compares some equal parts with all the equal parts. Another complete batch keeps that fraction the same.',
                    'Using the number of yellow parts as the denominator would compare blue to yellow, rather than blue to the whole.',
                    'Draw the whole bar and count the parts before calculating.',coloured_bands,bands_diagram()),
            Section('look-for-a-spare','Will there always be a spare?','Try one small case with counters first. Then ask what happens when a complete pair is added.',
                    'A pair adds two. When an odd number of singles is added, the complete display still has one item left after pairing.',
                    'Several examples can suggest a rule. Explain what changing the number of pairs does to the spare item.',
                    'A reason about any number of pairs earns more than a list of separate examples.',pairs_and_spare,pairing_diagram()),
        ),(('Pair','Two objects grouped together.'),('Claim','Something you think might be true.'),('Example','One case you can test.')), 6),
        8: Lesson('test-a-pattern','Find a rule and test it','Compare repeating changes and explain when a claim fails.',(
            Section('growth-and-start','What changes each time?','Make the first few rows. Point to the growing groups and the part that stays the same. Link them to the two terms of the rule.',
                    'In a rule of the form '+m('an+b')+', the coefficient '+m('a')+' is the step between terms. The fixed part '+m('b')+' accounts for the starting offset.',
                    'The first term includes some growing tiles. Putting the entire first term into the fixed part would count those tiles twice.',
                    'Test a proposed rule by substituting more than one row number.',growing_rows,groups_diagram()),
            Section('one-counterexample','Can the same fence cover a different area?','Draw two rectangles with the same total edge length. Find their areas in square units.',
                    'The fixed perimeter controls the sum of length and width. The area depends on their product, which can change even when the sum stays fixed.',
                    'Use the correct length for each width. Keeping both the first length and the new width changes the fence needed.',
                    'To disprove an “always” claim, give one clear example that satisfies the conditions but gives a different result.',same_fence,fence_diagram()),
            Section('percent-base','Do two opposite changes cancel?','Draw a bar for the starting amount. After a rise, make a new bar before working out the fall.',
                    'Each percentage acts on the current amount. The same percentage of the larger bar is a bigger quantity.',
                    'Taking both changes from the first amount makes them cancel in the calculation. The problem says the amount changes between steps.',
                    'Write both multipliers and round only at the end if asked.',round_trip,percentage_diagram(),extension=True),
        ),(('Counterexample','One case that proves an always claim false.'),('Offset','The fixed amount added in a rule.'),('Multiplier','A number you multiply by to make a change.')), 6),
        9: Lesson('test-a-claim','Test a claim with evidence','Use totals, ordered outcomes and scale factors to justify conclusions across topics.',(
            Section('combine-counts','Whose visits count in the mean?','Start with each group’s total. If you are given a group mean, recovering its total shows how much each group contributes.',
                    'A combined mean is the sum of the group totals divided by the combined headcount. A larger group has more weight.',
                    'An ordinary mean of the two group means gives equal weight to the groups. Check whether their sizes match before doing that.',
                    'Show the combined numerator and denominator before dividing.',combined_mean,weighted_diagram()),
            Section('test-both-orders','Which outcomes belong to the event?','List possible two-draw routes first. Mark every order that fits what the question asks. If the first object is kept, update the counts for the second draw.',
                    'For one route, multiply its consecutive probabilities. Add the probabilities of separate routes that can each give the event.',
                    'Writing down only blue then white misses white then blue. Writing the same fractions for both stages misses the removal.',
                    'Label your order. After the first draw, check the new total before setting the second denominator.',two_draws,outcome_diagram()),
            Section('choose-a-factor','Which measurements scale twice?','Sketch matching rectangles and mark the scaled side lengths. Count how many copies of the original area fit when both dimensions grow.',
                    'Perimeter uses the length scale factor. For area, each of the two dimensions contributes one factor, so the multiplier is its square.',
                    'Multiplying the area by the length factor stretches only one dimension. An enlargement changes both dimensions.',
                    'Name the quantity before choosing its multiplier. State length or area units with the answer.',scaled_area,scale_diagram()),
        ),(('Combined mean','Total for all entries divided by the total number of entries.'),('Outcome','A possible result, with order when it matters.'),('Scale factor','The multiplier that maps a length to its corresponding length.')), 6),
    }


if __name__ == '__main__':
    for stage, lesson in stage_lessons().items():
        chapters = [('mathematical-thinking','Thinking and working mathematically',(lesson,))]
        build_stage(stage,chapters,__file__,start_position=90,study_suffix='thinking-study')
