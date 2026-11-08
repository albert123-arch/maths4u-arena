"""Independent normal-distribution teaching, with explicit opt-in numerical accuracy."""
from fractions import Fraction as F
from statistics import NormalDist
from math import erf, erfc, sqrt, ceil, comb
from html import escape
import sympy as s
from s1_distributions_teaching import latex, math, table, notation

lessons, questions, models = [], [], []
std=NormalDist()

def Phi(z):return .5*erfc(-z/sqrt(2))
def Q(z):return .5*erfc(z/sqrt(2))
def area(a,b,mu,sd):return Phi((b-mu)/sd)-Phi((a-mu)/sd)
def quantile(p):return std.inv_cdf(p)
def number(v):return latex(F(str(v))) if isinstance(v,(int,F)) else f'{v:.4f}'
def display(v,places=4):return r'\('+f'{float(v):.{places}f}'+r'\)'
def aligned(rows):return r'\[\begin{aligned}'+r',\\{}'.join(k+'&'+op+v for k,op,v in rows)+r'.\end{aligned}\]'
def exact(key,label,value):return dict(key=key,label=label,type='number',expected=str(value))
def approx(key,label,value,places=4,prob=False):
 return dict(key=key,label=label+f' ({places} d.p.)',type='approximate',expected=repr(float(value)),absolute_tolerance=.5*10**(-places),**({'minimum':0,'maximum':1} if prob else {}))
def choice(value,options):return dict(key='choice',label='Correct conclusion',type='choice',expected=value,options=options)
def picture(name,alt):return '<p><img src="/assets/original/s1-normal/'+name+'.svg" alt="'+alt+'"></p>'
def notation_normal(mu,sd):return r'\(X\sim\mathrm N('+latex(F(str(mu)))+','+latex(F(str(sd))**2)+r')\)'

def normal_prose(html):
 import re
 chunks=re.split(r'(\\\(.*?\\\)|\\\[.*?\\\]|<[^>]+>)',notation(html),flags=re.S)
 for i in range(0,len(chunks),2):chunks[i]=re.sub(r'\bN\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)',lambda m:r'\(\mathrm N('+m.group(1)+','+m.group(2)+r')\)',chunks[i])
 return ''.join(chunks)

def lesson(key,title,summary,ideas,mistakes):
 lessons.append(dict(key=key,id='orig_9709_s1_norm_'+key,title=title,summary=summary,objective=summary,before=r'<p>Use continuous areas, conditional probability and binomial moments from the preceding chapters. In \(\mathrm N(\mu,\sigma^2)\), the second parameter is variance. Give probabilities to 4 decimal places and estimated measurements to 2 decimal places when labelled; calculator precision is also accepted. Exact boundary and integer fields remain exact. Written problems keep their own rounding instructions.</p>',ideas=ideas,method='<ol><li>Identify the mean, variance and positive standard deviation.</li><li>Sketch and label the requested region before choosing a tail or interval.</li><li>Standardise each boundary using the standard deviation.</li><li>Use a cumulative normal probability or inverse cumulative probability with the correct tail.</li><li>For counts, check approximation conditions and apply continuity correction to the integer event.</li><li>For a condition, restrict the numerator and denominator; retain full precision until the final answer.</li></ol>',mistakes=mistakes,examples=[]))

lesson('normal_areas','Normal areas, notation and interpretation',
 'Read normal parameters and turn continuous events into correctly standardised areas.',
 r'''<h3>Density height is not point probability</h3><p>A continuous model assigns probabilities to intervals through areas under its density curve. The total area is one. A single exact value has probability zero, so including or excluding an endpoint does not change a continuous area. A recorded value rounded to a unit represents an interval and can have positive probability.</p>
 <h3>Mean and variance have different roles</h3>\[X\sim\mathrm N(\mu,\sigma^2),\qquad\sigma&gt;0.\]<p>The mean locates the centre. The standard deviation controls spread; the variance is its square. Curves with smaller standard deviation are narrower and taller, but all have area one. For a common centre, a fixed central interval contains more probability under the narrower curve.</p>
 <h3>Standardise by the standard deviation</h3>\[Z=\frac{X-\mu}{\sigma}\sim\mathrm N(0,1).\]<p>Subtract the mean and divide by σ, not σ². A value below the mean has a negative z-score. Standardise both ends of an interval separately and show the substitutions.</p>'''+picture('normal-region','A normal density shaded between two labelled standardised boundaries')+r'''
 <h3>Use a consistent cumulative convention</h3><p>Write Φ(z)=P(Z≤z). A left tail is Φ(z); a right tail is 1−Φ(z). Symmetry gives Φ(−z)=1−Φ(z).</p>\[\begin{aligned}\mathrm P(a&lt;X&lt;b)&=\Phi\!\left(\frac{b-\mu}{\sigma}\right)\\&\quad-\Phi\!\left(\frac{a-\mu}{\sigma}\right).\end{aligned}\]<p>A table giving area between zero and z needs conversion to this cumulative convention. A quick sketch checks whether the probability should be above or below one half.</p>
 <h3>Read rounding intervals as intervals</h3><p>If a value is recorded to the nearest whole unit as r, its underlying value lies from r−0.5 to r+0.5, apart from endpoint conventions of zero probability. Do not confuse this with an exact reading X=r.</p>''',
 ['The second normal parameter is variance, not standard deviation.','Subtract the lower cumulative probability from the upper one.','A right tail is not the left cumulative area.','An exact point and a rounded recording are different events.'])

