"""Generate the Cambridge 0580 C/E2.9 practical graphs content."""
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from runpy import run_path

ROOT=Path(__file__).resolve().parents[2]
shared=run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p,m,f,task,check,line,label,table=(shared[k] for k in ("p","m","fraction","task","check","line","label","table"))
tools=run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))
number,bank_item=tools["number"],tools["bank_item"]


def conversion(i,mode=0):
    rate=2+i%11
    step=3+i
    header=["Cards printed","Paper used (g)"]
    points=[[0,0],[step,step*rate],[2*step,2*step*rate],[3*step,3*step*rate]]
    rows=table(header,[[str(x),str(y)] for x,y in points])
    target=2*step+1
    if mode==0:
        q=number("Read one value from a conversion line",
            f"A printer uses paper at a fixed rate. The table lists points on a straight conversion graph. How many grams are needed for {target} cards?",
            "Paper in grams",target*rate,
            f"The rate is {m(f'{step*rate}\\div {step}={rate}')} g per card.",
            f"Read the line above {target} cards. The corresponding reading is {m(f'{target}\\times {rate}')} g.",
            "Identify the scale factor from a table row or use the straight line between marked points.")
        q["written_prompt"]=rows+p(f"Draw the conversion graph from the table. Use it to find the paper needed for {target} cards in grams.")
        q["method"]=f"Draw labelled axes and plot the points, including the origin. Draw one straight line through the points."
    elif mode==1:
        q=number("Read the input from an output",
            f"The table shows a conversion graph for a printer. How many cards can use exactly {target*rate} g of paper?",
            "Number of cards",target,
            f"One card uses {rate} g. On the graph, start from {target*rate} on the vertical scale.",
            f"Go across to the line, then down to the horizontal scale.",
            "Start at the known measurement on its labelled axis. Read from the other axis.")
    else:
        # A nonzero intercept represents a fixed starting charge.
        fee=4+i
        first, last=step, 2*step
        rate=2+i%8
        rows=table(["Items","Total price (£)"],[["0",str(fee)],[str(first),str(fee+rate*first)],[str(last),str(fee+rate*last)]])
        q=number("Find a rate from a cost graph with a starting fee",
            "These points lie on a straight cost graph. What is the cost per extra item, in pounds?",
            "Cost in pounds per extra item",rate,
            f"The cost rises by {rate*step} pounds when the item count rises by {step}.",
            f"Divide the rise in cost by the rise in items: {m(f'{rate*step}\\div {step}')}." ,
            "Use differences between two points. The graph may start above zero.")
    q["prompt"]=rows+q["prompt"]
    return q


def distance_points(i):
    t1,t2,t3=5+i%11,3+i%7,6+i%9
    d=(2+i%8)*t1
    return [(0,0),(t1,d),(t1+t2,d),(t1+t2+t3,0)]


def journey(i,mode=0):
    points=distance_points(i)
    (_, _),(t1,d),(t2,_),(t3,_)=points
    rows=table(["Time from start (min)","Distance from home (m)"],[[str(t),str(y)] for t,y in points])
    if mode==0:
        q=number("Find the duration of a stop",
            "The times are marked on a piecewise straight journey graph. How many minutes does Ali stay still?",
            "Time stopped in minutes",t2-t1,f"The distance reading is unchanged between {t1} and {t2} minutes.",
            f"Subtract the start of the flat section from its end.","A flat distance graph means the person is not moving.")
        q["written_prompt"]=rows+p("Draw the distance–time graph. Then find how long Ali stays still.")
        q["method"]="Plot the four points on axes labelled time and distance from home and join successive points with straight line segments."
    elif mode==1:
        q=number("Find the speed returning to the start",
            "The table gives the vertices of a distance–time graph. What is the speed on the final segment, in metres per minute? Give your answer exactly.",
            "Speed in metres per minute",Fraction(d,t3-t2),
            f"The distance from home decreases by {d} m. The time increases by {t3-t2} minutes.",
            f"Use the positive change in distance travelled divided by the time: {m(f(d,t3-t2))}.",
            "A negative gradient shows direction towards home. Speed is non-negative.")
    else:
        q=number("Find an average speed for a return trip",
            "The graph starts at home and ends at home. Find the average speed for the whole trip in metres per minute. Give your answer exactly.",
            "Average speed in metres per minute",Fraction(2*d,t3),
            f"The outgoing leg is {d} m and the return leg is also {d} m, giving {2*d} m in total.",
            f"Divide by the whole time, including the stop: {m(f(2*d,t3))}.",
            "Use the complete distance travelled, even when the final distance from home is zero.",
            (0,"The final distance from home is zero, but the traveller moved out and came back."))
    q["prompt"]=rows+q["prompt"]
    return q


