"""Independent equations-of-impact audit of models, printed TeX and complete fields."""
import argparse
import hashlib
import html
import json
import re
from pathlib import Path
import sympy as s
from sympy.parsing.latex import parse_latex
from mechanics_momentum_teaching import lessons, models, questions, quick_models

ap=argparse.ArgumentParser()
ap.add_argument('--report',default='.local/c5-mechanics-momentum-20261107/teaching/math-checks.json')
args=ap.parse_args()
checks=[]
failures=[]
parsed=0

def check(value,label):
    checks.append(label)
    if not bool(value):
        failures.append(label)
        print('FAILED '+label,flush=True)

def equal(a,b):
    return s.simplify(a-b)==0

def V(value):
    return s.sympify(value)

def direct(a,b,u,w,e):
    va,vb=s.symbols('va vb')
    result=s.solve([a*(va-u)+b*(vb-w),vb-va-e*(u-w)],(va,vb))
    check(a>0 and b>0 and 0<=e<=1 and u>w,'Physical approaching direct contact')
    A,B=result[va],result[vb]
    energy=s.expand((a*u*u+b*w*w-a*A*A-b*B*B)/2)
    check(energy>=0,'Non-negative pair energy loss')
    check(B-A>=0,'Non-negative normal separation')
    return A,B,energy

def wall(m,ux,uy,nx,ny,e):
    vx,vy=s.symbols('vx vy')
    un=ux*nx+uy*ny
    tx,ty=-ny,nx
    check(nx*nx+ny*ny==1 and m>0 and un<0 and 0<=e<=1,'Wall unit normal and approaching physical state')
    result=s.solve([vx*nx+vy*ny+e*un,(vx-ux)*tx+(vy-uy)*ty],(vx,vy))
    x,y=result[vx],result[vy]
    Jx,Jy=m*(x-ux),m*(y-uy)
    energy=s.expand(m*(ux*ux+uy*uy-x*x-y*y)/2)
    check(s.simplify(Jx*tx+Jy*ty)==0,'Zero tangential impulse')
    check(energy>=0,'Non-negative wall energy loss')
    return dict(vx=x,vy=y,Jx=Jx,Jy=Jy,speed=s.sqrt(x*x+y*y),lost=energy)

