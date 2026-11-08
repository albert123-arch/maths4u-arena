"""Independent exact weighted outcome enumeration and inverse probability checks."""
from pathlib import Path
from fractions import Fraction as F
from itertools import product,permutations
from collections import defaultdict
from math import factorial
import json
import sympy as s
p=json.loads(Path('content/original/9709-s1/probability-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/probability-math-models.json').read_text('utf-8'));checks=0
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def dist(d):same(sum(d.values()),1);same(all(v>=0 for v in d.values()),True);return d
def mass(d,event):return sum((v for x,v in d.items() if event(x)),F(0))
def cond(d,event,given):
 denominator=mass(d,given);same(denominator>0,True)
 return mass(d,lambda x:given(x) and event(x))/denominator
def binary(ps):
 d={}
 for bits in product([0,1],repeat=len(ps)):
  weight=F(1)
  for bit,prob in zip(bits,ps):weight*=prob if bit else 1-prob
  d[bits]=weight
 return dist(d)
def biased(ps):return dist({(x,y):ps[i]*ps[j] for i,x in enumerate([1,2,4]) for j,y in enumerate([1,2,4])})
def contest(prob):
 d={}
 def walk(path,weight):
  if path.count(1)==2 or path.count(0)==2:d[path]=weight;return
  walk(path+(1,),weight*prob);walk(path+(0,),weight*(1-prob))
 walk((),F(1));return dist(d)
def hidden(w,a,b,two=False):
 d={}
 for group,weight,prob in [(1,w,a),(0,1-w,b)]:
  for bits,v in binary([prob]*(2 if two else 1)).items():d[(group,*bits)]=weight*v
 return dist(d)
def without(R,B):
 colours=[1]*R+[0]*B;d=defaultdict(F);pairs=list(permutations(range(len(colours)),2))
 for i,j in pairs:d[(colours[i],colours[j])]+=F(1,len(pairs))
 return dist(d)
def transfer(ar,ab,br,bb):
 A=[1]*ar+[0]*ab;B=[1]*br+[0]*bb;d=defaultdict(F)
 for moved in A:
  destination=B+[moved]
  for selected in destination:d[(moved,selected)]+=F(1,len(A)*len(destination))
 return dist(d)
def conditional_replacement(R,B):
 colours=[1]*R+[0]*B;d=defaultdict(F)
 for index,first in enumerate(colours):
  remaining=colours if first else colours[:index]+colours[index+1:]
  for second in remaining:d[(first,second)]+=F(1,len(colours)*len(remaining))
 return dist(d)
def stop_two(R,B):
 colours=[1]*R+[0]*B;N=len(colours);d=defaultdict(F)
 for order in permutations(range(N)):
  path=[]
  for index in order:
   path.append(colours[index])
   if sum(path)==2:break
  d[tuple(path)]+=F(1,factorial(N))
 return dist(d)
