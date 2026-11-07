"""Read-only independent audit of all 39 supplied Momentum tasks."""
from pathlib import Path
import argparse,ast,collections,hashlib,html,json,re
from functools import lru_cache
import sympy as s
from sympy.parsing.latex import parse_latex
from sympy.core.function import AppliedUndef

ap=argparse.ArgumentParser(description=__doc__)
ap.add_argument('--source',help='Optional untouched owner JSON; not required in CI')
ap.add_argument('--report',default='docs/ARENA-C5-MECHANICS-MOMENTUM-MATH-CHECKS-20261107.json')
args=ap.parse_args()
repo=Path(__file__).resolve().parents[2]
package=json.loads((repo/'content/original/9231-mechanics/momentum-v1.json').read_text(encoding='utf8'))
fixtures=json.loads((repo/'content/original/9231-mechanics/momentum-verification-v1.json').read_text(encoding='utf8'))
source_sha='bc9e214ef41836a25aff74046af5f1dee79f515244623d847d18a43685e4c8e1'
source=Path(args.source) if args.source else None
owner=fixtures['owner']
data={'question_count':39,'part_count':91,'total_marks':307}
tasks=sorted([row['original'] for row in owner],key=lambda q:q['bank_number'])
qmap={q['bank_number']:q for q in tasks}
R=s.Rational
m,u,k,e,d,U=s.symbols('m u k e d U',positive=True)
theta,alpha,beta=s.symbols('theta alpha beta',real=True)
loc={v.name:v for v in [m,u,k,e,d,U,theta,alpha,beta]}
checks=[];failures=[];part_coverage=set();active='structure';printed=0;notes=[]
def check(ok,label):
 result={'question':active,'label':label,'passed':bool(ok)};checks.append(result)
 if not result['passed']:failures.append(result);print('FAILED',active,label,flush=True)
def eq(a,b,label):check(s.simplify(s.trigsimp(s.sympify(a)-s.sympify(b)))==0,label)
def collide(ma,mb,ua,ub,rest):
 va=s.factor(((ma-rest*mb)*ua+(1+rest)*mb*ub)/(ma+mb));vb=s.factor(((mb-rest*ma)*ub+(1+rest)*ma*ua)/(ma+mb))
 eq(ma*ua+mb*ub,ma*va+mb*vb,'Conservation of signed normal momentum')
 eq(vb-va,rest*(ua-ub),'Restitution along normal')
 loss=s.factor((ma*ua**2+mb*ub**2-ma*va**2-mb*vb**2)/2)
 eq(loss,ma*mb/(2*(ma+mb))*(1-rest**2)*(ua-ub)**2,'Independent reduced-mass energy identity')
 return va,vb,loss

# Reuse only the mechanical TeX atom normaliser, never earlier task models.
tree=ast.parse((repo/'scripts/content/verify-mechanics-variable.py').read_text(encoding='utf8'))
node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='normalise_tex')
exec(compile(ast.Module(body=[node],type_ignores=[]),'normalise_tex','exec'))
def tex(raw):
 raw=normalise_tex(raw.strip().strip('.,; ')).replace('[','(').replace(']',')').replace(r'\,',' ').replace('\\ ',' ').replace(r'\%','')
 while (pos:=raw.find(r'\mathrm{'))>=0:
  depth=1;end=pos+8
  while depth:depth+=(raw[end]=='{')-(raw[end]=='}');end+=1
  raw=raw[:pos]+raw[end:]
 raw=re.sub(r'\\mathrm\{[^}]*\}|\\mathrm\s+[A-Za-z]|\\hbox\{[^}]*\}|\\text\{[^}]*\}','',raw)
 raw=re.sub(r'(\\(?:sin|cos|tan))\s*(\\(?:alpha|beta|theta))',lambda z:z[1]+'('+z[2]+')',raw)
 value=parse_latex(raw,strict=True)
 for atom in value.atoms(AppliedUndef):
  if atom.func.__name__ in loc:value=value.xreplace({atom:loc[atom.func.__name__]*s.prod(atom.args)})
 return value.xreplace({v:loc.get(v.name,v) for v in value.free_symbols})
