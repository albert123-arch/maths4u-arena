"""Independent 9709 S1 binomial/geometric notes, examples and exact short checks."""
from fractions import Fraction as F
from math import comb
from html import escape
import re
import sympy as s
from s1_distributions_teaching import latex, math, table, notation

lessons, questions, models = [], [], []

def B(n,p):return [F(comb(n,k))*p**k*(1-p)**(n-k) for k in range(n+1)]

def cumulative(d,lo=0,hi=None):return sum(d[max(0,lo):len(d) if hi is None else hi+1],F(0))

def field(key,label,value):return dict(key=key,label=label,type='number',expected=str(value))

def choice(value,options):return dict(key='choice',label='Correct conclusion',type='choice',expected=value,options=options)

def picture(name,alt):return '<p><img src="/assets/original/s1-binomial-geometric/'+name+'.svg" alt="'+alt+'"></p>'

def prose_math(html):
 html=notation(html)
 chunks=re.split(r'(\\\(.*?\\\)|\\\[.*?\\\]|<[^>]+>)',html,flags=re.S)
 substitutions=dict([('np(1−p)','np(1-p)'),('np(1-p)','np(1-p)'),('p(1−p)','p(1-p)'),('p(1-p)','p(1-p)'),('1−(1−p)ⁿ','1-(1-p)^n'),('1−p','1-p'),('1/p',r'\frac1p'),('Geo(p)',r'\operatorname{Geo}(p)')])
 for i in range(0,len(chunks),2):
  chunks[i]=re.sub('|'.join(map(re.escape,substitutions)),lambda m:r'\('+substitutions[m.group()]+r'\)',chunks[i])
  chunks[i]=re.sub(r'N=min\(T,(\d+|c)\)',lambda m:r'\(N=\min(T,'+m.group(1)+r')\)',chunks[i])
 return ''.join(chunks)

def aligned(rows):return r'\[\begin{aligned}'+r',\\{}'.join(label+'&='+value for label,value in rows)+r'.\end{aligned}\]'

def binomial_table(d):
 return table([r'\(x\)',r'\(\mathrm P(X=x)\)'],[[math(i),math(p)] for i,p in enumerate(d)])

def minimum(p,alpha,strict=False):
 n=0
 while not ((1-(1-p)**n)>alpha if strict else (1-(1-p)**n)>=alpha):n+=1
 return n

def lesson(key,title,summary,ideas,mistakes):
 lessons.append(dict(key=key,id='orig_9709_s1_bg_'+key,title=title,summary=summary,objective=summary,before='<p>Use exact probabilities, combinations and conditional sample spaces from chapters 4–6. Short checks ask for exact fractions unless stated otherwise; follow each written question’s own rounding instruction. Geo(p) counts trials up to and including the first success, starting at 1.</p>',ideas=ideas,method='<ol><li>Define success and what the random variable counts.</li><li>Check independence, constant probability and whether the trial count is fixed or stops at an event.</li><li>Translate words into an exact integer event before choosing a formula or complement.</li><li>For conditional or staged models, identify the reached branch and denominator.</li><li>Keep exact values until the final step; test neighbouring integers for a minimum or maximum.</li><li>Check every feasible parameter branch and explain any stopping rule.</li></ol>',mistakes=mistakes,examples=[]))

lesson('binomial_models','Binomial models and event probabilities',
 'Justify a binomial model and translate exact counts, tails and intervals into probabilities.',
 r'''<h3>A fixed number of trials and a fixed definition of success</h3><p>For a binomial model, count successes in a fixed number n of independent trials. Each trial must have the same success probability p and only success or failure relative to the chosen definition. A trial may have several physical outcomes, provided they are grouped consistently into these two categories.</p>
 \[X\sim\mathrm B(n,p).\]
 <h3>One count can be reached in several orders</h3><p>For exactly r successes, one specified order has probability \(p^r(1-p)^{n-r}\). Choose the r successful positions to account for all orders.</p>\[\mathrm P(X=r)=\binom nr p^r(1-p)^{n-r}.\]<p>The support is the integers from 0 to n. The combination factor is not needed for a single specified order, such as failure on every trial except the last.</p>'''+picture('binomial-counts','A binomial distribution on zero to four successes with probability one half')+r'''
 <h3>Translate the endpoint words first</h3><p>At most k means X≤k; fewer than k means X≤k−1. At least k means X≥k; more than k means X≥k+1. A strict interval L&lt;X&lt;U includes only the integers L+1 through U−1.</p>
 \[\mathrm P(X\ge k)=1-\mathrm P(X\le k-1).\]<p>For at least one success, subtract the probability of no successes. For a small central interval, add its point probabilities. Do not use a complement with the wrong endpoint.</p>
 <h3>State the assumptions in context</h3><p>Sampling a changing finite population without replacement is not exactly binomial. A common batch quality can also make outcomes dependent. Independence is a model assumption that needs a reason, not a consequence of observing repeated trials.</p>''',
 ['Include the combination factor for an unspecified set of success positions.','At least k is complemented by at most k−1.','Do not interchange successes and failures without changing p.','A fixed number of trials differs from stopping on first success.'])