def solution(expr,symbol):
 roots=s.solve(expr,symbol);same(len(roots),1);value=F(roots[0]);same(0<=value<=1,True);return value

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={a['key']:a['expected'] for a in q['fields']};kind=m['kind']
 def check(key,value):same(F(f[key]),value)
 if kind=='pairs':
  outcomes=list(product(range(1,m['n']+1),repeat=2));good=[x for x in outcomes if sum(x)>=m['target']];check('count',len(good));check('total',len(outcomes));check('probability',F(len(good),len(outcomes)))
 elif kind=='venn':
  a,b,j=map(F,[m['a'],m['b'],m['joint']]);regions=[F(f[k]) for k in ['a_only','both','b_only','neither']];same(sum(regions),1);same(all(x>=0 for x in regions),True);same(regions[0]+regions[1],a);same(regions[1]+regions[2],b);same(regions[1],j)
 elif kind=='relation':
  a,b=F(m['a']),F(m['b']);j=F(0) if not m['independent'] else a*b;check('joint',j);check('union',a+b-j);same(f['choice'],'A' if j==a*b else 'B')
 elif kind=='biased':
  d=biased(list(map(F,m['probs'])));check('total_five',mass(d,lambda x:sum(x)==5));check('condition',mass(d,lambda x:4 in x));check('conditional',cond(d,lambda x:sum(x)==5,lambda x:4 in x))
 elif kind=='three_trials':
  d=binary([F(m['p'])]*3);check('first_only',d[(1,0,0)]);check('exactly_one',mass(d,lambda x:sum(x)==1));check('at_least_one',mass(d,lambda x:sum(x)>=1))
 elif kind=='unequal':
  d=binary(list(map(F,m['probs'])));check('all',d[(1,1,1)]);check('two',mass(d,lambda x:sum(x)==2));check('none',d[(0,0,0)])
 elif kind=='keys':
  d=dist({i:F(1,m['n']) for i in range(1,m['n']+1)});check('success',mass(d,lambda i:i<=m['h']));check('last',d[m['h']]);check('conditional',cond(d,lambda i:i==m['h'],lambda i:1<i<=m['h']))
 elif kind=='contest':
  d=contest(F(m['p']));check('win',mass(d,lambda x:x.count(1)==2));check('two',mass(d,lambda x:len(x)==2));check('conditional',cond(d,lambda x:len(x)==3,lambda x:x.count(1)==2))
 elif kind=='table':
  a,b,c,d=m['cells'];outcomes=[(1,1)]*a+[(1,0)]*b+[(0,1)]*c+[(0,0)]*d;measure=defaultdict(F)
  for x in outcomes:measure[x]+=F(1,len(outcomes))
  dist(measure);check('a_given_b',cond(measure,lambda x:x[0],lambda x:x[1]));check('b_given_a',cond(measure,lambda x:x[1],lambda x:x[0]));check('joint',measure[(1,1)])
 elif kind=='marginals':
  a,b,c=F(f['a_only']),F(f['b_only']),F(f['neither']);same(a+m['J'],m['A']);same(b+m['J'],m['B']);same(a+b+c+m['J'],m['N']);same(all(x>=0 and x.denominator==1 for x in [a,b,c]),True);check('conditional',F(m['J'],m['A']))
 elif kind=='unknown_table':
  a,b,c=m['a'],m['b'],m['c'];n=F(f['unknown']);N=a+b+c+n;same(n>0 and n.denominator==1,True);same(F(a,N),F(a+b,N)*F(a+c,N));check('xor',F(b+c,N));check('conditional',F(a,a+c))
 elif kind=='reverse':
  a,ba,ab=map(F,[m['a'],m['ba'],m['ab']]);joint=F(f['joint']);b=F(f['b']);same(joint/a,ba);same(joint/b,ab);check('xor',a+b-2*joint);same(all(x>=0 for x in [joint,a-joint,b-joint,1-a-b+joint]),True)
 elif kind=='mixture':
  d=hidden(*map(F,[m['w'],m['a'],m['b']]));check('joint',d[(1,1)]);check('total',mass(d,lambda x:x[1]));check('posterior',cond(d,lambda x:x[0],lambda x:x[1]))
 elif kind=='unknown_branch':
  w,a,T=map(F,[m['w'],m['a'],m['total']]);z=s.Symbol('z');b=solution(w*a+(1-w)*z-T,z);check('q',b);d=hidden(w,a,b);same(mass(d,lambda x:x[1]),T);check('joint',d[(0,1)]);check('posterior',cond(d,lambda x:not x[0],lambda x:x[1]))
 elif kind=='hidden_group':
  w,a,b=map(F,[m['w'],m['a'],m['b']]);d=hidden(w,a,b,True);marginal=mass(d,lambda x:x[1]);joint=mass(d,lambda x:x[1] and x[2]);check('marginal',marginal);check('joint',joint);check('posterior',cond(d,lambda x:x[0],lambda x:x[1] and x[2]));same(joint!=marginal*mass(d,lambda x:x[2]),True);same(f['choice'],'B' if q['id'].endswith('-0') else 'C')
 elif kind=='unknown_weight':
  a,b,T=map(F,[m['a'],m['b'],m['total']]);z=s.Symbol('z');w=solution(z*a+(1-z)*b-T,z);check('weight',w);d=hidden(w,a,b);same(mass(d,lambda x:x[1]),T);check('joint',d[(1,1)]);check('posterior',cond(d,lambda x:x[0],lambda x:x[1]))
 elif kind=='without':
  d=without(m['R'],m['B']);check('rr',d[(1,1)]);check('one',mass(d,lambda x:sum(x)==1));check('conditional',cond(d,lambda x:sum(x)==2,lambda x:sum(x)>=1))
 elif kind=='transfer':
  d=transfer(m['ar'],m['ab'],m['br'],m['bb']);check('joint',d[(1,1)]);check('total',mass(d,lambda x:x[1]));check('posterior',cond(d,lambda x:x[0],lambda x:x[1]))
 elif kind=='conditional_replacement':
  d=conditional_replacement(m['R'],m['B']);check('same',mass(d,lambda x:x[0]==x[1]));check('blue',mass(d,lambda x:not x[1]));check('posterior',cond(d,lambda x:x[0],lambda x:not x[1]))
 elif kind=='stop_two':
  d=stop_two(m['R'],m['B']);same(all(sum(x)==2 and sum(x[:-1])<2 for x in d),True);check('at_three',mass(d,lambda x:len(x)==3));check('by_three',mass(d,lambda x:len(x)<=3));check('conditional',cond(d,lambda x:not x[0],lambda x:len(x)==3))
 else:raise AssertionError(kind)