def slope(i,mode=0):
    hours=3+i%9
    speed=4+i%13
    start=11+i
    a=hours
    b=hours+(2+i%8)
    diff=b-a
    hist=table(["Time (h)","Volume (L)"],[[str(a),str(start+a*speed)],[str(b),str(start+b*speed)]])
    if mode==0:
        q=number("Find the rate from a straight segment",
            "The table gives two points on a straight filling graph. Find the increase in volume per hour.",
            "Increase in litres per hour",speed,
            f"The volume rises by {diff*speed} L during {diff} hours.",
            f"Divide the change in volume by the change in time: {m(f(diff*speed,diff))}.",
            "A rate is a change in one quantity per unit of the other quantity.")
    elif mode==1:
        q=number("Use a gradient to find a change",
            f"The straight graph is continued at the same rate for {diff+1} hours. How much extra liquid will enter during those hours?",
            "Extra volume in litres",(diff+1)*speed,
            f"The rate from the two points is {diff*speed} L in {diff} hours, which is {speed} L per hour.",
            f"Multiply the rate by {diff+1} hours.","Find the rate first, then multiply by the new time interval.")
    else:
        gap=2+i%9
        q=number("Compare two rates in the same units",
            f"Another tank fills at {speed+gap} L per hour. The first tank follows the graph in the table. By how many litres per hour is the second tank faster?",
            "Difference in litres per hour",gap,
            f"Use the two points to find the rate of the first tank: {m(f(diff*speed,diff))} L per hour.",
            "Compare the two rates after writing them in the same units.",
            "The heights on the graph represent volumes, not rates.")
    q["prompt"]=hist+q["prompt"]
    return q


def speed_graph(i,mode=0):
    rise,flat,fall=3+i%8,5+i%7,4+i%9
    top=(2+i%9)*rise
    rows=table(["Time (s)","Speed (m/s)"],[["0","0"],[str(rise),str(top)],[str(rise+flat),str(top)],[str(rise+flat+fall),"0"]])
    if mode==0:
        q=number("Find acceleration as a gradient",
            "The table gives successive vertices of a speed–time graph. Find the acceleration in the first straight segment.",
            "Acceleration in metres per second squared",Fraction(top,rise),
            f"Speed increases by {top} m/s while time increases by {rise} s.",
            f"Divide the change in speed by the time: {m(f(top,rise))}.",
            "Acceleration is the gradient on a speed graph, not the height.")
    elif mode==1:
        q=number("Find the rate of deceleration",
            "The table gives successive vertices of a speed–time graph. Find the magnitude of the deceleration during the final segment. Give an exact value.",
            "Deceleration in metres per second squared",Fraction(top,fall),
            f"The speed reduces from {top} m/s to zero in {fall} seconds.",
            f"The gradient is negative. The magnitude of this gradient is {m(f(top,fall))}.",
            "For the magnitude, give a positive value.")
    else:
        result=Fraction(top)*(Fraction(rise+fall,2)+flat)
        q=number("Find the total area under a speed graph",
            "The table gives the vertices of a piecewise straight speed–time graph. What is the total distance travelled in metres? Give an exact value.",
            "Distance in metres",result,
            f"There are two triangles with widths {rise} s and {fall} s, and one rectangle of width {flat} s.",
            f"Add the three areas using height {top} m/s. This gives the distance in metres.",
            "Add the areas under all the segments. Use half the area for each triangle.")
        q["written_prompt"]=rows+p("Draw the speed–time graph and find the total distance travelled in metres.")
        q["method"]="Plot and join the four points. Set up the area using the rectangle and the two triangles."
    q["prompt"]=rows+q["prompt"]
    return q


