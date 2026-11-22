"""Pair existing 0862 worked examples and checks with their mathematical diagrams.

The study JSON is the editable source. Re-running this recipe replaces only
its own figures, retaining all original question IDs and answer keys.
"""
from fractions import Fraction
from html import escape
from math import atan2, cos, hypot, pi, radians, sin, sqrt
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
BLUE, INK, GRID, GOLD, GREEN = "#2563eb", "#172b49", "#d9e4ef", "#a45308", "#14745d"
PALE = "#dbeafe"

def line(x, y, xx, yy, color=INK, width=2, dash=""):
    return f'<line x1="{x:g}" y1="{y:g}" x2="{xx:g}" y2="{yy:g}" stroke="{color}" stroke-width="{width}"{f""" stroke-dasharray="{dash}" """ if dash else ""}/>'

def text(x, y, value, anchor="middle", color=INK, size=15):
    return f'<text x="{x:g}" y="{y:g}" text-anchor="{anchor}" font-size="{size}" fill="{color}">{escape(str(value))}</text>'

def rect(x, y, width, height, fill=PALE, stroke=INK):
    return f'<rect x="{x:g}" y="{y:g}" width="{width:g}" height="{height:g}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>'

def dot(x, y, color=BLUE):
    return f'<circle cx="{x:g}" cy="{y:g}" r="4" fill="{color}"/>'

def poly(points, fill="none", stroke=INK):
    coords = " ".join(f"{x:g},{y:g}" for x, y in points)
    return f'<polygon points="{coords}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'

def arrow(x, y, xx, yy, color=BLUE):
    angle = atan2(yy-y, xx-x)
    points = [(xx, yy), (xx-9*cos(angle-0.43), yy-9*sin(angle-0.43)), (xx-9*cos(angle+0.43), yy-9*sin(angle+0.43))]
    return line(x, y, xx, yy, color) + poly(points, color, color)

def asset(stage, key, alt, body, height, caption=None, *, existing=False):
    name = f"{key if existing else 'audit-' + key}.svg"
    relative = f"/assets/study/0862/stage-{stage}/{name}"
    destination = ROOT / "public" / relative.lstrip("/")
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 {height}" role="img" aria-labelledby="title">'
           f'<title id="title">{escape(alt)}</title><rect width="360" height="{height}" rx="10" fill="#f8fbff"/>'
           f'<g font-family="system-ui, sans-serif" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>\n')
    destination.write_text(svg, encoding="utf-8", newline="\n")
    return dict(src=relative, alt=alt, width=360, height=height, caption=f"<p>{caption or escape(alt)}</p>")

def img(figure):
    return '<p><img src="{src}" alt="{alt}" width="{width}" height="{height}"></p>'.format(**(figure | {"alt": escape(figure["alt"], quote=True)}))

def insert(html, figure):
    return re.sub(r'<p><img src="[^"]+/audit-[^"]+"[^>]*></p>', "", html) + img(figure)

def section(lesson, key):
    return next(item for item in lesson["sections"] if item["id"] == key)

def key_idea(section_row, html, figure=None):
    row = next(block for block in section_row["blocks"] if block["kind"] == "key")
    row["html"] = html
    if figure:
        row["figure"] = figure

def add_check(s, id, prompt, label, expected, hint, solution, *, kind="number", options=None):
    if any(block.get("id") == id for block in s["blocks"]):
        return
    field = dict(key="answer", label=label, type=kind, expected=expected)
    if options:
        field["options"] = options
    step = dict(kind="check", id=id, prompt=prompt, field=field, hint=hint, solution=solution)
    after = next(i for i, block in enumerate(s["blocks"]) if block["kind"] == "example")
    s["blocks"].insert(after + 1, step)

def views(stage, key, width, depth, height, show_views=False):
    unit = min(15, 123/width, 78/height, 54/depth)
    left, base = 112, 143
    right, top = left + width*unit, base - height*unit
    offset = depth*unit*0.67
    body = poly([(left,top),(right,top),(right+offset,top-offset),(left+offset,top-offset)], "#e8f6f1")
    body += poly([(right,top),(right+offset,top-offset),(right+offset,base-offset),(right,base)], "#bce3d5")
    body += rect(left,top,right-left,base-top)
    body += text((left+right)/2,base+20,f"{width} cm")
    body += text(left-9,(top+base)/2+4,f"{height} cm","end")
    body += text(right+offset+6,top-offset-7,f"{depth} cm","start")
    body += text(58,28,"Plan",color=BLUE) + arrow(80,29,left+offset+9,top-offset+9)
    body += text(51,144,"Front",color=BLUE) + arrow(68,128,left-4,base-13)
    body += text(318,177,"Right side",color=BLUE) + arrow(313,155,right+offset+5,base-offset-5)
    alt = f"Cuboid {width} cm wide, {depth} cm deep and {height} cm high. Arrows show the views from above, in front and from the right."
    if show_views:
        for x, title, (horizontal, vertical) in zip((61,180,299),("Plan","Front","Right side"),((width,depth),(width,height),(depth,height))):
            scale = min(13, 75/max(width,depth,height))
            rw, rh = horizontal*scale, vertical*scale
            body += text(x,211,title) + rect(x-rw/2,230,rw,rh) + text(x,322,f"{horizontal} × {vertical} cm")
        alt += f" Plan {width} by {depth}, front {width} by {height}, right side {depth} by {height}."
    return asset(stage,key,alt,body,340 if show_views else 193)

