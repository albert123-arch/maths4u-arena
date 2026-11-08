"""Independent finite-distribution teaching and complete-answer practice for 9709 S1."""
from fractions import Fraction as F
from itertools import product, combinations
from collections import defaultdict, Counter
from html import escape
from html import unescape
import re
import sympy as s

lessons, questions, models = [], [], []

def latex(v):
 return s.latex(s.Rational(v.numerator, v.denominator) if isinstance(v, F) else s.sympify(v))

def math(v):return r'\(' + latex(v) + r'\)'

def table(headers, rows):
 return '<div class="table-scroll"><table><thead><tr>' + ''.join('<th scope="col">'+x+'</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>'+''.join('<td>'+x+'</td>' for x in row)+'</tr>' for row in rows) + '</tbody></table></div>'

def dist(pairs):
 d=defaultdict(F)
 for x,p in pairs:d[F(x)]+=F(p)
 return dict(sorted((x,p) for x,p in d.items() if p))

def uniform(values):
 c=Counter(values);return {F(x):F(n,len(values)) for x,n in sorted(c.items())}

def weighted(xs,ws):return dist(zip(xs,[F(w,sum(ws)) for w in ws]))

def moments(d):
 mu=sum(x*p for x,p in d.items());second=sum(x*x*p for x,p in d.items());return mu,second,second-mu*mu

def probability(d,condition):return sum(p for x,p in d.items() if condition(x))

def dt(d,var='X',condition=False):
 return table([r'\(x\)',r'\(\mathrm P('+var+r'=x'+(r'\mid H' if condition else '')+r')\)'],[[math(x),math(p)] for x,p in d.items()])

def worked(d,var='X',condition=False):
 mu,e2,v=moments(d)
 suffix=r'\mid H' if condition else '';mass='p_H' if condition else 'p'
 return dt(d,var,condition)+table([r'\(x\)',r'\(x'+mass+r'(x)\)',r'\(x^2'+mass+r'(x)\)'],[[math(x),math(x*p),math(x*x*p)] for x,p in d.items()])+r'\[\begin{aligned}\mathrm E('+var+suffix+r')&='+latex(mu)+r',\\\mathrm E('+var+r'^2'+suffix+r')&='+latex(e2)+r',\\\operatorname{Var}('+var+suffix+r')&='+latex(e2)+'-('+latex(mu)+r')^2\\&='+latex(v)+r'.\end{aligned}\]'

def field(key,label,value):return dict(key=key,label=label,type='number',expected=str(value))

def choice(value,options):return dict(key='choice',label='Correct conclusion',type='choice',expected=value,options=options)

def picture(name,alt):return '<p><img src="/assets/original/s1-distributions/'+name+'.svg" alt="'+alt+'"></p>'

def notation(html):
 # Only mathematical prose is wrapped; existing TeX, tags, attributes and labels are untouched.
 chunks=re.split(r'(\\\(.*?\\\)|\\\[.*?\\\]|<[^>]+>)',html,flags=re.S)
 for i in range(0,len(chunks),2):
  def convert(match):
   value=unescape(match.group()).replace('²','^2').replace('≥',r'\ge ').replace('≤',r'\le ').replace('−','-').replace('|',r'\mid ')
   value=re.sub(r'\bVar\(',lambda m:r'\operatorname{Var}(',value)
   value=re.sub(r'\b([EP])\(',lambda m:r'\mathrm '+m.group(1)+'(',value)
   return r'\('+value+r'\)'
  chunks[i]=re.sub(r'\b(?:Var|E|P)\([^()]*(?:\([^()]*\)[^()]*)?\)',convert,chunks[i])
 return ''.join(chunks)

def lesson(key,title,summary,ideas,mistakes):
 lessons.append(dict(key=key,id='orig_9709_s1_dist_'+key,title=title,summary=summary,objective=summary,before='<p>Use exact fractions, mutually exclusive outcomes and conditional probabilities. Selection models also use combinations from the preceding chapter. This chapter covers finite discrete distributions; named binomial and geometric models follow in the next chapter.</p>',ideas=ideas,method='<ol><li>Define the numerical random variable and list its possible values.</li><li>Choose elementary outcomes and justify their probabilities.</li><li>Combine every route giving the same value; check non-negative probabilities summing to one.</li><li>Find the weighted first and second moments, then subtract the square of the mean.</li><li>For a condition, restrict and renormalise the table before recalculating its moments.</li><li>Interpret the result in its units and check any parameter against the original model.</li></ol>',mistakes=mistakes,examples=[]))