lesson('inverse_normal','Quantiles and unknown parameters',
 'Recover cutoffs, means and standard deviations from lower-tail probabilities and independent equations.',
 r'''<h3>Convert every probability to a lower tail first</h3><p>If P(X≤c)=p, use z=Φ⁻¹(p), then c=μ+σz. For an upper-tail probability α use p=1−α. A lower quantile below the median must have a negative z-score.</p>
 \[c=\mu+\sigma\Phi^{-1}(p).\]
 <h3>A known standard deviation leaves a linear equation for the mean</h3>\[\mu=a-\sigma\Phi^{-1}(p).\]<p>Use the actual stated cumulative probability. Keep the z-score at calculator precision while recovering μ, then use the recovered parameters for any follow-on area.</p>
 <h3>A known mean determines the standard deviation</h3>\[\sigma=\frac{a-\mu}{\Phi^{-1}(p)}.\]<p>The numerator and z-score must have compatible signs so σ is positive. A negative result is a reason to check the tail and sign, not to silently take an absolute value. Square σ only when the variance is required.</p>
 <h3>Two probability statements give two equations</h3>\[\begin{aligned}a&=\mu+\sigma z_a,\\b&=\mu+\sigma z_b.\end{aligned}\]<p>Subtract to eliminate μ. The difference in physical cutoffs corresponds to the difference in z-scores. Recover σ first, then μ, and check both original probabilities. Equal tail probabilities for different cutoffs would not determine a positive spread.</p>
 <h3>Rounding is the final step</h3><p>Rounding an intermediate quantile can move the final cutoff or parameter. Record the equations and retain full precision internally. Label whether your final answer is a standard deviation or a variance.</p>''',
 ['An upper-tail percentage must be complemented before inverse normal.','A lower quantile can require a negative z-score.','Do not replace a negative inferred standard deviation by its absolute value.','Use two independent equations to determine both parameters.'])

lesson('normal_models','Conditional and repeated normal models',
 'Keep conditions and route weights explicit when normal areas feed further probability models.',
 r'''<h3>Condition on the stated region</h3><p>For a condition H, divide the probability of the intersection by P(H). If b&gt;a, then X&gt;b already implies X&gt;a.</p>\[\mathrm P(X&gt;b\mid X&gt;a)=\frac{\mathrm P(X&gt;b)}{\mathrm P(X&gt;a)}.\]<p>Using the unconditional right tail alone ignores the smaller conditional sample space.</p>
 <h3>An interval probability can be a binomial success probability</h3><p>First calculate q for one normal reading meeting its criterion. If n readings are independent with the same distribution, the number meeting that criterion is B(n,q). Use the unrounded q in the second stage, not a rounded z-score or the original cutoff.</p>
 <h3>A mixture is assembled by routes</h3><p>If a machine is selected before a reading, multiply each machine’s event probability by its selection probability and add. For a posterior machine probability, retain the relevant route as the numerator. A mixture of two normal distributions is not generally one normal distribution with averaged parameters.</p>
 <h3>A rounded condition needs its own physical boundary</h3><p>For nearest-unit recording, recorded X≥k corresponds to the underlying value being at least k−0.5. Intersect this with any requested recorded interval before conditioning. This rounding interval describes a measurement; it is distinct from approximating a discrete count by a continuous normal model.</p>
 <h3>Expected frequencies are long-run quantities</h3><p>For n comparable readings and a single-reading event probability q, the expected count is nq. It need not be an integer. Round it only if the question explicitly asks for a rounded count.</p>''',
 ['A conditional denominator is the condition probability.','Use an unrounded single-reading probability in a repeated model.','A normal mixture does not generally reduce to averaged parameters.','A rounded threshold changes the boundary by half a recording unit.'])

