"""Attach original 0862 diagrams to unchanged study and practice data."""
from html import unescape
from math import ceil, cos, radians, sin
import json
import re

from review_0862_visuals import (
    ROOT, BLUE, GREEN, GOLD, GRID, INK, asset, chart, insert, line,
    rect, text, views,
)

def html_rows(prompt, tag):
    cells = []
    for row in re.findall(r"<tr>(.*?)</tr>", prompt, flags=re.S):
        values = [unescape(re.sub(r"<[^>]*>", "", cell)).strip()
                  for cell in re.findall(fr"<{tag}\b[^>]*>(.*?)</{tag}>",row,flags=re.S)]
        if values:
            cells.append(values)
    return cells

def right_limit(values):
    largest = max(values)
    step = 10**(len(str(largest))-1)
    return max(step, ceil(largest/step)*step)

def bar_chart(stage,key,categories,labels,values):
    cap=right_limit([v for row in values for v in row])
    body=line(52,34,52,181)+line(52,181,330,181)
    for tick in (0,cap//2,cap):
        y=181-tick*147/cap
        body+=line(52,y,330,y,GRID,1)+text(46,y+4,tick,"end",size=12)
    colors=(BLUE,GREEN)
    for j,label in enumerate(labels):
        body+=rect(60+j*117,11,13,12,colors[j],colors[j])+text(81+j*117,22,label,"start",size=13)
    slot=278/len(categories)
    for i,label in enumerate(categories):
        mid=52+slot*(i+0.5)
        for j,value in enumerate(values[i]):
            h=147*value/cap
            body+=rect(mid-28+j*29,181-h,26,h,colors[j],colors[j])
        body+=text(mid,204,label,size=13)
    body+=text(175,228,"Attendance")
    alt="Dual bar chart, " + "; ".join(f"{category}: "+", ".join(f"{label} {value}" for label,value in zip(labels,row)) for category,row in zip(categories,values))+"."
    return asset(stage,key,alt,body,241)

def pie(stage,key,total,model,art):
    x,y,r=103,116,77
    a=0
    body=""
    entries=[("Model room",model,BLUE),("Art room",art,GREEN),("Other rooms",total-model-art,GOLD)]
    for i,(label,count,color) in enumerate(entries):
        if count:
            b=a+360*count/total
            p=(x+r*cos(radians(a-90)),y+r*sin(radians(a-90)))
            q=(x+r*cos(radians(b-90)),y+r*sin(radians(b-90)))
            body+=f'<path d="M{x} {y} L{p[0]:g} {p[1]:g} A{r} {r} 0 {int(b-a>180)} 1 {q[0]:g} {q[1]:g} Z" fill="{color}" stroke="#f8fbff" stroke-width="2"/>'
            a=b
        body+=rect(202,65+i*38,12,12,color,color)+text(223,76+i*38,label,"start",size=13)
    alt=f"Pie chart based on {total} visitors. Model room {model}, art room {art} and other rooms {total-model-art}. The angles are not marked."
    return asset(stage,key,alt,body,228)

def parallel(stage,key,value):
    ratio=cos(radians(value))/sin(radians(value))
    x1,y1,y2=229,59,139
    x2=x1-(y2-y1)*ratio
    if not 42<x2<246:
        return None
    body=line(27,y1,331,y1)+line(27,y2,331,y2)+line(max(15,x2-15*ratio),y2+15,min(346,x1+21*ratio),y1-21,BLUE,2.3)
    body+=text(x1+35,y1-10,f"{value}°",color=BLUE)+text(x2+36,y2-9,"?",color=INK)
    body+=text(184,205,"The horizontal lines are parallel.")
    return asset(stage,key,f"Upper-right angle {value} degrees with the corresponding lower-right angle left blank.",body,222)

def visual(stage,key,prompt):
    clean=re.sub(r"<[^>]*>"," ",prompt)
    box=re.search(r"cuboid is (\d+) cm wide across the front, (\d+) cm deep and (\d+) cm high",clean)
    if box:
        return views(stage,key,*map(int,box.groups()))
    turns=re.search(r"angle above the horizontal line on the right of the transversal is (\d+)°",clean)
    if turns:
        return parallel(stage,key,int(turns[1]))
    counts=re.search(r"Out of (\d+) visitors to a museum, (\d+) chose the model room and (\d+) chose the art room",clean)
    if counts:
        total,model,art=map(int,counts.groups())
        return pie(stage,key,total,model,art) if 0<model and model+art<total else None
    heads, rows=html_rows(prompt,"th"),html_rows(prompt,"td")
    if not heads or not rows:
        return None
    if heads[0]==["Activity","Tuesday","Friday"] and all(len(row)==3 and all(v.isdigit() for v in row[1:]) for row in rows):
        return bar_chart(stage,key,[r[0] for r in rows],heads[0][1:],[[int(v) for v in row[1:]] for row in rows])
    if heads[0]==["Time","Water level (cm)"] and all(re.fullmatch(r"\d{1,2}:00",r[0]) and r[1].isdigit() for r in rows):
        points=[(int(x.split(":")[0]),int(y)) for x,y in rows]
        return chart(stage,key,points,"Time (hour)","Water level (cm)",xmin=points[0][0],xmax=points[-1][0],ymax=right_limit([y for _,y in points]),mode="line")
    if len(heads[0])!=2 or not all(len(r)==2 and all(v.isdigit() for v in r) for r in rows):
        return None
    x,y=heads[0]
    points=[tuple(map(int,r)) for r in rows]
    cap=right_limit([v for _,v in points])
    if y=="Visitors" and x=="Week":
        return chart(stage,key,points,x,y,xmin=1,xmax=len(rows),ymax=cap,mode="line")
    if x=="Time (minutes)" and y=="Distance from shelter (m)":
        return chart(stage,key,points,x,y,xmax=points[-1][0],ymax=cap,mode="line",xticks=[a for a,_ in points])
    if x=="Practice time (minutes)" and y=="Number of accurate passes":
        return chart(stage,key,points,x,"Accurate passes",xmax=points[-1][0],ymax=cap,xticks=[a for a,_ in points])
    return None

def main():
    root=ROOT/"content/original/0862"
    bank={}
    for path in sorted(root.glob("stage-*-v1.json")):
        data=json.loads(path.read_text(encoding="utf-8"))
        stage=int(path.name.split("-")[1])
        for q in data["questions"]:
            key=q["id"].lower()
            if not re.fullmatch(r"lower-0862-[a-z0-9-]+",key):
                continue
            if image:=visual(stage,key,q["prompt_html"]):
                bank[q["id"]]={k:v for k,v in image.items() if k!="caption"}
    for stage in (7,8,9):
        path=root/f"stage-{stage}-study.json"
        data=json.loads(path.read_text(encoding="utf-8"))
        for key,lesson in data.items():
            for i,example in enumerate(lesson["examples"]):
                if "<img " not in example["question"] and (figure:=visual(stage,key+f"-worked-{i+1}",example["question"])):
                    example["question"]=insert(example["question"],figure)
            for check in [b for section in lesson["sections"] for b in section["blocks"] if b["kind"]=="check"]+lesson.get("extraPractice",[]):
                if "<img " not in check["prompt"] and (figure:=visual(stage,key+"-"+check["id"],check["prompt"])):
                    check["prompt"]=insert(check["prompt"],figure)
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    (root/"practice-diagrams.json").write_text(json.dumps(bank,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    print(f"{len(bank)} existing practice questions have mathematically matched diagrams.")

if __name__=="__main__":
    main()