def tangent(i,mode=0):
    t=2+i%11
    width=2+i%9
    y=13+i%16
    change=2+i
    x2=t+width
    rise=change*width
    given= m(f"({t},{y})")+ " and " +m(f"({x2},{y+rise})")
    if mode==0:
        return number("Estimate a rate using two tangent points",
            f"A volume–time curve has a tangent drawn. Two readable points on that same tangent are {given}. Time is in minutes and volume is in litres. Estimate the filling rate in litres per minute.",
            "Filling rate in litres per minute",change,
            f"The two points on the tangent differ by {rise} L and {width} minutes.",
            f"The tangent's gradient is {m(f(rise,width))}. This estimates the rate at the point of contact.",
            "Use the straight tangent line, even though the original graph is curved.")
    if mode==1:
        return number("Estimate the downward rate",
            f"At one time the tangent of a temperature–time graph passes through {m(f'({t},{y+rise})')} and {m(f'({x2},{y})')}. Time is in minutes and temperature is in degrees Celsius. Estimate the decrease in temperature per minute.",
            "Cooling rate in degrees Celsius per minute",change,
            f"The temperature goes down by {rise} degrees while time goes up by {width} minutes.",
            f"The gradient is negative. The decrease per minute is its positive magnitude, {m(f(rise,width))}.",
            "A falling tangent has a negative gradient. A question about the amount of decrease calls for the magnitude.")
    return number("Compare the steepness of two tangents",
        f"At two points of a filling curve the tangent slopes are {change} and {change+width} litres per minute. By how much does the greater rate exceed the smaller rate?",
        "Difference in litres per minute",width,
        f"The larger slope belongs to the greater filling rate.",
        f"Subtract {change} from {change+width}.",
        "Compare the slopes of the tangents. The position on the graph does not tell you the rate.")


def pick(factory,mode):
    return lambda i:factory(i,mode)