lesson('tables_parameters','Discrete variables, tables and unknown probabilities',
 'Build a valid table and recover unknown probabilities from total probability and moments.',
 r'''<h3>A variable attaches a number to an outcome</h3><p>A random variable X records a numerical result of a chance experiment. Its possible values form its support. Capital X denotes the variable; lower-case x denotes a value it can take. A finite distribution lists every possible value once and assigns its total probability.</p>
 <h3>Check the table before using it</h3>\[0\le p(x)\le1,\qquad\sum_xp(x)=1.\]<p>The probabilities, not the values of X, sum to one. A parameter obtained from an equation is acceptable only if every table entry remains non-negative. Negative values of X are allowed; negative probabilities are not.</p>
 <h3>Expectation is a weighted long-run average</h3>\[\mathrm E(X)=\sum_x xp(x).\]<p>Multiply each value by its probability and add. The mean need not itself be a possible outcome, and it need not be the most probable value. Over n comparable repetitions, the expected frequency of a value is np(x); it is not a guarantee about a particular run.</p>
 <h3>Variance uses the second moment</h3>\[\begin{aligned}\mathrm E(X^2)&=\sum_xx^2p(x),\\\operatorname{Var}(X)&=\mathrm E(X^2)-[\mathrm E(X)]^2.\end{aligned}\]<p>Square the value before weighting it. Do not square the probability. Variance is non-negative and has squared units; the standard deviation is its non-negative square root. Keep fractions exact until a requested final rounding.</p>
 <h3>Unknown entries require independent equations</h3><p>Normalisation supplies one equation. A stated mean or second moment can supply another. Solve, reconstruct the full table, then test every entry and the stated moment. If variance is supplied, first recover the second moment by adding the square of the mean.</p>'''+picture('probability-bars','A discrete distribution with separated probability bars and total mass one'),
 ['The mean is not the unweighted average of the listed values.','E(X squared) differs from the square of E(X).','Do not square probabilities when finding the second moment.','A normalised table can still be invalid if one entry is negative.'])

lesson('finite_experiments','Distributions from finite experiments',
 'Aggregate elementary outcomes correctly for sums, differences, minima and counts of successes.',
 r'''<h3>Start with the experiment, not a familiar-looking table</h3><p>For two independent uniform choices, a grid of ordered elementary pairs is equally likely. The numerical result need not be uniform: several pairs can give one value. With biased choices, multiply the actual branch probabilities instead of counting grid cells alone.</p>
 <h3>Aggregate equal results</h3><p>If X is a sum, product, minimum or absolute difference, evaluate X on every permitted outcome. Add the probabilities of all outcomes with the same result. A repeated face label still represents separate physical faces when the selection is uniform over faces.</p>'''+picture('sum-grid','Nine equally likely ordered pairs aggregate into six possible sum values')+r'''
 <h3>Check support and symmetry</h3><p>An absolute difference cannot be negative. The largest minimum cannot exceed the largest original value. A maximum or minimum usually has an uneven distribution. Symmetry can check a table but does not replace its construction.</p>
 <h3>Different trial probabilities need their own branches</h3><p>A count of successes from three independent trials can be found using eight success/failure paths. If success probabilities differ, the probabilities of paths with the same success count can differ too. Do not apply an identical-trial model without checking its assumptions.</p>
 <h3>Calculate moments from the resulting table</h3><p>Once paths are aggregated, use the same weighted-moment method as in the first lesson. This also works when the result is not a sum. A correct mean alone does not prove that the probability table is correct.</p>''',
 ['Different numerical results need not be equally likely.','Ordered pairs and unordered selections are different sample spaces.','Keep separate physical faces even when labels repeat.','Independent trials need not have the same success probability.'])

