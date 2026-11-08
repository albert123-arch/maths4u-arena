"""Independent finite enumeration of arrangements, subsets, patterns and partitions."""
from pathlib import Path
from fractions import Fraction as F
from itertools import product,permutations,combinations,groupby
import json
p=json.loads(Path('content/original/9709-s1/counting-v1.json').read_text('utf-8'))
models=json.loads(Path('content/original/9709-s1/counting-math-models.json').read_text('utf-8'));checks=0
def same(a,b):
 global checks
 assert a==b,(a,b)
 checks+=1
def orders(n,r=None):return list(permutations(range(n),n if r is None else r))
def subsets(n,r):return list(map(frozenset,combinations(range(n),r)))
def patterns(values):return set(permutations(values))
def pair_next(x,a,b):return abs(x.index(a)-x.index(b))==1
def repeated_patterns(counts):return patterns([i for i,count in enumerate(counts) for _ in range(count)])
def two_pair_counts(k):
 d=patterns([0,0,1,1]+list(range(2,k+2)));E=lambda x:any(x[i]==x[i+1]==0 for i in range(len(x)-1));G=lambda x:any(x[i]==x[i+1]==1 for i in range(len(x)-1))
 return len(d),sum(E(x) for x in d),sum(E(x) and G(x) for x in d),sum(E(x)!=G(x) for x in d),sum(E(x) or G(x) for x in d)
def red_runs(x):return sorted(len(list(g)) for value,g in groupby(x) if value==0)
def red_patterns(n,r):return patterns([0]*r+list(range(1,n+1)))
def partition(groups):return tuple(sorted(tuple(sorted(g)) for g in groups))
def two_teams(r):
 n=2*r;people=frozenset(range(n));named=subsets(n,r);unnamed={partition([team,people-team]) for team in named};same_names=sum(any(0 in group and 1 in group for group in division) for division in unnamed)
 return len(named),len(unnamed),same_names
def group_allocations(sizes):
 labelled=[];unnamed=set();n=sum(sizes)
 for assignment in product(range(len(sizes)),repeat=n):
  if [assignment.count(i) for i in range(len(sizes))]!=sizes:continue
  groups=[tuple(j for j,label in enumerate(assignment) if label==i) for i in range(len(sizes))];labelled.append(groups);unnamed.add(partition(groups))
 return len(labelled),len(unnamed)
def row_counts(r):
 same_row=adjacent=0
 for x in orders(2*r):
  a,b=x.index(0),x.index(1)
  if a//r==b//r:
   same_row+=1;adjacent+=abs(a-b)==1
 return same_row,adjacent
def empty_counts(m,k):
 all_positions=set(range(m));placements=orders(m,k);block=separated=0
 for occupied in placements:
  empty=sorted(all_positions-set(occupied));block+=empty[-1]-empty[0]+1==len(empty);separated+=all(b-a>1 for a,b in zip(empty,empty[1:]))
 return len(placements),block,separated
def overlapping(n):
 d=orders(n);E=lambda x:pair_next(x,0,1);G=lambda x:pair_next(x,1,2)
 return sum(E(x) for x in d),sum(E(x) and G(x) for x in d),sum(E(x)!=G(x) for x in d),sum(E(x) or G(x) for x in d)
def pair_selection(n):
 d=subsets(2*n,4);complete=[sum({2*i,2*i+1}<=team for i in range(n)) for team in d]
 return len(d),complete.count(0),complete.count(1),sum(x>=1 for x in complete)