LESSONS=[
 ("conversion","Reading and drawing conversion graphs","Read axes and scales, plot data and use a straight graph to convert in either direction.",False,[
  ("from-input","How do I read from the horizontal axis?","Read what both axes measure. Find the given input on the horizontal scale, then go up to the line and across to the other scale.",
   "Choose scales that fit all the data. Label both axes with their units. Use a straight line when the quantities are related by a constant scale factor.",
   "Check the value of one small division before reading a position between labels.",pick(conversion,0),"conversion"),
  ("from-output","How do I read in the opposite direction?","If the known value belongs to the vertical axis, start on that axis. Go across to the line, then down.",
   "Start on the axis that measures the given quantity.",
   "A backwards reading uses the same graph. It changes the direction in which you read.",pick(conversion,1),None),
  ("starting-fee","What if the line does not start at zero?","A cost graph might start at a fixed fee. Its height tells you the total cost and its gradient tells you the extra cost for one unit.",
   "Use differences between two points to work out a rate of change.",
   "Dividing the total cost by an item count includes the fixed fee.",pick(conversion,2),None)]),
 ("distance","Distance–time graphs","Read a distance from home, find stops and work out speed for one segment or an entire journey.",False,[
  ("stop","What does a flat segment mean?","Check what the vertical axis measures. When the distance from home stays the same along a flat straight segment, the journey graph describes a stop.",
   "Subtract the starting time of the flat segment from its ending time.",
   "A horizontal line on a speed–time graph means something different.",pick(journey,0),"distance"),
  ("return","What does a falling distance from home show?","A straight downward segment shows distance from the start decreasing steadily. The traveller is returning towards home.",
   "Use the absolute change in distance from home and divide by the elapsed time on that part.",
   "Speed is non-negative even when the distance-from-home graph has a negative slope.",pick(journey,1),None),
  ("average","What distance should I use for a whole journey?","Add the lengths of the parts that were travelled. A trip out and back can start and finish at the same place while still covering a distance.",
   "Divide total distance travelled by the total time, including any stops.",
   "An average of the segment speeds is valid only when the segment times match.",pick(journey,2),None)]),
 ("straight-rates","Steady rates on straight practical graphs","Use a change triangle to find and compare rates on graphs with units.",False,[
  ("rate","Why do the differences matter?","Choose two clear points on the straight segment. Form a change triangle with a horizontal run and vertical rise.",
   "Gradient is vertical change divided by horizontal change.",
   "Measure both changes in the units on the axes.",pick(slope,0),"straight"),
  ("change","How do I use a rate to predict a change?","When the rate stays constant, each extra hour adds the same amount. Multiply the gradient by the time interval to find the change.",
   "The starting amount belongs to the total. The rate tells you how much is added over another interval.",
   "If a question asks for extra volume, keep it separate from the total volume.",pick(slope,1),None),
  ("compare","How can I compare two rates fairly?","Work out both rates in matching units. Then compare how much changes in one unit of time or distance.",
   "The steeper line corresponds to the bigger rate when axes have the same scales.",
   "Use numbers to compare gradients from diagrams with different scales.",pick(slope,2),None)]),
 ("speed","Speed–time graphs","Use gradients for acceleration and areas under a graph for distance travelled.",True,[
  ("increase","How do I find acceleration from a rising segment?","Vertical change on a speed–time graph is change in speed. Dividing that change by time gives acceleration.",
   "Divide change in speed in metres per second by change in time in seconds.",
   "A flat segment at a positive speed means constant motion, not a stop.",pick(speed_graph,0),"speed"),
  ("decrease","What does a negative gradient describe?","A downward segment shows the speed is falling. The signed change in speed is negative.",
   "For the magnitude of deceleration, give the positive size of the negative gradient.",
   "The speed itself is still non-negative on a speed–time graph.",pick(speed_graph,1),None),
  ("area","Which calculation gives the distance travelled?","Find the area between the speed line and the horizontal axis. Split a piecewise straight graph into rectangles and triangles if that helps.",
   "Add the areas for all the required segments. Metres per second multiplied by seconds gives metres.",
   "A gradient on a speed graph gives an acceleration, not a total distance.",pick(speed_graph,2),None)]),
 ("tangents","Estimating a rate using a tangent","Place a tangent at the requested point and use its slope as the rate at that point.",True,[
  ("touch","Which line should I use on a curved graph?","Draw a straight line whose direction matches the curve at the requested point. Choose two readable points on the tangent line.",
   "Use a wide triangle on the tangent to reduce the effect of small reading errors.",
   "The two points used for the gradient lie on the tangent. They need not lie on the curve.",pick(tangent,0),"tangent"),
  ("fall","How do I explain a falling tangent?","A tangent falls from left to right when the vertical quantity is decreasing. The gradient carries a minus sign.",
   "Give a signed gradient for rate of change. Give a positive magnitude when asked how much is lost per unit.",
   "Read the units before comparing the values.",pick(tangent,1),None),
  ("range","How do I describe changes in steepness?","Compare the gradient estimates at the requested points. A larger positive slope means the quantity is growing faster if the axes use the same units.",
   "A high graph value can have a shallow slope. Use the tangent for the rate.",
   "Keep a sensible level of precision for a gradient you estimate from a graph.",pick(tangent,2),None)]),
]