lesson('without_replacement','Sampling without replacement and stopping positions',
 'Construct distributions from physical subsets and finite stopping rules without continuing a stopped path.',
 r'''<h3>Sampling changes the available objects</h3><p>Without replacement, a later draw depends on what has already been removed. For a uniformly selected unordered subset, every physical subset of the stated size has equal probability. Equal labels do not merge the underlying objects before probabilities are counted.</p>
 <h3>Count every feasible composition</h3><p>If a population contains R marked and B unmarked objects and n are selected, the probability of r marked objects is obtained by choosing r of the marked objects and n−r of the others, then dividing by all n-subsets. Include only feasible integer values of r.</p>\[\mathrm P(X=r)=\frac{\binom Rr\binom B{n-r}}{\binom{R+B}n}.\]<p>This is a counting construction; no new named-distribution formula is required. A sequential tree gives the same result if all orders producing a composition are included.</p>
 <h3>A stopping variable records a position</h3><p>If X is the draw on which the first marked object appears, X counts draws, not preceding failures. If X is the position of the last marked object, all marked objects must have appeared by that position. Find the minimum and maximum possible positions before calculating.</p>'''+picture('stopping-positions','The first marked draw has positions one to four and a decreasing probability table')+r'''
 <h3>Do not continue a terminal path</h3><p>Multiply probabilities along a path only until its stopping condition is met. Add all terminal paths with the same draw count. In a finite bag the process must stop by a definite final draw; check that the terminal probabilities sum to one.</p>
 <h3>Conditioning changes the support</h3><p>Given that the stopping position lies in a range, discard positions outside it and divide the retained probabilities by their sum. The conditional mean and variance use this new normalised table.</p>''',
 ['A uniform physical subset is not a uniform visible pattern.','A stopping position includes the successful draw.','Do not replace changing denominators by independent trial probabilities.','Only the original possible positions can remain after conditioning.'])

lesson('conditional_processes','Conditional models and finite-stage experiments',
 'Build mixtures and changing-content models, then renormalise and recompute moments under a condition.',
 r'''<h3>A hidden first choice creates a mixture</h3><p>If a bag or machine is chosen first, weight each of its possible final results by the probability of reaching it. A simple average of two tables is justified only when the initial choices are equally likely.</p>\[\begin{aligned}\mathrm P(X=x)&=\mathrm P(A)\mathrm P(X=x\mid A)\\&\quad+\mathrm P(A')\mathrm P(X=x\mid A').\end{aligned}\]
 <h3>A transfer changes the destination</h3><p>Track the item actually transferred, the resulting contents and the next sample size. Each branch can have a different conditional table. Combine branches only after calculating their probabilities.</p>
 <h3>Restrict and renormalise</h3><p>For an event H with positive probability, retain the outcomes satisfying H and divide each retained probability by P(H).</p>\[\mathrm P(X=x\mid H)=\frac{\mathrm P(\{X=x\}\cap H)}{\mathrm P(H)}.\]<p>For conditions on X itself, the numerator is the original table entry for each retained value. Conditional expectation is the weighted mean of this new table, not the original mean divided by P(H).</p>
 <h3>Reverse conditioning keeps the route information</h3><p>The final distribution alone can lose which bag or route produced a result. Keep route-labelled probabilities when finding a posterior such as the chance a transferred item was marked given the observed final count.</p>
 <h3>A stop-and-retry rule has terminal rewards</h3><p>A success may end a game early while a failure leads to another trial. Label complete terminal paths by their actual reward. Do not include an unplayed second trial after a first-stage success.</p>''',
 ['A mixture uses the initial choice weights, not an automatic half-and-half average.','Recount the destination after a transfer.','Conditional moments must use a normalised conditional table.','Do not discard route labels before a reverse probability is calculated.'])

lesson('inverse_applications','Inverse problems, rewards and decisions',
 'Recover unknown scores, construct reward tables and compare expected gain with variability.',
 r'''<h3>A missing value is different from a missing probability</h3><p>When a possible score is unknown, its probability remains attached to that score. Substitute the unknown value into the weighted-mean equation and solve. Check the support restrictions, then recompute the second moment and variance.</p>
 <h3>A transformed variable needs a transformed table</h3><p>To handle Y=aX+b, apply the transformation to each possible value and keep its probability. Combine any values that become equal. A negative multiplier reverses the ordering; it does not create negative probabilities. Calculate moments directly from the new table. This chapter does not require rules for sums of independent random variables from Statistics 2.</p>
 <h3>Distinguish gross reward from net gain</h3><p>Net gain is reward minus entry fee, including the loss on a zero-reward outcome. A fair fee gives zero expected net gain; equivalently it equals the expected gross reward. Fairness is a long-run mean statement, not a promise of equal winning and losing chances.</p>
 <h3>A mean does not describe the risk</h3><p>Two games can have the same expected gain but very different variances and chances of a loss. If a decision rule asks for equal expectation and smaller variance, compare both quantities. Without a stated preference, a larger mean alone does not settle every player's choice.</p>
 <h3>Use exact answers and meaningful units</h3><p>Expectations have the units of the reward; variances have squared units. A probability such as P(X&gt;E(X)) uses the values exceeding the mean, even if the mean is not on the support. State which values were included.</p>''',
 ['Do not attach an unknown score to the wrong probability.','A negative transformation reverses value order but preserves probabilities.','Subtract the entry fee on every outcome, including a zero reward.','Equal expectation does not imply equal variability.'])

