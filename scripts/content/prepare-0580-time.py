"""Generate the Cambridge 0580 C1.15/E1.15 Time teaching package."""
from hashlib import sha256
from html import escape
import json
from math import cos, pi, sin
from pathlib import Path
from runpy import run_path

ROOT = Path(__file__).resolve().parents[2]
common = run_path(str(Path(__file__).with_name("prepare-0580-number-types.py")))
p, m, task, check, line, label, table = (common[k] for k in ("p","m","task","check","line","label","table"))
ratio = run_path(str(Path(__file__).with_name("prepare-0580-ratio-proportion.py")))
number, bank_item = ratio["number"], ratio["bank_item"]


def clock(t):
    h, minute = divmod(t % 1440, 60)
    return f"{h:02d}:{minute:02d}"


def clock_answer(title, prompt, time, method, step, hint):
    display = clock(time)
    final = m(display)
    model = task(title, prompt, "Time (24-hour clock)", display.replace(":",""),
        [method, step, f"The time is {final}."], hint)
    return dict(model, method=method, result=final)


def to_minutes(i):
    h, minute = 1+i%7, 5+i%53
    return number("Convert a duration to minutes",
        f"A school event lasts {h} h {minute} min. Give its duration in minutes.",
        "Duration in minutes",60*h+minute,
        f"Count 60 minutes for each of the {h} full hours, giving {60*h} minutes.",
        f"Add the extra {minute} minutes.","An hour is 60 minutes.",
        (100*h+minute, "Write the hours as groups of 60 minutes before adding the remaining minutes."))


def spare_seconds(i):
    minute, seconds = 2+i, 3+i%49
    total=60*minute+seconds
    return number("Use the remainder when converting seconds",
        f"A clip lasts {total} seconds. After recording all full minutes, how many seconds are left?",
        "Leftover seconds",seconds,
        f"{total} contains {minute} whole groups of 60 seconds.",
        f"Subtract {60*minute} seconds and keep the remainder.",
        "The remainder must be less than 60 seconds.")


def calendar(i):
    week, days = 2+i%11, 1+i%6
    if i%2:
        return number("Change a calendar duration to days",
            f"A challenge lasts {week} weeks and {days} days. How many days does it last?",
            "Duration in days",7*week+days,
            f"Multiply the {week} weeks by 7 days, giving {7*week} days.",
            f"Include the remaining {days} days.", "Convert the weeks before adding.")
    years=1+i%4
    return number("Count full years using the stated convention",
        f"A plan runs for {years} years and {week} days. Use 365 days per year. Give the duration in days.",
        "Duration in days",365*years+week,
        f"Take {years} groups of 365 days.",f"Add {week} days to the {365*years} days.",
        "Use the number of days per year stated in the question.")