@lru_cache(None)
def candidates(raw):
 out=[]
 for first,second in re.findall(r'\\\((.*?)\\\)|\\\[(.*?)\\\]',html.unescape(raw),re.S):
  block=(first or second).replace(r'\left','').replace(r'\right','')
  for segment in re.split(r'\\q(?:q)?uad|=|\\(?:lt|gt|leq|geq|le|ge)(?![A-Za-z])|<|>',block):
   segment=segment.strip().strip('.,; ')
   # Extract the components of a displayed vector/tuple as well as its whole form.
   values=[segment]
   if segment.startswith('(') and segment.endswith(')'):values+=segment[1:-1].split(',')
   values+=segment.split(',')
   for value in values:
    value=re.sub(r'\\approx.*$','',value).strip()
    if re.fullmatch(r'\d+\s*:\s*\d+',value):
     aa,bb=map(int,value.split(':'));out.append(R(aa,bb));continue
    if not value or '^\\circ' in value or r'\tan^{-1}' in value:continue
    try:out.append(tex(value))
    except Exception:pass
 return out
def C(n,part,*values):
 global printed
 part_coverage.add((n,part));raw=qmap[n]['parts'][part]['answer_html'];items=candidates(raw)
 for value in values:
  printed+=1;value=s.sympify(value)
  check(any(s.simplify(s.trigsimp(item-value))==0 for item in items),'Printed answer part '+str(part+1)+' contains '+str(value))
def word(n,part,*texts):
 part_coverage.add((n,part));raw=qmap[n]['parts'][part]['answer_html'].lower()
 for text in texts:check(text.lower() in raw,'Printed conclusion part '+str(part+1)+': '+text)

def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def image_normalised(value):
 value=re.sub(r'(<img\b[^>]*\bsrc=)(["\']).*?\2',r'\1"<image>"',value,flags=re.I|re.S)
 return value.replace('Geometry of the new variant. Diagram not to scale.','Diagram not to scale.')
check(package['source']['sha256']==source_sha,'Package identifies the exact supplied bank')
check(package['source']['supplied']==39 and not package['source']['held'],'All supplied variants retained')
pack_by={q['id']:q for q in package['questions']}
for row in owner:
 q=row['original'];uid=row['uid'];active=q['bank_number']
 check(uid==q['content_uid'] and row['bank_number']==q['bank_number'],'Fixture editorial identity')
 check(uid in pack_by,'Owner task present in package')
 if uid not in pack_by:continue
 public=pack_by[uid]
 check(digest(public)==row['contentSha256'],'Frozen owner projection digest')
 check(public['marks']==q['marks'] and public['difficulty']==q['difficulty'],'Owner marks and difficulty preserved')
 for key in ['answer_html','solution_html','hint_html']:
  check(image_normalised(public[key])==image_normalised(q[key]),'Source '+key+' preserved except image paths')
 check(len(public['parts'])==len(q['parts']),'All original parts retained')
 for i,part in enumerate(q['parts']):
  adapted=public['parts'][i]
  expected=[{'code':'','marks':c['marks'],'description_html':c['criterion_html']} for c in part['criteria']]
  check(adapted['marking_criteria']==expected,'Owner criteria text/marks preserved for part '+str(i+1))
  check(part['prompt_html'] in public['prompt_html'],'Owner part prompt preserved for part '+str(i+1))
if source:
 raw=source.read_bytes();original=json.loads(raw.decode('utf-8-sig'))
 actual=sorted([q for lesson in original['lessons'] for q in lesson['questions']],key=lambda q:q['bank_number'])
 check(hashlib.sha256(raw).hexdigest()==source_sha,'Optional owner source SHA-256')
 check(actual==tasks,'Fixture equals every complete owner source record')
active='structure'

check(len(tasks)==data['question_count']==39,'All 39 supplied records')
check([q['bank_number'] for q in tasks]==list(range(1,40)),'Complete unique bank numbering')
check(len({q['content_uid'] for q in tasks})==39,'Stable distinct editorial identities')
check(sum(len(q['parts']) for q in tasks)==data['part_count']==91,'91 parts')
check(sum(q['marks'] for q in tasks)==data['total_marks']==307,'307 marks')
for q in tasks:
 active=q['bank_number'];check(sum(p['marks'] for p in q['parts'])==q['marks'],'Part marks sum')
 check(q['marks']==q['mark_scheme']['total_marks'],'Mark scheme total')
 for i,p in enumerate(q['parts']):
  check(sum(c['marks'] for c in p['criteria'])==p['marks'],'Criterion marks sum for part '+str(i+1))
  check(all(p.get(x) for x in ['prompt_html','answer_html','solution_html']),'Complete text for part '+str(i+1))
 check(q['language']=='en' and q['exam'] is None,'Public English variant without exam label')

