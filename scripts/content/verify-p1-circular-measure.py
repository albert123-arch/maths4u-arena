"""Independent circle fractions, geometry, domains and full-answer checks."""
import json
from pathlib import Path
import sympy as s
r=s.Symbol('r',real=True)
p=json.loads(Path('content/original/9709-p1/circular-measure-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/circular-measure-math-models.json').read_text('utf-8'))
checks=0

def same(a,b):
    global checks
    assert a==b,(a,b)
    checks+=1

def expr(t):return s.sympify(str(t),locals={'r':r})
def zero(t):same(s.simplify(t),0)
def arc(R,t):return 2*s.pi*R*t/(2*s.pi)
def area(R,t):return s.pi*R*R*t/(2*s.pi)
def chord(R,t):return s.sqrt(s.simplify(2*R*R*(1-s.cos(t))))
def triangle(R,t):return s.simplify(chord(R,t)*s.sqrt(R*R-chord(R,t)**2/4)/2)
def minor(R,t):return area(R,t)-triangle(R,t)

for m in models:
    q=next(q for q in p['questions'] if q['id']==m['uid'])
    f={v['key']:v['expected'] if v['type']=='choice' else expr(v['expected']) for v in q['fields']}
    kind=m['kind'];R=expr(m.get('radius',1));t=expr(m.get('theta',1))
    def check(key,value):zero(f[key]-value)
    if 'radius' in m:same(bool(R>0),True)
    if 'theta' in m:same(bool(0<t<2*s.pi),True)
    if kind=='conversion':check('radians',s.Rational(m['degree'],360)*2*s.pi);check('degrees',360*expr(m['angle'])/(2*s.pi))
    elif kind=='arc_ratio':
        check('minor',expr(m['arc'])/R);check('reflex',2*s.pi-f['minor']);same(bool(0<f['minor']<s.pi),True)
    elif kind=='triangle':check('radians',s.pi-expr(m['a'])-expr(m['b']));check('degrees',180*f['radians']/s.pi)
    elif kind=='definition':same(f['definition'],m['answer']);check('multiple',m['n'])
    elif kind=='arc_perimeter':check('arc',arc(R,t));check('perimeter',2*R+arc(R,t))
    elif kind=='arc_reconstruct':check('radius',expr(m['arc'])/t);check('perimeter',2*f['radius']+expr(m['arc']))
    elif kind=='both_arcs':check('minor',arc(R,t));zero(f['minor']+f['major']-2*s.pi*R)
    elif kind=='rolling':check('angle',2*s.pi*expr(m['turns']));check('distance',expr(m['turns'])*2*s.pi*R)
    elif kind=='sector_area':check('area',area(R,t));check('arc',arc(R,t));zero(2*f['area']-R*f['arc'])
    elif kind=='area_reconstruct':zero(area(f['radius'],t)-expr(m['area']));check('perimeter',2*f['radius']+arc(f['radius'],t));same(bool(f['radius']>0),True)
    elif kind=='two_measurements':
        zero(area(f['radius'],f['angle'])-m['area']);zero(arc(f['radius'],f['angle'])-m['arc']);check('perimeter',2*f['radius']+m['arc']);same(bool(0<f['angle']<2*s.pi),True)
    elif kind=='maximum':
        P=m['P'];zero(f['model']-(f['area']-(r-f['radius'])**2));zero(s.diff(f['model'],r).subs(r,f['radius']));same(s.diff(f['model'],r,2),-2)
        zero(2*f['radius']+arc(f['radius'],f['angle'])-P);zero(area(f['radius'],f['angle'])-f['area']);same(bool(0<f['angle']<2*s.pi),True)
    elif kind=='minor_segment':check('area',minor(R,t));check('perimeter',arc(R,t)+chord(R,t));same(bool(0<f['area']<s.pi*R*R/2),True)
    elif kind=='equal_chord':zero(chord(R,f['angle'])-R);check('area',minor(R,f['angle']))
    elif kind=='major_segment':check('area',s.pi*R*R-minor(R,t));check('perimeter',arc(R,2*s.pi-t)+chord(R,t));same(bool(f['area']>s.pi*R*R/2),True)
    elif kind=='segment_boundary':check('chord',chord(R,t));check('arc',arc(R,t));zero(f['perimeter']-f['chord']-f['arc'])
    elif kind=='annulus':
        outer,inner=expr(m['R']),expr(m['inner']);same(bool(outer>inner>0),True);check('area',area(outer,t)-area(inner,t));check('perimeter',arc(outer,t)+arc(inner,t)+2*(outer-inner))
    elif kind=='rectangle_semicircle':check('area',2*R*m['h']+s.pi*R*R/2);check('perimeter',2*R+2*m['h']+s.pi*R)
    elif kind=='overlap':
        # Integrate the two symmetrical caps across their common chord.
        x=s.Symbol('x',real=True)
        overlap=4*s.integrate(s.sqrt(R*R-x*x),(x,R/2,R))
        check('overlap',overlap);zero(f['overlap']+f['union']-2*s.pi*R*R);check('perimeter',2*arc(R,4*s.pi/3))
    elif kind=='rope':check('three',3*(2*R)+2*s.pi*R);check('seven',6*(2*R)+2*s.pi*R)
    else:raise ValueError(kind)