lesson('binomial_approximation','Normal approximation and continuity correction',
 'Check the approximation conditions and convert exact integer events to continuous strips.',
 r'''<h3>Check both expected counts</h3><p>For X~B(n,p), this syllabus uses a normal approximation when n is sufficiently large that both np&gt;5 and n(1−p)&gt;5. Equality to 5 does not meet the stated strict criterion. Independence and a common p must still justify the underlying binomial model.</p>
 \[Y\sim\mathrm N\bigl(np,np(1-p)\bigr).\]<p>The second parameter is variance. Standardisation divides by the square root of that variance.</p>
 <h3>An integer occupies a unit-width strip</h3><p>Continuity correction replaces the mass at integer k by the area from k−0.5 to k+0.5. Sketch the bars or a number line first.</p>'''+picture('continuity-strip','An integer count occupies the strip from k minus one half to k plus one half')+r'''
 \[\begin{aligned}X\ge k&\longrightarrow Y&gt;k-0.5,\\X\le k&\longrightarrow Y&lt;k+0.5,\\X&gt;k&\longrightarrow Y&gt;k+0.5,\\X&lt;k&\longrightarrow Y&lt;k-0.5.\end{aligned}\]
 <h3>Translate strict intervals before correcting</h3><p>For integer bounds L and U, the event L&lt;X&lt;U contains L+1 through U−1. Its continuous strip starts at L+0.5 and ends at U−0.5. Do not move both boundaries in the same direction.</p>
 <h3>The result remains an approximation</h3><p>A normal answer need not equal the exact binomial probability. State the approximating distribution, corrected interval, z-scores and approximate area. Do not add a continuity correction to a quantity already modelled as a genuinely continuous normal reading.</p>''',
 ['Both np and n(1−p) must exceed 5 under the stated criterion.','Use the standard deviation sqrt(np(1−p)).','Exactly k requires a strip, not the zero-area point Y=k.','An approximation is not an exact binomial calculation.'])

lesson('mixed_inverse','Multi-stage models and inverse problems',
 'Connect parameter recovery, integer design limits and reward decisions without importing Statistics 2 rules.',
 r'''<h3>Recover a binomial model before approximating it</h3><p>If its mean and variance are given, recover p and integer n using the preceding chapter. Verify both expected counts exceed 5 before using a normal approximation. Apply continuity correction only to the final count event.</p>
 <h3>A continuous cutoff can imply an integer design decision</h3><p>Find the real quantile first. If an integer cutoff must make a lower-tail probability at least the target, choose the smallest integer satisfying the original condition and check its predecessor. A displayed rounded quantile is not a substitute for this integer check.</p>
 <h3>A normal event can trigger a discrete reward</h3><p>First calculate the normal probability q of the triggering event. Build the finite reward table, then find its weighted expectation and variance. This uses the previous discrete-distribution chapter; it does not assume Statistics 2 formulae for arbitrary linear combinations of normal variables.</p>
 <h3>Relationships between parameters are extra equations</h3><p>If σ=cμ with μ&gt;0, substitute into the standardised probability equation. Solve for μ and then obtain the positive σ. Check the original tail. Keep the original positive-parameter restriction throughout.</p>
 <h3>A normal model has an unbounded support</h3><p>Even when a real measurement cannot be negative, its normal model may assign a small negative-tail probability. That is a limitation to assess in context, not a reason to set the model probability to zero. Distinguish an unrounded small probability from a displayed probability rounded to four decimals.</p>''',
 ['Check feasibility of inferred binomial parameters before approximation.','Integer cutoffs require a neighbouring-integer check.','A two-level reward uses a discrete probability table.','A very small normal tail is not mathematically zero.'])

next(l for l in lessons if l['key']=='inverse_normal')['ideas']+=picture('normal-quantile','A lower-tail probability determines its standard-normal cutoff')