def derive(kind,p):
    if kind=='vector_impulse':
        Jx=p['m']*(p['vx']-p['ux']);Jy=p['m']*(p['vy']-p['uy'])
        return dict(Jx=Jx,Jy=Jy,J=s.sqrt(Jx*Jx+Jy*Jy),Fx=Jx/p['dt'],Fy=Jy/p['dt'])
    if kind in ['direct_impact','energy_transfer']:
        a,b,u,w,e=[p[k]for k in ['a','b','u','w','e']]
        va,vb,lost=direct(a,b,u,w,e)
        out=dict(va=va,vb=vb,Ja=a*(va-u),lost=lost)
        if kind=='energy_transfer':
            La=a*(u*u-va*va)/2;Gb=b*(vb*vb-w*w)/2
            check(La>0 and Gb>0,'Individual gain and loss retain correct signs')
            out.update(lossA=La,gainB=Gb,ratio=La/Gb)
        return out
    if kind=='stop_observation':
        e,vb=s.symbols('e vb');a,b,u=p['a'],p['b'],p['u']
        r=s.solve([b*vb-a*u,vb-e*u],(e,vb))
        check(0<=r[e]<=1,'Stopping restitution is physical')
        return dict(e=r[e],vb=r[vb])
    if kind=='impulse_given':
        return dict(vx=p['ux']+p['Jx']/p['m'],vy=p['uy']+p['Jy']/p['m'],Fx=p['Jx']/p['dt'],Fy=p['Jy']/p['dt'])
    if kind=='rebound_inverse':
        e,vb=s.symbols('e vb');a,b,u,va=[p[k]for k in ['a','b','u','observed']]
        r=s.solve([a*va+b*vb-a*u,vb-va-e*u],(e,vb));threshold=a/b
        check(va<0 and 0<=r[e]<=1 and 0<threshold<1,'Observed rebound and full physical interval')
        return dict(interval='('+str(threshold)+',1]',e=r[e],vb=r[vb])
    if kind=='wall_axis':return wall(p['m'],p['ux'],p['uy'],s.S.One,s.S.Zero,p['e'])
    if kind=='wall_tilt':return wall(*[p[k]for k in ['m','ux','uy','nx','ny','e']])
    if kind=='wall_inverse_speed':
        e=s.symbols('e');roots=s.solve(s.Eq(p['ux']**2*e**2+p['uy']**2,p['speed2']),e)
        roots=[v for v in roots if 0<=v<=1];check(len(roots)==1,'Unique physical inverse wall restitution')
        out=wall(p['m'],p['ux'],p['uy'],s.S.One,s.S.Zero,roots[0]);out.update(e=roots[0],tanBeta=out['vx']/abs(out['vy']))
        return out
    if kind=='ground_flight':
        w=p['e']*p['down'];t=s.symbols('t',real=True);y=w*t-p['g']*t*t/2
        positive=[v for v in s.solve(y,t) if v>0];check(len(positive)==1,'Unique next positive ground contact')
        apex=s.solve(s.diff(y,t),t)[0]
        check(0<apex<positive[0],'Apex occurs within next flight')
        return dict(vx=p['ux'],vy=w,time=positive[0],height=y.subs(t,apex),range=p['ux']*positive[0],Jy=p['m']*(w+p['down']))
    if kind=='sphere_axis':
        va,vb,lost=direct(p['a'],p['b'],p['ux'],p['wx'],p['e'])
        return dict(vax=va,vay=p['uy'],vbx=vb,vby=p['wy'],Ja=p['a']*(va-p['ux']),lost=lost)
    if kind=='sphere_tilt':
        a,b,nx,ny,un,ut,wn,wt,e=[p[k]for k in ['a','b','nx','ny','un','ut','wn','wt','e']]
        tx,ty=-ny,nx;ax,ay=un*nx+ut*tx,un*ny+ut*ty;bx,by=wn*nx+wt*tx,wn*ny+wt*ty
        X,Y,Z,W=s.symbols('X Y Z W')
        r=s.solve([(X-ax)*tx+(Y-ay)*ty,(Z-bx)*tx+(W-by)*ty,a*(X*nx+Y*ny-un)+b*(Z*nx+W*ny-wn),(Z-X)*nx+(W-Y)*ny-e*(un-wn)],(X,Y,Z,W))
        check(un>wn and nx*nx+ny*ny==1 and 0<=e<=1,'Approaching oblique sphere contact with unit normal')
        Jx,Jy=a*(r[X]-ax),a*(r[Y]-ay)
        check(s.simplify(Jx+b*(r[Z]-bx))==0 and s.simplify(Jy+b*(r[W]-by))==0,'Equal and opposite oblique impulses')
        energy=s.expand((a*(ax*ax+ay*ay-r[X]**2-r[Y]**2)+b*(bx*bx+by*by-r[Z]**2-r[W]**2))/2)
        check(energy>=0,'Non-negative oblique energy loss')
        return dict(vax=r[X],vay=r[Y],vbx=r[Z],vby=r[W],J=s.sqrt(Jx*Jx+Jy*Jy),lost=energy)
    if kind=='sphere_perpendicular':
        A,B,e=s.symbols('A B e');U,h=p['U'],p['h']
        roots=s.solve([A+B-U,B-A-e*U,A*B-h*h],(A,B,e),dict=True);valid=[r for r in roots if 0<=r[e]<=1]
        check(len(valid)==1,'Unique admissible perpendicular-path restitution')
        r=valid[0];check(r[A]*r[B]-h*h==0,'Whole outgoing velocity vectors perpendicular')
        return dict(e=r[e],vax=r[A],vay=h,vbx=r[B],vby=-h,lost=(U*U-r[A]**2-r[B]**2)/2)
    if kind=='three_chain':
        a,b,_=direct(s.S.One,s.S.One,p['U'],s.S.Zero,p['e1']);time=p['d']/b
        bb,c,_=direct(s.S.One,s.S.One,b,s.S.Zero,p['e2']);gap=p['d']-a*time
        check(time>0 and gap>0,'B reaches C after a positive time with A still behind')
        check(a<=bb and bb<=c,'No subsequent pair can close its existing gap')
        return dict(time=time,position=p['d'],va=a,vb=bb,vc=c,gap=gap)
    if kind=='wall_recollision':
        a,b,L,ew,ep=[p[k]for k in ['a','b','L','ew','ep']];tw=L/b
        t=s.symbols('t');T=s.solve(s.Eq(a*t,L-ew*b*(t-tw)),t)[0]
        check(0<tw<T<L/a,'Wall is first and recontact precedes A reaching the wall')
        va,vb,_=direct(s.S.One,s.S.One,a,-ew*b,ep)
        return dict(twall=tw,time=T,position=a*T,va=va,vb=vb)
    if kind in ['drop_bounces','ground_bounces']:
        e,g=p['e'],p['g'];check(0<e<1 and g>0,'Convergent idealised rebound model')
        n=s.symbols('n',integer=True,nonnegative=True)
        if kind=='drop_bounces':
            h=p['h'];U=s.sqrt(2*g*h);w=e*U
            time=U/g+s.summation(2*w*e**n/g,(n,0,s.oo));distance=h+s.summation(w*w*e**(2*n)/g,(n,0,s.oo))
            return dict(time=s.simplify(time),distance=s.simplify(distance))
        w=p['w'];after=w*e**p['n']
        return dict(time=s.simplify(s.summation(2*w*e**n/g,(n,0,s.oo))),distance=s.simplify(s.summation(w*w*e**(2*n)/g,(n,0,s.oo))),after=after,height=after*after/(2*g))
    if kind=='two_walls':
        m,ux,uy,Lx,Ly,ex,ey=[p[k]for k in ['m','ux','uy','Lx','Ly','ex','ey']]
        tx,ty=Lx/ux,Ly/uy;check(0<ty<tx,'Distinct horizontal-then-vertical contacts')
        x,y=Lx,Ly-ey*uy*(tx-ty);vx,vy=-ex*ux,-ey*uy
        check(y<Ly,'Second contact lies below the first wall, away from corner')
        return dict(first=ty,second=tx,x=x,y=y,vx=vx,vy=vy,Jx=m*(vx-ux),Jy=m*(vy-uy),lost=m*(ux*ux+uy*uy-vx*vx-vy*vy)/2)
    raise ValueError('Unknown independent model '+kind)