active=1;a,b,L=collide(4*m,3*m,2*u,-u,e);C(1,0,a,b);eq(a.subs(e,R(2,3)),-u/7,'Rebound observation');C(1,1,R(2,3))
LA=s.simplify(2*m*((2*u)**2-a.subs(e,R(2,3))**2));GB=s.simplify(3*m*(b.subs(e,R(2,3))**2-u**2)/2);eq(LA/GB,R(13,6),'Energy transfer ratio');C(1,2,LA/GB,LA-GB);check(LA-GB>0,'Net loss positive')
active=2;a,b,_=collide(4*m,4*m,u,0,e);b2,c,_=collide(4*m,3*m,b,0,e);C(2,0,a,b);C(2,1,b2,c);lower=(4-s.sqrt(7))/3;eq((b2-a).subs(e,lower),0,'Threshold velocities equal');C(2,2,lower,1);word(2,2,'included');check(0<float(lower)<1,'Threshold in physical domain');check(float((b2-a).subs({e:R(4,5),u:1}))>0,'Above threshold gaps increase')
active=3;C(3,0,R(1,3));J=R(18,100)*(18+6);C(3,1,J,J/108)
active=4;a,b,_=collide(4*m,2*m,u,0,e);b2,c,_=collide(2*m,m,b,0,e);C(4,0,a,b2,c);eq(c.subs(e,R(1,2)),2*a.subs(e,R(1,2)),'Double speed condition');C(4,1,R(1,2),u/2,u);eq(a.subs(e,R(1,2)),b2.subs(e,R(1,2)),'Equal velocity no reimpact across positive gap')
active=5;a,b,_=collide(3*m,6*m,2*u,-u,e);C(5,0,a,b);b2,c,_=collide(6*m,2*m,b,-5*u/6,e);eq(b2.subs(e,R(1,2)),0,'Second impact stops middle sphere');C(5,1,R(1,2),c.subs(e,R(1,2)));initial=(3*m*(2*u)**2+6*m*u**2+2*m*(5*u/6)**2)/2;final=(3*m*a**2+6*m*b2**2+2*m*c**2)/2;C(5,2,s.factor((initial-final).subs(e,R(1,2))))
active=6;a,b,_=collide(3*m,2*m,u,0,R(1,2));C(6,0,a,b);t1=d/b;vret=-R(2,3)*b;tret=(d-a*t1)/(a-vret);T=s.simplify(t1+tret);C(6,1,T);check(0<float((a*T/d))<1,'Second impact before trailing sphere hits wall');a2,b2,_=collide(3*m,2*m,a,vret,R(1,2));C(6,2,s.simplify(3*m*(a-a2)))
active=7;velocity=12-84*R(25,1000)/R(12,100);C(7,0,-velocity);word(7,0,'away');check(velocity<0,'Signed velocity actually rebounds')
active=8;a,b,_=collide(2*m,m,u,0,e);C(8,0,a,b);word(8,0,'-b/2');a2,b2,_=collide(2*m,m,a,-b/2,e);eq(a2.subs(e,R(1,2)),0,'Second impact stops A');C(8,1,R(1,2));C(8,2,b2.subs(e,R(1,2)));word(8,2,'yes');check(float((b2-a2).subs({e:R(1,2),u:1}))>0,'B ahead and separating towards wall')
active=9;a,b,_=collide(m,m,u,0,R(1,2));C(9,0,a,b);T=(3*d/5)/a;t1=d/b;return_speed=s.simplify((2*d/5)/(T-t1));C(9,1,return_speed/b,T);C(9,2,s.simplify(m*(b*b-return_speed**2)/2),s.simplify(m*(b+return_speed)))
active=10;a,b,_=collide(m,k*m,3*u,u,R(1,2));C(10,0,a,b,0,5);eq((b-3*u/2).subs(k,5),0,'Catch boundary speeds equal');word(10,0,r'\lt');b2,c,_=collide(2*m,2*m,b.subs(k,2),3*u/2,R(1,2));C(10,1,a.subs(k,2),b2,c);C(10,2,a.subs(k,2),b2,c);check(1<R(13,8)<R(15,8),'All adjacent gaps increase')
active=11;C(11,0,50*R(60,1000)/(8+2))
active=12;rest=(k-1)/(k+1);C(12,0,rest,1);word(12,0,r'\geq');eq(((1-k)**2/(1+k*k)).subs(k,2),R(1,5),'80 percent energy lost');check(rest.subs(k,R(1,2))<0,'Reject alternative negative restitution root');C(12,1,2,R(1,3));C(12,2,2*m*u);word(12,2,'original direction')
active=13;a,b,_=collide(3*m,m,u,0,e);C(13,0,a,b);eq(a.subs(e,R(2,3)),(7*e*b/10).subs(e,R(2,3)),'Equal opposite speeds after wall');C(13,1,R(2,3),7*u/12);a2,b2,_=collide(3*m,m,7*u/12,-7*u/12,R(2,3));C(13,2,a2,b2);check(R(7,8)>R(7,72)>0,'B ahead and faster')
active=14;a,b,_=collide(5*m,2*m,u,0,R(1,6));eq(5*m*a,2*2*m*b,'Specified momentum ratio');C(14,0,R(1,6))
active=15;c0=2/s.sqrt(5);s0=1/s.sqrt(5);v=s.simplify(u*s0/(2*s0*c0));C(15,0,v);an=s.simplify(v*(c0*c0-s0*s0));bn=s.simplify((u*c0-an)/k);rest=s.simplify((bn-an)/(u*c0));C(15,1,rest);C(15,2,R(5,11),R(5,3));eq(rest.subs(k,R(5,11)),1,'Elastic mass endpoint');eq(rest.subs(k,R(5,3)),0,'Zero restitution mass endpoint');word(15,2,'zero')
active=16;C(16,0,1/k,1);T=5*d/(3*u);eq(R(4,5)*u*T*(1+2),4*d,'Parallel displacement 4d');C(16,1,2,R(1,2));C(16,2,R(3,8));check(T>0,'Finite outward time and e>0 return')
active=17;a,b,_=collide(3*m,2*m,u,0,R(2,3));eq((2*m*b*b)/(3*m*a*a),6,'Energy ratio six');C(17,0,a,b,R(2,3));cosA=R(1,2);sinA=s.sqrt(3)/2;cosB=5/(2*s.sqrt(13));sinB=3*s.sqrt(3)/(2*s.sqrt(13));C(17,1,s.simplify(sinA*cosB+cosA*sinB));eq(cosA**2+R(9,25)*sinA**2,R(13,25),'Wall output speed constraint')
active=18;an,bn,_=collide(m,m,2*u*s.cos(theta),-3*u*s.cos(theta),e);eq(s.factor((-3*u*s.cos(theta))*bn+9*u*u*s.sin(theta)**2),-3*u*u*s.cos(theta)**2*(5*e-1)/2+9*u*u*s.sin(theta)**2,'Perpendicular dot-product');C(18,0,(5*e-1)/6,R(1,5),1);word(18,0,r'\lt');eq(bn.subs(e,R(3,5)),u*s.cos(theta),'Half incoming normal observation');C(18,1,R(3,5));word(18,1,'30^')
active=19;an,bn,_=collide(2*m,m,u*2/s.sqrt(5),0,R(1,2));at=u/s.sqrt(5);eq(2*(an*an+at*at),bn*bn,'Equal final energies');C(19,0,(2-e)*u*s.cos(theta)/3,2*(1+e)*u*s.cos(theta)/3,u*s.sin(theta));C(19,1,R(1,2))
active=20;rest=R(1,2);tanA=s.sqrt(2);V=U/tanA;eq(rest*tanA*tanA,1,'Smooth plane normal restitution and unchanged tangent');C(20,0,1,U/s.tan(alpha),U*s.sqrt(e));C(20,1,rest,tanA);eq(rest*R(4,9),R(2,9),'Extra height fraction');C(20,2,s.simplify(m*(2*u/s.sqrt(13))*s.sqrt(R(3,2))))
active=21;c0=2/s.sqrt(85);s0=9/s.sqrt(85);an,bn,L=collide(m,m,3*u*c0,-2*u*s0,R(1,2));eq(bn,0,'B final normal zero');C(21,0,R(9,2));C(21,1,L);before=s.Matrix([3*u*c0,3*u*s0]);after=s.Matrix([an,3*u*s0]);tanDelta=s.simplify(abs(s.det(s.Matrix.hstack(before,after)))/before.dot(after));eq(tanDelta,R(54,73),'Deflection tangent with quadrant');word(21,2,'54/73','36.5');check(round(float(s.atan(tanDelta)*180/s.pi),1)==36.5,'Printed angle rounding')
active=22;an,bn,_=collide(m,3*m,U,0,R(2,3));tan2=s.simplify(3*(bn/U)**2-(an/U)**2);C(22,0,s.sqrt(tan2));eq(tan2,R(11,24),'Equal energy condition')
active=23;ct=R(3,5);an,bn,_=collide(2*m,3*m,u,-2*u*ct/3,R(3,7));eq(an,-u/5,'Specified A velocity');eq(bn,2*u*ct/3,'Reversed B normal and unchanged speed');C(23,0,ct);C(23,1,R(3,7))
active=24;an,bn,_=collide(m,2*m,3*u/5,-3*u/5,R(1,2));eq(bn,0,'B perpendicular outgoing');eq(an*an+(4*u/5)**2,u*u,'A unchanged speed');C(24,0,(R(3,5)-2*s.cos(theta))*u);C(24,1,R(3,5),an);C(24,2,R(1,2));check(an<0,'Reject physically approaching positive normal choice')
active=25;b0,a0,L=collide(m,m,3*u/5,0,R(1,3));T=d/a0;eq(T,2*d/(4*u/5),'Equal first arrival times');C(25,0,R(4,3),d/2,d);C(25,1,16);eq(L/(m*u*u/2),R(16,100),'Total-system loss fraction')
active=26;cos2=R(3,8);sin2=1-cos2;rest=s.sqrt(R(1,2))*R(1,2)/s.sqrt(sin2);C(26,0,rest);word(26,1,'5/3','52.2');check(round(float(s.atan(s.sqrt(sin2/cos2))*180/s.pi),1)==52.2,'Incident angle rounding')
active=27;an,bn,L=collide(m,m,4*u/5,0,R(2,3));eq(bn/an,5,'Same direction component ratio');check(an>0 and bn>0,'Parallel not opposite direction');C(27,0,R(2,3));C(27,1,L)
active=28;an,bn,_=collide(m,k*m,U,0,R(3,4));C(28,0,an,bn);condition=s.factor(an*an+R(9,16)*U*U-k*bn*bn);roots=s.solve(condition,k);check(roots==[R(5,9),R(5,2)],'Both positive mass roots');C(28,1,*roots);check(an.subs(k,roots[0])>0 and an.subs(k,roots[1])<0,'Both normal sign branches admissible')
active=29;rest=R(2,3);incoming=s.Matrix([-4*u/5,-3*u/5]);first=s.Matrix([-4*u/5,3*rest*u/5]);eq(first.dot(first)/incoming.dot(incoming),R(4,5),'First wall retained energy');C(29,0,rest,-4*u/5,2*u/5);tau=5*d/(6*u);C(29,1,d/3);eq(d+first[0]*tau,first[1]*tau,'Second impact on y=x ray');check(tau>0,'Second impact time positive');normal=s.Matrix([-1,1])/s.sqrt(2);second=s.simplify(first-(1+rest)*(first.dot(normal))*normal);eq(second[0],u/5,'Second wall outgoing x');eq(second[1],-3*u/5,'Second wall outgoing y');word(29,2,'2','63.4');check(round(float(s.atan(2)*180/s.pi),1)==63.4,'Second wall acute angle rounding')
active=30;an,bn,L=collide(m,3*m,u,-3*u/5,R(1,2));eq(bn,0,'B normal zero');C(30,0,3,an);C(30,1,L)
active=31;ct=1/s.sqrt(5);st=2/s.sqrt(5);an,bn,_=collide(m,m/3,u*ct,-3*u*st,R(3,7));C(31,0,(15*s.cos(alpha)+3*s.sin(alpha))*u/14);eq(bn/(3*u*ct),ct/st,'Same outgoing direction');C(31,1,2,bn,3*u*ct);check(bn>0,'Not opposite direction')
active=32;an,bn,L=collide(m,m,u/2,-u/6,R(1,2));eq(an,0,'A normal zero');C(32,0,0,u*s.sin(alpha));eq(L,m*u*u/12,'Specified total kinetic energy');C(32,1,R(1,6));word(32,1,'60^')
active=33;an,bn,L=collide(m,k*m,U,0,R(1,2));C(33,0,an,bn);fraction=s.simplify((L.subs(U,2*u/s.sqrt(5)))/(m*u*u/2));eq(fraction,3*k/(5*(1+k)),'Full-system loss fraction');C(33,1,5,fraction,R(3,5));eq(fraction.subs(k,5),R(1,2),'Half-loss inverse mass');eq(s.limit(fraction,k,s.oo),R(3,5),'Supremum not finite mass');check(s.simplify(R(3,5)-fraction)>0,'Strict unattainability of 60 percent')
active=34;rest=1/s.sqrt(6);ta=s.sqrt(R(2,3));ct=1/s.sqrt(1+ta*ta);st=ta*ct;C(34,0,e*u*s.cos(alpha),-u*s.sin(alpha),u*s.sin(alpha)/2);eq(rest*ct,st/2,'Final 45 degree direction');eq(rest*rest*ct*ct+st*st/4,R(1,5),'One fifth energy retained');C(34,1,rest,ta);check(ta<3,'X wall precedes Y wall');C(34,2,R(1,2));word(34,2,'equal')
active=35;an,bn,L=collide(m,2*m,u,-3*u/5,R(3,4));before=s.Matrix([-3*u/5,4*u/5]);after=s.Matrix([bn,4*u/5]);tanDelta=s.simplify(abs(s.det(s.Matrix.hstack(before,after)))/before.dot(after));eq(tanDelta,R(56,33),'Deflection with correct quadrants');word(35,0,'56/33','59.5');check(round(float(s.atan(tanDelta)*180/s.pi),1)==59.5,'Angle rounding');C(35,1,L)
active=36;C(36,0,1,e);ct2=e/(1+e);st2=1/(1+e);eq(ct2+e*e*st2,e,'Right-angle retained energy identity');C(36,1,R(2,5),s.sqrt(R(2,5)));word(36,1,'5/2','57.7');check(round(float(s.atan(s.sqrt(R(5,2)))*180/s.pi),1)==57.7,'Angle rounding')
active=37;C(37,0,2*(1+e)/(3*(1-e)),1);word(37,0,r'\lt');an,bn,_=collide(m,m,2*u/s.sqrt(5),-6*u/s.sqrt(5),R(1,2));eq(bn,0,'B zero normal condition');C(37,1,R(1,2),s.sqrt(an*an+(4*u/s.sqrt(5))**2));check((2*(1+e)).subs(e,1)>0,'Elastic endpoint impossible at acute incidence')
active=38;an,bn,_=collide(m,3*m,u,0,e);C(38,0,an,bn);ratio=s.factor((m*an*an)/(3*m*R(13,25)*bn*bn));roots=s.solve(ratio-R(25,156),e);check(roots==[R(1,7),R(3,5)],'Both restitution roots survive');C(38,1,*roots);C(38,2,an.subs(e,roots[0]),an.subs(e,roots[1]));check(an.subs(e,roots[0])>0 and an.subs(e,roots[1])<0,'Energy measurement cannot fix sign')
active=39;an,bn,_=collide(3*m,2*m,4*u/5,0,R(1,2));C(39,0,an,3*u/5);C(39,1,s.sqrt(an*an+(3*u/5)**2))

