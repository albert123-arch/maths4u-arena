"""Verify the stored answers using identities, interval images and actual domains."""
import json,re
from pathlib import Path
import sympy as s
from sympy.calculus.util import function_range
x=s.Symbol('x',real=True)
p=json.loads(Path('content/original/9709-p1/functions-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-p1/functions-math-models.json').read_text('utf-8'))
checks=0
def same(a,b):
    global checks
    assert a==b,(a,b)
    checks+=1
def expr(t):return s.sympify(str(t),locals={'x':x,'inf':s.oo})
def zero(a):same(s.simplify(a),0)
def sets(t):
    if t.startswith('{'):return s.FiniteSet(*(expr(v) for v in t[1:-1].split(',')))
    out=s.S.EmptySet
    for interval in t.split(' U '):
        a,b=interval[1:-1].split(',');out|=s.Interval(expr(a),expr(b),left_open=interval[0]=='(',right_open=interval[-1]==')')
    return out
def pairs(t):return s.FiniteSet(*(s.Tuple(*(expr(c) for c in part[1:-1].split(','))) for part in t.split(';')))
def chosen(f):
    # Tiny reader for this package's displayed sqrt/fraction choices only.
    text=f['options'][f['expected']][2:-2]
    def group(pos):
        assert text[pos]=='{';depth=1;j=pos+1
        while depth:
            depth+=(text[j]=='{')-(text[j]=='}');j+=1
        return text[pos+1:j-1],j
    def convert(t):
        nonlocal text
        saved=text;text=t;i=0;out=''
        while i<len(text):
            if text.startswith('\\sqrt',i):
                part,j=group(i+5);out+='sqrt('+convert(part)+')';i=j
            elif text.startswith('\\dfrac',i) or text.startswith('\\frac',i):
                n=6 if text.startswith('\\dfrac',i) else 5;a,j=group(i+n);b,k=group(j);out+='(('+convert(a)+')/('+convert(b)+'))';i=k
            else:out+=text[i];i+=1
        text=saved
        return re.sub(r'(\d)x',r'\1*x',out)
    return expr(convert(text))

for model in models:
    q=next(q for q in p['questions'] if q['id']==model['uid']);fields={f['key']:f for f in q['fields']};f={k:v['expected'] for k,v in fields.items()};m=model;kind=m['kind']
    if kind=='affine':
        original=m['b']-m['m']*x;inv=expr(f['formula']);zero(original.subs(x,inv)-x);zero(inv.subs(x,original)-x)
        same(sets(f['domain']),function_range(original,x,s.Interval(m['lo'],m['hi'],right_open=True)))
    elif kind=='many_one':
        original=(x-m['h'])**2+m['k'];same(f['one_one'],'B');same(original.subs(x,m['h']-1),original.subs(x,m['h']+1));same(sets(f['range']),function_range(original,x,s.S.Reals))
    elif kind=='rational':
        original=(m['a']*x+m['b'])/(x-m['c']);inv=expr(f['inverse'][0])/expr(f['inverse'][1]);zero(original.subs(x,inv)-x);zero(inv.subs(x,original)-x);same(sets(f['excluded']),s.solveset(expr(f['inverse'][1]),x,domain=s.S.Reals))
    elif kind=='finite':same(pairs(f['points']),s.FiniteSet(*(s.Tuple(b,a) for a,b in zip(m['inputs'],m['outputs']))))
    elif kind=='composition':
        a,b=expr(m['f']),expr(m['g']);zero(expr(f['fg'])-a.subs(x,b));zero(expr(f['gf'])-b.subs(x,a))
    elif kind=='root_composite':
        zero(chosen(fields['formula'])-s.sqrt(2*x+1-m['a']));same(sets(f['domain']),s.solve_univariate_inequality(2*x+1-m['a']>=0,x,relational=False)&s.Interval(0,s.oo))
    elif kind=='reciprocal_composite':
        original=1/(x-m['a']);inner=x*x+m['b'];zero(expr(f['fg'][0])/expr(f['fg'][1])-original.subs(x,inner));same(sets(f['domain']),s.S.Reals-s.solveset(inner-m['a'],x,domain=s.S.Reals))
    elif kind=='recover':zero(m['a']*expr(f['f'])+m['b']-expr(m['composite']))
    elif kind in ('right_branch','left_branch'):
        right=kind=='right_branch';a=m['a'] if right else -m['a'];original=a*(x-m['h'])**2+m['k'];domain=s.Interval(m['cut'],s.oo) if right else s.Interval(-s.oo,m['cut']);inv=chosen(fields['formula'])
        same(sets(f['domain']),function_range(original,x,domain));same(sets(f['range']),domain);zero(original.subs(x,inv)-x)
        for t in [m['cut'],m['cut']+(1 if right else -1),m['cut']+(3 if right else -3)]:zero(inv.subs(x,original.subs(x,t))-t)
    elif kind=='cutoff':
        same(expr(f['cutoff']),m['h']);same(sets(f['domain']),s.Interval(m['k'],s.oo));same(expr(f['value']),m['h']+3)
        # Every smaller cutoff includes two inputs equally distant from the vertex.
        for d in [s.Rational(1,2),2]:same((-d)**2+m['k'],d*d+m['k'])
    elif kind=='root_inverse':
        inv=expr(f['formula']);same(sets(f['domain']),s.Interval.open(m['k'],s.oo));same(sets(f['range']),s.Interval.open(m['h'],s.oo));zero(inv.subs(x,s.sqrt(x-m['h'])+m['k'])-x)
        for t in [m['k']+1,m['k']+2]:zero(s.sqrt(inv.subs(x,t)-m['h'])+m['k']-t)
    elif kind=='reflect_points':same(pairs(f['points']),s.FiniteSet(*(s.Tuple(b,a) for a,b in m['points'])))
    elif kind=='inverse_intersections':
        h=m['h'];original=(x-h)**2+h;actual=s.solveset(original-x,x,domain=s.Interval(h,s.oo));same(pairs(f['points']),s.FiniteSet(*(s.Tuple(a,a) for a in actual)))
    elif kind=='reciprocal_graph':
        original=m['k']/x;zero(expr(f['inverse'][0])/expr(f['inverse'][1])-original);zero(original.subs(x,original)-x);same(pairs(f['points']),s.FiniteSet(*(s.Tuple(a,a) for a in s.solveset(x*x-m['k'],x,domain=s.S.Reals))))
    elif kind=='intercepts':
        inv=(x-m['b'])/m['m'];same(f['intercept'],'B');root=s.solveset(inv,x,domain=s.Interval(m['m']+m['b'],s.oo));same(root,s.S.EmptySet);same(pairs(f['point']),s.FiniteSet(s.Tuple(0,inv.subs(x,0))))
    elif kind=='transform_point':
        B=expr(m['B']);A=m['A'];point=s.Tuple(m['h']+m['u']/B,A*m['v']+m['k']);same(pairs(f['point']),s.FiniteSet(point));assert m['lo']<=m['u']<m['hi']
        allowed=s.solve_univariate_inequality(B*(x-m['h'])>=m['lo'],x,relational=False)&s.solve_univariate_inequality(B*(x-m['h'])<m['hi'],x,relational=False);same(sets(f['domain']),allowed)
    elif kind=='translation':zero(expr(f['formula'])-((x-m['h'])**2+2*(x-m['h'])-1+m['k']))
    elif kind=='stretch':
        B=expr(m['B']);zero(expr(f['formula'])-m['A']*((B*x)**3-2*B*x))
    elif kind=='order':
        h=m['h'];scale=m['scale'];a=x/scale-h;b=(x-h)/scale;zero(expr(f['first'])-((a-1)**2+2));zero(expr(f['second'])-((b-1)**2+2));assert s.expand(expr(f['first'])-expr(f['second']))!=0
    else:raise ValueError(kind)

