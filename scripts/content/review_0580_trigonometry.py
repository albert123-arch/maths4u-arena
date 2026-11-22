"""Attach data-matched drawings to existing 0580 trigonometry questions."""

from dataclasses import dataclass
from hashlib import sha256
from html import escape
import json
from math import acos, asin, atan2, cos, degrees, hypot, isclose, radians, sin, sqrt, tan
from pathlib import Path
import re

from review_0606_circular_measure import exact

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content/original/0580"
PUBLIC = "/assets/study/0580/trigonometry"
WIDTH, HEIGHT = 420, 230
INK, BLUE, TEAL, MUTED = "#193455", "#195795", "#087464", "#516984"
MATH = re.compile(r"\\\((.*?)\\\)")
UNIT = re.compile(r"\\,\\mathrm\{(cm|m)\}(?:\^\{2\})?")
SIDE = r"([ABCabc]{1,2})=(.+)"


def line(a, b, colour=BLUE, dashed=False, arrow=False):
    extra = (' stroke-dasharray="6 4"' if dashed else "") + (' marker-end="url(#arrow)"' if arrow else "")
    return (f'<line x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}" '
            f'stroke="{colour}" stroke-width="2.2"{extra}/>')


def label(x, y, value, colour=INK):
    return f'<text x="{x:.1f}" y="{y:.1f}" fill="{colour}">{escape(str(value))}</text>'


def poly(points, fill="#e6eef9", stroke=BLUE):
    coords = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
    return f'<polygon points="{coords}" fill="{fill}" stroke="{stroke}" stroke-width="2.1"/>'


def midpoint(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def sqmark(x, y, xsign=-1, ysign=-1):
    return line((x+12*xsign, y), (x+12*xsign, y+12*ysign), TEAL) + line((x+12*xsign, y+12*ysign), (x, y+12*ysign), TEAL)


def outside(a, b, center, distance=15):
    m = midpoint(a, b)
    dx, dy = -(b[1] - a[1]), b[0] - a[0]
    n = hypot(dx, dy)
    assert n
    sign = 1 if dx * (m[0] - center[0]) + dy * (m[1] - center[1]) > 0 else -1
    return (m[0] + sign * distance * dx / n, m[1] + sign * distance * dy / n + 3)


def arc(p, start, end, radius=24, clockwise=True, colour=TEAL, arrow=False):
    a = circular(p, radius, start)
    b = circular(p, radius, end)
    angle = (end-start if clockwise else start-end) % 360
    marker = ' marker-end="url(#arrow)"' if arrow else ""
    return (f'<path d="M {a[0]:.2f} {a[1]:.2f} A {radius} {radius} 0 {int(angle>180)} {int(clockwise)} '
            f'{b[0]:.2f} {b[1]:.2f}" fill="none" stroke="{colour}" stroke-width="1.8"{marker}/>')


def circular(p, distance, angle):
    return p[0]+distance*sin(radians(angle)), p[1]-distance*cos(radians(angle))


def projected_angle(point, first, second, radius=35):
    def direction(other):
        return degrees(atan2(other[0]-point[0],point[1]-other[1]))%360
    start,end=direction(first),direction(second)
    return arc(point,start,end,radius,(end-start)%360<180)


def number(raw):
    base = UNIT.sub("", raw).replace(r"\,", "").replace(r"^\circ", "").strip()
    if re.fullmatch(r"-?\d+(?:\.\d+)?",base):
        return float(base)
    sum_parts=re.split(r"\s+([+-])\s+",base)
    if len(sum_parts)>1:
        return number(sum_parts[0])+sum((1 if sign=="+" else -1)*number(value)
                                        for sign,value in zip(sum_parts[1::2],sum_parts[2::2]))
    fraction=re.fullmatch(r"(-?)\s*\\frac\{((?:[^{}]|\{\d+\})+)\}\{(\d+)\}",base)
    if fraction:
        return (-1 if fraction[1] else 1)*number(fraction[2])/int(fraction[3])
    quotient=re.fullmatch(r"(.+)/(\d+)",base)
    if quotient:
        return number(quotient[1])/int(quotient[2])
    base = re.sub(r"\*?sqrt\((\d+)\)", r"\\sqrt{\1}",base)
    return float(exact(base))


def shown(value):
    return f"{value:.10g}".replace("-", "−")


def measure(value, unit):
    return f"{shown(value)} {unit}"


def numbers(html):
    values = []
    for value in MATH.findall(html):
        if UNIT.search(value) and "=" not in value or re.fullmatch(r"\d+(?:\.\d+)?\^\\circ",value):
            values.append(number(value))
    return values


@dataclass(frozen=True)
class Drawing:
    body: str
    alt: str
    answers: tuple
    solution: bool = False


def write_drawing(drawing):
    title = escape(drawing.alt)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
           f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title"><title id="title">{title}</title>'
           '<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" '
           'orient="auto"><path d="M0 0L8 4L0 8z" fill="#516984"/></marker></defs>'
           f'<rect width="{WIDTH}" height="{HEIGHT}" rx="14" fill="#f1f5fb"/>'
           '<g font-family="system-ui,sans-serif" font-size="16" text-anchor="middle" '
           'paint-order="stroke" stroke="#f1f5fb" stroke-width="3" stroke-linejoin="round">'
           f'{drawing.body}</g></svg>\n')
    name = "audit-trig-" + sha256(svg.encode()).hexdigest()[:14] + ".svg"
    dest = ROOT / "public" / PUBLIC.lstrip("/") / name
    dest.write_text(svg, encoding="utf-8")
    return f'<p><img src="{PUBLIC}/{name}" alt="{escape(drawing.alt, quote=True)}" width="{WIDTH}" height="{HEIGHT}"></p>'