def numeric_tex(text,label):
    global parsed
    value=parse_latex(text,strict=True)
    check(not value.free_symbols,label+' numerical printed expression')
    parsed+=1
    return value

example_index={e['verification']:e for l in lessons for e in l['examples']}
for model in models:
    uid=model['id'];ex=example_index[uid];inputs={k:V(v)for k,v in model['inputs'].items()};independent=derive(model['kind'],inputs)
    blocks=re.findall(r'\\\[\\begin\{gathered\}(.*?)\\end\{gathered\}\\\]',ex['solution'],re.S)
    check(bool(blocks),uid+' explicit final displayed results')
    rows=blocks[-1].split(r'\\');printed={row.split('=',1)[0]:row.split('=',1)[1]for row in rows}
    check(len(printed)==len(model['expected']),uid+' all claimed outputs are printed')
    for key,wanted in model['expected'].items():
        check(key in independent,uid+' independent output '+key)
        check(equal(V(wanted),independent[key]),uid+' stored model '+key)
        label=model['labels'][key];check(label in printed,uid+' named printed output '+key)
        check(equal(numeric_tex(printed[label],uid+' '+key),independent[key]),uid+' actual TeX '+key)
    check(not any(ord(c)<32 and c not in '\n\r\t' for c in ex['solution']),uid+' no control-character escapes')

logic_answers={'D41':'B','D42':'C','F41':'D','F42':'A','B41':'B','B42':'C','C41':'A','C42':'D'}
qindex={q['id']:q for q in questions}
for model in quick_models:
    uid=model['uid'];q=qindex[uid];kind=model['model']['kind']
    if kind=='logic':
        wanted=logic_answers[uid.removeprefix('M4U-9231-MMOM-')];field=q['fields'][0]
        check(field['expected']==wanted and wanted in field['options'],uid+' independently reviewed conceptual option')
        check(len(set(field['options'].values()))==4,uid+' distinct options')
        check(html.escape(field['options'][wanted]) in q['answer_html'],uid+' printed correct option')
        continue
    p={k:V(v)for k,v in model['model']['inputs'].items()};independent=derive(kind,p)
    spans=re.findall(r'\\\((.*?)\\\)',q['answer_html'],re.S);check(len(spans)==len(q['fields']),uid+' each full field has a displayed answer')
    for field,printed in zip(q['fields'],spans):
        key=field['key'];check(key in independent,uid+' independently derived field '+key)
        if field['type']=='set':
            check(field['expected']==independent[key],uid+' complete physical interval')
            text=printed.replace(r'\left','').replace(r'\right','');parts=text[1:-1].split(',')
            expected=independent[key];endpoints=expected[1:-1].split(',')
            check(text[0]==expected[0] and text[-1]==expected[-1],uid+' printed strict/closed endpoints')
            for val,endpoint in zip(parts,endpoints):check(equal(numeric_tex(val,uid+' endpoint'),V(endpoint)),uid+' printed interval endpoint')
        else:
            check(equal(V(field['expected']),independent[key]),uid+' stored complete answer '+key)
            check(equal(numeric_tex(printed,uid+' '+key),independent[key]),uid+' printed exact answer '+key)
    check(sum(c['marks']for p in q['parts']for c in p['marking_criteria'])==q['marks']==len(q['fields']),uid+' marks match all requested fields')