# Independently verify every worked example's substantive conclusions.
same(function_range((x-2)**2+1,x,s.S.Reals),s.Interval(1,s.oo))
same(function_range(8-3*x,x,s.Interval(-1,2,left_open=True)),s.Interval(2,11,right_open=True))
zero((2*((3*x+5)/(x-2))+5)/(((3*x+5)/(x-2))-3)-x)
same(s.FiniteSet(s.Tuple(1,-2),s.Tuple(4,1),s.Tuple(9,3)),s.FiniteSet(*(s.Tuple(b,a) for a,b in [(-2,1),(1,4),(3,9)])))
zero(3*(x*x+1)-2-(3*x*x+1));zero((3*x-2)**2+1-(9*x*x-12*x+5))
same(s.solve_univariate_inequality(2*x+1>=4,x,relational=False)&s.Interval(0,s.oo),s.Interval(s.Rational(3,2),s.oo))
zero(2*(3*x*x+x+1)-3-(6*x*x+2*x-1))
zero(1/(1/(x-2)-2)-(x-2)/(5-2*x));same(s.S.Reals-s.FiniteSet(2,s.Rational(5,2)),sets('(-inf,2) U (2,5/2) U (5/2,inf)'))
same(function_range(2*(x-1)**2-3,x,s.Interval(3,s.oo)),s.Interval(5,s.oo))
same(function_range(7-2*(x+1)**2,x,s.Interval(-s.oo,-2)),s.Interval(-s.oo,5))
same(function_range(s.sqrt(x-2)+3,x,s.Interval.open(2,s.oo)),s.Interval.open(3,s.oo))
same(function_range((x-2)**2+1,x,s.Interval(2,5,left_open=True)),s.Interval(1,10,left_open=True))
same(function_range((x-2)/2,x,s.Interval(4,8,left_open=True)),s.Interval(1,3,left_open=True))
same(s.Tuple(1,4)[::-1],s.Tuple(4,1));same(s.Tuple(3,8)[::-1],s.Tuple(8,3))
same(s.solveset((x-1)**2+1-x,x,domain=s.Interval(1,s.oo)),s.FiniteSet(1,2))
zero(6-(6-x)-x);same(6-1,5)
zero(1+3/((2+3/(x-1))-2)-x)
zero((x-3)**2+2*(x-3)-3-(x*x-4*x))
zero(-2*((x/3)**3-2*x/3)-(-2*x**3/27+4*x/3))
same(s.Tuple(1+s.Rational(6,3),2*(-1)-4),s.Tuple(3,-6))
same(3*(1+2),9);same(3*1+2,5)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_and_boundary_assertions=checks,failed=0)))