def right_triangle(sides, angle, find_angle=False):
    a, b, c = (56, 171), (336, 171), (336, 49)
    body = poly([a,b,c]) + sqmark(*b)
    if angle is not None:
        body += arc(a, 66, 90, 43)
        body += label(112, 158, f"{shown(angle)}°", TEAL)
    elif find_angle:
        body += arc(a, 66, 90, 32) + label(115, 156, "θ", TEAL)
    body += label(42, 179, "A") + label(349, 183, "B") + label(347, 45, "C")
    locations = {"AB": (199, 199), "BC": (372, 108), "AC": (179, 93)}
    descriptions = []
    for side,(x,y) in locations.items():
        given = sides.get(side)
        body += label(x, y, measure(given, "cm") if given is not None else side)
        if given is not None:
            descriptions.append(f"{side} is {shown(given)} centimetres")
    alt = "Right-angled triangle ABC with its square corner at B. " + "; ".join(descriptions) + "."
    if angle is not None:
        alt += f" Angle A is {shown(angle)} degrees."
    return body, alt


def right_question(html, data):
    given = {key:number(value) for key,value in data.items()}
    sides = {key:value for key,value in given.items() if len(key)==2}
    a, b, c = (given.get(k) for k in ("AB","BC","AC"))
    angle = given.get("A")
    if angle is None:
        if c is None:
            c = hypot(a,b)
        elif a is None:
            a = sqrt(c*c-b*b)
        elif b is None:
            b = sqrt(c*c-a*a)
    else:
        theta = radians(angle)
        if c is None:
            c = a/cos(theta) if a is not None else b/sin(theta)
        a = c*cos(theta)
        b = c*sin(theta)
    target = re.search(r"(?:Find|Calculate) \\\(([A-C]{1,2})\\\)", html)
    if not target:
        return None
    answer = {"AB":a,"BC":b,"AC":c,"A":degrees(atan2(b,a))}
    body, alt = right_triangle(sides, angle, target[1]=="A")
    return Drawing(body, alt, (answer[target[1]],))


def rectangle(w, h, d=None, unit="cm", bearing=False):
    a,b,c,e = (67,168), (342,168), (342,57),(67,57)
    body = poly([a,b,c,e]) + line(a,c,TEAL) + sqmark(*b)
    body += label(204,195,measure(w,unit) if w is not None else "other edge")
    body += label(374,118,measure(h,unit) if h is not None else "other edge")
    body += label(186,103,measure(d,unit) if d is not None else "diagonal",TEAL)
    if bearing:
        body += arc(a,68,90,57) + label(149,157,"angle",TEAL)
    fields = [f"{name} {measure(val,unit)}" for name,val in zip(("width","height","diagonal"),(w,h,d)) if val is not None]
    return body, "Rectangle with its diagonal marked. " + "; ".join(fields) + "."


def bearing_ray(length, angle, names=("P","Q"), boat=False):
    p = (206,117)
    end = circular(p,79,angle)
    body = line((p[0],210),(p[0],22),MUTED,dashed=True,arrow=True)
    body += label(p[0]+13,22,"N",MUTED)
    body += line(p,end,BLUE,arrow=True)
    body += label(p[0]-17,p[1]+23,names[0])
    body += label(end[0]+(27 if end[0]>p[0] else -29),end[1]-3,names[1])
    body += arc(p,0,angle,38,arrow=True)
    angle_x,angle_y = circular(p,65,angle/2)
    body += label(angle_x,angle_y,f"{int(angle):03d}°",TEAL)
    if length is not None:
        middle = midpoint(p,end)
        body += label(middle[0]-37,middle[1]+6,measure(length,"cm"))
    if boat:
        body += line(p,(end[0],p[1]),MUTED,dashed=True)
        body += line(end,(end[0],p[1]),MUTED,dashed=True)
    if not boat:
        body += line((end[0],end[1]),(end[0],max(15,end[1]-57)),MUTED,dashed=True,arrow=True)
    return body, f"The bearing runs clockwise from north at {names[0]} to the ray towards {names[1]}. It is {int(angle):03d} degrees."