cases=[
 ('normal_areas',1,'Read variance, then standardise','notation',[dict(mu=50,var=16,x=54),dict(mu=30,var=9,x=27),dict(mu=72,var=25,x=78)]),
 ('normal_areas',2,'Subtract cumulative areas at both boundaries','interval',[dict(mu=20,sd=4,a=16,b=26),dict(mu=50,sd=5,a=42,b=55),dict(mu=80,sd=6,a=73,b=89)]),
 ('normal_areas',3,'An exact point differs from a recorded value','recorded',[dict(mu=20,sd=3,r=20,step=1),dict(mu=50,sd=4,r=52,step=2),dict(mu=80,sd=5,r=80,step=2)]),
 ('normal_areas',4,'Equal centres need not have equal central probabilities','spread',[dict(mu=50,s1=2,s2=4,d=3),dict(mu=20,s1=3,s2=6,d=4),dict(mu=80,s1=4,s2=7,d=5)]),
 ('inverse_normal',1,'A cumulative probability determines a cutoff','cutoff',[dict(mu=50,sd=5,p='.9'),dict(mu=20,sd=3,p='.1'),dict(mu=80,sd=6,p='.95')]),
 ('inverse_normal',2,'Recover a mean from a known spread','mean',[dict(sd=4,a=40,p='.2',l=38,u=48),dict(sd=3,a=25,p='.8',l=18,u=28),dict(sd=5,a=70,p='.1',l=70,u=82)]),
 ('inverse_normal',3,'Recover a positive standard deviation','sd',[dict(mu=40,a=50,tail='.1',l=35,u=48),dict(mu=20,a=25,tail='.2',l=18,u=26),dict(mu=80,a=90,tail='.05',l=75,u=88)]),
 ('inverse_normal',4,'Two quantiles determine two parameters','fit',[dict(a=40,b=64,pa='.1',pb='.8'),dict(a=18,b=30,pa='.2',pb='.9'),dict(a=60,b=84,pa='.15',pb='.85')]),
 ('normal_models',1,'The larger tail is the conditioning space','conditional',[dict(mu=20,sd=4,a=20,b=24),dict(mu=50,sd=5,a=48,b=55),dict(mu=80,sd=6,a=80,b=89)]),
 ('normal_models',2,'A normal tail becomes a repeated-trial success','repeated',[dict(mu=50,sd=5,c=55,n=3,k=1),dict(mu=20,sd=3,c=23,n=4,k=2),dict(mu=80,sd=6,c=86,n=3,k=2)]),
 ('normal_models',3,'Retain route weights for a posterior','mixture',[dict(ma=40,sa=4,mb=48,sb=5,w='.4',c=45,n=100),dict(ma=20,sa=3,mb=25,sb=4,w='.3',c=23,n=80),dict(ma=70,sa=5,mb=80,sb=6,w='.6',c=76,n=120)]),
 ('normal_models',4,'Condition on the physical rounding boundary','rounded_condition',[dict(mu=20,sd=4,r=20,k=18),dict(mu=50,sd=5,r=52,k=48),dict(mu=80,sd=6,r=80,k=76)]),
 ('binomial_approximation',1,'Check both strict expected-count conditions','conditions',[dict(n=100,p='3/10'),dict(n=20,p='1/4'),dict(n=80,p='2/5')]),
 ('binomial_approximation',2,'Correct an inclusive upper tail','upper',[dict(n=100,p='2/5',k=45),dict(n=80,p='1/2',k=44),dict(n=120,p='1/4',k=35)]),
 ('binomial_approximation',3,'A strict interval needs two corrected ends','approx_interval',[dict(n=80,p='1/2',L=34,U=46),dict(n=100,p='2/5',L=34,U=47),dict(n=120,p='1/4',L=24,U=36)]),
 ('binomial_approximation',4,'A point count becomes a strip','point',[dict(n=60,p='1/3',k=20),dict(n=100,p='2/5',k=40),dict(n=80,p='1/2',k=40)]),
 ('mixed_inverse',1,'Infer a count model before approximating','inverse_binomial',[dict(mean=30,variance=21,k=35),dict(mean=40,variance=24,k=45),dict(mean=40,variance=20,k=45)]),
 ('mixed_inverse',2,'A real quantile is not yet an integer decision','integer_cutoff',[dict(mu=50,sd=5,p='.9'),dict(mu=20,sd=3,p='.95'),dict(mu=100,sd=8,p='.8')]),
 ('mixed_inverse',3,'A normal trigger creates a two-level reward','reward',[dict(mu=60,sd=5,c=65,low=2,high=10),dict(mu=20,sd=3,c=23,low=3,high=12),dict(mu=80,sd=6,c=86,low=4,high=15)]),
 ('mixed_inverse',4,'A parameter relationship closes the model','relative_sd',[dict(c='.5',a=30,tail='.158655254'),dict(c='.25',a=50,tail='.2'),dict(c='1/3',a=40,tail='.1')]),
]