lesson('inverse_binomial','Parameters, moments and integer thresholds',
 'Recover binomial parameters and find exact integer bounds while retaining all feasible branches.',
 r'''<h3>The mean and variance identify different quantities</h3>
 \[\begin{aligned}\mathrm E(X)&=np,\\\operatorname{Var}(X)&=np(1-p).\end{aligned}\]<p>If a standard deviation is supplied, square it before using the variance equation. The mean is measured in counts and the variance in squared counts. For a non-degenerate model with positive mean, divide the variance by the mean to find 1−p, then recover n. Check 0&lt;p&lt;1 and that n is a positive integer.</p>
 \[p=1-\frac{v}{\mu},\qquad n=\frac{\mu}{p}.\]
 <h3>Variance alone can leave two values of p</h3><p>For known n, p(1−p) is unchanged when p is replaced by 1−p. Solve the quadratic, retain both valid values, and use any extra mean or context restriction only afterwards. Label the smaller and larger answers clearly.</p>
 <h3>A probability target gives a bound, not an automatic integer</h3><p>For at least one success in n trials the probability is \(1-(1-p)^n\). This increases with n. A logarithmic estimate can locate the boundary, but the original strict or inclusive inequality decides which integer is valid.</p>
 <h3>Check the neighbouring trial counts</h3><p>For a minimum, verify that the proposed integer satisfies the condition and the preceding integer does not. If the target equals a boundary probability, changing ≥ to &gt; can increase the minimum by one. For a maximum survival condition, check the next integer instead. Do not round a logarithm to the nearest integer without checking.</p>
 <h3>Check the original model after solving</h3><p>A numerical solution with n not an integer is not a binomial trial count. A negative variance, or variance greater than the mean in a non-degenerate binomial model, signals an invalid parameter set. The deterministic boundary cases p=0 and p=1 need separate interpretation.</p>''',
 ['Square a given standard deviation before substituting for variance.','Do not discard p and 1−p without an extra restriction.','n must be an integer, not a rounded estimate that changes the given model.','Strict and inclusive probability targets can have different integer answers.'])

lesson('mixed_binomial','Conditional and multi-stage binomial models',
 'Combine groups and batches correctly, retain shared causes and condition on the actual count event.',
 r'''<h3>Groups with different probabilities need separate counts</h3><p>If two independent groups have different success probabilities, their combined count is not generally binomial with an averaged p. To get one success overall, split into one from the first group and none from the second, or the reverse. Add disjoint cases and retain their labels for a posterior question.</p>
 <h3>A batch event can become a new Bernoulli success</h3><p>First calculate q, the probability a batch meets its stated criterion. If batches are independent and identically generated, the number of qualifying batches in a fixed set is binomial with success probability q. It is q, not the probability of a single item, that belongs in the second model.</p>
 <h3>A shared hidden choice can create dependence</h3><p>A machine chosen once for a batch affects every item in that batch. Trials may be independent conditional on the machine, yet dependent after its identity is hidden. Mix the full conditional count tables using the machine-choice weights. The binomial variance formula using an averaged p need not apply to that mixture.</p>
 <h3>Restrict and renormalise a count table</h3><p>Let H be a count event with positive probability. Intersect the requested event with H and divide by P(H). For conditional moments, retain only the permitted count values and renormalise their probabilities.</p>
 \[\mathrm P(X=r\mid H)=\frac{\mathrm P(\{X=r\}\cap H)}{\mathrm P(H)}.\]
 <p>Given at least one success, the zero-count outcome is removed. The conditional mean is not simply np. Keep the condition explicit in both probability and expectation notation.</p>''',
 ['Averaging different group probabilities does not generally give the combined model.','Use the batch qualification probability in the outer binomial.','Conditional independence does not force unconditional independence.','Conditional expectations need a normalised conditional distribution.'])

lesson('geometric','First success and geometric models',
 'Use the first-success convention, waiting-time tails, memorylessness and finite caps correctly.',
 r'''<h3>Count trials including the first success</h3><p>Repeat independent trials with a constant success probability p until the first success. For 0&lt;p≤1, the trial count T has support 1,2,3,… and is written Geo(p). It counts the successful trial as well as the preceding failures.</p>
 \[\begin{aligned}T&\sim\operatorname{Geo}(p),\\\mathrm P(T=r)&=(1-p)^{r-1}p.\end{aligned}\]
 <h3>Tail events describe runs of failures</h3>\[\begin{aligned}\mathrm P(T&gt;m)&=(1-p)^m,\\\mathrm P(T\le m)&=1-(1-p)^m.\end{aligned}\]<p>T&gt;m means all first m trials failed. T≥m needs only the first m−1 failures. For an interval, subtract the relevant tails with these exact endpoints.</p>'''+picture('first-success','Failure paths before the first success and the remaining tail after four trials')+r'''
 <h3>The expected wait and a restart</h3>\[\mathrm E(T)=\frac1p.\]<p>After a known run of failures, the further wait still has the same geometric law, because the remaining independent trials are unchanged. The expected number of further trials is 1/p; the expected total trial count includes the failures already observed. State which of these the question asks for.</p>
 <h3>Recover p from the correct information</h3><p>The ratio of consecutive positive point probabilities is 1−p. The reciprocal of a given mean is p. In either case check the probability range and use neighbouring integers for a strict or inclusive waiting-time target.</p>
 <h3>A capped wait is a different variable</h3><p>If N=min(T,c), then N=c includes success on c and failure on every one of the c trials. Hence P(N=c) is the probability of reaching trial c, not just of succeeding on it. Build the finite table and calculate E(N) from it; the unrestricted formula 1/p is not E(N).</p>''',
 ['Geo(p) starts at 1, not 0.','T≥m and T&gt;m have different failure counts.','Expected further trials and expected total trials are different after known failures.','At a finite cap combine terminal success and failure outcomes.'])