def route(east, north, unit, first_north=False):
    left, right = 78, 335
    ax = left if east>0 else right
    bx = right if east>0 else left
    ay = 168 if north>0 else 69
    by = 69 if north>0 else 168
    a,b = (ax,ay),(bx,by)
    p = (ax,by) if first_north else (bx,ay)
    body = poly([a,p,b]) + line(a,b,TEAL) + line((44,89),(44,33),MUTED,arrow=True)
    body += label(44,24,"N",MUTED)
    body += label(ax+(-14 if east>0 else 14),ay+17,"A")
    body += label(bx+(14 if east>0 else -14),by-7,"B")
    body += label(205,p[1]+(25 if p[1]>100 else -13),measure(abs(east),unit))
    vx = ax if first_north else bx
    body += label(vx+(35 if vx>200 else -35),119,measure(abs(north),unit))
    body += sqmark(*p, 1 if p[0]==left else -1, 1 if p[1]==69 else -1)
    alt = f"Along the horizontal leg, {measure(abs(east),unit)} {'east' if east>0 else 'west'}. Along the vertical leg, {measure(abs(north),unit)} {'north' if north>0 else 'south'}. The direct route joins A to B."
    return body, alt


def elevation(kind, length, value, offset=0, unit="cm"):
    a,b,c = (69,175),(321,175),(321,53)
    body = poly([a,b,c]) + sqmark(*b)
    if kind=="rise" and offset:
        body += line((69,202),(321,202),MUTED) + line((69,175),(69,202),MUTED) + line((321,175),(321,202),MUTED)
        body += label(48,193,shown(offset),TEAL)
        body += label(175,222,"bench")
    if kind in ("rise","shortest"):
        if kind=="rise":
            body += label(198,194,measure(length,unit)) + label(365,116,"height")
        else:
            body += label(183,98,measure(length,unit)) + label(368,115,"distance")
            body += line((49,175),(354,175),MUTED) + label(59,194,"A") + label(332,47,"P")
        body += arc(a,64,90,32) + label(120,164,f"{shown(value)}°",TEAL)
        alt = f"Right triangle with the supplied {measure(length,unit)} {'on the sloping line' if kind=='shortest' else 'on the horizontal leg'} and a {shown(value)} degree angle."
        if offset:
            alt += f" The lower platform is {measure(offset,unit)} high."
        return body, alt
    body += line(c,(222,c[1]),MUTED,dashed=True)
    body += arc(c,244,270,43)
    body += label(248,73,f"{shown(value)}°" if kind=="depression-length" else "angle",TEAL)
    body += label(361,113,measure(length,unit))
    body += label(196,198,"distance" if kind=="depression-length" else measure(value,unit))
    return body, f"Line of sight slopes down from the observer. The angle of depression is measured from the observer’s horizontal. Vertical height {measure(length,unit)}."


def fit(points, x_max=331, pad=59):
    xs,ys = zip(*points)
    f = min((x_max-pad)/max(max(xs)-min(xs),1e-6), 118/max(max(ys)-min(ys),1e-6))
    dx = (pad+x_max-f*(max(xs)+min(xs)))/2
    dy = (174+56+f*(max(ys)+min(ys)))/2
    return [(dx+f*x,dy-f*y) for x,y in points]


def scalene(a,b,angle,known):
    raw = [(b*cos(radians(angle)),b*sin(radians(angle))),(a,0),(0,0)]
    aa,bb,cc = fit(raw)
    mid = tuple(sum(point[i] for point in [aa,bb,cc])/3 for i in range(2))
    marks=[]
    for point, name in zip([aa,bb,cc],"ABC"):
        dx,dy = point[0]-mid[0],point[1]-mid[1]
        n = hypot(dx,dy)
        marks.append((point[0]+16*dx/n,point[1]+16*dy/n+4,name))
    body=poly([aa,bb,cc])
    for start,end,name in [(bb,cc,"a"),(aa,cc,"b"),(aa,bb,"c")]:
        text=measure(known[name],"cm") if name in known else name
        for distance in [15,24,32,40,48]:
            x,y=outside(start,end,mid,distance)
            span=len(text)*4.7
            if not (x-span>2 and x+span<418 and 40<y<224):
                continue
            if all(abs(y-my)>21 or abs(x-mx)>span+len(previous)*4.7+2 for mx,my,previous in marks):
                marks.append((x,y,text))
                if distance>=32:
                    body+=line(midpoint(start,end),(x,y-6),MUTED,dashed=True)
                break
        else:
            marks.append((*outside(start,end,mid,45),text))
    body+="".join(label(*row) for row in marks)
    # Put the numerical angle labels in a header so small angles remain legible.
    angles = [f"{name} = {shown(known[name])}°" for name in "ABC" if name in known]
    if angles:
        body += label(210,26,"  ·  ".join(angles),TEAL)
    fields = [f"{name}={shown(known[name])}" for name in "ABCabc" if name in known]
    return body, "Triangle ABC. Lowercase side labels are opposite the matching uppercase vertices. Given " + ", ".join(fields) + "."