def orthographic(lesson):
    for i, example in enumerate(lesson["examples"][:4]):
        dimensions = re.search(r"cuboid is (\d+) cm wide across the front, (\d+) cm deep and (\d+) cm high", example["question"])
        w,d,h = map(int, dimensions.groups())
        example["title"] = "Choose the dimensions of the plan" if i < 2 else "Read the right-side view"
        example["question"] = insert(example["question"], views(7,f"views-example-{i+1}",w,d,h))
        example["solution"][-1] = insert(example["solution"][-1], views(7,f"projections-example-{i+1}",w,d,h,True))
    key_idea(section(lesson,"plan"),"<p>Start at the blue arrow. From above, the two visible lengths are width and depth. The height points towards your eye. From the front, width and height are visible.</p>",views(7,"cuboid-directions",6,2,5,True))
    key_idea(section(lesson,"side"),"<p>Start at the right arrow. Keep the height and use the front-to-back depth. Trace the outline without including the edges behind the front face.</p>")
    add_check(section(lesson,"side"),"audit-side-view","<p>A box is 6 cm wide, 2 cm deep and 5 cm high. Sketch the rectangle you see from the right. Give its dimensions as depth × height.</p>","Dimensions","side","<p>Look along the width of the box, in the direction of the right arrow.</p>","<p>The right-side view is 2 cm deep and 5 cm high.</p>"+img(views(7,"cuboid-directions",6,2,5,True)),kind="choice",options={"side":"2 cm × 5 cm","plan":"6 cm × 2 cm","front":"6 cm × 5 cm"})
    lesson["revision"]["body"] += "" if "audit-cuboid-directions" in lesson["revision"]["body"] else img(views(7,"cuboid-directions",6,2,5,True))

def grid_points(xmin, xmax, ymin, ymax, *, margin=30):
    step = min((360-2*margin)/(xmax-xmin), 34)
    def coords(x,y):
        return margin+(x-xmin)*step, 20+(ymax-y)*step
    height = int(20+(ymax-ymin)*step+28)
    body = ""
    for x in range(xmin,xmax+1):
        xx, top = coords(x,ymax)
        yy = coords(x,ymin)[1]
        body += line(xx,top,xx,yy, INK if x==0 else GRID, 1.5 if x==0 else 1)
        if x%max(1,round(25/step))==0: body += text(xx,yy+16,x,size=11)
    for y in range(ymin,ymax+1):
        left, yy = coords(xmin,y)
        right = coords(xmax,y)[0]
        body += line(left,yy,right,yy,INK if y==0 else GRID,1.5 if y==0 else 1)
        if y%max(1,round(25/step))==0: body += text(left-6,yy+4,y,anchor="end",size=11)
    return coords, height, body

def rotation(stage, key, cx, cy, x, y, show=True):
    dx, dy = x-cx, y-cy
    image = cx+dy, cy-dx
    xvals, yvals = [cx,x,image[0]], [cy,y,image[1]]
    loc,h,body = grid_points(min(xvals)-1,max(xvals)+2,min(yvals)-1,max(yvals)+1)
    c, p, q = loc(cx,cy), loc(x,y), loc(*image)
    body += line(*c,*p,BLUE,2) + dot(*c,INK) + dot(*p)
    body += text(c[0]-8,c[1]+17,"C","end") + text(p[0]+10,p[1]-8,"P","start")
    alt = f"Equal-scale grid. Centre C ({cx}, {cy}) and original point P ({x}, {y})."
    if show:
        body += line(*c,*q,GREEN,2) + dot(*q,GREEN) + text(q[0]+10,q[1]+5,"P′","start",GREEN)
        angle = atan2(p[1]-c[1],p[0]-c[0])
        radius = 18
        arc = [(c[0]+radius*cos(angle+i*pi/36),c[1]+radius*sin(angle+i*pi/36)) for i in range(19)]
        for a,b in zip(arc[:-2],arc[1:-1]): body += line(*a,*b,GOLD,1.8)
        body += arrow(*arc[-3],*arc[-1],GOLD)
        alt += f" A quarter turn clockwise maps P to P prime ({image[0]}, {image[1]})."
    return asset(stage,key,alt,body,h)

def rotate_and_recover(lesson):
    initial = rotation(8,"turn-about-c", -1,-3,0,-1)
    key_idea(section(lesson,"rotate"),"<p>Keep C fixed. The move from C to P is one unit right and two up. Turning this arrow a quarter turn clockwise gives two right and one down. Start at C again to locate P′ at \\((1,-4)\\).</p>",initial)
    for i, example in enumerate(lesson["examples"][:2]):
        x,y,cx,cy = map(int,re.findall(r"-?\d+", example["question"].split("<ol")[0].replace("90°","")))
        example["question"] = insert(example["question"],rotation(8,f"turn-prompt-{i}",cx,cy,x,y,False))
        example["solution"][-1] = insert(example["solution"][-1],rotation(8,f"turn-answer-{i}",cx,cy,x,y))
    loc,h,body = grid_points(-3,6,-3,6)
    c, p, pp, q, qq = (-1,-1),(1,0),(3,1),(0,2),(1,5)
    body += line(*loc(*c),*loc(*pp),BLUE) + line(*loc(*c),*loc(*qq),GREEN)
    for point,name,color,dy in [(c,"C",INK,16),(p,"P",BLUE,17),(pp,"P′",BLUE,-9),(q,"Q",GREEN,-9),(qq,"Q′",GREEN,-7)]:
        x,y = loc(*point)
        body += dot(x,y,color)+text(x+7,y+dy,name,"start",color)
    key_idea(section(lesson,"recover"),"<p>To recover the centre, draw a line through each point and its image. Here the lines through \\(P=(1,0), P'=(3,1)\\) and \\(Q=(0,2), Q'=(1,5)\\) meet at \\(C=(-1,-1)\\). Check that \\(CP'=2CP\\) and \\(CQ'=2CQ\\). Then read the scale factor.</p>",asset(8,"recover-centre","PP prime and QQ prime intersect at C (minus 1, minus 1), with each image twice as far from C.",body,h))
    add_check(section(lesson,"rotate"),"audit-turn-centre","<p>Use the same centre \\(C=(-1,-3)\\). Rotate \\(Q=(1,-3)\\) by 90° clockwise. Give the ordered pair for its image.</p>","Coordinates of Q′","(-1,-5)","<p>From C, Q is two units to the right. Turn that arrow a quarter turn clockwise.</p>","<p>The new movement is two units down from C, so \\(Q'=(-1,-5)\\).</p>",kind="pairs")