lesson('success_sequences','Repeated successes and mixed stopping rules',
 'Count success positions and terminal histories without applying an unrequired named distribution.',
 r'''<h3>A second success fixes the final trial</h3><p>For the second success on trial t, the first t−1 trials contain exactly one success and trial t succeeds. Use the earlier binomial count and multiply by the final success probability. This is a construction from familiar methods; no negative-binomial theorem is required.</p>
 \[\mathrm P(S_2=t)=\mathrm P(\mathrm B(t-1,p)=1)\,p.\]
 <h3>By a trial and on a trial are different events</h3><p>The second success by trial m is equivalent to at least two successes in the first m trials. The second success exactly on m excludes histories that had already reached two successes earlier. A specified first-success position can impose further restrictions on those earlier histories.</p>
 <h3>Independent waiting processes keep separate parameters</h3><p>For two independent first-success processes, multiply their point probabilities for a specified pair of finish times. Sum disjoint pairs for events such as simultaneous finishes within a finite window. Given both finish in that window, divide by the probability of that condition.</p>
 <h3>Sampling without replacement changes the hazard</h3><p>A first marked item in a finite bag has a changing success chance after each failure. Use the finite tree or marked-position subsets. The initial success proportion alone does not justify Geo(p) or the mean 1/p.</p>
 <h3>Stop immediately when either condition is met</h3><p>In a race to two successes or two failures, SS and FF end after two trials. Only SF and FS continue. On trial three every remaining path ends. List these terminal histories once, multiply their probabilities and check that the total is one. Never append a trial to an already stopped history.</p>'''+picture('stopped-tree','A race to two successes or two failures has six terminal histories and ends by trial three'),
 ['The final success needs its own probability factor.','Second success on t excludes an earlier second success.','A first success in a finite bag need not be geometric.','Do not count histories after a stopping condition has already occurred.'])

cases=[
 ('binomial_models',1,'A count model and its lower tail','binomial',[
  dict(n=4,p='1/3',r=2,k=2),dict(n=5,p='1/2',r=2,k=3),dict(n=4,p='2/5',r=1,k=2)]),
 ('binomial_models',2,'Define success before using moments','categories',[
  dict(n=4,a='1/6',b='1/3'),dict(n=3,a='1/5',b='1/5'),dict(n=5,a='1/4',b='1/4')]),
 ('binomial_models',3,'Strict endpoints select integer values','interval',[
  dict(n=5,p='1/2',L=1,U=4,r=2),dict(n=4,p='1/3',L=0,U=3,r=1),dict(n=5,p='2/5',L=1,U=4,r=3)]),
 ('binomial_models',4,'A specified order differs from an unspecified count','order',[
  dict(n=4,p='1/2'),dict(n=3,p='1/3'),dict(n=5,p='1/2')]),
 ('inverse_binomial',1,'Recover trial count and success probability','moments',[
  dict(mean='2',variance='1',r=2),dict(mean='3/2',variance='3/4',r=1),dict(mean='4/3',variance='8/9',r=2)]),
 ('inverse_binomial',2,'A known mean supplies p','known_n',[
  dict(n=4,mean='1',r=1,U=2),dict(n=5,mean='5/2',r=2,U=3),dict(n=3,mean='1',r=1,U=2)]),
 ('inverse_binomial',3,'Inclusive and strict targets can differ by one trial','threshold',[
  dict(p='1/2',alpha='7/8'),dict(p='1/3',alpha='65/81'),dict(p='1/4',alpha='37/64')]),
 ('inverse_binomial',4,'Variance can determine two branches','two_roots',[
  dict(n=4,variance='3/4'),dict(n=5,variance='6/5'),dict(n=6,variance='5/6')]),
 ('mixed_binomial',1,'One success overall has two disjoint routes','groups',[
  dict(na=2,pa='1/2',nb=2,pb='1/3'),dict(na=3,pa='1/3',nb=2,pb='1/2'),dict(na=2,pa='1/4',nb=3,pb='1/2')]),
 ('mixed_binomial',2,'A common machine makes the trials dependent','latent',[
  dict(w='1/2',pa='1/4',pb='3/4'),dict(w='1/3',pa='1/3',pb='2/3'),dict(w='2/5',pa='1/5',pb='3/5')]),
 ('mixed_binomial',3,'Qualifying batches form the outer count','batches',[
  dict(n=3,p='1/2',r=2,d=3,k=2),dict(n=4,p='1/3',r=3,d=3,k=1),dict(n=3,p='1/3',r=2,d=2,k=1)]),
 ('mixed_binomial',4,'Condition on at least one success','condition',[
  dict(n=3,p='1/2',r=1),dict(n=4,p='1/2',r=2),dict(n=3,p='1/3',r=2)]),
 ('geometric',1,'A point, a tail and a cumulative probability','geo',[
  dict(p='1/4',t=3,m=4),dict(p='1/3',t=4,m=3),dict(p='2/5',t=3,m=4)]),
 ('geometric',2,'The further wait restarts, but the total clock does not','memory',[
  dict(p='1/3',a=2,b=3),dict(p='1/4',a=3,b=2),dict(p='2/5',a=2,b=2)]),
 ('geometric',3,'A consecutive-probability ratio gives the failure probability','ratio',[
  dict(ratio='1/2',alpha='7/8'),dict(ratio='2/3',alpha='65/81'),dict(ratio='3/4',alpha='37/64')]),
 ('geometric',4,'The last capped value combines success and failure','cap',[
  dict(p='1/2',c=3),dict(p='1/3',c=3),dict(p='1/4',c=4)]),
 ('success_sequences',1,'Fix the final trial of the second success','second',[
  dict(p='1/2',t=4,m=4),dict(p='1/3',t=3,m=4),dict(p='2/5',t=4,m=5)]),
 ('success_sequences',2,'Two waiting clocks can finish together','two_clocks',[
  dict(pa='1/2',pb='1/3',c=3),dict(pa='1/3',pb='1/4',c=2),dict(pa='1/2',pb='1/4',c=3)]),
 ('success_sequences',3,'A finite bag is not an independent-trial model','finite_bag',[
  dict(r=2,b=3),dict(r=3,b=2),dict(r=2,b=4)]),
 ('success_sequences',4,'Stop on either of two competing targets','race',[
  dict(p='1/3'),dict(p='2/5'),dict(p='1/4')]),
]