def to_24(i):
    h, minute, pm = 1+i%12, 4+i%53, (i//12+i)%2==1
    target = h%12 + (12 if pm else 0)
    guide = ("At midnight the 24-hour hour is 00." if h==12 and not pm else
             "At noon the 24-hour hour is 12." if h==12 else
             "Add 12 to this afternoon hour." if pm else "Keep this morning hour.")
    return clock_answer("Convert a 12-hour reading to 24-hour time",
        f"Write {m(f'{h}:{minute:02d}')} {'p.m.' if pm else 'a.m.'} in 24-hour notation.",
        60*target+minute, guide, f"Keep the minutes at {m(f'{minute:02d}')}.",
        "The minutes are unchanged. Check the time of day before adjusting the hour.")


def to_12(i):
    h, minute = (7*i+12)%24, (12+3*i)%60
    display=f"{h%12 or 12}:{minute:02d}"
    options={"A":f"{display} a.m.","B":f"{display} p.m."}
    key="A" if h<12 else "B"
    method="Hours below 12 are a.m. Hours from 12 onwards are p.m."
    q=task("Convert a 24-hour reading to 12-hour time",
        f"Write {m(clock(60*h+minute))} in 12-hour notation.","12-hour time",key,
        [method,f"The 12-hour reading uses hour {h%12 or 12} with the same minutes.",
        f"The time is {options[key]}."],"Check which side of noon the hour falls in.",kind="choice",options=options)
    return dict(q,method=method,result=options[key])


def hands(i):
    h, minute = 1+i%12, 5*(1+i%11)
    return clock_answer("Read the hour and minute hands",
        f"It is morning. An analogue clock's minute hand points to {minute//5}. Its hour hand has passed {h} and has not reached {h%12+1}. Write the time in 24-hour notation.",
        (h%12)*60+minute,
        f"Count {minute//5} groups of five minutes to get {minute} minutes.",
        f"Use the hour just passed, {h}. Between midnight and 1 a.m. the hour is written 00.",
        "The short hand shows the hour just passed. The long hand's numbers count in fives.")


def elapsed(i):
    start=(21+i%3)*60+18+i%33
    to_hour=60-start%60
    duration=to_hour+6+i%51
    end=start+duration
    next_day=" the next day" if end>=1440 else ""
    return number("Count forward between two clock readings",
        f"A session starts at {m(clock(start))} and finishes at {m(clock(end))}{next_day}. Give the duration in minutes.",
        "Duration in minutes",duration,
        f"Count from {m(clock(start))} to {m(clock(start+to_hour))}: {to_hour} minutes.",
        f"Then count {duration-to_hour} more minutes to {m(clock(end))}. Add both jumps.",
        "Count through the next whole hour. At midnight reset the clock to 00:00.")


def move(i, back=False):
    t=(19+i%5)*60+12+i%42
    duration=21+2*i
    stop=t+(-duration if back else duration)
    action="subtract" if back else "add"
    prompt=(f"A workshop must finish at {m(clock(t))}. It lasts {duration} minutes. Give its start time in 24-hour notation." if back else
            f"An observation begins at {m(clock(t))} and lasts {duration} minutes. Give its finish time in 24-hour notation.")
    return clock_answer("Find the start time" if back else "Find the finish time",
        prompt, stop, f"Convert {m(clock(t))} to {t} minutes after midnight. Then {action} the {duration} minutes.",
        f"Convert the result back to hours and minutes, moving to the next day if the result reaches 1440 minutes.",
        f"Work from the given time and {action} the whole duration.")


def transit(i, find_departure=False):
    first=8*60+2+i%40
    gap, leg1, leg2=19+i%8,13+i%9,9+i%5
    rows=[["Museum",*[clock(first+j*gap) for j in range(3)]],
          ["Square",*[clock(first+j*gap+leg1) for j in range(3)]],
          ["Library",*[clock(first+j*gap+leg1+leg2) for j in range(3)]]]
    if find_departure:
        cutoff=first+gap+leg1+leg2+1
        q=clock_answer("Find the last service before a deadline",
            f"What is the latest departure time from the Museum that reaches the Library by {m(clock(cutoff))}? Use 24-hour notation.",
            first+gap, "Read along the Library row. Service C arrives after the deadline.",
            "Follow the column for service B back to the Museum row.","Choose the service from its arrival, then read its departure.")
    else:
        q=number("Compare two times in one timetable column",
            "How many minutes does service C take from the Museum to the Square?","Duration in minutes",leg1,
            f"Read column C from {m(rows[0][3])} to {m(rows[1][3])}.",
            "Count the minutes between these times.","Keep both times in the same column.")
    q["prompt"]=table(["Stop","A","B","C"],rows)+q["prompt"]
    return q


def local_time(i):
    start=(2+i%18)*60+12+i%42
    delta=90+30*(i%9)
    ahead = i%2==0
    word = "ahead of" if ahead else "behind"
    return clock_answer("Apply a fixed time-zone difference",
        f"Town B is {delta} minutes {word} Town A. It is {m(clock(start))} in Town A. Find the local time in Town B, in 24-hour notation.",
        start+(delta if ahead else -delta),f"{word.capitalize()} means {'add' if ahead else 'subtract'} the time difference.",
        "If the calculation crosses midnight, continue reading the other day's clock.",
        "Use the stated direction between the clocks. The difference is not a journey duration.")



LESSONS = [
    ("units","Time units and durations","Convert between seconds, minutes, hours and calendar units.",[
        ("minutes","How many minutes make up the duration?","Separate the complete hours from the leftover minutes. Count 60 minutes per hour.",
         "Multiply the hours by 60 and add the extra minutes.",
         "The two parts of a duration are in different units.",to_minutes,"hours"),
        ("seconds","What remains after whole minutes?","Group seconds in lots of 60. Each full group is one minute.",
         "Keep the number of whole groups and the leftover seconds.",
         "The decimal digits of a number of minutes do not tell you the seconds.",spare_seconds,None),
        ("days","How are days, weeks, months and years related?","There are 7 days in a week and 12 months in a year. Use 365 days when the question treats a year as 365 days.",
         "Use the given number of days in a month or read it from a calendar.",
         "The months have different lengths.",calendar,None)]),
    ("clocks","12-hour, 24-hour and analogue clocks","Convert between clock systems and read the hour and minute hands.",[
        ("to24","What time is noon or midnight?","The 24-hour clock starts at 00:00. Noon is 12:00. Afternoon times after 12:59 have hour 13 or later.",
         "Convert the hour using a.m. or p.m. Keep the minutes the same.",
         "The hour for 12 a.m. becomes 00. The hour for 12 p.m. stays at 12.",to_24,None),
        ("to12","When should I write a.m. or p.m.?","The 12-hour clock names the half-day. A time from noon onwards uses p.m.",
         "If the 24-hour hour is 13 or more, subtract 12. Read hour 00 as 12 a.m.",
         "Write both the digits and the a.m. or p.m. label.",to_12,None),
        ("hands","Which hand tells me the minutes?","The long hand indicates minutes. It takes five minutes to move from one big number to the next.",
         "Read the hour just passed by the short hand. Count the long hand in fives. At the top the minutes are zero.",
         "At half past the hour the short hand is halfway to the next number.",hands,"clock")]),
    ("elapsed","Elapsed time and crossing midnight","Find durations and count forwards or backwards on a 24-hour clock.",[
        ("between","How long passes between two readings?","Draw a timeline. Jump to the next whole hour, then onwards to the finish.",
         "Add the lengths of the jumps. Continue from 00:00 when crossing midnight.",
         "The digits on a clock do not form a decimal number.",elapsed,"midnight"),
        ("finish","How can I find the finish time?","Start at the given time and add the duration. When the minute count reaches 60, make a new hour.",
         "Count forward. After 23:59 the next minute is 00:00 the next day.",
         "Count minutes on the clock in groups of 60.",move,None),
        ("start","How can I find an earlier start time?","Start with the finish and count the duration backwards. If it helps, make jumps to a whole hour.",
         "Subtract the whole duration. Regroup one hour as 60 minutes when needed.",
         "Adding a duration to the finish tells you a later time.",lambda s:move(s,True),None)]),
    ("timetables","Timetables and time zones","Read a timetable, choose a service and use a fixed local-time offset.",[
        ("deadline","Which service arrives before the deadline?","Find the row for the destination, then pick the latest acceptable time. Follow that column back to the start.",
         "The same column shows all the times for one service.",
         "A later departure is useful only if its arrival still meets the deadline.",lambda s:transit(s,True),"services"),
        ("journey","How long does the journey take?","Read two times from the same service. Check which stop each time belongs to.",
         "Find the duration between the two times using jumps.",
         "Moving to another column chooses another service.",transit,None),
        ("zone","Which way does a local-time difference go?","When a place is ahead, its clock is later. When it is behind, its clock is earlier.",
         "Add or subtract the offset. Change the day if your result crosses midnight.",
         "A local-time offset is a difference between clocks. A journey duration is a different quantity.",local_time,None)]),
]


def figures():
    folder=ROOT/"public/assets/study/0580/time"
    folder.mkdir(parents=True,exist_ok=True)
    navy,green="#243f61","#126758"
    face='<circle cx="200" cy="64" r="52" fill="#eff5fb" stroke="#243f61" stroke-width="2"/>'
    for j in range(12):
        angle=j*pi/6
        face+=label(round(200+40*sin(angle)),round(69-40*cos(angle)),str(j or 12))
    face+=line(200,64,200,32,green)+line(200,64,221,64,navy)
    def timeline(xs,names,spans):
        result=line(35,66,365,66,navy)
        for x,name in zip(xs,names):
            result+=line(x,60,x,74,navy)+label(x,99,name)
        for left,right,text in zip(xs,xs[1:],spans):
            result+=line(left,48,right,48,green)+label((left+right)//2,34,text)
        return result
    raw={
        "hours":("A timeline covering two hours and a further half hour.",
            timeline([47,167,287,347],["0 min","60 min","120 min","150 min"],["60 min","60 min","30 min"]),
            "Two hours and 30 minutes add to 150 minutes."),
        "clock":("Clock with its long hand towards twelve and its short hand towards three.",
            face,"The minute hand is at zero minutes. The short hand shows three o'clock."),
        "midnight":("Timeline from 23:44 through midnight to 00:27.",
            timeline([54,166,355],["23:44","00:00","00:27"],["16 min","27 min"]),
            "Count 16 minutes to midnight, then another 27 minutes."),
        "services":("Three service columns, with service B highlighted from top to bottom.",
            '<rect x="181" y="16" width="45" height="95" rx="7" fill="#bce1d6"/>'+
            "".join(label(x,37,text) for x,text in [(145,"A"),(203,"B"),(262,"C")])+
            line(203,50,203,93,green)+line(203,93,197,85,green)+line(203,93,209,85,green)+label(81,59,"Start")+label(81,93,"Finish"),
            "Read down the chosen service column when you compare stops."),
    }
    assets={}
    for name,(alt,body,caption) in raw.items():
        image=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 124" role="img" aria-labelledby="title">'
            f'<title id="title">{escape(alt)}</title><rect width="400" height="124" rx="10" fill="white"/>{body}</svg>\n')
        (folder/f"{name}.svg").write_text(image,encoding="utf-8")
        assets[name]=dict(src=f"/assets/study/0580/time/{name}.svg",alt=alt,caption=p(caption),width=400,height=124)
    return assets


def build():
    diagrams=figures()
    study,lessons,tasks={},[],[]
    for key,title,summary,methods in LESSONS:
        id=f"igcse-0580-time-{key}"
        sections,examples,extra=[],[],[]
        for j,(anchor,heading,intro,idea,mistake,gen,figure) in enumerate(methods):
            first=len(examples)
            for i in (j+2,j+6):
                q=gen(i)
                examples.append(dict(title=q["title"],question=q["prompt"],solution=q["steps"]))
            blocks=[dict(kind="key",html=p(idea),**({"figure":diagrams[figure]} if figure else {})),
                dict(kind="example",index=first),check(f"{id}-{anchor}-one",gen(j+10)),dict(kind="mistake",html=p(mistake)),
                dict(kind="example",index=first+1,tryFirst=True),check(f"{id}-{anchor}-two",gen(j+13))]
            if key=="clocks" and j==0:
                blocks.insert(1,dict(kind="tip",html=table(["Name","24-hour time"],[["Midnight","00:00"],["Noon","12:00"],["4:15 p.m.","16:15"]])))
            sections.append(dict(id=anchor,title=heading,label=anchor.capitalize(),minutes=7,level="core",intro=p(intro),blocks=blocks))
            extra.extend(check(f"{id}-{anchor}-extra-{n+1}",gen(18+2*j+n)) for n in range(2))
        figure=next(diagrams[r[-1]] for r in methods if r[-1])
        recap="".join(f"<h2>{r[1]}</h2>"+p(r[3]) for r in methods)
        recap+=f'<p><img width="250" src="{figure["src"]}" alt="{escape(figure["alt"],quote=True)}"></p>'
        samples=[m[-2](i+3) for i,m in enumerate(methods[:2])] if key!="timetables" else [local_time(4)]
        checks="<ol>"+"".join(f"<li>{q['prompt']}<p><strong>Answer.</strong> {q['result']}</p></li>" for q in samples)+"</ol>"
        study[id]=dict(updatedOn="2026-11-22",description=summary,examples=examples,sections=sections,extraPractice=extra,
            revision=dict(body=recap,checks=checks,examTip=p(methods[-1][4])),
            glossary=[dict(term=name,definition=p(detail)) for name,detail in (
                ("Elapsed time","The time between the start and finish of an event."),
                ("Midnight","The start of a new day, 00:00 on the 24-hour clock."),
                ("Local time","The time shown by clocks in a given place."))])
        if lessons:
            prev=lessons[-1]
            study[id]["related"]=[dict(title=prev["title"],href=f"/courses/maths4u-0580/topics/{prev['id']}")]
        lessons.append(dict(id=id,key=key,title=title,summary=summary,objective=summary,before=p("Recall how many minutes there are in one hour."),
            ideas="".join(p(r[3]) for r in methods),method="".join(f"<h4>{r[1]}</h4>"+p(r[2]) for r in methods),
            mistakes=[r[4] for r in methods],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                 verification=f"{id}-example-{i+1}") for i,e in enumerate(examples[::2])]))
        gens=[r[-2] for r in methods]
        for j,(first,second) in enumerate(((0,1),(1,2),(2,0),(0,2),(2,1))):
            family=f"{id}-P{j+1}"
            tasks.extend(bank_item(f"{family}-{v}",family,key,[gens[first](28+4*j+2*v)]) for v in range(2))
            family=f"{id}-E{j+1}"
            for v in range(4):
                seed=58+24*j+2*v
                tasks.append(bank_item(f"{family}-{v}",family,key,[gens[first](seed),gens[second](seed+10)],v))
    pack=dict(schema_version=1,key="0580-number-time",version="1.0.0",
        course=dict(slug="maths4u-0580",title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_number_time",slug="time",title="Time",position=14),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lessons,questions=tasks,marking_status="DRAFT")
    for suffix,content in [("v1",pack),("study",study)]:
        (ROOT/"content/original/0580"/f"time-{suffix}.json").write_text(json.dumps(content,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lessons)} lessons; {len(tasks)} questions; {len(diagrams)} diagrams")


if __name__=="__main__":
    build()