def sine_question(html, known):
    a, b = known.get("a"), known.get("b")
    if "A" in known and "B" in known:
        A, B = known["A"], known["B"]
        C=180-A-B
        ratio=a/sin(radians(A))
        sides = {q:ratio*sin(radians(angle)) for q,angle in zip("abc",(A,B,C))}
        target = re.search(r"Find \\\(([bc])\\\)",html)
        assert target, html
        body,alt=scalene(a,sides["b"],C,known)
        return Drawing(body,alt,(sides[target[1]],))
    baseline_at_A = "A" in known
    angle = known.get("A", known.get("B"))
    opposite, adjoining = (a,b) if baseline_at_A else (b,a)
    h = adjoining*sin(radians(angle))
    z = adjoining*cos(radians(angle))
    m = sqrt(max(0,opposite*opposite-h*h))
    roots = [t for t in sorted(set([z-m,z+m])) if opposite>=h-1e-9 and t>1e-8]
    # A circle centred at C intersects the known angle's ray at each possible final vertex.
    circle_extent=[(z-opposite,h-opposite),(z+opposite,h+opposite)]
    base,center,low,high,end = fit([(0,0),(z,h),*circle_extent,(max(roots+[z+opposite]),0)])
    radius=(high[0]-low[0])/2
    ray = (end[0]+15,base[1])
    name = "A" if baseline_at_A else "B"
    other = "B" if baseline_at_A else "A"
    body = line(base,ray,MUTED,arrow=True) + line(base,center) + label(base[0]-13,base[1]+15,name)
    body += f'<circle cx="{center[0]:.1f}" cy="{center[1]:.1f}" r="{radius:.1f}" fill="none" stroke="{TEAL}" stroke-width="2"/>'
    body += label(center[0]+9,center[1]-12,"C")
    body += label(210,26,f"{name} = {shown(angle)}°  ·  {name}C = {measure(adjoining,'cm')}  ·  radius {measure(opposite,'cm')}",TEAL)
    for idx,t in enumerate(roots,1):
        p=(base[0]+radius*t/opposite,base[1])
        body += line(center,p,BLUE) + label(p[0]+(10 if idx==2 else -8),p[1]+20,other+(str(idx) if len(roots)>1 else ""))
    alt = f"Sine-rule construction. {name}C has length {measure(adjoining,'cm')} and the circle about C has radius {measure(opposite,'cm')}. There are {len(roots)} intersections on the ray."
    angles=sorted(degrees(atan2(h,t-z)) for t in roots)
    if "How many triangles" in html:
        result = "No triangle" if not roots else "Two distinct triangles" if len(roots)>1 else "One obtuse triangle" if max(angle,angles[0],180-angle-angles[0])>90 else "One acute triangle"
    elif "in which B is obtuse" in html:
        result = 180-angle-max(angles)
    elif "all possible" in html:
        result = tuple(angles)
    elif "Find" in html and len(angles)==1:
        result = angles[0]
    else:
        return None
    return Drawing(body,alt,(result,),solution=True)


def cosine_question(html,known):
    a,b,c,A,C = [known.get(k) for k in ("a","b","c","area","C")]
    if C is None:
        C = degrees(acos((a*a+b*b-c*c)/(2*a*b))) if c is not None else 180-degrees(asin(2*A/(a*b)))
    if b is None:
        b=2*A/(a*sin(radians(C)))
    c=hypot(a-b*cos(radians(C)),b*sin(radians(C)))
    body,alt=scalene(a,b,C,known)
    result = a*b*sin(radians(C))/2 if "Find the area" in html or "Find its area" in html else b if r"Find \(b\)" in html else C if r"Find \(C\)" in html else "Cosine rule" if "Which method" in html else c
    return Drawing(body,alt,(result,))