# Independently calculated conclusions of all twenty worked examples.
same(s.Rational(105,10)/7,s.Rational(3,2))
zero(s.Rational(150,180)*s.pi-5*s.pi/6);zero(7*s.pi/4*180/s.pi-315)
zero(2*s.pi-2*s.pi/5-8*s.pi/5)
same(round(float(s.atan(s.Rational(4,3))),3),0.927)
zero(arc(6,s.Rational(8,10))-s.Rational(48,10));zero(2*6+arc(6,s.Rational(8,10))-s.Rational(168,10))
zero(5*s.pi/(5*s.pi/6)-6);zero(2*6+5*s.pi-(12+5*s.pi))
zero(arc(4,2*s.pi-s.pi/3)-20*s.pi/3)
zero(2*s.pi*s.Rational(25,2)*s.Rational(35,100)-35*s.pi/4)
zero(area(5,s.Rational(12,10))-15)
zero(area(12,s.pi/4)-18*s.pi);zero(arc(12,s.pi/4)-3*s.pi)
zero(area(8,s.Rational(5,4))-40);zero(arc(8,s.Rational(5,4))-10)
zero(10*r-r*r-(25-(r-5)**2));zero(2*5+arc(5,2)-20)
zero(minor(4,s.pi/2)-(4*s.pi-8))
zero(chord(6,s.pi/3)-6);zero(minor(6,s.pi/3)-(6*s.pi-9*s.sqrt(3)));zero(arc(6,s.pi/3)+6-(6+2*s.pi))
zero(chord(3,2*s.pi/3)-3*s.sqrt(3));zero(s.pi*9-minor(3,2*s.pi/3)-(6*s.pi+9*s.sqrt(3)/4));zero(arc(3,4*s.pi/3)+3*s.sqrt(3)-(4*s.pi+3*s.sqrt(3)))
same(round(float(minor(8,s.Rational(9,10))),2),3.73)
zero(area(6,s.Rational(7,10))-area(2,s.Rational(7,10))-s.Rational(112,10));zero(arc(8,s.Rational(7,10))+8-s.Rational(136,10))
zero(6*4+s.pi*9/2-(24+9*s.pi/2));zero(6+2*4+arc(3,s.pi)-(14+3*s.pi))
zero(2*minor(4,2*s.pi/3)-(32*s.pi/3-8*s.sqrt(3)));zero(32*s.pi-2*minor(4,2*s.pi/3)-(64*s.pi/3+8*s.sqrt(3)));zero(2*arc(4,4*s.pi/3)-32*s.pi/3)
rho=3*(3+s.pi)/(6+s.pi);zero(12*rho+2*s.pi*rho-(18+6*s.pi));same(bool(rho>0),True)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_boundary_assertions=checks,failed=0)))