for m in models:
 q=next(q for q in p['questions'] if q['id']==m['uid']);f={field['key']:field['expected'] for field in q['fields']};kind=m['kind']
 def check(key,value):
  same(F(f[key]),value)
  if isinstance(value,int):same(F(f[key]).denominator,1);same(value>=0,True)
  elif key in ['probability','conditional']:same(0<=value<=1,True)
 if kind=='choose_order':
  d=orders(m['n'],m['r']);sets={frozenset(x) for x in d};multiplicities=[sum(frozenset(x)==group for x in d) for group in sets];same(len(set(multiplicities)),1);check('ordered',len(d));check('selected',len(sets));check('factor',multiplicities[0])
 elif kind=='digits':
  d=[x for x in orders(m['m']+1,m['r']) if x[0]!=0];zero=[x for x in d if x[-1]==0];nz=[x for x in d if x[-1]!=0 and x[-1]%2==0];check('all',len(d));check('zero',len(zero));check('nonzero',len(nz));check('even',sum(x[-1]%2==0 for x in d));same(set(zero).isdisjoint(nz),True)
 elif kind=='block_relative':
  d=orders(m['n']);together=sum(pair_next(x,0,1) for x in d);check('together',together);check('apart',len(d)-together);check('before',sum(x.index(0)<x.index(1) for x in d))
 elif kind=='separation':
  d=orders(m['n']);good=[x for x in d if abs(x.index(0)-x.index(1))-1==m['g']];positions={(x.index(0),x.index(1)) for x in good};check('positions',len(positions));check('arrangements',len(good));check('probability',F(len(good),len(d)))
 elif kind=='multiset':
  d=repeated_patterns(m['counts']);check('total',len(d));check('first',sum(x[0]==0 for x in d));check('last_not',sum(x[-1]!=0 for x in d))
 elif kind=='two_pairs':
  total,single,both,xor,union=two_pair_counts(m['k']);check('both',both);check('xor',xor);same(union>0,True);check('conditional',F(xor,union));same(xor+both,union)
 elif kind=='two_reds':
  d=red_patterns(m['n'],2);separated=sum(red_runs(x)==[1,1] for x in d);adjacent=sum(red_runs(x)==[2] for x in d);check('separated',separated);check('adjacent',adjacent);check('total',len(d));same(separated+adjacent,len(d))
 elif kind=='three_reds':
  d=red_patterns(m['n'],3);no=sum(red_runs(x)==[1,1,1] for x in d);pair=sum(red_runs(x)==[1,2] for x in d);triple=sum(red_runs(x)==[3] for x in d);check('none',no);check('pair',pair);check('triple',triple);same(no+pair+triple,len(d))
 elif kind in ['composition','threshold']:
  d=subsets(m['a']+m['b'],m['r']+m['t'] if kind=='composition' else m['r']);counts=[sum(i<m['a'] for i in team) for team in d];good=sum(k==m['r'] for k in counts) if kind=='composition' else sum(k>=m['minimum'] for k in counts);check('favourable',good);check('total',len(d));check('probability',F(good,len(d)))
 elif kind=='named':
  d=subsets(m['n'],m['r']);check('one',sum((0 in group)!=(1 in group) for group in d));check('both',sum({0,1}<=group for group in d));check('neither',sum(not ({0,1}&group) for group in d));same(sum(int(F(f[k])) for k in ['one','both','neither']),len(d))
 elif kind=='restrictions':
  d=subsets(m['n'],m['r']);not_both={group for group in d if not {0,1}<=group};all_none={group for group in d if (0 in group)==(1 in group)};check('not_both',len(not_both));check('all_none',len(all_none));same(all((0 in group)==(1 in group) for group in all_none),True);same(any((0 in group)!=(1 in group) for group in not_both),True);same(f['choice'],'B' if q['id'].endswith('-0') else 'C')
 elif kind=='two_teams':
  named,unnamed,together=two_teams(m['r']);check('named',named);check('unnamed',unnamed);check('same',together)
 elif kind=='unequal_groups':
  named,unnamed=group_allocations(m['sizes']);check('named',named);check('unnamed',unnamed);same(named,2*unnamed);same(f['choice'],'B' if q['id'].endswith('-0') else 'C')
 elif kind=='rows':
  together,adjacent=row_counts(m['r']);check('same',together);check('adjacent',adjacent);check('conditional',F(adjacent,together))
 elif kind=='empty':
  allcount,block,separated=empty_counts(m['m'],m['k']);check('all',allcount);check('block',block);check('separated',separated)
 elif kind=='selected_first':
  d=orders(m['n'],m['r']);yes=[x for x in d if x[0]==0];no=[x for x in d if 0 not in x];check('included',len(yes));check('absent',len(no));check('total',len(yes)+len(no));same(set(yes).isdisjoint(no),True)
 elif kind=='physical':
  a=m['a'];d=subsets(a+2,2);visible_patterns={tuple(sorted(0 if i<a else i-a+1 for i in selected)) for selected in d};check('physical',len(d));check('patterns',len(visible_patterns));check('exactly',F(sum(sum(i<a for i in selected)==1 for selected in d),len(d)));check('at_least',F(sum(any(i<a for i in selected) for selected in d),len(d)))
 elif kind=='overlapping_adjacency':
  single,both,xor,union=overlapping(m['n']);check('both',both);check('xor',xor);check('conditional',F(single,union));same(xor+both,union)
 elif kind=='complete_pairs':
  total,none,one,atleast=pair_selection(m['pairs']);check('one',one);check('at_least',atleast);check('conditional',F(one,atleast));same(atleast+none,total)
 else:raise AssertionError(kind)

# Restore the conclusions of all twenty worked examples from enumerated outcomes.
same(len(subsets(6,3)),20);same(len(orders(6,3)),120)
d=[x for x in orders(6,4) if x[0]!=0];same(len(d),300);same(sum(x[-1]%2==0 for x in d),156)
d=orders(6);same(sum(pair_next(x,0,1) for x in d),240);same(sum(not pair_next(x,0,1) for x in d),480)
same(sum(x.index(0)<x.index(1)<x.index(2) for x in d),120)
d=repeated_patterns([3,2,1]);same(len(d),60);same(sum(x[0]==0 for x in d),30)
same(two_pair_counts(2),(180,60,24,72,96));same(F(72,96),F(3,4))
d=red_patterns(4,2);same(sum(red_runs(x)==[1,1] for x in d),240);same(sum(red_runs(x)==[2] for x in d),120)
d=red_patterns(3,3);same([sum(red_runs(x)==r for x in d) for r in [[1,1,1],[1,2],[3]]],[24,72,24])
same(sum(sum(i<5 for i in team)==2 for team in subsets(11,5)),200)
d=subsets(7,3);same([sum(sum(i in group for i in [0,1])==k for group in d) for k in [1,2,0]],[20,5,10])
same(sum(sum(i<6 for i in team)>=2 for team in subsets(10,4)),185)
d=subsets(10,4);same(sum(not {0,1}<=group for group in d),182);same(sum((0 in group)==(1 in group) for group in d),98)
same(two_teams(3)[:2],(20,10));same(group_allocations([4,4,1]),(630,315))
same(row_counts(3),(288,192));same(F(192,288),F(2,3));same(empty_counts(7,4),(840,120,240))
d=orders(7,4);same(sum(x[0]==0 for x in d),120);same(sum(0 not in x for x in d),360)
d=subsets(4,2);same(len(d),6);same(sum(bool(group&{0,1}) for group in d),5);same(sum(len(group&{0,1})==1 for group in d),4)
same(overlapping(6),(240,48,384,432));same(F(240,432),F(5,9))
same(pair_selection(4),(70,16,48,54));same(F(48,54),F(8,9))
same(len({ex['verification'] for lesson in p['lessons'] for ex in lesson['examples']}),20)
print(json.dumps(dict(quick_questions=len(models),worked_examples=20,exact_enumeration_structure_and_boundary_checks=checks,failed=0)))