def solid(html, lengths):
    if "pyramid" in html:
        width,height = lengths
        a,b,c,d,p = (76,172),(289,172),(360,120),(147,120),(218,42)
        m=midpoint(a,c)
        body=poly([a,b,c,d])+line(a,p)+line(b,p)+line(c,p)+line(d,p,MUTED,dashed=True)
        body+=line(p,m,TEAL,dashed=True)+line(a,m,TEAL,dashed=True)
        body+=projected_angle(a,p,m,45)
        body+=label(172,197,measure(width,"cm"))+label(253,92,measure(height,"cm"))+label(118,151,"base plane",TEAL)
        return Drawing(body,"Square-based pyramid. The vertical height meets the middle of the square. The projection runs from a corner to that middle.",
                       (degrees(atan2(height,width/sqrt(2))),))
    a,b,c,d=(68,171),(277,171),(348,119),(139,119)
    up=lambda pt:(pt[0],pt[1]-75)
    high = up(c)
    w,l,v=lengths
    finding_height="Find the vertical height" in html
    body=poly([a,b,c,d])+poly([up(a),up(b),up(c),up(d)],"#d9e7fa")
    for lower in [a,b,c,d]:
        body+=line(lower,up(lower))
    body+=line(a,c,TEAL,dashed=True)+line(a,high,TEAL)+line(c,high,TEAL)
    body+=label(161,199,measure(w,"cm"))+label(342,170,measure(l,"cm"))
    body+=label(379,84,"height" if finding_height else measure(v,"cm"))
    alt = "Cuboid with the base diagonal and the space diagonal from the same lower vertex. A vertical edge joins their far endpoints."
    base = hypot(w,l)
    angle=degrees(atan2(v,base))
    if finding_height:
        body+=projected_angle(a,high,c,48)
        body+=label(115,145,f"{shown(v)}°",TEAL)
        alt+=f" The angle with the base plane is {shown(v)} degrees."
        answer=base*tan(radians(v))
    elif "opposite vertices on its base" in html:
        answer=base
    elif "vertical edge at" in html:
        body+=projected_angle(high,a,c,38)
        body+=label(316,79,"angle",TEAL)
        answer=90-angle
    elif "angle between" in html:
        body+=projected_angle(a,high,c,48)
        body+=label(116,149,"angle",TEAL)
        answer=angle
    else:
        answer=hypot(base,v)
    return Drawing(body,alt,(answer,))


def draw(html):
    intro = html.split("</p>",1)[0].removeprefix("<p>")
    math = MATH.findall(intro)
    data = {}
    for match in math:
        pair=re.fullmatch(SIDE,match)
        if pair:
            data[pair[1]]=pair[2]
    if intro.startswith("Triangle") and "right-angled" in intro:
        return right_question(html,data)
    if intro.startswith("In triangle"):
        known = {k:number(v) for k,v in data.items()}
        area = re.search(r"(?:Its|The) area is \\\((.*?)\\\)",html)
        if area:
            known["area"]=number(area[1])
        return cosine_question(html,known) if "C" in known or "c" in known or "area" in known else sine_question(html,known)
    dims = numbers(intro)
    if intro.startswith(("A rectangular panel","A rectangular banner","A tool passes","A diagonal shortcut")):
        w,h=dims
        if "banner" in intro:
            return Drawing(*rectangle(h,None,w),(sqrt(w*w-h*h),))
        answer=degrees(atan2(h,w)) if "shortcut" in intro else w+h-hypot(w,h) if "alternative route" in html else hypot(w,h)
        return Drawing(*rectangle(w,h,bearing="shortcut" in intro),(answer,))
    if intro.startswith("A sample of rods"):
        a,b,c=sorted(dims)
        s = isclose(a*a+b*b,c*c)
        angle=degrees(acos((a*a+b*b-c*c)/(2*a*b)))
        return Drawing(*scalene(a,b,angle,{"a":a,"b":b,"c":c}),("Yes, the squares balance." if s else "No, the squares do not balance.",),solution=True)
    if intro.startswith("The bearing of"):
        q,p=math[:2]
        return Drawing(*bearing_ray(None,dims[0],(p,q)),((dims[0]+180)%360,))
    if intro.startswith("A model boat"):
        lengte,angle=dims
        return Drawing(*bearing_ray(lengte,angle,("Start","Finish"),boat=True),(lengte*sin(radians(angle)),))
    if intro.startswith(("A delivery robot","A machine travels","A beacon")) or re.search(r"north of \\\(A\\\)",intro):
        x,y=dims
        if intro.startswith("A machine travels"):
            x,y=y,x
        if "west" in intro:
            x=-x
        if "south" in intro:
            y=-y
        unit="m" if r"\mathrm{m}" in intro else "cm"
        answer=degrees(atan2(x,y))%360 if "bearing" in html else hypot(x,y)
        return Drawing(*route(x,y,unit,intro.startswith("A machine travels")),(answer,))
    if intro.startswith("From a point on level ground"):
        length,value=dims
        return Drawing(*elevation("rise",length,value),(length*tan(radians(value)),))
    if intro.startswith("From the top of a vertical platform"):
        length,value=dims
        return Drawing(*elevation("depression-length",length,value),(length/tan(radians(value)),))
    if intro.startswith(("An observer","A camera is")):
        offset,length,value=dims
        answer=length/cos(radians(value)) if "straight distance" in html else offset+length*tan(radians(value))
        return Drawing(*elevation("rise",length,value,offset),(answer,))
    if intro.startswith("A small observation camera"):
        length,value=dims
        return Drawing(*elevation("depression-angle",length,value),(degrees(atan2(length,value)),))
    if intro.startswith("A straight path"):
        length,value=dims
        return Drawing(*elevation("shortest",length,value),(length*sin(radians(value)),))
    if intro.startswith("Point") and "perpendicular" in intro:
        leg,horizontal=dims
        body,alt=right_triangle({"AB":horizontal,"BC":leg},None)
        body=body.replace(">A</text>",">Q</text>").replace(">B</text>",">F</text>").replace(">C</text>",">P</text>").replace(">AC</text>",">PQ</text>")
        return Drawing(body,f"F is the foot of the perpendicular. PF is {measure(leg,'cm')}, FQ is {measure(horizontal,'cm')}, and PQ is the sloping side.",(hypot(leg,horizontal),))
    if intro.startswith(("A cuboid","A rectangular crate","A right square-based pyramid")):
        return solid(html,dims)
    match=re.search(r"y=(\d*)\\(sin|cos|tan) x",html if "On paper, sketch" in html else intro)
    if match:
        return graph_question(html,match[2],int(match[1] or 1))
    equation=re.search(r"Solve \\\((\d*)\\(sin|cos|tan) x(?:\s*([+-]\s*\d+))?=(.*?)\\\)",intro)
    if equation:
        a,kind,b,c=equation.groups()
        target=(number(c)-int((b or "0").replace(" ","")))/int(a or 1)
        return roots_diagram(kind,target)
    return None