# Independently verify general identities used by the notes.
a,b,u,w,e=s.symbols('a b u w e',positive=True)
va,vb=s.symbols('va vb');r=s.solve([a*(va-u)+b*(vb-w),vb-va-e*(u-w)],(va,vb))
energy=s.expand((a*u*u+b*w*w-a*r[va]**2-b*r[vb]**2)/2)
check(equal(energy,a*b*(1-e*e)*(u-w)**2/(2*(a+b))),'General reduced-mass energy-loss identity')
check(equal(r[vb]-r[va],e*(u-w)),'General signed restitution identity')
normal,tangent=s.symbols('normal tangent',real=True);m=s.symbols('m',positive=True)
check(equal(m*(normal**2+tangent**2-e**2*normal**2-tangent**2)/2,m*(1-e**2)*normal**2/2),'Smooth-wall normal-only energy-loss identity')
check('normal momentum is not conserved' in lessons[0]['ideas'] and 'fixed support supplies the impulse' in lessons[1]['ideas'],'Notes explicitly reject fixed-wall normal momentum conservation')
check('positive masses' in lessons[2]['ideas'],'Positive sphere masses condition')
check('simultaneous' in lessons[1]['ideas'].lower() and 'Simultaneous' in lessons[3]['ideas'],'Simultaneous contacts explicitly outside sequential model')
for lesson in lessons:
    key=lesson['key'];qs=[q for q in questions if q['lesson']==key]
    check(len(lesson['examples'])==4 and len(qs)==8,key+' complete lesson size')
    check(sum(q['fields'][0]['type']=='choice' for q in qs)==2,key+' six short and two multiple-choice checks')
    check(not re.search('AI.assist|teacher review|Maths4U Original',str(lesson),re.I),key+' no editorial status in public copy')
    for family in set(q['family_uid']for q in qs):
        members=[q for q in qs if q['family_uid']==family]
        check(len(members)==2 and {q['collection']for q in members}=={'short','variant'},key+' paired fresh family '+family)
        check(members[0]['prompt_html']!=members[1]['prompt_html'],key+' non-identical fresh prompt '+family)

# The independently checked mathematical text must be the text actually shipped.
repo=Path(__file__).resolve().parents[2]
pack=json.loads((repo/'content/original/9231-mechanics/momentum-v1.json').read_text(encoding='utf8'))
fixture=json.loads((repo/'content/original/9231-mechanics/momentum-verification-v1.json').read_text(encoding='utf8'))
def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
check(pack['lessons']==lessons,'Shipped lesson text matches independently checked generator')
check([q for q in pack['questions'] if q['collection']!='exam']==questions,'Shipped quick checks match independently checked generator')
for model in fixture['quick']:
    check(model['contentSha256']==digest(next(q for q in pack['questions'] if q['id']==model['uid'])),'Quick content digest '+model['uid'])
for model in fixture['examples']:
    check(model['contentSha256']==digest(next(e for l in pack['lessons'] for e in l['examples'] if e['verification']==model['id'])),'Example content digest '+model['id'])
report={'examples':len(models),'quickChecks':len(quick_models),'numericalQuickChecks':sum(m['model']['kind']!='logic'for m in quick_models),'conceptualQuickChecks':len(logic_answers),'checks':len(checks),'actualPrintedNumericExpressionsParsed':parsed,'failures':failures,'result':'passed'if not failures else 'failed'}
path=Path(args.report);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
if failures:raise SystemExit(1)