# Twenty worked examples: exact conclusions from separately enumerated models.
d=dist({x:F(1,16) for x in product(range(1,5),repeat=2)});same(mass(d,lambda x:sum(x)>=6),F(3,8));same(mass(d,lambda x:x[0]==x[1]),F(1,4));same(cond(d,lambda x:x[0]==x[1],lambda x:sum(x)>=6),F(1,3))
same(sum([F(7,20),F(1,4),F(1,4),F(3,20)]),1);same(F(7,20)+F(1,4),F(3,5))
same(F(2,5)+F(1,3),F(11,15));same(F(2,5)*F(1,3)!=0,True)
d=biased([F(1,2),F(1,3),F(1,6)]);same(cond(d,lambda x:sum(x)==5,lambda x:4 in x),F(6,11))
d=binary([F(3,4),F(2,3),F(4,5)]);same(d[(1,1,1)],F(2,5));same(mass(d,lambda x:sum(x)==2),F(13,30));same(mass(d,lambda x:sum(x)>=1),F(59,60))
d=binary([F(2,5)]*3);same(mass(d,lambda x:sum(x)==1),F(54,125));same(mass(d,lambda x:sum(x)>=2),F(44,125))
same(cond({i:F(1,6) for i in range(1,7)},lambda i:i==4,lambda i:1<i<=4),F(1,3))
d=contest(F(3,5));same(mass(d,lambda x:x.count(1)==2),F(81,125));same(cond(d,lambda x:len(x)==3,lambda x:x.count(1)==2),F(4,9))
same(F(12,18),F(2,3));same(F(12,20),F(3,5));same(F(12,40)!=F(20,40)*F(18,40),True)
same(15+9+21+15,60);same(F(15+21,60),F(3,5))
same(F(6,25),F(10,25)*F(15,25));same(1-F(6,25),F(19,25))
same(F(2,5)*F(3,4),F(3,10));same(F(3,10)/F(3,5),F(1,2));same(F(2,5)+F(1,2)-2*F(3,10),F(3,10))
d=hidden(F(1,3),F(3,4),F(2,5));same(mass(d,lambda x:x[1]),F(31,60));same(cond(d,lambda x:x[0],lambda x:x[1]),F(15,31))
same(F(2,5)*F(3,4)+F(3,5)*F(1,2),F(3,5))
d=hidden(F(1,4),F(4,5),F(2,5),True);same(mass(d,lambda x:x[1]),F(1,2));same(mass(d,lambda x:x[1] and x[2]),F(7,25));same(cond(d,lambda x:x[0],lambda x:x[1] and x[2]),F(4,7))
d=hidden(F(1,4),F(1,10),F(1,50));same(mass(d,lambda x:x[1]),F(1,25));same(cond(d,lambda x:x[0],lambda x:x[1]),F(5,8))
d=without(3,5);same(d[(1,1)],F(3,28));same(mass(d,lambda x:sum(x)==1),F(15,28));same(cond(d,lambda x:sum(x)==2,lambda x:sum(x)>=1),F(1,6))
d=transfer(2,3,4,2);same(mass(d,lambda x:x[1]),F(22,35));same(cond(d,lambda x:x[0],lambda x:x[1]),F(5,11))
d=conditional_replacement(4,3);same(mass(d,lambda x:x[0]==x[1]),F(23,49));same(mass(d,lambda x:not x[1]),F(19,49));same(cond(d,lambda x:x[0],lambda x:not x[1]),F(12,19))
d=stop_two(2,2);same([mass(d,lambda x:len(x)==n) for n in [2,3,4]],[F(1,6),F(1,3),F(1,2)]);same(cond(d,lambda x:not x[0],lambda x:len(x)==3),F(1,2))
same(len({ex['verification'] for l in p['lessons'] for ex in l['examples']}),20)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_enumeration_structure_and_boundary_checks=checks,failed=0)))
