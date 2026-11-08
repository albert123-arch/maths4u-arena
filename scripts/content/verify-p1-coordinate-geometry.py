"""Independent incidence, distance, complete-set and tangency checks."""
import json
from pathlib import Path
import sympy as s
x,y=s.symbols('x y',real=True)
p=json.loads(Path('content/original/9709-p1/coordinate-geometry-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/coordinate-geometry-math-models.json').read_text('utf-8'))
checks=0
def same(a,b):
    global checks
    assert a==b,(a,b)
    checks+=1
def expr(t):return s.sympify(str(t),locals={'x':x,'y':y,'inf':s.oo})
def zero(t):same(s.simplify(t),0)
def pairs(t):return s.FiniteSet(*(s.Tuple(*(expr(v) for v in part[1:-1].split(','))) for part in t.split(';')))
def points(t):return list(pairs(t))
def dist2(a,b):return s.simplify((a[0]-b[0])**2+(a[1]-b[1])**2)
def midpoint(a,b):return s.Tuple(*((a[i]+b[i])/2 for i in range(2)))
def at(f,P):return f.subs({x:P[0],y:P[1]})
def coeff(f):
    poly=s.Poly(f,x,y);same(poly.total_degree(),1)
    return [poly.coeff_monomial(v) for v in [x,y,1]]
def slope(f):a,b,_=coeff(f);assert b!=0;return -a/b
def line_on(f,*pts):
    coeff(f)
    for P in pts:zero(at(f,P))
def circle(f):
    poly=s.Poly(f,x,y);a=poly.coeff_monomial(x*x);same(poly.coeff_monomial(y*y),a);assert a!=0;same(poly.coeff_monomial(x*y),0)
    h=-poly.coeff_monomial(x)/(2*a);k=-poly.coeff_monomial(y)/(2*a);r2=s.simplify(h*h+k*k-poly.coeff_monomial(1)/a)
    return s.Tuple(h,k),r2
def solve(F,G):return s.FiniteSet(*(s.Tuple(P[x],P[y]) for P in s.solve((F,G),(x,y),dict=True)))
def sets(t):
    if t.startswith('{'):return s.FiniteSet(*(expr(v) for v in t[1:-1].split(',')))
    result=s.S.EmptySet
    for part in t.split(' U '):
        a,b=part[1:-1].split(',');result|=s.Interval(expr(a),expr(b),left_open=part[0]=='(',right_open=part[-1]==')')
    return result

for m in models:
    q=next(q for q in p['questions'] if q['id']==m['uid']);f={v['key']:v['expected'] for v in q['fields']};kind=m['kind']
    if kind=='distance':
        length=expr(f['length']);zero(length**2-dist2(m['A'],m['B']));assert length>=0;same(pairs(f['midpoint']),s.FiniteSet(midpoint(s.Tuple(*m['A']),s.Tuple(*m['B']))))
    elif kind=='endpoint':
        B=points(f['point'])[0];same(midpoint(s.Tuple(*m['A']),B),s.Tuple(*m['M']))
    elif kind=='equidistant':
        A,B=m['A'],m['B'];poly=dist2((x,2*x),A)-dist2((x,2*x),B);same(s.FiniteSet(expr(f['parameter'])),s.solveset(poly,x,domain=s.S.Reals));t=expr(f['parameter']);same(pairs(f['point']),s.FiniteSet(s.Tuple(t,2*t)));zero(dist2((t,2*t),A)-dist2((t,2*t),B))
    elif kind=='diameter':
        C=points(f['centre'])[0];same(C,midpoint(s.Tuple(*m['A']),s.Tuple(*m['B'])));zero(expr(f['r2'])-dist2(m['A'],m['B'])/4)
    elif kind=='gradients':
        A,B=m['A'],m['B'];g=expr(f['gradient']);zero(g*(B[0]-A[0])-(B[1]-A[1]));zero(g*expr(f['perpendicular'])+1)
    elif kind=='parallel':
        line=expr(f['line']);a,b,_=coeff(line);zero(at(line,m['P']));zero(a*m['b']-b*m['a'])
    elif kind in ('bisector','exceptional'):
        A,B=s.Tuple(*m['A']),s.Tuple(*m['B']);line=expr(f['line']);a,b,_=coeff(line);zero(at(line,midpoint(A,B)));zero(a*(B[1]-A[1])-b*(B[0]-A[0]))
        if kind=='exceptional':same(f['gradient'],'A' if A[0]==B[0] else 'C')
    elif kind=='point_line':
        line=expr(f['line']);line_on(line,m['P']);zero(slope(line)-expr(m['m']))
    elif kind=='two_point_line':line_on(expr(f['line']),m['A'],m['B'])
    elif kind=='intercepts':
        original=m['a']*x+m['b']*y+m['c'];actual=solve(original,x)|solve(original,y);same(pairs(f['points']),actual)
        px=next(P[0] for P in actual if P[1]==0);qy=next(P[1] for P in actual if P[0]==0);zero(expr(f['area'])-abs(px*qy)/2);assert expr(f['area'])>0
    elif kind=='line_intersection':same(pairs(f['point']),solve(expr(m['f']),expr(m['g'])))
    elif kind=='centre_point':
        F=expr(f['circle']);C,r2=circle(F);same(C,s.Tuple(*m['C']));zero(at(F,m['P']));zero(expr(f['radius'])**2-r2);assert expr(f['radius'])>0
    elif kind=='expanded_circle':
        C,r2=circle(expr(m['polynomial']));same(pairs(f['centre']),s.FiniteSet(C));zero(expr(f['radius'])**2-r2);assert expr(f['radius'])>0
    elif kind=='diameter_circle':
        F=expr(f['circle']);C,r2=circle(F);same(C,midpoint(s.Tuple(*m['A']),s.Tuple(*m['B'])));zero(r2-dist2(m['A'],m['B'])/4);zero(at(F,m['A']));zero(at(F,m['B']))
    elif kind=='tangent_normal':
        C,P=m['C'],m['P'];T,N=expr(f['tangent']),expr(f['normal']);line_on(T,P);line_on(N,P,C);a,b,_=coeff(T);c,d,_=coeff(N);zero(a*c+b*d);zero(a*(P[1]-C[1])-b*(P[0]-C[0]))
    elif kind=='secant':
        F=x*x+y*y-m['r2'];G=y-x-m['c'];actual=solve(F,G);same(pairs(f['points']),actual);a,b=list(actual);zero(expr(f['length'])**2-dist2(a,b));assert expr(f['length'])>0
    elif kind=='horizontal_family':
        t=s.Symbol('t',real=True);F=(x-m['C'][0])**2+(t-m['C'][1])**2-m['r']**2;D=s.discriminant(F,x)
        same(sets(f['parameters']),s.solve_univariate_inequality(D>0,t,relational=False));same(sets(f['tangents']),s.solveset(D,t,domain=s.S.Reals))
    elif kind=='chord':
        C=m['C'];F=(x-C[0])**2+(y-C[1])**2-m['r']**2;G=y-C[1]-m['d'];actual=solve(F,G);same(pairs(f['points']),actual);a,b=list(actual);same(pairs(f['midpoint']),s.FiniteSet(midpoint(a,b)));zero(expr(f['length'])**2-dist2(a,b));assert expr(f['length'])>0
    elif kind=='two_circles':
        F=x*x+y*y-m['R2'];G=(x-m['a'])**2+y*y-m['S2'];actual=solve(F,G);same(pairs(f['points']),actual);line_on(expr(f['line']),*actual)
    else:raise ValueError(kind)