TRIG={"sin":sin,"cos":cos,"tan":tan}


def graph(kind, points=(), asymptotes=(), level=None, amplitude=1):
    left,right,axis=45,389,121
    ymax=max(abs(amplitude)+0.3,abs(level or 0)+0.5,3.4 if kind=="tan" else 1)
    norm=lambda x,y:(left+(right-left)*x/360,axis-69*y/ymax)
    body=line((left,axis),(right+4,axis),MUTED) + line((left,201),(left,48),MUTED,arrow=True)
    body+=label(413,axis+5,"x",MUTED)+label(34,45,"y",MUTED)
    body+=label(213,26,f"y = {amplitude if amplitude!=1 else ''}{kind} x")
    for angle in range(0,361,90):
        x=norm(angle,0)[0]
        body+=line((x,axis-4),(x,axis+4),MUTED)+label(x,216,f"{angle}°")
    for height in (-amplitude,amplitude):
        y=norm(0,height)[1]
        body+=line((left-4,y),(left+4,y),MUTED)+label(27,y+5,shown(height),MUTED)
    value=lambda x: amplitude*TRIG[kind](radians(x))
    for run in ((0,89),(91,269),(271,360)) if kind=="tan" else ((0,360),):
        pieces=[]; current=[]
        for angle in range(run[0],run[1]+1):
            y=value(angle)
            if abs(y)<=ymax:
                current.append(norm(angle,y))
            elif current:
                pieces.append(current); current=[]
        pieces.append(current)
        for segment in pieces:
            if segment:
                coords=" ".join(f"{x:.1f},{y:.1f}" for x,y in segment)
                body+=f'<polyline points="{coords}" fill="none" stroke="{BLUE}" stroke-width="2.5"/>'
    marked=set(asymptotes)
    if kind=="tan":
        for angle in (90,270):
            x=norm(angle,0)[0]
            body+=line((x,47),(x,198),TEAL if angle in marked else MUTED,dashed=True)
    if level is not None:
        body+=line(norm(0,level),norm(360,level),TEAL)
    for angle in points:
        x,y=norm(angle,value(angle))
        body+=line((x,axis),(x,y),TEAL,dashed=True)
        body+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{TEAL}"/>'
    text=f"The {kind} graph from 0 to 360 degrees."
    if points:
        text+=" The marked angles are "+", ".join(shown(round(p,1))+" degrees" for p in points)+"."
    if asymptotes:
        text+=" The highlighted vertical asymptote is at "+shown(asymptotes[0])+" degrees."
    return body,text