def build(kind,r):
 fields=[];solution='';D=None
 def f(key,label,value):fields.append(field(key,label,value))
 if kind=='binomial':
  n,p,k,rr=r['n'],F(r['p']),r['k'],r['r'];d=B(n,p);prompt=f'<p>A sensor is tested {n} times independently. Each test fails with probability '+math(p)+f'. X counts failed tests. Give n and p in its binomial model, then P(X={rr}) and P(X≤{k}).</p>';f('n','Trial count n',n);f('p','Failure probability p',p);f('exact','Exact-count probability',d[rr]);f('tail','At-most probability',cumulative(d,0,k));solution='<p>Failure is the defined success for this count. The trials are fixed, independent and share a constant probability.</p>'+r'\[X\sim\mathrm B('+str(n)+','+latex(p)+r').\]'+aligned([(r'\mathrm P(X='+str(rr)+')',r'\binom{'+str(n)+'}{'+str(rr)+'}'+r'\left('+latex(p)+r'\right)^{'+str(rr)+'}'+r'\left('+latex(1-p)+r'\right)^{'+str(n-rr)+'}'),(r'\mathrm P(X\le '+str(k)+')',latex(cumulative(d,0,k)))]);D=d
 elif kind=='categories':
  n,a,b=r['n'],F(r['a']),F(r['b']);p=a+b;d=B(n,p);prompt='<p>On each independent run a device gives red with probability '+math(a)+', amber with probability '+math(b)+f', and green otherwise. X counts red-or-amber results in {n} runs. Find its success probability, mean, variance and P(X≥1).</p>';f('p','Red-or-amber probability',p);f('mean','Mean',n*p);f('variance','Variance',n*p*(1-p));f('any','At-least-one probability',1-d[0]);solution='<p>Red and amber are disjoint categories of the same run, so add their probabilities. Then use the binomial moments and complement the zero-count event.</p>'+aligned([('p',latex(a)+'+'+latex(b)),(r'\mathrm E(X)',latex(n*p)),(r'\operatorname{Var}(X)',latex(n*p*(1-p))),(r'\mathrm P(X\ge1)','1-'+latex(1-p)+'^{'+str(n)+'}')]);D=d
 elif kind=='interval':
  n,p,L,U,rr=r['n'],F(r['p']),r['L'],r['U'],r['r'];d=B(n,p);inside=cumulative(d,L+1,U-1);prompt=r'<p>\(X\sim\mathrm B('+str(n)+','+latex(p)+r')\). Find P('+str(L)+'&lt;X&lt;'+str(U)+'), P(X≥'+str(U)+'), and P(X='+str(rr)+' | '+str(L)+'&lt;X&lt;'+str(U)+').</p>';f('interval','Strict-interval probability',inside);f('upper','At-least upper-bound probability',cumulative(d,U));f('conditional','Point probability given the interval',d[rr]/inside);solution='<p>The strict interval retains integer counts '+', '.join(map(str,range(L+1,U)))+'. Add those entries. The upper event includes its endpoint. In the conditional event, the requested point is already within the interval.</p>'+aligned([(r'\mathrm P('+str(L)+'<X<'+str(U)+')',latex(inside)),(r'\mathrm P(X='+str(rr)+r'\mid '+str(L)+'<X<'+str(U)+')',r'\frac{'+latex(d[rr])+'}{'+latex(inside)+'}')]);D=d
 elif kind=='order':
  n,p=r['n'],F(r['p']);q=1-p;d=B(n,p);prompt=f'<p>There are {n} independent trials, each with success probability '+math(p)+'. Find the probability of exactly one success anywhere, of the last trial being the only success, and of at least one success. Choose the correct explanation.</p>';f('one','Exactly one success anywhere',d[1]);f('last','Only the last trial succeeds',q**(n-1)*p);f('any','At least one success',1-q**n);fields.append(choice('B',{'A':'A specified final success needs the same combination factor as any position','B':'An unspecified single success can occupy n positions; the specified last success cannot','C':'At least one success excludes exactly one success'}));solution='<p>There are n possible positions for an unspecified single success. The specified last-success history is one sequence only. At least one is the complement of all failures.</p>'+aligned([(r'\mathrm P(X=1)',str(n)+r'\left('+latex(q)+r'\right)^{'+str(n-1)+'}'+latex(p)),(r'\mathrm P(\text{last only})',latex(q**(n-1)*p)),(r'\mathrm P(X\ge1)',latex(1-q**n))])
 elif kind=='moments':
  mu,v=F(r['mean']),F(r['variance']);p=1-v/mu;n=mu/p;assert n.denominator==1;n=int(n);rr=r['r'];prompt='<p>X is binomial with mean '+math(mu)+' and variance '+math(v)+'. Find n, p and P(X='+str(rr)+').</p>';f('n','Trial count n',n);f('p','Success probability p',p);f('exact','Exact-count probability',B(n,p)[rr]);solution=r'<p>Divide the variance equation by the mean equation, then recover the trial count. Verify p lies in (0,1) and n is an integer.</p>'+aligned([('1-p',r'\frac{'+latex(v)+'}{'+latex(mu)+'}'),('p',latex(p)),('n',r'\frac{'+latex(mu)+'}{'+latex(p)+'}'),(r'\mathrm P(X='+str(rr)+')',latex(B(n,p)[rr]))])
 elif kind=='known_n':
  n,mu,rr,U=r['n'],F(r['mean']),r['r'],r['U'];p=mu/n;d=B(n,p);prompt=f'<p>X is binomial with {n} trials and mean '+math(mu)+'. Find p, Var(X), and P(X='+str(rr)+' | X≤'+str(U)+').</p>';f('p','Success probability p',p);f('variance','Variance',n*p*(1-p));f('conditional','Point probability given the upper bound',d[rr]/cumulative(d,0,U));solution='<p>Use np equal to the given mean. The conditional point is allowed by the upper bound, so divide its probability by the inclusive lower tail.</p>'+aligned([('p',latex(p)),(r'\operatorname{Var}(X)',latex(n*p*(1-p))),(r'\mathrm P(X='+str(rr)+r'\mid X\le'+str(U)+')',r'\frac{'+latex(d[rr])+'}{'+latex(cumulative(d,0,U))+'}')]);D=d
 elif kind in ['threshold','ratio']:
  if kind=='threshold':p=F(r['p']);prompt='<p>Independent trials have success probability '+math(p)+'. Find the minimum n for the probability of at least one success in n trials to be at least '+math(F(r['alpha']))+', and separately to be greater than this target. Give the at-least-one probability at the inclusive minimum.</p>'
  else:
   ratio=F(r['ratio']);p=1-ratio;prompt='<p>T is the first-success trial count in independent trials with constant success probability p. The ratio P(T=3)/P(T=2) is '+math(ratio)+'. Find p, E(T), the minimum n with P(T≤n) at least '+math(F(r['alpha']))+', and the minimum n when the inequality is strict.</p>';f('p','Success probability p',p);f('mean','Expected first-success trial',1/p)
  alpha=F(r['alpha']);lo=minimum(p,alpha);hi=minimum(p,alpha,True);f('inclusive','Minimum for an inclusive target',lo);f('strict','Minimum for a strict target',hi)
  if kind=='threshold':f('boundary','Probability at the inclusive minimum',1-(1-p)**lo)
  solution=('<p>The consecutive point-probability ratio is 1−p, so subtract it from one; the mean is 1/p.</p>' if kind=='ratio' else '')+'<p>The relevant cumulative probability is 1−(1−p)ⁿ. Check the original inequality at consecutive integers; equality is allowed only for the inclusive target.</p>'+table([r'\(n\)',r'\(1-(1-p)^n\)'],[[math(i),math(1-(1-p)**i)] for i in sorted(set([max(0,lo-1),lo,hi]))])
 elif kind=='two_roots':
  n,v=r['n'],F(r['variance']);p=s.Symbol('p');roots=sorted(F(str(x)) for x in s.solve(n*p*(1-p)-s.Rational(v),p));low,high=roots;prompt=f'<p>X is binomial with {n} trials and variance '+math(v)+'. Find both possible success probabilities, labelled smaller and larger, and the corresponding means in the same order.</p>';f('low','Smaller probability',low);f('high','Larger probability',high);f('mean_low','Mean for the smaller probability',n*low);f('mean_high','Mean for the larger probability',n*high);solution='<p>Rearrange np(1−p) equal to the given variance as a quadratic. Its valid roots are complementary. No extra information here selects one branch.</p>'+aligned([(str(n)+'p(1-p)',latex(v)),(r'p_{\rm low}',latex(low)),(r'p_{\rm high}',latex(high))])
 elif kind=='groups':
  na,nb,pa,pb=r['na'],r['nb'],F(r['pa']),F(r['pb']);a,b=B(na,pa),B(nb,pb);left=a[1]*b[0];right=a[0]*b[1];one=left+right;prompt=f'<p>Group A has {na} trials with success probability '+math(pa)+f'; group B has {nb} trials with probability '+math(pb)+'. All trials are independent. Find the probabilities of no successes overall, exactly one overall, and that the unique success came from A given exactly one overall.</p>';f('zero','No successes overall',a[0]*b[0]);f('one','Exactly one success overall',one);f('posterior','Unique success from A given exactly one',left/one);solution='<p>For one overall, use the disjoint cases (one in A, none in B) and (none in A, one in B). Keep the first case as the posterior numerator.</p>'+aligned([(r'\mathrm P(A_1\cap B_0)',latex(left)),(r'\mathrm P(A_0\cap B_1)',latex(right)),(r'\mathrm P(\text{one overall})',latex(one)),(r'\mathrm P(A_1\mid\text{one overall})',r'\frac{'+latex(left)+'}{'+latex(one)+'}')])
 elif kind=='latent':
  w,pa,pb=map(F,[r['w'],r['pa'],r['pb']]);d=[w*a+(1-w)*b for a,b in zip(B(2,pa),B(2,pb))];mu=sum(i*p for i,p in enumerate(d));v=sum((i-mu)**2*p for i,p in enumerate(d));marginal=w*pa+(1-w)*pb;prompt='<p>Choose machine A once with probability '+math(w)+', otherwise B. Test two items using that same machine. Conditional on its identity, outcomes are independent with success probability '+math(pa)+' for A or '+math(pb)+' for B. X counts the two successes. Find the marginal success probability of one item, P(X=2) and Var(X), then choose the dependence statement.</p>';f('marginal','Marginal probability of one success',marginal);f('two','Probability both items succeed',d[2]);f('variance','Variance of the count',v);fields.append(choice('B',{'A':'Independent given the machine means independent when its identity is hidden','B':'The shared hidden machine makes the outcomes dependent unconditionally','C':'The mixture always has the binomial variance at the averaged success probability'}));solution='<p>Weight the two conditional binomial tables by the initial machine-choice probabilities. Calculate the variance from this mixture. Compare the joint success probability with the square of the marginal probability.</p>'+binomial_table(d)+aligned([(r'\mathrm P(S_1)',latex(marginal)),(r'\mathrm P(S_1\cap S_2)',latex(d[2])),(r'[\mathrm P(S_1)]^2',latex(marginal*marginal)),(r'\operatorname{Var}(X)',latex(v))])
 elif kind=='batches':
  n,p,rr,days,k=r['n'],F(r['p']),r['r'],r['d'],r['k'];q=cumulative(B(n,p),rr);outer=B(days,q);prompt=f'<p>A batch contains {n} independent items, each successful with probability '+math(p)+f'. It qualifies if at least {rr} succeed. There are {days} independent such batches; K counts qualifying batches. Find the qualification probability q, E(K), and P(K={k}).</p>';f('q','Batch qualification probability',q);f('mean','Expected qualifying batches',days*q);f('exact','Exact qualifying-batch probability',outer[k]);solution='<p>First evaluate the inner binomial upper tail. Each batch then supplies one independent success/failure indicator with probability q; use that in the outer binomial.</p>'+r'\[K\sim\mathrm B('+str(days)+','+latex(q)+r').\]'+aligned([('q',latex(q)),(r'\mathrm E(K)',latex(days*q)),(r'\mathrm P(K='+str(k)+')',latex(outer[k]))])
 elif kind=='condition':
  n,p,rr=r['n'],F(r['p']),r['r'];d=B(n,p);h=1-d[0];mean=sum(i*d[i] for i in range(1,n+1))/h;prompt=r'<p>\(X\sim\mathrm B('+str(n)+','+latex(p)+r')\). Let \(H=\{X\ge1\}\). Find P(X='+str(rr)+' | H), P(X≤'+str(rr)+' | H), and E(X | H).</p>';f('point','Point probability given at least one',d[rr]/h);f('lower','Lower tail given at least one',cumulative(d,1,rr)/h);f('mean','Conditional mean',mean);solution='<p>Remove the zero-count outcome and divide every retained probability by P(H). Both the lower tail and the mean use the renormalised table.</p>'+table([r'\(x\)',r'\(\mathrm P(X=x\mid H)\)'],[[math(i),math(d[i]/h)] for i in range(1,n+1)])+aligned([(r'\mathrm P(H)',latex(h)),(r'\mathrm E(X\mid H)',r'\frac{'+latex(n*p)+'}{'+latex(h)+'}')])
 elif kind=='geo':
  p,t,m=F(r['p']),r['t'],r['m'];q=1-p;prompt='<p>Independent trials have constant success probability '+math(p)+'. T is the first-success trial, including the successful trial. Find P(T='+str(t)+'), P(T&gt;'+str(m)+'), P(T≤'+str(m)+'), and E(T).</p>';f('point','First success on the stated trial',q**(t-1)*p);f('tail','First success after the stated trial',q**m);f('by','First success by the stated trial',1-q**m);f('mean','Expected first-success trial',1/p);solution='<p>The point event needs '+str(t-1)+' failures followed by success. The tail needs all first '+str(m)+' trials to fail. The cumulative probability is its complement.</p>'+aligned([(r'\mathrm P(T='+str(t)+')',r'\left('+latex(q)+r'\right)^{'+str(t-1)+'}'+latex(p)),(r'\mathrm P(T>'+str(m)+')',latex(q**m)),(r'\mathrm E(T)',r'\frac{1}{'+latex(p)+'}')])
 elif kind=='memory':
  p,a,b=F(r['p']),r['a'],r['b'];q=1-p;prompt='<p>T is geometric with success probability '+math(p)+f'. The first {a} trials have failed. Find P(T&gt;{a+b} | T&gt;{a}), P(T={a+b} | T&gt;{a}), the expected number of further trials, and the expected total trial count.</p>';f('tail','Conditional probability of the later tail',q**b);f('point','Conditional point probability',q**(b-1)*p);f('further','Expected further trials',1/p);f('total','Expected total trial count',a+1/p);solution='<p>Cancel the already observed failure factor from numerator and denominator. The remaining future trials keep the original success probability. The total clock adds the known failures to the further wait.</p>'+aligned([(r'\mathrm P(T>'+str(a+b)+r'\mid T>'+str(a)+')',r'\frac{'+latex(q**(a+b))+'}{'+latex(q**a)+'}'),(r'\mathrm E(T-'+str(a)+r'\mid T>'+str(a)+')',latex(1/p)),(r'\mathrm E(T\mid T>'+str(a)+')',latex(a+1/p))])
 elif kind=='cap':
  p,c=F(r['p']),r['c'];q=1-p;d=[q**(i-1)*p for i in range(1,c)]+[q**(c-1)];mean=sum(i*w for i,w in enumerate(d,1));prompt='<p>Independent trials have success probability '+math(p)+f'. T is the unrestricted first-success trial. Stop after at most {c} attempts and let N=min(T,{c}). Find P(N={c}), E(N), the probability of success by the cap, and E(T).</p>';f('last','Probability at the capped final value',d[-1]);f('capped_mean','Expected capped trial count',mean);f('success','Success probability by the cap',1-q**c);f('unrestricted','Expected unrestricted trial count',1/p);solution='<p>The last value combines success on trial c and no success in the allowed trials. Their sum is the chance of reaching trial c. Use the finite table for N; 1/p belongs to the unrestricted T.</p>'+table([r'\(j\)',r'\(\mathrm P(N=j)\)'],[[math(i),math(w)] for i,w in enumerate(d,1)])+aligned([(r'\mathrm E(N)',latex(mean)),(r'\mathrm P(T\le '+str(c)+')',latex(1-q**c)),(r'\mathrm E(T)',latex(1/p))])
 elif kind=='second':
  p,t,m=F(r['p']),r['t'],r['m'];q=1-p;point=B(t-1,p)[1]*p;by=cumulative(B(m,p),2);joint=p*p*q**(t-2);prompt='<p>Independent trials have success probability '+math(p)+'. Let S₂ be the trial of the second success. Find P(S₂='+str(t)+'), P(S₂≤'+str(m)+'), and the probability the first success is on trial 1 and the second on trial '+str(t)+'.</p>';f('point','Second success on the stated trial',point);f('by','Second success by the stated trial',by);f('joint','First on one and second on the stated trial',joint);solution='<p>For the second success on t, use exactly one success among the first t−1 trials and success on trial t. For the joint event, the first and final trials succeed and every intervening trial fails.</p>'+aligned([(r'\mathrm P(S_2='+str(t)+')',latex(point)),(r'\mathrm P(S_2\le '+str(m)+')',latex(by)),(r'\mathrm P(S_1=1,S_2='+str(t)+')',latex(joint))])
 elif kind=='two_clocks':
  pa,pb,c=F(r['pa']),F(r['pb']),r['c'];qa,qb=1-pa,1-pb;A=1-qa**c;Bprob=1-qb**c;both=A*Bprob;one=A*(1-Bprob)+(1-A)*Bprob;same=sum(pa*qa**(j-1)*pb*qb**(j-1) for j in range(1,c+1));prompt='<p>Two independent processes have first-success trial counts T_A and T_B, with success probabilities '+math(pa)+' and '+math(pb)+f'. Find the probability both finish by {c}, exactly one finishes by {c}, and that they finish on the same trial given both finish by {c}.</p>';f('both','Both finish by the limit',both);f('one','Exactly one finishes by the limit',one);f('same','Same finish time given both finish by the limit',same/both);solution='<p>For both, multiply the two cumulative probabilities. Exactly one has two disjoint routes. For simultaneous finishes within the window, sum products of matching point probabilities, then condition on both finishing.</p>'+aligned([(r'\mathrm P(\text{both})',latex(both)),(r'\mathrm P(\text{exactly one})',latex(one)),(r'\mathrm P(\text{same within window})',latex(same)),(r'\mathrm P(\text{same}\mid\text{both})',r'\frac{'+latex(same)+'}{'+latex(both)+'}')])
 elif kind=='finite_bag':
  R,Bc=r['r'],r['b'];N=R+Bc;den=comb(N,R);d={t:F(comb(N-t,R-1),den) for t in range(1,Bc+2)};mean=sum(t*p for t,p in d.items());prompt=f'<p>A bag contains {R} marked and {Bc} unmarked counters. Draw uniformly without replacement until the first marked counter appears; T is its position. Find P(T=3), E(T), and choose the correct model statement.</p>';f('third','Probability of first marked on trial three',d[3]);f('mean','Expected first marked position',mean);fields.append(choice('C',{'A':'Geo(p) applies because the initial marked proportion is known','B':'The success probability remains the initial proportion after each failure','C':'The success probability changes after failure; use a finite model'}));solution='<p>In a random order every subset of marked positions is equally likely. For T=t, the first marked position is t and the other marked positions are chosen afterwards. The finite table sums to one; it does not have a geometric tail.</p>'+table([r'\(t\)',r'\(\mathrm P(T=t)\)'],[[math(t),math(w)] for t,w in d.items()])+aligned([(r'\mathrm E(T)',latex(mean))])
 elif kind=='race':
  p=F(r['p']);q=1-p;paths=[('SS',p*p),('FF',q*q),('SFS',p*q*p),('SFF',p*q*q),('FSS',q*p*p),('FSF',q*p*q)];win=sum(w for h,w in paths if h.count('S')==2);third=sum(w for h,w in paths if len(h)==3);mean=sum(len(h)*w for h,w in paths);cond=sum(w for h,w in paths if len(h)==3 and h.count('S')==2)/third;prompt='<p>Independent trials succeed with probability '+math(p)+'. Stop as soon as two successes or two failures have occurred. T is the number of trials and W means stopping with two successes. Find P(W), P(T=3), E(T), and P(W | T=3).</p>';f('win','Probability of stopping with two successes',win);f('third','Probability of three trials',third);f('mean','Expected trial count',mean);f('conditional','Win given three trials',cond);solution='<p>SS and FF stop immediately. SF and FS each allow one more trial. These six terminal histories are mutually exclusive and exhaustive; no trial follows an already stopped path.</p>'+table(['Terminal history','Probability'],[[h,math(w)] for h,w in paths])+aligned([(r'\mathrm P(W)',latex(win)),(r'\mathrm P(T=3)',latex(third)),(r'\mathrm E(T)',latex(mean)),(r'\mathrm P(W\mid T=3)',latex(cond))])
 else:raise ValueError(kind)
 if D is not None:solution+='<h4>Count table</h4>'+binomial_table(D)
 answer=''.join('<p>'+escape(f['label'])+': '+(escape(f['options'][f['expected']]) if f['type']=='choice' else math(F(f['expected'])))+'.</p>' for f in fields)
 return prose_math(prompt),fields,prose_math(solution)+'<h4>Complete answers</h4>'+answer,answer

for topic,family,title,kind,variants in cases:
 for v,params in enumerate(variants):
  prompt,fields,solution,answer=build(kind,params);uid=f'M4U-9709-S1-BG-CHECK-{topic.upper()}-{family}-{v}';model=dict(uid=uid,kind=kind,params=params)
  if v==2:
   key='BG-'+kind.upper();model.update(example=key,expected={f['key']:f['expected'] for f in fields});next(l for l in lessons if l['key']==topic)['examples'].append(dict(title=title,question=prompt,solution=solution,verification=key))
  else:
   questions.append(dict(id=uid,family_uid=uid.rsplit('-',1)[0],lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution,hint_html='<p>Define success and translate the exact integer event. Decide whether the number of trials is fixed or stops. For a condition, restrict the sample space; for a target, test both neighbouring integers.</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer for '+f['label']+'.') for f in fields])],verification=uid))
  models.append(model)

for prepared in lessons:
 for key in ['before','ideas','method']:prepared[key]=prose_math(prepared[key])
 prepared['mistakes']=[prose_math(item) for item in prepared['mistakes']]
