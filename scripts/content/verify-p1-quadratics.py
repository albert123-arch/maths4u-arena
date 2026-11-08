"""Check stored complete answers against the equations, signs and boundaries."""
import json
from pathlib import Path
import sympy as s

x=s.Symbol('x',real=True)
p=json.loads(Path('content/original/9709-p1/quadratics-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/quadratics-math-models.json').read_text('utf-8'))
count=0
def same(a,b):
    global count
    assert a==b,(a,b)
    count+=1
def expr(text):return s.sympify(text,locals={'x':x})
def values(text):return s.FiniteSet(*(expr(v) for v in text.strip('{}').split(',')))
def intervals(text):
    result=s.S.EmptySet
    for part in text.split(' U '):
        a,b=part[1:-1].split(',')
        result|=s.Interval(expr(a.replace('inf','oo')),expr(b.replace('inf','oo')),left_open=part[0]=='(',right_open=part[-1]==')')
    return result
for m in models:
    q=next(q for q in p['questions'] if q['id']==m['uid']);f={f['key']:f['expected'] for f in q['fields']};kind=m['kind']
    if kind=='roots':same(values(f['roots']),s.solveset(expr(m['polynomial']),x,domain=s.S.Reals))
    elif kind=='sqrt':same(values(f['roots']),s.solveset(x+s.sqrt(x)-m['constant'],x,domain=s.S.Reals))
    elif kind=='square':
        a,h,k=(expr(f[key]) for key in ('form_a','form_h','form_k'))
        same(s.expand(a*(x-h)**2+k-expr(m['polynomial'])),0)
    elif kind=='range':
        same(f['vertex'],f"({m['h']},{m['k']})")
        from sympy.calculus.util import function_range
        same(intervals(f['range']),function_range(m['a']*(x-m['h'])**2+m['k'],x,s.S.Reals))
    elif kind=='restricted':
        from sympy.calculus.util import function_range
        h,end=m['h'],m['end']
        same(intervals(f['range']),function_range((x-h)**2+1,x,s.Interval(0,end)))
        levels=intervals(f['levels'])
        for t in [0,1,s.Rational(3,2),h*h+1,h*h+2,(end-h)**2+1]:
            actual=s.solveset((x-h)**2+1-t,x,domain=s.Interval(0,end))
            same(bool(levels.contains(t)),len(actual)==2)
    elif kind=='distinct':same(intervals(f['parameters']),s.solve_univariate_inequality(4*x*x-4*m['a']>0,x,relational=False))
    elif kind=='linear':
        k=expr(f['exception']);poly=(k-m['p'])*x*x-2*k*x+k+m['p']
        same(s.degree(poly,x),1);same(poly.subs(x,expr(f['linear_root'])),0);same(int(f['count']),2)
        for k in [-2,0,s.Rational(1,2),3,5]:
            if k!=m['p']:same(len(s.solveset((k-m['p'])*x*x-2*k*x+k+m['p'],x,domain=s.S.Reals)),2)
    elif kind=='positive':same(intervals(f['parameters']),s.Interval.open(2*m['h']**2,s.oo))
    elif kind=='tangent':
        c=expr(f['c']);poly=x*x-4*x+7-(m['slope']*x+c)
        same(s.discriminant(poly,x),0)
        a,b=(expr(v) for v in f['point'][1:-1].split(','));same(poly.subs(x,a),0);same(b,m['slope']*a+c)
    elif kind in ('interval','outside','intersection'):
        poly=(x-m['r'])*(x-m['t'])
        relation=poly<=0 if kind=='interval' else -poly<0 if kind=='outside' else poly>0
        actual=s.solve_univariate_inequality(relation,x,relational=False)
        if kind=='intersection':actual&=s.Interval(m['lo'],m['hi'],right_open=True)
        same(intervals(f['allowed']),actual)
    elif kind=='repeated':same(f['set'],'B');same(s.solveset((x-m['r'])**2,x,domain=s.S.Reals),s.FiniteSet(m['r']))
    elif kind=='pairs':
        pairs=[tuple(expr(v) for v in pair[1:-1].split(',')) for pair in f['points'].split(';')]
        same(s.FiniteSet(*(pair[0] for pair in pairs)),s.solveset(expr(m['polynomial']),x,domain=s.S.Reals))
        for a,b in pairs:same(s.simplify(expr(m['line']).subs(x,a)-b),0)
    elif kind=='slopes':same(values(f['slopes']),s.solveset((m['p']-x)**2-16,x,domain=s.S.Reals))
    elif kind=='rectangle':
        sides=values(f['lengths']);same(sum(sides),m['a']+m['b']);same(s.prod(sides),m['a']*m['b']);assert all(a>0 for a in sides)
    else:raise ValueError(kind)

# All twenty worked-example conclusions, checked independently of their prose.
same(s.FiniteSet(s.Rational(1,2),3),s.solveset(2*x*x-7*x+3,x,domain=s.S.Reals))
same(s.FiniteSet((-1-s.sqrt(13))/3,(-1+s.sqrt(13))/3),s.solveset(3*x*x+2*x-4,x,domain=s.S.Reals))
same(s.FiniteSet(-3,-2,2,3),s.solveset(x**4-13*x*x+36,x,domain=s.S.Reals))
same(s.FiniteSet(16),s.solveset(x-2*s.sqrt(x)-8,x,domain=s.S.Reals))
same(s.expand(3*(x-3)**2+5-(3*x*x-18*x+32)),0)
same(s.expand(5-2*(x-3)**2-(-2*x*x+12*x-13)),0)
same(s.FiniteSet(3-s.sqrt(14)/2,3+s.sqrt(14)/2),s.solveset(2*x*x-12*x+11,x,domain=s.S.Reals))
for t,n in [(1,1),(2,2),(5,2),(6,1),(10,1),(11,0)]:same(len(s.solveset((x-2)**2+1-t,x,domain=s.Interval(0,5))),n)
same(s.discriminant(x*x-2*s.Symbol('k')*x+s.Symbol('k')+3,x),4*(s.Symbol('k')**2-s.Symbol('k')-3))
same(s.factor(x*x-4*x+7-(2*x-2)),(x-3)**2)
k=s.Symbol('k');same(s.simplify(s.discriminant((k-1)*x*x-2*k*x+k+1,x)),4)
same(s.expand(2*(x-2)**2+k-8),2*x*x-8*x+k)
same(s.solve_univariate_inequality(2*x*x-7*x+3<=0,x,relational=False),s.Interval(s.Rational(1,2),3))
same(s.solve_univariate_inequality(-x*x+5*x-6>=0,x,relational=False),s.Interval(2,3))
same(s.solve_univariate_inequality((x-4)**2<0,x,relational=False),s.S.EmptySet)
same(s.solve_univariate_inequality((x+2)*(x-5)>0,x,relational=False)&s.Interval(-4,7,right_open=True),s.Union(s.Interval(-4,-2,right_open=True),s.Interval.open(5,7)))
same(s.solveset(x*x-x-3-(2*x+1),x,domain=s.S.Reals),s.FiniteSet(-1,4))
same(s.solveset(x*(7-3*x)-2,x,domain=s.S.Reals),s.FiniteSet(s.Rational(1,3),2))
same(s.solveset((2-x)**2-16,x,domain=s.S.Reals),s.FiniteSet(-2,6))
same(s.solveset(x*(13-x)-40,x,domain=s.S.Reals),s.FiniteSet(5,8))
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_boundary_assertions=count,failed=0)))