def angles_at(kind,level):
    if kind=="tan":
        angles=[degrees(atan2(level,1))+180*i for i in range(-1,4)]
    elif kind=="cos":
        t=degrees(acos(level)); angles=[t,360-t]
    else:
        t=degrees(asin(level)); angles=[t,180-t,360+t]
    return tuple(sorted(set(x for x in angles if 0<=x<=360)))


def roots_diagram(kind,target,amplitude=1,only_value=False):
    points=angles_at(kind,target)
    return Drawing(*graph(kind,points,level=target*amplitude,amplitude=amplitude),
                   (target if only_value else points,),solution=True)


def graph_question(html,kind,amplitude):
    if "horizontal line" in html:
        raw=re.search(r"horizontal line \\\(y=(.*?)\\\)",html)
        return roots_diagram(kind,number(raw[1])/amplitude,amplitude,"What value" in html)
    if "On paper, sketch" in html:
        if "first maximum" in html:
            points,ordinate=(90,),1
        elif "first minimum" in html:
            points,ordinate=(180,),-1
        elif "first positive zero" in html:
            points,ordinate=(180,),0
        else:
            points,ordinate=(90,270),0
        return Drawing(*graph(kind,points),(tuple((angle,ordinate) for angle in points),),solution=True)
    given=re.search(r"x=(\d+)\^\\circ",html)
    if given:
        a=int(given[1])
        if kind=="tan" and a%180==90:
            return Drawing(*graph(kind,asymptotes=(a,)),("There is no point",),solution=True)
        value=TRIG[kind](radians(a))
        if "above, on or below" in html:
            answer="On the x-axis" if abs(value)<1e-9 else "Above the x-axis" if value>0 else "Below the x-axis"
            return Drawing(*graph(kind,(a,)),(answer,),solution=True)
        if "vertical coordinate" in html:
            add=re.search(r"find \\\(y\s*\+\s*(\d+)\\\)",html)
            return Drawing(*graph(kind,(a,)),(value+int(add[1]),),solution=True)
        if "given height" in html:
            other=(180-a)%360 if kind=="sin" else 360-a
            return Drawing(*graph(kind,(a,other),level=value),(other,),solution=True)
    if "same finite height" in html:
        a=numbers(html)[0]; other=a%180
        return Drawing(*graph(kind,(a,other),level=tan(radians(a))),(other,),solution=True)
    options={"asymptote":(90,270),"maximum":(90,) if kind=="sin" else (0,360),
             "minimum":(270,) if kind=="sin" else (180,),"axis":(0,180,360) if kind!="cos" else (90,270)}
    matched=next((key for key in options if key in html),None)
    interval=re.search(r"(\d+)\^\\circ(?:\\le|&lt;)\s*x\s*(?:\\le|&lt;)\s*(\d+)\^\\circ",html)
    if matched and interval and "sketch" not in html:
        lo,hi=map(int,interval.groups())
        endpoint,=[x for x in options[matched] if lo<=x<=hi]
        return Drawing(*graph(kind,(endpoint,) if matched!="asymptote" else (),asymptotes=(endpoint,) if matched=="asymptote" else ()),
                       (endpoint,),solution=True)
    return None


def strip(s):
    return re.sub("<[^>]*>", "", s).strip().rstrip(".")


def verify(drawing, expected, prompt):
    expected = strip(expected)
    result, = drawing.answers
    if isinstance(result,str):
        assert result.rstrip(".") == expected, (result,expected,prompt)
        return
    correct = MATH.findall(expected)
    value = correct[0] if correct else expected
    if isinstance(result,tuple):
        if result and isinstance(result[0],tuple):
            coordinates=tuple(tuple(map(int,point)) for point in re.findall(r"\((\d+)\^\\circ\s*,\s*(-?\d+)\)",expected))
            assert coordinates==result,(result,coordinates,prompt)
            return
        values=[number(token) for token in value.replace(r"\{","").replace(r"\}","").strip("{}").split(",")]
        assert len(values)==len(result) and all(abs(a-b)<=0.050001 for a,b in zip(values,result)), (result,values,prompt)
        return
    numeric = number(value)
    if abs(result-numeric)<1e-6:
        return
    if "significant figures" in prompt:
        assert abs(float(f"{result:.3g}")-numeric)<1e-6, (result,numeric,prompt)
    elif "decimal place" in prompt:
        assert abs(round(result,1)-numeric)<1e-6, (result,numeric,prompt)
    else:
        raise AssertionError((result,numeric,prompt))


def append_once(content, markup):
    return re.sub(r'<p><img src="/assets/study/0580/trigonometry/audit-trig-[^"]+"[^>]*></p>',"",content) + markup