# Three independently chosen parameter sets: two practice variants and one worked example.
cases = [
 ('tables_parameters',1,'Weights must be normalised','weights',[
  dict(xs=[-2,1,4],ws=[1,2,1]),dict(xs=[-1,2,5],ws=[2,1,2]),dict(xs=[-3,0,2],ws=[1,3,2])]),
 ('tables_parameters',2,'Recover two unknown probabilities','unknown_mean',[
  dict(xs=[0,2,5],ps=['1/5','3/10','1/2']),dict(xs=[-1,1,4],ps=['1/4','1/2','1/4']),dict(xs=[0,3,7],ps=['1/3','1/2','1/6'])]),
 ('tables_parameters',3,'A second moment is not a mean','unknown_second',[
  dict(xs=[-2,0,3],ps=['1/4','1/2','1/4']),dict(xs=[-1,0,2],ps=['1/3','1/2','1/6']),dict(xs=[-3,0,2],ps=['1/5','1/2','3/10'])]),
 ('tables_parameters',4,'Normalisation and a mean determine a parameter','parameter',[
  dict(t='1/4'),dict(t='1/6'),dict(t='1/5')]),
 ('finite_experiments',1,'Equal elementary pairs can give an uneven sum','sum',[
  dict(labels=[0,1,3]),dict(labels=[1,2,4]),dict(labels=[0,2,5])]),
 ('finite_experiments',2,'An absolute difference aggregates both orders','difference',[
  dict(labels=[1,2,4]),dict(labels=[0,2,5]),dict(labels=[1,3,6])]),
 ('finite_experiments',3,'A minimum need not be uniform','minimum',[
  dict(labels=[1,3,4]),dict(labels=[0,2,5]),dict(labels=[2,4,7])]),
 ('finite_experiments',4,'Independent does not mean identical','unequal_trials',[
  dict(ps=['1/2','1/3','2/3']),dict(ps=['1/4','1/2','3/4']),dict(ps=['1/3','1/2','3/4'])]),
 ('without_replacement',1,'The full table counts marked subsets','marked',[
  dict(r=3,b=3),dict(r=4,b=2),dict(r=2,b=3)]),
 ('without_replacement',2,'Equal labels still belong to different physical counters','sample_sum',[
  dict(labels=[1,1,2,4]),dict(labels=[0,2,2,5]),dict(labels=[1,2,2,5])]),
 ('without_replacement',3,'The first marked draw includes the success','first',[
  dict(r=2,b=3),dict(r=3,b=2),dict(r=2,b=4)]),
 ('without_replacement',4,'The final marked position has a finite bound','last',[
  dict(r=2,b=2),dict(r=3,b=2),dict(r=2,b=3)]),
 ('conditional_processes',1,'Weight the bag before combining its scores','mixture',[
  dict(a=[0,2,2],b=[0,0,3],w='1/3'),dict(a=[0,3,3],b=[0,0,4],w='1/4'),dict(a=[0,1,1],b=[0,0,5],w='2/5')]),
 ('conditional_processes',2,'A transfer changes the next sample','transfer',[
  dict(sr=2,sb=1,dr=1,db=2),dict(sr=1,sb=2,dr=2,db=1),dict(sr=2,sb=2,dr=1,db=3)]),
 ('conditional_processes',3,'Condition before taking moments','truncate',[
  dict(xs=[0,1,3],ws=[2,3,1]),dict(xs=[-1,2,4],ws=[1,2,3]),dict(xs=[0,2,5],ws=[3,2,1])]),
 ('conditional_processes',4,'Only played trials belong to a terminal path','retry',[
  dict(p='1/3',q='2/3'),dict(p='1/4',q='1/2'),dict(p='2/5',q='1/3')]),
 ('inverse_applications',1,'Rebuild the table after a negative transformation','affine',[
  dict(xs=[-1,1,2],ps=['1/4','1/2','1/4'],a=-2,b=5),dict(xs=[0,2,3],ps=['1/3','1/2','1/6'],a=-3,b=4),dict(xs=[-2,0,3],ps=['1/5','1/2','3/10'],a=-2,b=3)]),
 ('inverse_applications',2,'Recover an unknown score before squaring it','score',[
  dict(xs=[0,2,6],ps=['1/4','1/2','1/4']),dict(xs=[-1,3,7],ps=['1/4','1/2','1/4']),dict(xs=[0,2,8],ps=['1/3','1/2','1/6'])]),
 ('inverse_applications',3,'A fair fee and a profitable game differ','reward',[
  dict(xs=[0,3,8],ps=['1/2','1/3','1/6'],fee=2),dict(xs=[0,4,10],ps=['1/2','1/3','1/6'],fee=3),dict(xs=[0,5,12],ps=['1/2','1/3','1/6'],fee=3)]),
 ('inverse_applications',4,'Equal means do not give equal risk','compare',[
  dict(a=[0,4],b=[1,3]),dict(a=[0,6],b=[2,4]),dict(a=[-1,7],b=[1,5])]),
]