# Worked examples: independently verify all twenty conclusions.
A,B=s.Tuple(-3,2),s.Tuple(5,8);same(midpoint(A,B),s.Tuple(1,5));same(dist2(A,B),100)
same(midpoint(s.Tuple(-4,7),s.Tuple(8,-5)),s.Tuple(2,1))
same(s.solveset(dist2((x,2*x),(1,0))-dist2((x,2*x),(5,2)),x,domain=s.S.Reals),s.FiniteSet(s.Rational(7,4)))
same(midpoint(s.Tuple(-2,1),s.Tuple(6,5)),s.Tuple(2,3));same(dist2((-2,1),(6,5))/4,20)
same(s.Rational(5-1,4+2),s.Rational(2,3));zero(s.Rational(2,3)*s.Rational(-3,2)+1)
zero(slope(2*x-3*y+4)-slope(4*x-6*y+1));zero(slope(2*x-3*y+4)*slope(3*x+2*y-7)+1)
zero(at(3*x+2*y-14,(2,4)));zero(slope(3*x+2*y-14)*s.Rational(4,6)+1)
zero(at(y-2,midpoint(s.Tuple(4,-2),s.Tuple(4,6))))
line_on(2*x+3*y-3,(3,-1));zero(slope(2*x+3*y-3)+s.Rational(2,3))
line_on(2*x+y-1,(-1,3),(3,-5))
zero(at(3*x+2*y-12,(4,0)));zero(at(3*x+2*y-12,(0,6)));same(s.Rational(4*6,2),12)
same(solve(2*x+y-7,x-2*y-1),s.FiniteSet(s.Tuple(3,1)))
zero(at((x+2)**2+(y-3)**2-25,(1,7)))
same(circle(x*x+y*y-6*x+4*y-12),(s.Tuple(3,-2),s.Integer(25)))
for P in [(1,1),(5,1),(1,7)]:zero(at((x-3)**2+(y-4)**2-13,P))
line_on(3*x+4*y-27,(5,3));line_on(4*x-3*y-11,(5,3),(2,-1));zero(slope(3*x+4*y-27)*slope(4*x-3*y-11)+1)
same(solve(x*x+y*y-25,y-x-1),s.FiniteSet(s.Tuple(-4,-3),s.Tuple(3,4)));same(dist2((-4,-3),(3,4)),98)
t=s.Symbol('t',real=True);D=s.discriminant((x-1)**2+(t+2)**2-9,x);same(s.solve_univariate_inequality(D>0,t,relational=False),s.Interval.open(-5,1));same(s.solveset(D,t,domain=s.S.Reals),s.FiniteSet(-5,1))
same(solve((x-2)**2+(y-1)**2-25,y-4),s.FiniteSet(s.Tuple(-2,4),s.Tuple(6,4)));same(dist2((-2,4),(6,4)),64)
same(solve(x*x+y*y-25,(x-4)**2+y*y-9),s.FiniteSet(s.Tuple(4,-3),s.Tuple(4,3)))
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_boundary_assertions=checks,failed=0)))