def work_parts(prompt):
    marker = '<ol class="parts" type="a">'
    if marker not in prompt:
        return [prompt]
    lead, parts = prompt.split(marker,1)
    pieces = re.split(r"</span></li><li>",parts.removeprefix("<li>"))
    return [lead + piece for piece in pieces]


def revision_drawing(name):
    lesson=name.removeprefix("igcse-0580-trigonometry-")
    if lesson=="pythagoras":
        return Drawing(*right_triangle({"AB":8,"BC":15},None),())
    if lesson=="right-triangle-ratios":
        return Drawing(*right_triangle({"AB":9,"BC":5},None,True),())
    if lesson=="bearings-and-two-dimensions":
        return Drawing(*bearing_ray(None,62),())
    if lesson=="elevation-and-distance":
        return Drawing(*elevation("rise",9,34),())
    if lesson=="cosine-rule-and-area":
        return Drawing(*scalene(8,5,60,{"a":8,"b":5,"C":60}),())
    if lesson=="three-dimensional-trigonometry":
        return solid("angle between a space diagonal and the base plane",(6,8,4))
    return None


def main():
    bank = json.loads((CONTENT/"trigonometry-v1.json").read_text(encoding="utf-8"))
    study_path=CONTENT/"trigonometry-study.json"
    lessons = json.loads(study_path.read_text(encoding="utf-8"))
    displayed = {}
    study_counts={"example":0,"check":0}
    for name,lesson in lessons.items():
        checks = [b for section in lesson["sections"] for b in section["blocks"] if b["kind"]=="check"]
        checks += lesson.get("extraPractice",[])
        for data in lesson["examples"]:
            prompt = data["question"]
            picture = draw(prompt)
            if picture is None:
                continue
            answer = next((step for step in reversed(data["solution"]) if step.startswith("<p>Answer ")),None)
            if answer:
                verify(picture,answer.replace("<p>Answer ","<p>",1),prompt)
            markup = write_drawing(picture)
            if picture.solution:
                data["solution"]=[step for step in data["solution"] if f'src="{PUBLIC}/audit-trig-' not in step] + [markup]
            else:
                data["question"]=append_once(prompt,markup)
            study_counts["example"]+=1
        for data in checks:
            prompt = data["prompt"]
            picture = draw(prompt)
            if picture is None:
                continue
            field=data["field"]
            expected = field.get("options",{}).get(field["expected"],field["expected"])
            verify(picture,expected,prompt)
            key = "solution" if picture.solution else "prompt"
            data[key]=append_once(data[key],write_drawing(picture))
            study_counts["check"]+=1
        revision=revision_drawing(name)
        if revision:
            compact=write_drawing(revision).replace('width="420" height="230"','width="285" height="156"')
            body=lesson["revision"]["body"]
            if compact not in body:
                body=re.sub(r'<p><img src="/assets/study/0580/trigonometry/audit-trig-[^"]+"[^>]*></p>',"",body)
                before,after=body.split("<h2>Worked line</h2>",1)
                before=re.sub(r'<p><img[^>]+src="/assets/study/0580/trigonometry/[^"]+"[^>]*></p>','',before)
                lesson["revision"]["body"]=before+"<h2>Worked line</h2>"+compact+after
    checked_answers=0
    for q in bank["questions"]:
        written = q["collection"]=="exam"
        figures = {"prompt":[],"solution":[]}
        prompts = work_parts(q["prompt_html"])
        answer_html = q["answer_html"]
        answers = re.split(r"<h4>\([a-z]\)</h4>",answer_html)[1:] if written else [answer_html]
        assert len(answers)==len(prompts),q["id"]
        for i,(prompt,expected) in enumerate(zip(prompts,answers)):
            picture = draw(prompt)
            if picture is None:
                continue
            try:
                verify(picture,expected,prompt)
            except (AssertionError,ValueError) as error:
                raise ValueError(f'{q["id"]} ({i+1}): {error}') from error
            checked_answers+=1
            key="solution" if written or picture.solution else "prompt"
            markup=write_drawing(picture)
            if not any(markup in previous for previous in figures[key]):
                part=f"<p><strong>Part ({chr(97+i)})</strong></p>" if written else ""
                figures[key].append(part + markup)
        projection={key:"".join(markup) for key,markup in figures.items() if markup}
        if projection:
            displayed[q["id"]]=projection
    study_path.write_text(json.dumps(lessons,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    (CONTENT/"trigonometry-practice-diagrams.json").write_text(json.dumps(displayed,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"study":study_counts,"bankQuestions":len(displayed),"bankAnswers":checked_answers,
                      "promptProjections":sum("prompt" in r for r in displayed.values()),
                      "solutionProjections":sum("solution" in r for r in displayed.values())}))


if __name__=="__main__":
    main()