def chart(stage,key,points,xlabel,ylabel,*,xmin=0,xmax=None,ymax=None,mode="scatter",xticks=None,yticks=None,existing=False):
    xmax = xmax or max(x for x,_ in points)
    ymax = ymax or max(y for _,y in points)
    left,right,top,bottom = 54,332,20,177
    def point(x,y): return left + (x-xmin)*(right-left)/(xmax-xmin),bottom-y*(bottom-top)/ymax
    body=""
    for x in (xticks or list(range(xmin,xmax+1))):
        xx, yy = point(x,0)
        body += line(xx,top,xx,yy,GRID,1) + text(xx,yy+19,x,size=12)
    for y in (yticks or [0,ymax//2,ymax]):
        xx,yy=point(xmin,y)
        body += line(xx,yy,right,yy,GRID,1) + text(xx-7,yy+4,y,"end",size=12)
    body += line(left,top,left,bottom)+line(left,bottom,right,bottom)+text((left+right)/2,221,xlabel)
    body += f'<g transform="rotate(-90 15 100)">{text(15,100,ylabel)}</g>'
    if mode=="bars":
        for x,y in points:
            xx,yy=point(x,y)
            width=point(x+5,y)[0]-xx
            body+=rect(xx,yy,width,bottom-yy,PALE,BLUE)
    if mode=="line":
        for (x,y),(xx,yy) in zip(points,points[1:]): body+=line(*point(x,y),*point(xx,yy),BLUE)
    if mode!="bars":
        for x,y in points: body+=dot(*point(x,y))
    alt = ("Frequency diagram with class lower bounds and counts: " if mode=="bars" else f"{ylabel} against {xlabel}. ") + "; ".join(f"{x}, {y}" for x,y in points) + "."
    return asset(stage,key,alt,body,238,existing=existing)

def pictogram():
    body = text(30,29,"Key", "start")
    def badge(x,y,half=False):
        return rect(x,y,17,19,"#f8fbff",BLUE)+rect(x,y,8.5 if half else 17,19,PALE,BLUE)
    body+=badge(70,13)+text(98,29,"= 6 books","start")
    body+=text(30,80,"Fiction","start")+text(30,134,"Science","start")
    for i in range(3): body+=badge(124+27*i,63)
    for i in range(2): body+=badge(124+27*i,117)
    body+=badge(178,117,True)
    return asset(8,"pictogram","Each full badge represents 6 books. Fiction has three badges. Science has two and a half.",body,156)

def data_graphs(lesson):
    for i, example in enumerate(lesson["examples"]):
        if i in {0,1,4,5}:
            data = re.findall(r"</td><td>(\d+)</td>",example["question"])
            if i<2:
                values=list(map(int,data[:4]))
                fig=chart(8,f"grouped-example-{i}",list(zip((10,15,20,25),values)),"Time (seconds)","Frequency",xmin=10,xmax=30,ymax=20,mode="bars",xticks=[10,15,20,25,30],yticks=[0,5,10,15,20])
            else:
                values=list(map(int,data[:4]))
                fig=chart(8,f"series-example-{i}",list(zip((1,2,3,4),values)),"Week","Visitors",xmin=1,xmax=4,ymax=32,mode="line",yticks=[0,8,16,24,32])
            example["question"]=insert(example["question"],fig)
    data=[(12,42),(14,48),(17,51),(19,63),(21,58),(24,71)]
    scatter=chart(8,"temperature-visits",data,"Temperature (°C)","Visitors",xmin=10,xmax=26,ymax=80,xticks=[10,14,18,22,26],yticks=[0,20,40,60,80])
    graphs=section(lesson,"graphs")
    scatter_example = dict(title="Describe the trend between two measurements",
       question="<p>Each point is one day. Which kind of association does the plot suggest?</p>"+img(scatter),
       solution=["<p>Each day contributes a temperature and a visitor count. Keep the two values together as one point.</p>",
                 "<p>The points tend upwards. The count at 21 °C is below the count at 19 °C, but the overall association is positive.</p>"])
    if not any(e["title"]==scatter_example["title"] for e in lesson["examples"]):
        lesson["examples"].append(scatter_example)
        graphs["blocks"].append(dict(kind="example",index=len(lesson["examples"])-1))
    check_plot=chart(8,"journey-vs-delay",[(2,16),(3,14),(4,13),(6,9),(7,10),(8,6)],"Distance (km)","Delay (min)",xmax=8,ymax=20,xticks=[0,2,4,6,8],yticks=[0,5,10,15,20])
    add_check(graphs,"audit-read-scatter","<p>Look at the direction of the points overall. What is the association between distance and delay in this sample?</p>"+img(check_plot),"Association","negative","<p>Trace the trend from the left of the plot to the right.</p>","<p>Delays tend to fall as distance rises, so the association is negative.</p>",kind="choice",options={"positive":"Positive","negative":"Negative","none":"No visible association"})
    scatter_check = next(block for block in graphs["blocks"] if block.get("id") == "audit-read-scatter")
    graphs["blocks"].remove(scatter_check)
    graphs["blocks"].append(scatter_check)
    story=section(lesson,"story")
    key_idea(story,"<p>Read the pictogram key before counting. A half-symbol stands for half the key value. Three full symbols represent 18 books. Two and a half represent 15 books.</p>",pictogram())
    add_check(story,"audit-read-pictogram","<p>Use the pictogram above. How many more fiction books than science books does it show?</p>","Number of books","3","<p>The rows differ by half a badge.</p>","<p>Half of 6 is 3 books.</p>")

def fraction(x,y,num,den):
    return (f'<rect x="{x-15:g}" y="{y-19:g}" width="30" height="35" rx="3" fill="#f8fbff"/>'
            +text(x,y-4,num,color=INK,size=13)+line(x-12,y,x+12,y,INK,1)+text(x,y+14,den,color=INK,size=13))

def tree(red,blue,replacement,index):
    nodes = [(18,122),(148,63),(148,176),(295,26),(295,91),(295,148),(295,214)]
    n=red+blue
    after=n if replacement else n-1
    links = [(0,1,red,n,True),(0,2,blue,n,False),(1,3,red-(not replacement),after,True),
             (1,4,blue,after,False),(2,5,red,after,False),(2,6,blue-(not replacement),after,False)]
    for low in (0,2,4):
        assert sum(Fraction(u[2],u[3]) for u in links[low:low+2])==1
    body=""
    for i,(a,b,top,bottom,active) in enumerate(links):
        x,y=nodes[a]
        xx,yy=nodes[b]
        body+=line(x,y,xx,yy, BLUE if active else INK,2.5 if active else 1.4)
        body+=fraction((x+xx)/2,(y+yy)/2-7,top,bottom)
        body+=dot(xx,yy,INK)
    for pos,label in zip(nodes[1:],("R","B","RR","RB","BR","BB")): body+=text(pos[0]+10,pos[1]+4,label,"start")
    alt=f"Two draws of {red} red and {blue} blue counters, {'with' if replacement else 'without'} replacement. " \
        f"First red {red}/{n}. Given red, second red {red-(not replacement)}/{after}; given blue, second red {red}/{after}. Blue branch at each node is the complement."
    return asset(9,f"draw-tree-{index}",alt,body,239,"Multiply the two highlighted branches for the red–red path.")

def probability(lesson):
    for i in range(4,8):
        example=lesson["examples"][i]
        red,blue=map(int,re.search(r"has (\d+) red and (\d+) blue",example["question"]).groups())
        fig=tree(red,blue,i<6,i)
        example["solution"][0]=insert(example["solution"][0],fig)
        example["title"]="Follow a path with replacement" if i<6 else "Update each branch without replacement"
    for sid,idx in [("with-replacement",4),("without-replacement",6)]:
        example=lesson["examples"][idx]
        red,blue=map(int,re.search(r"has (\d+) red and (\d+) blue",example["question"]).groups())
        fig=tree(red,blue,idx==4,idx)
        key_idea(section(lesson,sid),
                 "<p>With replacement, both branches of the second draw use the original bag.</p>" if idx==4 else "<p>Without replacement, the denominator drops by one. The colour just drawn also loses one counter. For the 11 red and 11 blue example, the red chance is \\(\\frac{10}{21}\\) after red and \\(\\frac{11}{21}\\) after blue.</p>",fig)
    add_check(section(lesson,"without-replacement"),"audit-update-branch","<p>For the 11 red and 11 blue counters above, the first counter was blue. What is the probability of red on the next draw?</p>","Probability of red","11/21","<p>One blue counter is out. Count the red counters and all the counters still in the bag.</p>","<p>There are 11 red counters left out of 21. The probability is \\(\\frac{11}{21}\\).</p>")

def triangle(key, x, y, c, names=("a","b","c"), units=""):
    scale=min(201/x,135/y)
    x0,y0=58,174
    x1,y1=x0+x*scale,y0-y*scale
    body=poly([(x0,y0),(x1,y0),(x1,y1)],PALE)+line(x1-13,y0,x1-13,y0-13)+line(x1-13,y0-13,x1,y0-13)
    a,b,hypotenuse=names
    body+=text((x0+x1)/2,y0+22,a)+text(x1+9,(y0+y1)/2,b,"start")+text((x0+x1)/2-12,(y0+y1)/2-12,hypotenuse)
    return asset(9,key,f"Right-angled triangle. Legs {a} and {b}; hypotenuse {hypotenuse} lies across from the right angle."+units,body,221)

def pythagoras(lesson):
    s=section(lesson,"hypotenuse")
    key_idea(s,"<p>The square marks the right angle. The sides meeting there are \\(a\\) and \\(b\\). The side across from the square is \\(c\\), the hypotenuse. In this triangle, \\(a^2+b^2=c^2\\).</p>",triangle("pythagoras-letters",4,3,5))
    if not any(b.get("id")=="audit-small-hypotenuse" for b in s["blocks"]):
        i=next(i for i,b in enumerate(s["blocks"]) if b["kind"]=="example")
        lesson["examples"].append({"title":"Find the hypotenuse before substituting",
          "question":"<p>Use the right-angle mark to choose the longest side.</p>"+img(triangle("pythagoras-3-4",4,3,5,("4 m","3 m","c"))),
          "solution":["<p>The two legs meet at the right angle, so \\(c^2=4^2+3^2=25\\).</p>","<p>The length is positive, so \\(c=5\\text{ m}\\).</p>"]})
        s["blocks"].insert(i,dict(kind="example",index=len(lesson["examples"])-1))
    add_check(s,"audit-small-hypotenuse","<p>A right triangle has legs 6 cm and 8 cm. Find its hypotenuse.</p>"+img(triangle("pythagoras-6-8",8,6,10,("8 cm","6 cm","c"))),"Hypotenuse (cm)","10","<p>Square the legs and add before taking the square root.</p>","<p>\\(c^2=6^2+8^2=100\\), so \\(c=10\\text{ cm}\\).</p>")
    if not any(b.get("id")=="audit-root-length" for b in s["blocks"]):
        s["blocks"].append(dict(kind="check",id="audit-root-length",prompt="<p>A right triangle has legs 2 cm and 3 cm. Find the hypotenuse. Give an exact value or round to two decimal places.</p>",
          field=dict(key="answer",label="Hypotenuse (cm)",type="number",expected="sqrt(13)",schoolDecimalPlaces=2),
          hint="<p>Square 2 and 3 first, then take the positive square root.</p>",solution="<p>\\(c=\\sqrt{2^2+3^2}=\\sqrt{13}\\text{ cm}\\), which is about 3.61 cm.</p>"))

def section_art(lesson, key, figure):
    row = next(b for b in section(lesson, key)["blocks"] if b["kind"] == "key")
    row["figure"] = figure

def row_shapes(values, labels, y=65):
    x=16
    width=(328-20*(len(values)-1))/len(values)
    draw=""
    for i,(value,label) in enumerate(zip(values,labels)):
        draw+=rect(x,y,width,54)+text(x+width/2,y-14,label,size=14)+text(x+width/2,y+34,value,size=19)
        if i<len(values)-1: draw+=arrow(x+width+3,y+27,x+width+17,y+27)
        x+=width+20
    return draw

def correct_legacy_figures(s7,s8):
    chapter="lower-0862-s7-"
    figure=asset(7,"place-value","Place value of 2.5. Zero tens, two ones and five tenths.",
        rect(20,44,320,118,"#ffffff")
        +line(125,44,125,162)+line(235,44,235,162)+line(20,93,340,93)
        +text(73,76,"Tens")+text(178,76,"Ones")+text(288,76,"Tenths")
        +text(73,137,0,size=23)+text(178,137,2,size=23)+text(288,137,5,size=23)
        +text(230,143,".",size=26)+text(180,197,"2.5 = 2 ones + 5 tenths"),228,existing=True)
    section_art(s7[chapter+"place-value"],"multiply",figure)
    figure=asset(7,"algebra-machine","Input r, multiply by four, subtract two. Result 4r minus 2.",
        row_shapes(("r","× 4","− 2","4r − 2"),("Input","Multiply","Subtract","Output")),151,existing=True)
    section_art(s7[chapter+"formulas"],"word-rules",figure)
    figure=asset(7,"function-machine","Two inputs in the same direction. Two times three is six and four times three is twelve.",
        row_shapes(("2","× 3","6"),("Input","Rule","Output"),47)+row_shapes(("4","× 3","12"),("","",""),117),191,existing=True)
    section_art(s7[chapter+"functions"],"forward",figure)
    balance=(line(60,56,300,56,INK,4)+poly([(159,186),(201,186),(180,58)],"#e8f5ee")
        +line(80,57,80,120)+line(280,57,280,120)+line(28,121,133,121,BLUE,3)+line(227,121,331,121,BLUE,3)
        +rect(37,87,44,33)+rect(84,93,36,27,"#ffebc9")+rect(243,85,66,35,"#e8f5ee")
        +text(59,109,"x")+text(102,112,8)+text(276,109,20)+text(180,211,"Remove 8 from both pans."))
    section_art(s7[chapter+"equations-inequalities"],"one-step",asset(7,"equation-balance","Balanced beam: x and eight on the left, twenty on the right. Removing eight from both sides leaves twelve.",balance,228,existing=True))
    center=(178,111)
    circle='<circle cx="178" cy="111" r="67" fill="#e2ecff" stroke="#172b49" stroke-width="2"/>'
    circle += line(111,111,245,111,INK,1.6) + line(*center,178,44,BLUE,3)
    circle += line(119,143,237,143,GREEN,2) + line(245,35,245,186,GOLD,2) + dot(*center,INK)+dot(245,111,GOLD)
    circle += text(167,104,"O","end") + text(188,79,"radius","start",BLUE) + text(180,165,"chord",color=GREEN)
    circle += text(83,115,"diameter","end") + line(90,111,107,111,INK,1) + text(252,83,"tangent","start",GOLD)
    section_art(s7[chapter+"shapes-lines"],"circle",asset(7,"circle-parts","One radius from O to the circle, a diameter through O, a lower chord and a tangent touching at the right endpoint.",circle,209,existing=True))
    cube=rect(81,94,106,105)+poly([(81,94),(122,54),(228,54),(187,94)],"#d5f2e9")+poly([(187,94),(228,54),(228,159),(187,199)],"#bbdfd5")
    cube+=arrow(273,45,229,56)+text(270,38,"Vertex")+arrow(280,86,228,113)+text(282,77,"Edge")
    cube+=arrow(52,170,121,142)+text(50,192,"Face")
    section_art(s7[chapter+"solids-volume"],"properties",asset(7,"solid-features","A cube with a point labelled vertex, a side segment labelled edge and a square surface labelled face.",cube,228,existing=True))
    venn=rect(14,35,332,171,"#ffffff")+text(180,26,"All shapes")
    venn+='<circle cx="139" cy="115" r="69" fill="#dbeafe" fill-opacity=".8" stroke="#2563eb" stroke-width="2"/><circle cx="224" cy="115" r="69" fill="#d4f0e2" fill-opacity=".7" stroke="#14745d" stroke-width="2"/>'
    venn+=text(107,81,"Blue",color=BLUE)+text(259,81,"Triangle",color=GREEN)+text(105,124,5)+text(181,122,3)+text(258,124,4)+text(318,186,2)
    prior=next(b for b in section(s7[chapter+"sorting-tables"],"sorting")["blocks"] if b["kind"]=="key")
    prior["html"]='<p>A shape in the overlap is both blue and a triangle. The same 14 shapes go in this Carroll table, each in one cell.</p><table><thead><tr><th>Shape</th><th>Blue</th><th>Not blue</th></tr></thead><tbody><tr><th>Triangle</th><td>3</td><td>4</td></tr><tr><th>Other</th><td>5</td><td>2</td></tr></tbody></table>'
    prior["figure"]=asset(7,"two-sorting-models","Venn diagram for 14 shapes. Blue only 5, both 3, triangle only 4, neither 2.",venn,218,existing=True)
    ruler=line(32,138,330,138)
    for value in range(23,29):
        x=32+(value-23)*59.6
        ruler+=line(x,129,x,146)+text(x,169,value)
    point=32+1.4*59.6
    ruler+=dot(point,138,BLUE)+arrow(point,80,point,128)+text(point,69,"24.4",color=BLUE)+text(180,205,"24.4 is nearer to 24 than 25.")
    section_art(s8["lower-0862-s8-place-value-rounding"],"rounding",asset(8,"nearest-tenth","Scaled number line: 24.4 lies between 24 and 25, to the left of 24.5.",ruler,228,existing=True))
    prism=poly([(68,87),(157,182),(274,145),(185,50)],"#e5f7ee")+poly([(62,182),(157,182),(68,87)],PALE)
    prism+=line(62,182,179,145,INK,1.5,"5 4")+line(179,145,274,145,INK,1.5,"5 4")+line(179,145,185,50,INK,1.5,"5 4")
    prism+=text(211,103,"length")+text(111,153,"end area")+text(180,211,"Dashed edges are hidden.")
    section_art(s8["lower-0862-s8-solids"],"prism",asset(8,"prism-faces","Triangular prism with congruent triangular ends and dashed rear edges.",prism,228,existing=True))
    timeline=chart(8,"time-series",[(1,12),(2,20),(3,16),(4,24)],"Week","Visitors",xmin=1,xmax=4,ymax=24,mode="line",yticks=[0,8,16,24],existing=True)
    section_art(s8["lower-0862-s8-data-graphs"],"graphs",timeline)

def stage7_angles(lesson):
    for index,example in enumerate(lesson["examples"][4:6]):
        given=int(re.search(r" is (\d+)°",example["question"]).group(1))
        slope=cos(radians(given))/sin(radians(given))
        top_x,top_y=203,55
        bottom_y=137
        bottom_x=top_x-(bottom_y-top_y)*slope
        diagram=line(32,top_y,330,top_y)+line(32,bottom_y,330,bottom_y)
        diagram+=line(bottom_x-29*slope,bottom_y+29,top_x+33*slope,top_y-33,BLUE,2.5)
        diagram+=text(top_x+40,top_y-12,f"{given}°",color=BLUE)+text(bottom_x+38,bottom_y-10,"a°")+text(bottom_x-35,bottom_y-11,"b°")
        diagram+=text(179,194,"The two horizontal lines are parallel.")
        fig=asset(7,f"parallel-example-{index}",f"Upper-right angle {given} degrees. At the lower crossing, a is above the line to the right and b is above it to the left.",diagram,213)
        example["question"]=insert(example["question"],fig)
        example["title"]="Identify corresponding and supplementary angles"
    extra=section(lesson,"parallel")
    key_idea(extra,"<p>Corresponding angles occupy matching positions at the two crossings. They are equal when the lines are parallel. The angle adjacent to either one on a straight line is found by subtracting from 180°.</p>")
    if not any(b.get("id")=="audit-angle-rule" for b in extra["blocks"]):
        add_check(extra,"audit-angle-rule","<p>In the worked diagram, compare the given upper angle with \\(a\\) at the lower crossing. Which relationship justifies their equality?</p>","Angle relationship","corresponding","<p>Compare their positions relative to both lines at each crossing.</p>","<p>They are corresponding angles, in the same relative position at the two crossings.</p>",kind="choice",options={"vertical":"Vertically opposite","corresponding":"Corresponding","adjacent":"Adjacent on one straight line"})
    revision=lesson["revision"]
    for field,value in revision.items():
        revision[field]=value.replace("a° in this diagram","a° at the lower crossing of the parallel-line diagram")

def stage8_construction(lesson):
    data=[(13,7,10),(14,7,11)]
    for index,(ab,ac,bc) in enumerate(data):
        x=(ab*ab+ac*ac-bc*bc)/(2*ab)
        y=sqrt(ac*ac-x*x)
        assert abs(hypot(x,y)-ac)<1e-10 and abs(hypot(ab-x,y)-bc)<1e-10
        scale=224/ab
        ax,by=65,162
        bx=ax+224
        cx,cy=ax+x*scale,by-y*scale
        base=line(ax,by,bx,by,INK,3)+text(ax,183,"A")+text(bx,183,"B")+text((ax+bx)/2,185,f"{ab} cm")
        angle=atan2(y,x)
        arc_a=[(ax+ac*scale*cos(angle+i*pi/120),by-ac*scale*sin(angle+i*pi/120)) for i in range(-9,10)]
        other=atan2(y,x-ab)
        arc_b=[(bx+bc*scale*cos(other+i*pi/135),by-bc*scale*sin(other+i*pi/135)) for i in range(-9,10)]
        for points,color in [(arc_a,BLUE),(arc_b,GREEN)]:
            for pa,pb in zip(points,points[1:]): base+=line(*pa,*pb,color,1.7)
        base+=line(ax,by,cx,cy,BLUE)+line(bx,by,cx,cy,GREEN)+dot(cx,cy,INK)+text(cx,cy-11,"C")
        base+=text(112,129,f"{ac} cm",color=BLUE)+text(247,122,f"{bc} cm",color=GREEN)
        fig=asset(8,f"construction-triangle-{index}",f"Draw base AB {ab} cm, an arc of radius {ac} cm from A and an arc of radius {bc} cm from B. Join their intersection C to A and B.",base,207)
        example=lesson["examples"][index+2]
        example["solution"][-1]=insert(example["solution"][-1],fig)
    for i,point in enumerate(((-4,2),(1,5))):
        p,q=(point[0]-1,point[1]-2),(point[0]+1,point[1]+2)
        loc,h,body=grid_points(min(p[0],0)-1,max(q[0],0)+1,min(p[1],0)-1,max(q[1],0)+1)
        body+=line(*loc(*p),*loc(*q),BLUE)+dot(*loc(*p))+dot(*loc(*q))
        for label,(x,y) in [("P",loc(*p)),("Q",loc(*q))]: body+=text(x+7,y-7,label,"start")
        add_check(section(lesson,"midpoint"),f"audit-midpoint-{i+1}",f"<p>Find the midpoint of \\(P={p}\\) and \\(Q={q}\\).</p>"+img(asset(8,f"midpoint-{i+1}",f"Segment P to Q, where P is {p} and Q is {q}.",body,h)),"Midpoint",str(point).replace(" ",""),"<p>Average the two x-coordinates and the two y-coordinates separately.</p>",f"<p>The point halfway along the segment is \\({point}\\).</p>",kind="pairs")


def stage7_transformations(lesson):
    def display(key, bounds, original, result, name, center=(0,0)):
        loc,height,body=grid_points(*bounds)
        body+=poly([loc(*p) for p in original],PALE,BLUE)
        if result:
            body+=poly([loc(*p) for p in result],"#ddf7e9",GREEN)
        cx,cy=loc(*center)
        body+=dot(cx,cy,INK)+text(cx+7,cy+18,"O","start")
        for tag,pts,color in [("",original,BLUE),("′",result or [],GREEN)]:
            for i,point in enumerate(pts):
                x,y=loc(*point)
                body+=dot(x,y,color)+text(x+8,y-7,chr(65+i)+tag,"start",color)
        return asset(7,key,name,body,height)
    shapes=[("rotation",2,(-5,5,-2,5),[(2,0),(3,0),(2,1)],[(0,2),(0,3),(-1,2)]),
            ("enlargement",4,(-1,7,-1,6),[(1,0),(2,0),(1,1)],[(3,0),(6,0),(3,3)])]
    for key,index,bounds,original,result in shapes:
        mode="Rotate the triangle 90° anticlockwise about O." if key=="rotation" else "Enlarge the triangle by scale factor 3 about O."
        alt=("Triangle A, B, C on equal-scale grid with origin O as centre. " + "Vertices " + ", ".join(str(p) for p in original))
        figure=display(key+"-small-grid",bounds,original,None,alt)
        answer=display(key+"-small-grid-answer",bounds,original,result,alt+". The displayed image has vertices "+", ".join(str(p) for p in result))
        first=("<p>Turn the ray from O to each vertex one quarter turn anticlockwise. A is two right of O, so A′ is two up.</p>"
               if key=="rotation" else "<p>Measure from O. A is one square right of O. Its image is three squares right of O. Keep each point on its own ray.</p>")
        lesson["examples"][index]={"title":"Turn a small triangle on squared paper" if key=="rotation" else "Use a scale factor of three on a grid",
          "question":f"<p>{mode} Draw the image on squared paper.</p>"+img(figure),
          "solution":[first,"<p>Mark each image point, then join them in the same order.</p>"+img(answer)]}
        expected=str(result[0]).replace(" ","")
        add_check(section(lesson,key),"audit-grid-"+key,f"<p>Use the previous grid. {mode} Where does vertex A move?</p>",
          "Image A′",expected,"<p>Start from O and follow the direction and distance in the worked example.</p>",
          f"<p>A′ is \\({expected}\\).</p>"+img(answer),kind="pairs")

def revision_figure(lesson, figure, replace=True):
    body=lesson["revision"]["body"]
    if replace:
        body=re.sub(r'<p><img\b[^>]*></p>',"",body)
    # A single compact diagram preserves space for the worked check.
    width=236
    height=round(figure["height"]*width/figure["width"])
    lesson["revision"]["body"]=insert(body,figure|{"width":width,"height":height})


def polish_school_copy(data, stage):
    def polish(value):
        value=re.sub(r"\b(a) ((?:8|11|18)\b(?=[ -]))",lambda m:("An" if m[1].isupper() else "an")+" "+m[2],value,flags=re.I)
        value=re.sub(r"\b1 (equal )?pieces\b",lambda m:"1 "+(m[1] or "")+"piece",value)
        value=re.sub(r"\ball 2 (regions|pieces|parts)\b",r"both \1",value,flags=re.I)
        value=re.sub(r"\\\((-?\d+)\.0+\\\)",r"\\(\1\\)",value)
        value=re.sub(r"<p>Look at this calculation ([^<]+)\.</p><p>Work out \1\.</p>",r"<p>Work out \1.</p>",value)
        return value
    def edit(obj):
        if isinstance(obj,list):
            for item in obj: edit(item)
        if isinstance(obj,dict):
            for key,value in list(obj.items()):
                if isinstance(value,str) and key in {"prompt","question","hint","feedback","solution","html","title","intro","caption"}:
                    obj[key]=polish(value)
                elif isinstance(value,list) and key=="solution":
                    obj[key]=[polish(item) for item in value]
                elif isinstance(value,(dict,list)):
                    edit(value)
    edit(data)
    targets={
        7: {
            "calculating-decimals": {
                "sum": "Write the numbers in columns with the decimal points under each other. Use a zero to fill any empty place.",
                "multiply": "Multiply the two whole-number versions first. Count the decimal places in both factors to place the point in the product.",
                "divide": "Multiply both the number being divided and the divisor by the same power of ten. Choose the power that makes the divisor a whole number.",
            },
        },
        9: {
            "formulae": {
                "divide": "Isolate the product containing the required variable. Divide both sides by the entire multiplier.",
                "square": "Isolate the squared variable before taking a square root. Check which values fit the restrictions in the question.",
                "cube": "First leave only the cube of the required variable on one side. Then take the real cube root.",
            },
            "linear-systems": {
                "eliminate": "Make one pair of coefficients equal or opposite. Decide whether to add or subtract the equations to remove that variable.",
                "intersect": "At the crossing, both expressions for y have the same value. Solve that equation, then find y and check the ordered pair.",
                "modelling": "Choose a letter for each unknown amount. Translate the total and the second condition into separate equations.",
            },
            "compound-percentages": {
                "growth": "Turn the increase into a multiplier greater than 1. Apply it once for each new balance.",
                "decrease": "Use the fraction remaining after one decrease as the multiplier. Start the second decrease from the new amount.",
                "mixed": "Write one multiplier for each change, in the order shown. Apply both to the starting value before rounding.",
            },
        },
    }
    for suffix,hints in targets.get(stage,{}).items():
        lesson=data[f"lower-0862-s{stage}-{suffix}"]
        for index,s in enumerate(lesson["sections"]):
            if s["id"] not in hints:
                continue
            hint="<p>"+hints[s["id"]]+"</p>"
            checks=[block for block in s["blocks"] if block["kind"]=="check"]
            checks.extend(c for c in lesson.get("extraPractice",[]) if c["id"].startswith(f"s{index+1}-"))
            for check in checks:
                check["hint"]=hint
    if stage==9:
        lesson=data["lower-0862-s9-compound-percentages"]
        target=next(item for item in section(lesson,"growth")["blocks"] if item.get("id")=="s1-try-1")
        if "Give a monetary amount" not in target["prompt"]:
            target["prompt"]+='<p>Give a monetary amount in credits to two decimal places if you round.</p>'
        target["field"].update(label="Final balance (credits)", schoolDecimalPlaces=2)
        target["solution"]="<p>For two rounds the balance is \\(450\\times 1.15^2=595.125\\) credits. This is 595.13 credits to two decimal places.</p>"


def read(stage):
    path = ROOT/"content"/"original"/"0862"/f"stage-{stage}-study.json"
    return path, json.loads(path.read_text(encoding="utf-8"))

def main():
    p7,s7=read(7)
    p8,s8=read(8)
    p9,s9=read(9)
    correct_legacy_figures(s7,s8)
    orthographic(s7["lower-0862-s7-views-surface"])
    stage7_transformations(s7["lower-0862-s7-transformations"])
    stage7_angles(s7["lower-0862-s7-angle-reasoning"])
    stage8_construction(s8["lower-0862-s8-constructions-midpoints"])
    rotate_and_recover(s8["lower-0862-s8-rotations-enlargements"])
    data_graphs(s8["lower-0862-s8-data-graphs"])
    probability(s9["lower-0862-s9-outcomes"])
    pythagoras(s9["lower-0862-s9-pythagoras"])
    revision_figure(s7["lower-0862-s7-views-surface"],views(7,"cuboid-directions",6,2,5,True))
    revision_figure(s8["lower-0862-s8-rotations-enlargements"],rotation(8,"turn-about-c",-1,-3,0,-1))
    revision_figure(s9["lower-0862-s9-outcomes"],tree(11,11,False,6))
    revision_figure(s9["lower-0862-s9-pythagoras"],triangle("pythagoras-letters",4,3,5))
    for stage, path, data in [(7,p7,s7),(8,p8,s8),(9,p9,s9)]:
        polish_school_copy(data,stage)
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")

if __name__ == "__main__":
    main()