def build(kind,r):
 fields=[];solution=''
 def e(k,label,v):fields.append(exact(k,label,v))
 def a(k,label,v,places=4,prob=False):fields.append(approx(k,label,v,places,prob))
 def p(k,label,v):a(k,label,v,4,True)
 def fit(aa,bb,pa,pb):
  za,zb=quantile(pa),quantile(pb);sd=(bb-aa)/(zb-za);return aa-sd*za,sd
 def standard(mu,sd,lo,hi=None):
  rows=[]
  for label,boundary in [('z_a',lo)]+([('z_b',hi)] if hi is not None else []):
   fraction=r'\frac{'+latex(F(str(boundary)))+'-'+latex(F(str(mu)))+'}{'+latex(F(str(sd)))+'}'
   rows.extend([(label,'=',fraction),(label,r'\approx',f'{(boundary-mu)/sd:.4f}')])
  return aligned(rows)
 if kind=='notation':
  mu,sd,x=r['mu'],sqrt(r['var']),r['x'];z=F(x-mu)/F(str(sd));value=Q(float(z));prompt='<p>'+notation_normal(mu,sd)+'. Give its standard deviation, the exact z-score for X='+str(x)+', and P(X&gt;'+str(x)+').</p>';e('sd','Standard deviation',F(str(sd)));e('z','Exact z-score',z);p('probability','Right-tail probability',value);solution='<p>Take the positive square root of the variance. Standardise by this standard deviation and complement the lower cumulative area.</p>'+standard(mu,sd,x)+aligned([(r'\mathrm P(X>'+str(x)+')',r'\approx',f'{value:.4f}')])
 elif kind=='interval':
  mu,sd,lo,hi=r['mu'],r['sd'],r['a'],r['b'];za,zb=F(lo-mu,sd),F(hi-mu,sd);value=area(lo,hi,mu,sd);prompt='<p>'+notation_normal(mu,sd)+'. Give the exact z-scores at '+str(lo)+' and '+str(hi)+', then P('+str(lo)+'&lt;X&lt;'+str(hi)+').</p>';e('lower','Exact lower z-score',za);e('upper','Exact upper z-score',zb);p('probability','Interval probability',value);solution='<p>Standardise both boundaries, then subtract the lower cumulative probability from the upper.</p>'+standard(mu,sd,lo,hi)+aligned([(r'\mathrm P(a<X<b)','=',r'\Phi('+latex(zb)+r')-\Phi('+latex(za)+')'),(r'\mathrm P(a<X<b)',r'\approx',f'{value:.4f}')])
 elif kind=='recorded':
  mu,sd,value,step=r['mu'],r['sd'],r['r'],r['step'];lo,hi=F(value)-F(step,2),F(value)+F(step,2);prob=area(float(lo),float(hi),mu,sd);prompt='<p>'+notation_normal(mu,sd)+f'. Readings are recorded to the nearest {step} units. Give the exact underlying lower and upper boundaries for a recorded value {value}, P(X={value}) for an exact reading, and the probability of recording {value}.</p>';e('lower','Exact lower recording boundary',lo);e('upper','Exact upper recording boundary',hi);e('point','Exact point probability',0);p('probability','Recorded-value probability',prob);solution='<p>The recorded value represents half a recording unit on each side. An exact continuous point still has probability zero.</p>'+aligned([('a','=',latex(lo)),('b','=',latex(hi)),(r'\mathrm P(X='+str(value)+')','=','0'),(r'\mathrm P(\text{recorded value})',r'\approx',f'{prob:.4f}')])
 elif kind=='spread':
  mu,s1,s2,d=r['mu'],r['s1'],r['s2'],r['d'];pa,pb=area(-d,d,0,s1),area(-d,d,0,s2);prompt=f'<p>A and B are normal with common mean {mu} and standard deviations {s1} and {s2}. Find P(|A−{mu}|&lt;{d}) and P(|B−{mu}|&lt;{d}), then choose the correct comparison.</p>';p('A','Central probability for A',pa);p('B','Central probability for B',pb);fields.append(choice('B',{'A':'The wider curve has the larger probability in every central interval','B':'A is narrower and has the larger probability in this fixed central interval','C':'Equal means force the probabilities to agree'}));solution='<p>Use each curve’s own standard deviation. By symmetry, subtract the left tail from the matching upper cumulative probability.</p>'+aligned([(r'\mathrm P(|A-\mu|<d)',r'\approx',f'{pa:.4f}'),(r'\mathrm P(|B-\mu|<d)',r'\approx',f'{pb:.4f}')])
 elif kind=='cutoff':
  mu,sd,pp=r['mu'],r['sd'],float(r['p']);z=quantile(pp);cut=mu+sd*z;prompt='<p>'+notation_normal(mu,sd)+'. Find the standard-normal quantile z and cutoff c such that P(X≤c)='+str(pp)+'.</p>';a('z','Standard-normal quantile',z);a('cutoff','Cutoff c',cut,2);solution='<p>The probability is already a lower cumulative probability. Use inverse normal, then undo standardisation.</p>'+aligned([('z','=',r'\Phi^{-1}('+str(pp)+')'),('z',r'\approx',f'{z:.4f}'),('c','=',str(mu)+'+'+str(sd)+'z'),('c',r'\approx',f'{cut:.2f}')])
 elif kind=='mean':
  sd,aa,pp=r['sd'],r['a'],float(r['p']);z=quantile(pp);mu=aa-sd*z;value=area(r['l'],r['u'],mu,sd);prompt=f'<p>X is normal with standard deviation {sd} and P(X≤{aa})={pp}. Find the mean and P({r["l"]}&lt;X&lt;{r["u"]}).</p>';a('mean','Mean',mu,2);p('probability','Follow-on interval probability',value);solution='<p>Write the lower-tail z-score equation and solve for the mean. Use the unrounded recovered mean in the new interval.</p>'+aligned([('z','=',r'\Phi^{-1}('+str(pp)+')'),(r'\mu','=',str(aa)+'-'+str(sd)+'z'),(r'\mu',r'\approx',f'{mu:.2f}'),(r'\mathrm P(\text{interval})',r'\approx',f'{value:.4f}')])
 elif kind=='sd':
  mu,aa,tail=r['mu'],r['a'],float(r['tail']);z=quantile(1-tail);sd=(aa-mu)/z;value=area(r['l'],r['u'],mu,sd);prompt=f'<p>X is normal with mean {mu}, and P(X&gt;{aa})={tail}. Find the standard deviation, the variance, and P({r["l"]}&lt;X&lt;{r["u"]}).</p>';a('sd','Standard deviation',sd,2);a('variance','Variance',sd*sd,2);p('probability','Follow-on interval probability',value);solution='<p>Convert the right tail to a lower tail before inverse normal. Divide the displacement by its z-score, checking the positive standard deviation. Retain the unrounded value for the variance and follow-on interval.</p>'+aligned([('z','=',r'\Phi^{-1}('+str(1-tail)+')'),(r'\sigma','=',r'\frac{'+str(aa-mu)+'}{z}'),(r'\sigma',r'\approx',f'{sd:.2f}'),(r'\sigma^2',r'\approx',f'{sd*sd:.2f}'),(r'\mathrm P(\text{interval})',r'\approx',f'{value:.4f}')])
 elif kind=='fit':
  aa,bb,pa,pb=r['a'],r['b'],float(r['pa']),float(r['pb']);mu,sd=fit(aa,bb,pa,pb);prompt=f'<p>X is normal, P(X≤{aa})={pa} and P(X≤{bb})={pb}. Find its mean and standard deviation, then P({aa}&lt;X&lt;{bb}).</p>';a('mean','Mean',mu,2);a('sd','Standard deviation',sd,2);p('probability','Probability between the stated cutoffs',pb-pa);solution='<p>Obtain two z-scores. Subtract the two standardisation equations, recover the positive spread, then substitute for the mean. The final interval is also the difference of the two given cumulative probabilities.</p>'+aligned([(r'z_a','=',r'\Phi^{-1}('+str(pa)+')'),(r'z_b','=',r'\Phi^{-1}('+str(pb)+')'),(str(aa),'=',r'\mu+\sigma z_a'),(str(bb),'=',r'\mu+\sigma z_b'),(r'\sigma',r'\approx',f'{sd:.2f}'),(r'\mu',r'\approx',f'{mu:.2f}'),(r'\mathrm P(\text{interval})','=',str(round(pb-pa,12)))])
 elif kind=='conditional':
  mu,sd,aa,bb=r['mu'],r['sd'],r['a'],r['b'];den=Q((aa-mu)/sd);num=Q((bb-mu)/sd);value=num/den;prompt='<p>'+notation_normal(mu,sd)+f'. Find P(X&gt;{aa}), P(X&gt;{bb}), and P(X&gt;{bb} | X&gt;{aa}).</p>';p('condition','Condition probability',den);p('numerator','Intersection probability',num);p('conditional','Conditional probability',value);solution='<p>The smaller upper-tail event lies wholly inside the condition. Standardise each cutoff, then divide the intersection probability by the condition probability.</p>'+standard(mu,sd,aa,bb)+aligned([(r'\mathrm P(X>b\mid X>a)','=',r'\frac{\mathrm P(X>b)}{\mathrm P(X>a)}'),(r'\mathrm P(X>b\mid X>a)',r'\approx',f'{value:.4f}')])
 elif kind=='repeated':
  mu,sd,c,n,k=r['mu'],r['sd'],r['c'],r['n'],r['k'];q=Q((c-mu)/sd);value=comb(n,k)*q**k*(1-q)**(n-k);prompt='<p>'+notation_normal(mu,sd)+f'. Take {n} independent readings and let K count those above {c}. Find the single-reading probability q, P(K={k}) and E(K).</p>';p('q','Single-reading probability',q);p('probability','Repeated-count probability',value);a('mean','Expected qualifying readings',n*q,2);solution='<p>Compute the normal right tail first. Independence and an identical reading distribution then give a binomial count with that unrounded probability.</p>'+standard(mu,sd,c)+r'\[K\sim\mathrm B('+str(n)+r',q).\]'+aligned([('q',r'\approx',f'{q:.4f}'),(r'\mathrm P(K='+str(k)+')',r'\approx',f'{value:.4f}'),(r'\mathrm E(K)',r'\approx',f'{n*q:.2f}')])
 elif kind=='mixture':
  ma,sa,mb,sb,w,c,n=r['ma'],r['sa'],r['mb'],r['sb'],float(r['w']),r['c'],r['n'];qa=Phi((c-ma)/sa);qb=Phi((c-mb)/sb);value=w*qa+(1-w)*qb;post=w*qa/value;prompt=f'<p>For each reading choose machine A with probability {w}, otherwise B. A readings are N({ma},{sa**2}); B readings are N({mb},{sb**2}). Find the probability a reading is below {c}, the probability it came from A given it is below {c}, and the expected number below {c} in {n} independent repetitions of this selection process.</p>';p('probability','Overall event probability',value);p('posterior','Machine A given the event',post);a('count','Expected event count',n*value,2);solution=r'<p>Let H mean the reading is below the cutoff, and let \(q_A\), \(q_B\) be its probability under each machine. Weight the lower tails by their route probabilities. Keep only the A route for the posterior numerator.</p>'+aligned([(r'q_A',r'\approx',f'{qa:.4f}'),(r'q_B',r'\approx',f'{qb:.4f}'),('q','=',str(w)+'q_A+'+str(1-w)+'q_B'),('q',r'\approx',f'{value:.4f}'),(r'\mathrm P(A\mid H)',r'\approx',f'{post:.4f}'),(r'\mathrm E(K)',r'\approx',f'{n*value:.2f}')])
 elif kind=='rounded_condition':
  mu,sd,v,k=r['mu'],r['sd'],r['r'],r['k'];bound=F(k)-F(1,2);num=area(v-.5,v+.5,mu,sd);den=Q((float(bound)-mu)/sd);value=num/den;prompt='<p>'+notation_normal(mu,sd)+f'. Record X to the nearest whole unit as R. Give the exact underlying boundary for R≥{k}, P(R={v}), and P(R={v} | R≥{k}); then choose the correct point/recording statement.</p>';e('boundary','Exact conditioning boundary',bound);p('recorded','Recorded-value probability',num);p('conditional','Conditional recorded-value probability',value);fields.append(choice('C',{'A':'A recorded integer has zero probability because X is continuous','B':'R≥k means X≥k without a half-unit boundary','C':'An exact X-value has probability zero, but a rounded recording represents an interval'}));solution='<p>The condition starts half a unit below its smallest allowed recorded integer. The requested recording interval lies inside this condition, so divide its normal area by the corrected upper tail.</p>'+aligned([('a','=',latex(bound)),(r'\mathrm P(R='+str(v)+')',r'\approx',f'{num:.4f}'),(r'\mathrm P(R='+str(v)+r'\mid R\ge'+str(k)+')',r'\approx',f'{value:.4f}')])
 elif kind in ['conditions','upper','approx_interval','point','inverse_binomial']:
  if kind=='inverse_binomial':
   mu,var=r['mean'],r['variance'];pp=F(mu-var,mu);nn=F(mu)/pp;assert nn.denominator==1;n=int(nn);e('n','Exact binomial trial count',n);e('p','Exact binomial success probability',pp)
  else:n,pp=r['n'],F(r['p']);mu=n*pp;var=mu*(1-pp)
  sd=sqrt(float(var));eligible=mu>5 and n*(1-pp)>5
  if kind=='conditions':
   prompt=r'<p>\(X\sim\mathrm B('+str(n)+','+latex(pp)+r')\). Give np and n(1−p), then decide whether both strict expected-count conditions for the normal approximation are met.</p>';e('np','Exact expected successes',mu);e('nq','Exact expected failures',n*(1-pp));fields.append(choice('B' if eligible else 'C',{'A':'Only the total n matters','B':'Both expected counts exceed 5, so the stated criterion is met','C':'At least one expected count does not exceed 5, so the stated criterion is not met'}));solution='<p>Calculate both expected counts and compare each with 5 using a strict inequality.</p>'+aligned([('np','=',latex(F(mu))),('n(1-p)','=',latex(n*(1-pp)))])
  else:
   assert eligible
   if kind in ['upper','inverse_binomial']:
    lo=F(r['k'])-F(1,2);z=(float(lo)-float(mu))/sd;value=Q(z)
    prompt=('<p>A binomial X has mean '+str(mu)+' and variance '+str(var)+'. Recover its n and p, then give the exact continuity-corrected boundary and a normal approximation to P(X≥'+str(r['k'])+').</p>' if kind=='inverse_binomial' else r'<p>\(X\sim\mathrm B('+str(n)+','+latex(pp)+r')\). Give the exact corrected boundary for P(X≥'+str(r['k'])+'), its z-score, and the normal approximation to that probability.</p>');e('boundary','Exact corrected boundary',lo)
    if kind=='upper':a('z','Corrected z-score',z)
    p('probability','Normal-approximated upper tail',value);formula=aligned([('a','=',latex(lo)),('z',r'\approx',f'{z:.4f}'),(r'\mathrm P(X\ge'+str(r['k'])+')',r'\approx',f'{value:.4f}')])
   else:
    lo,hi=(F(r['L'])+F(1,2),F(r['U'])-F(1,2)) if kind=='approx_interval' else (F(r['k'])-F(1,2),F(r['k'])+F(1,2));value=area(float(lo),float(hi),float(mu),sd);event=str(r['L'])+'&lt;X&lt;'+str(r['U']) if kind=='approx_interval' else 'X='+str(r['k']);prompt=r'<p>\(X\sim\mathrm B('+str(n)+','+latex(pp)+r')\). Give the exact lower and upper continuity-corrected boundaries for '+event+', then approximate its probability using a normal model.</p>';e('lower','Exact lower corrected boundary',lo);e('upper','Exact upper corrected boundary',hi);p('probability','Normal-approximated interval probability',value);formula=aligned([('a','=',latex(lo)),('b','=',latex(hi)),(r'\mathrm P(\text{integer event})',r'\approx',f'{value:.4f}')])
   solution='<p>Both expected counts exceed 5. Use the binomial mean and variance for the normal model, then divide corrected displacements by its standard deviation. This is an approximate area, not the exact binomial probability.</p>'+r'\[Y\sim\mathrm N('+latex(F(mu))+','+latex(F(var))+r').\]'+formula
 elif kind=='integer_cutoff':
  mu,sd,pp=r['mu'],r['sd'],float(r['p']);cut=mu+sd*quantile(pp);n=ceil(cut);value=Phi((n-mu)/sd);prompt='<p>'+notation_normal(mu,sd)+'. Find the real cutoff c with P(X≤c)='+str(pp)+', the smallest integer k satisfying P(X≤k)≥'+str(pp)+', and the probability at that integer.</p>';a('cutoff','Continuous cutoff c',cut,2);e('integer','Exact smallest integer cutoff',n);p('probability','Probability at the integer cutoff',value);solution='<p>Find the real quantile first and retain its precision. Check that the chosen integer succeeds and the previous one fails.</p>'+aligned([('c',r'\approx',f'{cut:.2f}'),(r'\mathrm P(X\le'+str(n-1)+')',r'\approx',f'{Phi((n-1-mu)/sd):.4f}'),(r'\mathrm P(X\le'+str(n)+')',r'\approx',f'{value:.4f}')])
 elif kind=='reward':
  mu,sd,c,lo,hi=r['mu'],r['sd'],r['c'],r['low'],r['high'];q=Q((c-mu)/sd);mean=lo*(1-q)+hi*q;var=(lo-mean)**2*(1-q)+(hi-mean)**2*q;prompt='<p>'+notation_normal(mu,sd)+f'. A reward is {hi} credits if X&gt;{c}, otherwise {lo} credits. Find the high-reward probability, mean reward and variance of the reward.</p>';p('q','High-reward probability',q);a('mean','Mean reward',mean,2);a('variance','Variance of reward',var,2);solution='<p>Find the normal triggering probability, then build a two-value reward table and calculate its weighted moments.</p>'+table(['Reward','Probability'],[[math(lo),display(1-q)],[math(hi),display(q)]])+aligned([(r'\mathrm E(R)',r'\approx',f'{mean:.2f}'),(r'\operatorname{Var}(R)',r'\approx',f'{var:.2f}')])
 elif kind=='relative_sd':
  c,aa,tail=float(F(r['c'])),r['a'],float(r['tail']);z=quantile(1-tail);mu=aa/(1+c*z);sd=c*mu;negative=Phi(-mu/sd);prompt='<p>X is normal with positive mean μ and standard deviation σ='+math(F(r['c']))+'μ. Given P(X&gt;'+str(aa)+')='+str(tail)+', find μ, σ and P(X&lt;0), then choose the correct model interpretation.</p>';a('mean','Mean',mu,2);a('sd','Standard deviation',sd,2);p('negative','Negative-tail probability',negative);fields.append(choice('B',{'A':'A positive mean forces zero probability below zero','B':'The normal model can assign a small negative tail even when physical values are non-negative','C':'The negative tail equals the probability of an exact zero'}));solution='<p>Convert the upper tail to a cumulative quantile and substitute the given relation for σ. The normal model still has a negative tail; a displayed rounded zero is not a mathematical assertion of zero probability.</p>'+aligned([('z','=',r'\Phi^{-1}('+str(1-tail)+')'),(str(aa),'=',r'\mu(1+cz)'),(r'\mu',r'\approx',f'{mu:.2f}'),(r'\sigma',r'\approx',f'{sd:.2f}'),(r'\mathrm P(X<0)',r'\approx',f'{negative:.4f}')])
 else:raise ValueError(kind)
 answer=''.join('<p>'+escape(f['label'])+': '+(escape(f['options'][f['expected']]) if f['type']=='choice' else display(float(f['expected']),2 if '2 d.p.' in f['label'] else 4) if f['type']=='approximate' else math(F(f['expected'])))+'.</p>' for f in fields)
 return normal_prose(prompt),fields,solution+'<h4>Complete answers</h4>'+answer,answer

for topic,family,title,kind,variants in cases:
 for v,params in enumerate(variants):
  prompt,fields,solution,answer=build(kind,params);uid=f'M4U-9709-S1-NORM-CHECK-{topic.upper()}-{family}-{v}';model=dict(uid=uid,kind=kind,params=params)
  if v==2:
   key='NORM-'+kind.upper();model.update(example=key,expected={f['key']:f['expected'] for f in fields});next(l for l in lessons if l['key']==topic)['examples'].append(dict(title=title,question=prompt,solution=solution,verification=key))
  else:
   questions.append(dict(id=uid,family_uid=uid.rsplit('-',1)[0],lesson=topic,title=title,collection='short' if v==0 else 'variant',prompt_html=prompt,answer_html=answer,solution_html=solution,hint_html='<p>Sketch the region. Read variance versus standard deviation, standardise each boundary, and keep the correct tail. A count needs continuity correction; a genuinely continuous value does not. Round only the final answer.</p>',marks=len(fields),difficulty=2,fields=fields,parts=[dict(label='',marking_criteria=[dict(code='B1',marks=1,description_html='Complete correct answer to the labelled accuracy for '+f['label']+'.') for f in fields])],verification=uid))
  models.append(model)