def figures():
    folder=ROOT/"public/assets/study/0580/practical-graphs"
    folder.mkdir(parents=True,exist_ok=True)
    ink,contrast="#243f61","#13745f"

    def chart(name,alt,caption,x_axis,y_axis,x_ticks,y_ticks,solid,extra=None,shade=None):
        left,right,top,bottom=72,393,37,152
        def px(x):return left+(right-left)*x/x_ticks[-1]
        def py(y):return bottom-(bottom-top)*y/y_ticks[-1]
        def coords(points):return " ".join(f"{px(x):.2f},{py(y):.2f}" for x,y in points)
        drawing=""
        for x in x_ticks:
            drawing+=line(px(x),top,px(x),bottom,"#deebf2")+label(px(x),173,str(x))
        for y in y_ticks:
            drawing+=line(left,py(y),right,py(y),"#deebf2")+label(49,py(y)+5,str(y))
        drawing+=line(left,bottom,right+8,bottom,ink)+line(left,bottom,left,top-8,ink)
        drawing+=label(232,194,x_axis)+label(117,20,y_axis)
        if shade:
            drawing+=f'<polygon points="{coords(shade)}" fill="#b9e2d4" fill-opacity=".65"/>'
        if extra:
            drawing+=f'<polyline points="{coords(extra)}" fill="none" stroke="{contrast}" stroke-width="2" stroke-dasharray="5 5"/>'
        drawing+=f'<polyline points="{coords(solid)}" fill="none" stroke="{ink}" stroke-width="3"/>'
        if not name=="tangent":
            drawing+="".join(f'<circle cx="{px(x):.2f}" cy="{py(y):.2f}" r="4" fill="{ink}"/>' for x,y in solid)
        elif extra:
            drawing+=f'<circle cx="{px(4):.2f}" cy="{py(12):.2f}" r="5" fill="{contrast}"/>'
        text=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 204" role="img" aria-labelledby="title">'
            f'<title id="title">{escape(alt)}</title><rect width="420" height="204" rx="11" fill="white"/>{drawing}</svg>\n')
        (folder/(name+".svg")).write_text(text,encoding="utf-8")
        return dict(src=f"/assets/study/0580/practical-graphs/{name}.svg",alt=alt,caption=p(caption),width=420,height=204)

    return {
      "conversion":chart("conversion","A straight conversion line from zero through nine and 27.",
         "The line represents 3 grams per card. Read the matching coordinate using the two labelled scales.",
         "Cards","Paper (g)",[0,3,6,9],[0,9,18,27],[(0,0),(9,27)]),
      "distance":chart("distance","Distance from home rises, stays level, then returns to zero.",
         "The flat segment shows a stop. The final segment returns the traveller to the starting place.",
         "Time (min)","Distance (m)",[0,5,10,15,20],[0,20,40,60],[(0,0),(5,60),(10,60),(20,0)]),
      "straight":chart("straight","Volume increases from 8 litres with a change triangle.",
         "From one to three hours, the tank gains 8 litres, so the rate is 4 litres per hour.",
         "Time (h)","Volume (L)",[0,1,2,3,4],[0,6,12,18,24],[(0,8),(4,24)],[(1,12),(3,12),(3,20)]),
      "speed":chart("speed","A speed graph rises to 12, stays level, then drops to zero. The area below is shaded.",
         "Use the gradient to describe the changing speed. Use the shaded area for distance.",
         "Time (s)","Speed (m/s)",[0,4,8,12,16],[0,4,8,12],[(0,0),(4,12),(12,12),(16,0)],
         shade=[(0,0),(4,12),(12,12),(16,0)]),
      "tangent":chart("tangent","Curve and dashed tangent touching at time 4 and volume 12.",
         "The dashed tangent and the curve have the same direction at the marked point.",
         "Time (min)","Volume (L)",[0,2,4,6,8],[0,12,24,36],[(i/4,4+(i/4)**2/2) for i in range(33)],[(1,0),(8,28)]),
    }