active='coverage'
expected={(q['bank_number'],i) for q in tasks for i in range(len(q['parts']))};check(part_coverage==expected,'Every one of 91 part answers inspected')
if source:check(hashlib.sha256(source.read_bytes()).hexdigest()==source_sha,'Owner source unchanged after audit')
result={'sourceSha256':source_sha,'sourceTasks':39,'sourceParts':91,'sourceMarks':307,'checks':len(checks),'printedAnswerClaims':printed,'failures':failures,'partCoverage':sorted([list(p) for p in part_coverage]),'topicDistribution':dict(collections.Counter(q['topic'] for q in tasks)),'actualSourceErrors':[],'method':'Independent signed momentum/restitution systems, reduced-mass energy identity, unchanged tangential components, exact event time/order checks, physical root/endpoint validation and quadrant-aware deflection angles. Printed mathematical results parsed separately from their derivation; verbal conclusions reviewed in full. No source edits. Not an external teacher review.','notes':['In oblique impact e=0 only equates normal velocities; it need not cause sticking.','A finite return from a fixed wall requires a positive rebound coefficient.','Equal adjacent velocities with a positive gap do not cause another collision.','Reverse-parallel motion after two perpendicular wall impacts requires equal positive restitution coefficients when both incident components are nonzero.']}
result['checkLog']=checks
result['teachingVerification']='Run python scripts/content/verify-momentum-teaching.py separately; this report audits the supplied 39 exam-style tasks.'
report=Path(args.report);report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in result.items() if k not in ['partCoverage','topicDistribution','notes','checkLog']},ensure_ascii=False));raise SystemExit(bool(failures))