def build(kind,r):
 fields=[];extra='';var='X';prefix='';D={};reason=''
 def f(key,label,value):fields.append(field(key,label,value))
 def usual(d):
  mu,e2,v=moments(d);f('mean','Expected value',mu);f('variance','Variance',v)
 if kind=='weights':
  D=weighted(r['xs'],r['ws']);prompt='<p>X has the following distribution, with positive k.</p>'+table([r'\(x\)']+[math(x) for x in r['xs']],[[r'\(\mathrm P(X=x)\)']+[math(s.Symbol('k')*w) for w in r['ws']]])+'<p>Find k, E(X), Var(X), and P(X&gt;E(X)).</p>'
  f('k','Normalising constant k',F(1,sum(r['ws'])));usual(D);f('above','Probability above the mean',probability(D,lambda x:x>moments(D)[0]));reason='<p>Sum the probability coefficients, then divide one by that sum. Form the weighted moments. For the final probability, compare each possible value with the exact mean and add only the entries above it.</p>'
 elif kind in ['unknown_mean','unknown_second']:
  D=dist(zip(r['xs'],map(F,r['ps'])));mu,e2,v=moments(D);xs=r['xs'];known=F(r['ps'][0] if kind=='unknown_mean' else r['ps'][1]);p,q=(D[F(xs[1])],D[F(xs[2])]) if kind=='unknown_mean' else (D[F(xs[0])],D[F(xs[2])]);symbols=[math(known),r'\(p\)',r'\(q\)'] if kind=='unknown_mean' else [r'\(p\)',math(known),r'\(q\)'];given='mean '+math(mu) if kind=='unknown_mean' else 'second moment '+math(e2)
  prompt='<p>X has '+given+' and this distribution.</p>'+table([r'\(x\)']+[math(x) for x in xs],[[r'\(\mathrm P(X=x)\)']+symbols])+'<p>Find p, q, E(X) and Var(X).</p>';f('p','Probability p',p);f('q','Probability q',q);usual(D)
  i,j=(1,2) if kind=='unknown_mean' else (0,2);power=1 if kind=='unknown_mean' else 2;target=mu if power==1 else e2;remaining=target-sum(x**power*w for x,w in D.items() if x not in [F(xs[i]),F(xs[j])]);eq=latex(xs[i]**power)+r'p+'+latex(xs[j]**power)+'q='+latex(remaining)
  prefix=r'\[\begin{aligned}p+q&='+latex(1-known)+r',\\'+eq.replace('=','&=')+r'.\end{aligned}\]';reason='<p>Use normalisation and the stated moment as separate equations. Solve simultaneously and check that both probabilities lie between zero and one. Use squared values in a second-moment equation.</p>'
 elif kind=='parameter':
  t=F(r['t']);D=dist([(-1,t),(0,1-3*t),(2,2*t)]);mu,e2,v=moments(D);prompt='<p>X takes values −1, 0, 2 with probabilities t, 1−3t, 2t respectively. Its mean is '+math(mu)+'. Find t, P(X=0), E(X²), Var(X), then choose the correct variance rule.</p>';f('t','Parameter t',t);f('zero','Probability of zero',D[F(0)]);f('second','Second moment',e2);f('variance','Variance',v);fields.append(choice('B',{'A':'Square each probability before adding','B':'Subtract the square of the mean from the second moment','C':'Subtract the mean from the second moment'}));reason=r'<p>The mean equation is \(-t+4t=3t\). Check \(0\le t\le\frac13\), then reconstruct the table. Variance subtracts the square of the mean, not the mean itself.</p>'
 elif kind in ['sum','difference','minimum']:
  xs=r['labels'];pairs=list(product(xs,repeat=2));fn={'sum':lambda a,b:a+b,'difference':lambda a,b:abs(a-b),'minimum':min}[kind];D=uniform([fn(a,b) for a,b in pairs]);word={'sum':'sum','difference':'absolute difference','minimum':'smaller value'}[kind];prompt='<p>A fair spinner has three equally likely sectors labelled '+', '.join(map(str,xs))+'. Spin it twice independently. X is the '+word+' of the two labels.</p>'
  if kind=='sum':target=xs[0]+xs[-1];prompt+='<p>Find P(X='+str(target)+'), E(X) and Var(X).</p>';f('event','Probability of the stated sum',D[F(target)])
  elif kind=='difference':prompt+='<p>Find P(X=0), E(X), Var(X), and P(X≥'+str(xs[1]-xs[0]+1)+' | X&gt;0).</p>';f('zero','Probability of zero difference',D[F(0)])
  else:prompt+='<p>Find P(X='+str(min(xs))+'), E(X) and Var(X).</p>';f('minimum','Probability of the smallest label',D[F(min(xs))])
  usual(D)
  if kind=='difference':f('conditional','Conditional probability',probability(D,lambda x:x>=xs[1]-xs[0]+1)/(1-D[F(0)]))
  reason='<p>List the nine ordered pairs, each with probability '+math(F(1,9))+'. Evaluate the specified function on each pair, then aggregate equal results. The resulting values are not assumed equally likely.</p>'
 elif kind=='unequal_trials':
  ps=list(map(F,r['ps']));D=dist([(sum(path),__import__('functools').reduce(lambda a,b:a*b,[p if z else 1-p for p,z in zip(ps,path)],F(1))) for path in product([0,1],repeat=3)]);prompt='<p>Three independent trials have success probabilities '+', '.join(math(p) for p in ps)+'. X is the total number of successes. Find P(X=2), E(X) and Var(X), then choose the valid model statement.</p>';f('two','Probability of two successes',D[F(2)]);usual(D);fields.append(choice('C',{'A':'The three trial probabilities must be averaged before using identical trials','B':'Independence makes all eight paths equally likely','C':'Use the actual probability of each of the eight paths'}));reason='<p>Multiply the actual success/failure probabilities along each of the eight paths. Add paths with the same success count. Independence permits multiplication but does not make unequal trials identical.</p>'
 elif kind in ['marked','sample_sum']:
  labels=[1]*r['r']+[0]*r['b'] if kind=='marked' else r['labels'];samples=list(combinations(range(len(labels)),2));D=uniform([sum(labels[i] for i in indices) for indices in samples])
  if kind=='marked':prompt=f'<p>A bag contains {r["r"]} marked and {r["b"]} unmarked counters. Select two physical counters uniformly without replacement. X is the number marked. Find P(X=0), P(X=1), P(X=2), E(X) and Var(X).</p>';[f('p'+str(x),'Probability of '+str(x)+' marked',D.get(F(x),F(0))) for x in range(3)]
  else:target=sorted(D)[1];prompt='<p>Four different physical counters are labelled '+', '.join(map(str,labels))+'. Select two uniformly without replacement. X is the sum of their labels. Find the number of physical subsets, P(X='+str(target)+'), E(X) and Var(X).</p>';f('subsets','Physical two-counter subsets',len(samples));f('event','Probability of the stated sum',D[target])
  usual(D);reason='<p>List unordered subsets of physical counters, each with probability '+math(F(1,len(samples)))+'. Equal labels retain their physical multiplicities. Group subsets by their numerical result, then calculate the moments.</p>'
 elif kind in ['first','last']:
  R,B=r['r'],r['b'];sets=list(combinations(range(1,R+B+1),R));D=uniform([(min if kind=='first' else max)(z) for z in sets]);prompt=f'<p>A bag contains {R} marked and {B} unmarked counters. Draw without replacement until the '+('first' if kind=='first' else 'last')+' marked counter appears. X is its draw position.</p>'
  if kind=='first':prompt+='<p>Find the largest possible X, P(X=3), E(X) and Var(X).</p>';f('maximum','Largest possible position',max(D));f('third','Probability of position three',D.get(F(3),F(0)));usual(D)
  else:threshold=R+B-1;prompt+='<p>Find P(X='+str(R+B)+'), E(X), Var(X), and P(X='+str(R+B)+' | X≥'+str(threshold)+').</p>';f('last','Probability of the final possible position',D[F(R+B)]);usual(D);f('conditional','Final position given the last two positions',D[F(R+B)]/probability(D,lambda x:x>=threshold))
  reason='<p>In a random ordering, every subset of marked positions is equally likely. Take its minimum for the first marked draw or its maximum for the last. This gives the terminal distribution without continuing a stopped path.</p>'
 elif kind=='mixture':
  w=F(r['w']);A,B=uniform(r['a']),uniform(r['b']);D=dist([(x,p*w) for x,p in A.items()]+[(x,p*(1-w)) for x,p in B.items()]);prompt='<p>Choose bag A with probability '+math(w)+', otherwise bag B. A contains physical tiles labelled '+', '.join(map(str,r['a']))+'; B contains '+', '.join(map(str,r['b']))+'. Choose one tile uniformly from the selected bag. X is its score. Find P(X&gt;0), E(X), Var(X), and P(A | X&gt;0).</p>';positive=probability(D,lambda x:x>0);f('positive','Probability of a positive score',positive);usual(D);f('posterior','Bag A given a positive score',w*probability(A,lambda x:x>0)/positive);reason='<p>Weight each bag table by its selection probability before adding equal scores. For the posterior, the numerator keeps only positive results reached through A; the denominator includes positive results from both bags.</p>'
 elif kind=='transfer':
  sr,sb,dr,db=[r[k] for k in ['sr','sb','dr','db']];out=[];num=F(0)
  for mark,w in [(1,F(sr,sr+sb)),(0,F(sb,sr+sb))]:
   labels=[1]*(dr+mark)+[0]*(db+1-mark);samples=list(combinations(labels,2))
   for selected in samples:
    x=sum(selected);p=w/len(samples);out.append((x,p))
    if mark and x==1:num+=p
  D=dist(out);prompt=f'<p>Source bag has {sr} marked and {sb} unmarked counters; destination bag has {dr} marked and {db} unmarked. Transfer one random source counter to the destination, then choose two destination counters uniformly without replacement. X is the number marked in that pair. Find P(X=1), E(X), Var(X), and the probability the transferred counter was marked given X=1.</p>';f('one','Probability of one marked in the pair',D[F(1)]);usual(D);f('posterior','Marked transfer given one marked in the pair',num/D[F(1)]);reason='<p>Split on the colour transferred. Rebuild the destination on each branch and count physical pairs there. Retain the marked-transfer branch weight for the reverse probability.</p>'
 elif kind=='truncate':
  original=weighted(r['xs'],r['ws']);h=probability(original,lambda x:x>0);D={x:p/h for x,p in original.items() if x>0};prompt='<p>X has the following distribution.</p>'+dt(original)+'<p>Given X&gt;0, find the probability of the largest value, the conditional mean and conditional variance. Also give P(X&gt;0) in the original model.</p>';f('condition','Original probability of the condition',h);f('largest','Conditional probability of the largest value',D[max(D)]);usual(D);reason='<p>Remove non-positive values and divide each retained probability by '+math(h)+'. The table below is the conditional distribution. Use it, rather than the original table, for both moments.</p>'
 elif kind=='retry':
  p,q=F(r['p']),F(r['q']);D=dist([(2,p),(1,(1-p)*q),(0,(1-p)*(1-q))]);prompt='<p>A game ends immediately with reward 2 after a first-stage success, whose probability is '+math(p)+'. Otherwise a second stage succeeds with probability '+math(q)+', giving reward 1; failure gives 0. X is the reward. Find P(X=1), E(X), Var(X), and P(X=2 | X&gt;0).</p>';f('one','Probability of reward one',D[F(1)]);usual(D);f('conditional','Reward two given positive reward',D[F(2)]/(1-D[F(0)]));reason='<p>The first success is already terminal. Reward one needs first-stage failure followed by second-stage success. The zero branch needs both failures. There is no second trial on the reward-two branch.</p>'
 elif kind=='affine':
  original=dist(zip(r['xs'],map(F,r['ps'])));a,b=r['a'],r['b'];D=dist([(a*x+b,p) for x,p in original.items()]);var='Y';prompt='<p>X has this table.</p>'+dt(original)+f'<p>Define Y={a}X+{b}. Give the corresponding Y-value for each listed X in that order, then E(Y) and Var(Y).</p>'
  for i,x in enumerate(r['xs']):f('y'+str(i),'Y when X = '+str(x),a*x+b)
  usual(D);reason='<p>Transform every listed value and keep its probability. The negative coefficient reverses the order, so sort the new table before reading it. Calculate the new moments directly.</p>'
 elif kind=='score':
  D=dist(zip(r['xs'],map(F,r['ps'])));mu,e2,v=moments(D);prompt='<p>X has values '+str(r['xs'][0])+', '+str(r['xs'][1])+', a with probabilities '+', '.join(math(F(p)) for p in r['ps'])+'. Its mean is '+math(mu)+'. Find a, E(X²), Var(X), and P(X&gt;E(X)).</p>';f('score','Unknown score a',r['xs'][2]);f('second','Second moment',e2);f('variance','Variance',v);f('above','Probability above the mean',probability(D,lambda x:x>mu));reason='<p>Use the mean equation to recover a before calculating its squared contribution. The probability stays attached to a. Check which possible values exceed the recovered mean.</p>';prefix=r'\['+latex(F(r['ps'][2]))+'a='+latex(mu-sum(F(p)*x for x,p in zip(r['xs'][:2],r['ps'][:2])))+r'.\]'
 elif kind=='reward':
  gross=dist(zip(r['xs'],map(F,r['ps'])));fee=r['fee'];D=dist([(x-fee,p) for x,p in gross.items()]);prompt='<p>A game pays gross rewards '+', '.join(map(str,r['xs']))+' pounds with probabilities '+', '.join(math(F(p)) for p in r['ps'])+f'. The entry fee is {fee} pounds. X is net gain. Find the fair entry fee, E(X), Var(X), and P(X&gt;0).</p>';f('fair','Fair entry fee',moments(gross)[0]);usual(D);f('positive','Probability of positive net gain',probability(D,lambda x:x>0));reason='<p>The fair fee is the weighted gross reward. For this actual game subtract the stated fee on every outcome, including the zero gross reward. The table below is for net gain in pounds, so variance is in squared pounds.</p>'
 elif kind=='compare':
  A,B=uniform(r['a']),uniform(r['b']);prompt='<p>Game A gives either '+', '.join(map(str,r['a']))+' pounds of net gain, each equally likely. Game B gives either '+', '.join(map(str,r['b']))+' pounds, each equally likely. Find each mean and variance. A player wants equal expected gain with smaller variance: select the appropriate conclusion.</p>'
  for label,d in [('A',A),('B',B)]:f('mean'+label,'Expected gain '+label,moments(d)[0]);f('variance'+label,'Variance '+label,moments(d)[2])
  fields.append(choice('B',{'A':'Choose A because its largest reward is larger','B':'Choose B: the means agree and its variance is smaller','C':'Equal means force the two variances to agree'}));reason='<p>Use both complete net-gain tables. Equal expectations do not make the distributions or their variances equal. Under the stated rule, compare variance only after checking the means agree.</p>';extra='<h4>Game A</h4>'+worked(A)+'<h4>Game B</h4>'+worked(B)
 else:raise ValueError(kind)
 if not extra:
  if kind=='truncate':reason+=r'<p>Write \(H=\{X>0\}\) and \(p_H(x)=\mathrm P(X=x\mid H)\). The moments below are conditional on H.</p>'
  extra=worked(D,var,condition=kind=='truncate')
 answer=''.join('<p>'+escape(f['label'])+': '+(escape(f['options'][f['expected']]) if f['type']=='choice' else math(F(f['expected'])))+'.</p>' for f in fields)
 return notation(prompt),fields,reason+prefix+extra+'<h4>Complete answers</h4>'+answer,answer

for topic,family,title,kind,variants in cases:
 for v,params in enumerate(variants):
  prompt,fields,solution,answer=build(kind,params);uid=f'M4U-9709-S1-DIST-CHECK-{topic.upper()}-{family}-{v}'
  model=dict(uid=uid,kind=kind,params=params)
  if v==2:
   key=f'DIST-{kind.upper()}';model.update(example=key,expected={f['key']:f['expected'] for f in fields});next(l for l in lessons if l['key']==topic)['examples'].append(dict(title=title,question=prompt,solution=solution,verification=key))
  else:
   questions.append(dict(id=uid,family_uid=uid.rsplit('-',1)[0],lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution,hint_html='<p>List the possible numerical values and build their total probabilities first. Check the sum is one, then use weighted moments. Keep the conditioning event and physical sample space explicit.</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
  models.append(model)