def build():
    images=figures()
    lessons,study,questions=[],{},[]
    for key,title,summary,extended,methods in LESSONS:
        id=f"igcse-0580-practical-graphs-{key}"
        examples,sections,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,gen,figure) in enumerate(methods):
            first=len(examples)
            for seed in (j+1,j+5):
                q=gen(seed)
                examples.append(dict(title=q["title"],question=q["prompt"],solution=q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":images[figure]} if figure else {})),
                dict(kind="example",index=first),check(f"{id}-{anchor}-one",gen(9+j)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=first+1,tryFirst=True),
                check(f"{id}-{anchor}-two",gen(13+j))]
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),
                minutes=7,level="core",intro=p(intro),blocks=blocks))
            extra.extend(check(f"{id}-{anchor}-extra-{n+1}",gen(17+3*j+n)) for n in range(2))
        figure=images[methods[0][-1]]
        review="".join(f"<h2>{r[1]}</h2>"+p(r[3]) for r in methods)
        review+=f'<p><img width="252" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        q=methods[0][5](3)
        study[id]=dict(updatedOn="2026-11-22",description=summary,sections=sections,examples=examples,extraPractice=extra,
            glossary=[dict(term=k,definition=p(v)) for k,v in [("Gradient","Vertical change divided by horizontal change."),
                ("Axis scale","The amount that one division on an axis represents."),
                ("Tangent","A straight line with the same direction as a curve at a chosen point.")]],
            revision=dict(body=review,checks=q["prompt"]+p("<strong>Answer.</strong> "+q["result"]),examTip=p(methods[-1][4])))
        if lessons:
            prior=lessons[-1]
            study[id]["related"]=[dict(title=prior["title"],href=f"/courses/maths4u-0580/topics/{prior['id']}")]
        if extended:title+=" (Extended)"
        lessons.append(dict(id=id,key=key,title=title,summary=summary,objective=summary,
            before=p("Read the label and unit on each axis before looking at the data."),
            ideas="".join(p(r[3]) for r in methods),method="".join(f"<h4>{r[1]}</h4>"+p(r[2]) for r in methods),mistakes=[r[4] for r in methods],
            examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),verification=f"{id}-ex-{n+1}") for n,e in enumerate(examples[::2])]))
        gens=[r[5] for r in methods]
        for family,(a,b) in enumerate(((0,1),(1,2),(2,0),(0,2),(2,1)),start=1):
            short=f"{id}-P{family}"
            questions.extend(bank_item(f"{short}-{v}",short,key,[gens[a](29+5*family+v)]) for v in range(2))
            exam=f"{id}-E{family}"
            for v in range(4):
                seed=55+23*family+v
                parts=[gens[a](seed),gens[b](seed+10)]
                bank=bank_item(f"{exam}-{v}",exam,key,parts,v)
                for part,source in zip(bank["parts"],parts,strict=True):
                    if "written_prompt" in source:
                        part["marking_criteria"][-1]["description_html"]=p("Correct graph and reading " + source["result"] + ".")
                        bank["solution_html"]=bank["solution_html"].replace(source["steps"][0],
                            p(source["method"])+source["steps"][0],1)
                questions.append(bank)
    pack=dict(schema_version=1,key="0580-algebra-practical-graphs",version="1.0.0",
        course=dict(slug="maths4u-0580",title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_algebra_practical_graphs",slug="practical-graphs",title="Graphs in practical situations",position=26),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,
        questions=questions,marking_status="DRAFT")
    for suffix,payload in [("v1",pack),("study",study)]:
        (ROOT/"content/original/0580"/f"practical-graphs-{suffix}.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons and {len(questions)} bank questions")


if __name__=="__main__":
    build()
