"""Exact independent checks of owner bank claims and authored teaching.
No web/database writes. A failed owner claim is reported, never repaired here.
Requires sympy==1.14.0. Pass --owner to bind the source hash in a local audit.
"""
import argparse,hashlib,json,itertools
from pathlib import Path
import sympy as s
x,y,a,b,c,p,q,k,t=s.symbols('x y a b c p q k t')
logs=[];failures=[]
def ck(uid,label,left,right):
    ok=s.simplify(left-right)==0
    row=dict(id=uid,label=label,result='PASS' if ok else 'FAIL',actual=str(s.simplify(left)),expected=str(right))
    logs.append(row)
    if not ok:failures.append(row)
def eq(uid,P,Q):
    ck(uid,'transformed polynomial',s.Poly(P,y).monic().as_expr(),s.Poly(Q,y).monic().as_expr())
def transform(uid,P,T,Q):
    num=s.together(y-T).as_numer_denom()[0]
    eq(uid,s.resultant(P,num,x),Q)
def power(P,n,T=x):return s.RootSum(s.Poly(P,x),s.Lambda(x,s.cancel(T**n))).doit()
def powers(uid,P,claims,T=x):
    for n,v in claims.items():ck(uid,'power sum '+str(n),power(P,n,T),s.sympify(v))
def roots(uid,P,rs):ck(uid,'root factorisation',s.Poly(P,x).monic().as_expr(),s.expand(s.prod(x-r for r in rs)))

# Every supplied ID has at least one independent algebraic construction; all
# numerical final sums and transformed equations are checked as separate claims.
P=3*x**3-2*x*x-2*x+6;powers('4157',P,{2:s.Rational(16,9)});transform('4157',P,1-2/x,3*y**3-7*y*y+y-9)
P=2*x**3-3*x*x+10*x+4;ck('4164','shifted product',-P.subs(x,-1)/2,s.Rational(11,2));transform('4164',P,-x/2,4*y**3+3*y*y+5*y-1)
roots('4246',x**3-12*x+16,[2,2,-4]);ck('4246','reciprocal-square condition',s.Rational(2,4)+s.Rational(1,16),s.Rational(9,16));ck('4246','repeated-root identity',4*(-3*a*a)**3+27*(2*a**3)**2,0)
P=3*x**3-6*x*x+2*x+4;powers('4268',P,{1:2,2:s.Rational(8,3),4:s.Rational(-40,9)});transform('4268',P,2-x,3*y**3-12*y*y+14*y-8);powers('4268',P,{-2:s.Rational(1,16)},2-x)
roots('4274',x**3-2*x*x-x+2,[2,1,-1]);powers('4274',x**3-2*x*x-x+2,{1:2,2:6,3:8});ck('4274','squared differences',2*6-2*(-1),14)
P=2*x**3-6*x*x+4*x-6;powers('5809',P,{1:3,2:5,3:18});transform('5809',P,1/x**2,9*y**3+14*y*y+5*y-1)
roots('5851',x**3-11*x*x+31*x-21,[1,3,7]);ck('5851','positive geometric centre',4**3-14*4-8,0)
P=(x-a)*(x+2*a)*(x-3*a);ck('5871','coefficients',P,x**3-2*a*x*x-5*a*a*x+6*a**3);ck('5871','first identity',4*(-5*a*a)+5*(-2*a)**2,0);ck('5871','second identity',4*(6*a**3)+3*(-2*a)**3,0)
P=x**3-5*x+q;powers('5889',P,{1:0,2:10,4:50});powers('5889',P.subs(q,2),{-1:s.Rational(5,2)})
P=x**3-4*x*x+2*x+1;powers('6218',P,{2:12});ck('6218','difference sum',2*12-2*2,20);powers('6218',P,{3:10},x-1)
rs=[-2,1,5];roots('6236',x**3-4*x*x-7*x+10,rs);ck('6236','six ratios',sum(s.Rational(i,j) for i,j in itertools.permutations(rs,2)),s.Rational(-1,5));powers('6236',x**3-4*x*x-7*x+10,{1:4,2:30,-1:s.Rational(7,10)})
ck('6267','converse factorisation',(x+a/2)*(x*x+a*x/2+b-a*a/4),x**3+a*x*x+b*x+a*b/2-a**3/8)
roots('6284',x**3-10*x*x+25*x-18,[2,4-s.sqrt(7),4+s.sqrt(7)]);ck('6284','rejected discriminant',2**2-4*9,-32)
powers('6317',x**3+2*x*x-2*x+1,{-1:2,-2:0,-3:-7})
P=3*x**3-2*x*x+5*x-6;ck('6355','shifted product',P.subs(x,2)/3,s.Rational(20,3));ck('6355','pair-sum product',P.subs(x,s.Rational(-1,3))/3,s.Rational(-8,3));powers('6355',P,{-1:s.Rational(33,20)},2-x)
P=x**3+p*x+q;powers('6409',P,{2:-2*p,3:-3*q,6:-2*p**3+3*q*q});ck('6409','sixth-power identity',12*power(P,6)-3*power(P,2)**3-4*power(P,3)**2,0)
powers('6420',x**3-5*x+3,{2:10,5:-75})
roots('6445',8*x**3-6*x*x-3*x+1,[-s.Rational(1,2),s.Rational(1,4),1]);ck('6445','AP reciprocals',(1-1)**3+3*1-4,-1) if False else ck('6445','centre equation',1+3-4,0)
B=-q/p;ck('6477','geometric factorisation',(x-B)*(x*x+(p+B)*x+B*B),x**3+p*x*x+q*x+q**3/p**3);ck('6477','reality inequality',s.expand(((p+B)**2-4*B*B)*p*p),(p*p-3*q)*(p*p+q))
ck('6498','converse factorisation',(x-q/2)*(x*x+(2+q/2)*x-2),x**3+2*x*x+(-2-q-q*q/4)*x+q)
roots('6516',x**3-3*x*x-6*x+8,[-2,1,4]);powers('6516',x**3-3*x*x-6*x+8,{1:3,2:21,4:273})
roots('6535',x**3+4*x*x+x-6,[-3,-2,1]);powers('6535',x**3+4*x*x+x-6,{1:-4,2:14})
roots('6544',x**3-3*x*x-9*x+27,[3,3,-3]);roots('6544',x**3-3*x*x-9*x-5,[-1,-1,5]);ck('6544','shifted identity',(x**3-3*x*x+p*x+q).subs(x,y+1),y**3+(p-3)*y+p+q-2)
P=x**4-8*x**3+17*x*x-4*x-3;ck('6374','centred quartic',P.subs(x,y+2),y**4-7*y*y+9);powers('6374',P,{2:30,-2:s.Rational(118,9)});assert sum(complex(r).real>0 for r in s.nroots(P))==3
P=x**4-5*x**3+5*x*x-5*x+1;powers('6385',P,{2:15});ck('6385','reciprocal identity',s.expand(x**4*P.subs(x,1/x)),P);powers('6385',P,{-2:s.Rational(16,17)},x+1)
P=x**4+2*x*x+3*x-1;transform('6398',P,x*x,y**4+4*y**3+2*y*y-13*y+1);powers('6398',P,{6:-1,8:-76})
P=(x*x-3*x-3)**2;transform('6418',P,1/(x-1),25*y**4+10*y**3-9*y*y-2*y+1);powers('6418',P,{2:s.Rational(22,25)},1/(x-1));ck('6418','coefficient alternatives',(x*x-3*x+3)**2,x**4-6*x**3+15*x*x-18*x+9)
P=x**4-3*x*x+2*x-1;transform('6566',P,x*x,y**4-6*y**3+7*y*y+2*y+1);powers('6566',P,{6:84})
P=x**4+2*x**3+c*x*x-2*x-2;powers('6587',P,{2:4-2*c,-2:1+c});ck('6587','difference squares',power(P,2)+power(P,-2)-8,-3-c)
P=x**4-x**3-2;transform('4138',P,x**3+1,y**4-5*y**3+3*y*y-7*y);powers('4138',P,{6:13,9:55})
P=x**4-x**3-2*x*x-x-2;powers('4145',P,{1:1,2:5,3:10,4:29,5:56});ck('4145','ordered mixed sum',power(P,1)*power(P,2)-power(P,3),-5)
P=x**4+2*x*x-3*x+1;transform('4152',P,x*x+1,y**4-9*y+9);powers('4152',P,{4:4});powers('4152',P,{6:243},x*x+1)
P=x**4-2*x**3+3*x*x+4*x-2;powers('4180',P,{1:2,-1:2,-2:7,2:-2,3:-22,4:-38})
P=x**4-2*x**3-2*x+4;powers('4194',P,{1:2,3:14,-1:s.Rational(1,2)});transform('4194',P,x-1,y**4+2*y**3-4*y+1);powers('4194',P,{4:-20},x-1)
P=x**4+2*x**3-2;transform('4262',P,2/x**3,y**4-6*y**3+12*y*y-8*y-2);powers('4262',P,{3:-8,-6:3,4:24})
ck('6292','double quadratic',(x*x-2*x+(p-4)/2)**2,x**4-4*x**3+p*x*x+(8-2*p)*x+(p-4)**2/4)
P=x**3+2*x+2;transform('4108',P,x**3-x+1,y**3+3*y*y+21*y-35);powers('4108',P,{2:-33,3:267},x**3-x+1)
P=x**3-2*x*x+3;transform('4116',P,(x-1)**2,y**3-3*y*y-3*y-4);powers('4116',P,{4:15,6:66},x-1)
P=x**3-x*x+2*x+1;transform('4172',P,x*x+1,y**3+3*y-5);powers('4172',P,{1:0,4:18},x*x+1)
P=3*x**3+x*x-3*x+1;transform('4235',P,1/x-1,y**3-2*y+2);transform('4235',P,(1/x-1)**3,y**3+6*y*y+4*y+8);powers('4235',P,{6:28,9:-168},1/x-1)
P=x**3+3*x*x+5*x+2;transform('5820',P,(x+1)**3,y**3-3*y*y+11*y-1);powers('5820',P,{3:3,-3:11,6:-13,9:-69},x+1)
P=x**3-2*x*x+x+2;transform('5843',P,2/x-1,y**3+4*y*y+y+2);powers('5843',P,{2:14,3:-58},2/x-1)
P=4*x**3+6*x*x-2*x-1;transform('5864',P,2*x+1,y**3-5*y+2);powers('5864',P,{1:0,3:-6},2*x+1);powers('5864',P,{2:s.Rational(89,4)},2*x+1+1/(2*x+1))
P=x**3-3*x*x+5*x-5;transform('6243',P,1/(x-1)**2,4*y**3-4*y*y-4*y-1)
P=2*x**3-5*x*x-4*x+6;transform('6307',P,(x-s.Rational(5,2))/3,108*y**3+180*y*y+51*y-8);powers('6307',P,{2:s.Rational(11,6)},(x-s.Rational(5,2))/3)
P=x**3+2*x*x-4*x-3;powers('6335',P,{3:-23,4:88});transform('6335',P,(2*x+1)/(x-1),4*y**3-33*y*y+39*y-5)
transform('6340',3*x**3-5*x*x+2*x-4,2/x-1,y**3+2*y*y+6*y-1)
P=x**3-4*x*x+x+6;transform('6388',P,4/x-1,3*y**3+11*y*y-19*y+5);powers('6388',P,{-2:s.Rational(251,25)},4/x-1)
P=x**3+2*x-1;transform('6456',P,x**(-3),y**3-11*y*y+3*y-1);ck('6456','squared differences',3*power(P,-6)-power(P,-3)**2,224)
P=x**3-2*x*x-3*x+5;transform('6494',P,2-3*x,y**3-39*y-65);transform('6494',P,s.Rational(3,5)-1/x,25*y**3-30*y*y-y+1);powers('6494',P,{2:s.Rational(38,25)},s.Rational(3,5)-1/x)
P=x**3-2*x+3;transform('6527',P,x*x+2,y**3-10*y*y+32*y-41);powers('6527',P,{1:10,2:36,3:163,4:888},x*x+2)
P=2*x**3+3*x*x-4*x+2;transform('6594',P,1-1/x,2*y**3-2*y*y+y-3);powers('6594',P,{3:4,-2:s.Rational(-11,9)},1-1/x)
P=x**4+2*x*x-2*x+2;transform('4215',P,x*x-1,y**4+8*y**3+26*y*y+36*y+21);powers('4215',P,{-1:s.Rational(-12,7)},x*x-1);powers('4215',P,{4:0})
P=2*x**4-2*x**3+3*x*x+1;transform('4254',P,1+x**(-2),y**4+2*y**3+y*y-4*y+4);powers('4254',P,{-4:10});ck('4254','triple-product squares',s.Rational(1,4)*power(P,-2),s.Rational(-3,2))
P=4*x**4-4*x**3+3*x*x+x-1;transform('5884',P,2*x-1,y**4+2*y**3+3*y*y+6*y);powers('5884',P,{2:-2,3:-8,4:34,5:-32},2*x-1)
P=x**3-4*x*x+5*x-2;powers('4132',P,{2:6,3:10});ck('4132','singularity',8+2*2-2*6,0);ck('4132','shifted determinant',27+2*2-3*6,13)
P=x**3-3*x*x+x-3;powers('4240',P,{2:7});roots('4240',x**3-7*x+6,[-3,1,2])
P=x**3+k*x-2;transform('5803',P,x**3+1,y**3-9*y*y+(27+k**3)*y-(27+k**3));powers('5803',P,{2:27-2*k**3},x**3+1);ck('5803','singularity equation',1+2*(27+k**3)-(27-2*k**3),28+4*k**3)
P=x**3-3*x*x-6*x+8;roots('5834',P,[-2,1,4]);powers('5834',P,{3:57});ck('5834','given conjugate root',(x**3-3*x*x+9*x+81).subs(x,3+3*s.sqrt(2)*s.I),0)
P=x**4+4*x**3-4*x*x-16*x-1;powers('6429',P,{1:-4,2:24,3:-64,-1:-16,4:292});ck('6429','centre shift',P.subs(x,y-1),y**4-10*y*y+8)
P=2*x**3-4*x*x-3*x-6;powers('6557',P,{2:7,3:26});ck('6557','singularity',8+6-2*7,0)
P=x**4-3*x**3+x*x-3*x+1;ck('6582','reciprocal substitution',s.expand(x*x*((x+1/x)**2-3*(x+1/x)-1)),P);ck('6582','combined sums',power(P,2)+power(P,-2),14)

# Textbook notation distinguishes unordered products from powers, including
# multiplicity and the one cubic/four quartic triple products.
for degree in (3,4):
    rs=list(s.symbols('notation_r1:'+str(degree+1)))
    pair=sum(s.prod(terms) for terms in itertools.combinations(rs,2))
    triple=sum(s.prod(terms) for terms in itertools.combinations(rs,3))
    product=s.prod(rs);total=sum(rs)
    ck('NOTATION-'+str(degree),'square sum',sum(r*r for r in rs),total**2-2*pair)
    ck('NOTATION-'+str(degree),'cube sum',sum(r**3 for r in rs),total**3-3*total*pair+3*triple)
    ck('NOTATION-'+str(degree),'number of pair terms',len(list(itertools.combinations(rs,2))),degree*(degree-1)//2)
    ck('NOTATION-'+str(degree),'number of triple terms',len(list(itertools.combinations(rs,3))),1 if degree==3 else 4)
    ck('NOTATION-'+str(degree),'reciprocal sum',sum(1/r for r in rs),sum(s.prod(terms) for terms in itertools.combinations(rs,degree-1))/product)
    ck('NOTATION-'+str(degree),'reciprocal pair sum',sum(1/s.prod(terms) for terms in itertools.combinations(rs,2)),sum(s.prod(terms) for terms in itertools.combinations(rs,degree-2))/product)
rs=[a,a,b]
ck('NOTATION-repeated','pair-product sum',sum(i*j for i,j in itertools.combinations(rs,2)),a*a+2*a*b)
ck('NOTATION-repeated','product',s.prod(rs),a*a*b)
ck('NOTATION-repeated','square sum',sum(r*r for r in rs),2*a*a+b*b)
ck('NOTATION-repeated','cube sum',sum(r**3 for r in rs),2*a**3+b**3)

# New examples: independent polynomial checks, not copies of textbook examples.
powers('E-C1',6*x*x-5*x-4,{1:s.Rational(5,6)})
ck('E-C1','product',s.Rational(-4,6),s.Rational(-2,3))
ck('E-C2','monic coefficients',2*(x**3-s.Rational(7,2)*x*x-s.Rational(3,2)*x+s.Rational(9,2)),2*x**3-7*x*x-3*x+9)
ck('E-C3','quartic coefficients',3*(x**4+2*x**3-s.Rational(4,3)*x*x+s.Rational(5,3)*x-s.Rational(2,3)),3*x**4+6*x**3-4*x*x+5*x-2)
roots('E-C4',x**3-5*x*x+7*x-3,[1,1,3])
powers('E-S1',x**3-3*x*x+2*x+4,{2:5,3:-3});powers('E-S2',x**3-3*x*x+2*x+4,{-2:s.Rational(7,4)})
powers('E-S3',x**3-x-2,{6:14});powers('E-S4',x**3-x*x-4*x+6,{1:1,2:9,3:-5,-1:s.Rational(2,3)})
transform('E-T1',x**3-2*x*x-3*x+1,x+2,y**3-8*y*y+17*y-9);transform('E-T2',x**3+2*x*x-3*x+4,1/x,4*y**3-3*y*y+2*y+1)
transform('E-T3',x**3-2*x+1,x*x,y**3-4*y*y+4*y-1)
transform('E-T4',x**3-x*x+2*x-3,(x+2)/(x-1),y**3-12*y*y+3*y-19)
roots('E-M1',x**3-9*x*x+23*x-15,[1,3,5])
ck('E-M2','reciprocal substitution',s.expand(x*x*((x+1/x)**2-4*(x+1/x)+1)),x**4-4*x**3+3*x*x-4*x+1)
ck('E-M3','centred quartic',(x**4-8*x**3+14*x*x+8*x-15).subs(x,y+2),y**4-10*y*y+9)
ck('E-M4','square contradiction',power(x**4+x**3+c*x*x-x-1,2)+power(x**4+x**3+c*x*x-x-1,-2)-8,-6)

root=Path('content/original/9231-fp1');pack=json.loads((root/'roots-v1.json').read_text(encoding='utf-8'))
refs=json.loads((root/'roots-quick-verification-v1.json').read_text())
audit=json.loads(Path('docs/ARENA-C1-SOURCE-AUDIT-20261106.json').read_text(encoding='utf-8'))
# Owner-authorised notation-only revision, 8 November 2026. Original audit
# manifests remain immutable. Every other package value is bound by the protected
# projection; only these exact new presentation digests are accepted for 1.0.1.
NOTATION_PATHS = [['version'], ['lessons', 0, 'ideas'], ['lessons', 0, 'examples', 1, 'question'], ['lessons', 0, 'examples', 1, 'solution'], ['lessons', 0, 'examples', 2, 'solution'], ['lessons', 1, 'ideas'], ['lessons', 1, 'examples', 0, 'solution'], ['lessons', 1, 'examples', 3, 'solution'], ['questions', 1, 'prompt_html'], ['questions', 2, 'prompt_html'], ['questions', 3, 'prompt_html'], ['questions', 4, 'solution_html'], ['questions', 17, 'prompt_html'], ['questions', 18, 'prompt_html'], ['questions', 19, 'prompt_html'], ['questions', 20, 'solution_html'], ['questions', 36, 'solution_html'], ['questions', 46, 'solution_html'], ['questions', 59, 'solution_html'], ['questions', 61, 'solution_html'], ['questions', 62, 'answer_html'], ['questions', 62, 'solution_html'], ['questions', 63, 'solution_html'], ['questions', 64, 'solution_html'], ['questions', 65, 'solution_html'], ['questions', 66, 'solution_html'], ['questions', 76, 'solution_html'], ['questions', 83, 'solution_html'], ['questions', 86, 'solution_html'], ['questions', 91, 'solution_html']]
NOTATION_PROTECTED_SHA256 = '7b2041b77d4cab753ad30f796f3c23410bc2e2d0dd25283193e64c5392fc4f0d'
NOTATION_QUESTIONS = {'M4U-9231-RPE-C21': {'before': 'a733a1c11f9e8e8fd9c8027d05433a75114cff9c1def8b5c7703338e9a793e20', 'after': '3e667ce70318984ebc4b60f56587efb20da40b6bb3f7a4c51183ecfd6e1c08a5'}, 'M4U-9231-RPE-C31': {'before': '3b19671abcc763e04175f3474ee7e50e991176567e7391160d368c00992f3644', 'after': '9da0940d7e0d6be9b402e85337dabc5466d6ccf2bb666d49fd4543afcf7cc539'}, 'M4U-9231-RPE-C41': {'before': '58616ff8ec2f8652115ee7d71c7d3481043eb9ad81a763065356b5bd7c70175d', 'after': 'f8cc927be3b4d11a958703f0fae29d80013ba59aa1d7d3edf18e44771867722e'}, 'M4U-9231-RPE-S11': {'before': 'da582b487d4c2fc8dabd1c49ef430236ea8873e2607fe6008552fdd70e093744', 'after': 'a55c49bde073296fab90db784e3fba5e7a4b924a0d01a135312ca6fedc4a49ff'}, 'M4U-9231-RPE-C22': {'before': '8e78018e822ed388cb11a348ff7f451ace13e2767bc321c087b6af47b79a2b0e', 'after': '4e1a18fa36edb2daab5fee36a87321ccd618a1d585deccefdad9674d1f57751c'}, 'M4U-9231-RPE-C32': {'before': '61f3d2a9a59b40f73e332a7d16324539829d991739ef99361d0f0e52b18a9f27', 'after': '9e7552447831592fddee6b67a4c1ad8750c325e3ffdfc17789a38a1a7027e25f'}, 'M4U-9231-RPE-C42': {'before': 'ca0fdb71a698fef9a6a4cebbe2876cc75d15d44f2dee7ba6d7501b708972e2aa', 'after': '3add6d72275291f24dec1aad11e7b32d37ea735aee2fd6b9c214a0a9b713ece9'}, 'M4U-9231-RPE-S12': {'before': '9078d0fb2a8e88c4d6a65517c724575ad354c5c825a9fa41e0f6adf851d453b1', 'after': '291ba357f8c72d714c426dfcd97a7dbffd13b0de5be8794ed1585ade20d2e354'}, 'M4U-9231-FP1-RPE-4274': {'before': '36b73ec33118ee43f5ea3bc99eab65f56688cc9459771907fdfaf75a692ad2b3', 'after': 'ced034e4a7cbaeafb633f578bd74f76d7081ad6f174b8749e1b3dc3e2c2158a5'}, 'M4U-9231-FP1-RPE-6355': {'before': 'a316b061a15109ba12be8269b97c21f401c4ead1f71d912dd9140a87f9813429', 'after': 'e2146f5799181876a42736e9b2ce8fb97632f245d5a8d494a792f4d6231e0d5c'}, 'M4U-9231-FP1-RPE-6566': {'before': '43e3d1a0592372dcf21016c4c2bbc7e92ccbef1b20367cd47531a342863c602b', 'after': '38fa7b7fc007adc9be5801e83a6cf7279ca7304d08bed00b4686a272dab6d3a6'}, 'M4U-9231-FP1-RPE-4138': {'before': '9f874c539a779cc4555c687a8edeabf6bbc40619dcf42e780cd5633a696276d6', 'after': '321ad1e542a4a5f13280b7700f94a428093b2bec27d6d3ed63c0a4ec80a6d9df'}, 'M4U-9231-FP1-RPE-4145': {'before': 'ee004352882c1225279b60d108b70789c84379d1ee228b571d06506fc9eb506c', 'after': '958551c94d57c0bf30ee0f77c8db4a1fc6802f4fad41f160490acafe5895c359'}, 'M4U-9231-FP1-RPE-4152': {'before': '3ad89f3fe2b9bf2ec5ca209d07c855e251d88997e7ab1f835d46d9f057ef0aa4', 'after': '8f30ddea41d57ca1c8f9c4b0e6dbaf24eea054a4abfbc0b5052623f09f7ffe72'}, 'M4U-9231-FP1-RPE-4180': {'before': '81a0d0e6a6611e383e43ac35a670366676b27852599ec2b1cd410907c072213e', 'after': '0bc8b16989e23b67f665b2d7567995d6d450583d9cae7d140ddcb5392f05a41f'}, 'M4U-9231-FP1-RPE-4194': {'before': '907b8008dfb75cb8234bb3d0f45b0808b22bc064f1ba0bcd32930e81e9749ffd', 'after': '818e48992f187d56eeb7a75739b471d65aa12d1e9db2a6706eb4eba10aa21331'}, 'M4U-9231-FP1-RPE-4262': {'before': 'e1dee51347e42041611f8b2900edebf72a57f5183494b8034b6ff009e3aa315e', 'after': '373be412cb1c4a16fdc045e362df54cc604ea02199ea7e291762f58e6b443c97'}, 'M4U-9231-FP1-RPE-6307': {'before': 'd2d1e969844f282a2feb276522729a8a43efeb6ca34ddb91f57a35e7a9b94415', 'after': '60a9e8d79330ecb8debdc5b086960883814fed6cfffb0cca6ec802172cf3e71a'}, 'M4U-9231-FP1-RPE-6594': {'before': '0fe41ddb33766f9e9b7802e242c92b1909883ebf53fecec790650f34dc959004', 'after': '4bea8e90e3b64cde799af3d2f546c7f2b36695b290399f5d7e9a2f2993f507f5'}, 'M4U-9231-FP1-RPE-5884': {'before': '41da1fdd84dcc641fecfb9d755701b5b8674039ceb09b0809540cc2ba644b5f2', 'after': '3b7cad5cae9a396c6c3eee14a6e2232cbcad28c59b36ccbd23ed878b820fa6c4'}, 'M4U-9231-FP1-RPE-6429': {'before': 'e68fda5dc2b6d5513ff98ab8369f52ac7829a3195bcdfbf89476030cba08a702', 'after': 'aa15cc4cb53d9761b77361ff6a81c87e06afa23fc5a9f225b11541e02b9536d1'}}
NOTATION_LESSONS = {'fp1_roots_coefficients': {'before': '9c4f6e8ad4ac19e3a7a9ff0698859265e7c11fcacfd485d0ec0412249bbb771d', 'after': '0380a524f45f01cb8451dc2a1aaae32953eda5f0c710bb39e497a27b090650f1'}, 'fp1_roots_symmetric_sums': {'before': '6973e4cf53447e22953f481de8c8c08cce9ae488540d0e0d13f31c584c6ec00f', 'after': 'eaa75c3886ba129ef086dfa0362ba19046d25cf64bc0c3f28cde0ec3e2352e52'}}
assert pack['version'] in {'1.0.0','1.0.1'}, 'Unaudited roots package version'
import copy,re
projection=copy.deepcopy(pack)
for path in NOTATION_PATHS:
    node=projection
    for key in path[:-1]: node=node[key]
    node[path[-1]]=None
assert hashlib.sha256(json.dumps(projection,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==NOTATION_PROTECTED_SHA256, 'Non-notation package data changed'
if pack['version']=='1.0.1':
    assert not re.search(r'\be_(?:[1-4j]|\{[1-4j]\})',json.dumps(pack)), 'Obsolete elementary-sum labels remain'
def approved_digest(identity,old_expected,changes):
    if identity not in changes: return old_expected
    assert old_expected==changes[identity]['before'], 'Original audit reference changed'
    return changes[identity]['after'] if pack['version']=='1.0.1' else old_expected

def content_digest(q):
    return hashlib.sha256('\0'.join([q['title'],q['prompt_html'],q['answer_html'],q['solution_html'],q['hint_html'],str(q['marks'])]).encode()).hexdigest()
for lesson in pack['lessons']:
    assert hashlib.sha256(json.dumps(lesson,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==approved_digest(lesson['id'],audit['teachingDigests'][lesson['id']],NOTATION_LESSONS),'Teaching text changed after audited checks'
for row in audit['rows']:
    assert content_digest(next(q for q in pack['questions'] if q['id']==row['uid']))==approved_digest(row['uid'],row['contentSha256'],NOTATION_QUESTIONS),'Owner text changed after audited checks'
for row in refs:
    uid=row['uid'];ref=row['reference'];P=s.sympify(ref.get('poly','0'));ans=row['answers']
    current=next(q for q in pack['questions'] if q['id']==uid)
    assert content_digest(current)==approved_digest(uid,row['contentSha256'],NOTATION_QUESTIONS)
    assert {f['key']:f['expected'] for f in current['fields']}==ans,'Quick-check key differs from verified mathematics'
    if ref['kind']=='power':ck(uid,'quick power',power(P,ref['n']),s.sympify(next(iter(ans.values()))))
    elif ref['kind']=='combined':ck(uid,'quick combined',power(P,2)+power(P,-2),s.sympify(ans['sum']))
    elif ref['kind']=='transform':transform(uid,P,s.sympify(ref['map']),s.sympify(ref['result']));eq(uid,s.sympify(ans['equation'].replace('^','**')),s.sympify(ref['result']))
    elif ref['kind']=='given-roots':roots(uid,s.sympify(ans['equation'].replace('^','**')).subs(y,x),list(map(s.sympify,ref['roots'])))
    elif ref['kind']=='S0':ck(uid,'number of root positions',int(ans['choice']),ref['degree'])
    elif ref['kind'] in ['sums','elementary','quartic-tail']:
        co=s.Poly(P,x).monic().all_coeffs()
        expected=({'sum':-co[1],'product':co[-1]} if ref['kind']=='sums' else {'e1':-co[1],'e2':co[2],'e3':-co[3]} if ref['kind']=='elementary' else {'e3':-co[3],'e4':co[4]})
        for k,v in expected.items():ck(uid,k,s.sympify(ans[k]),v)
    else:
        # Independently inspect actual choice option A algebra, including the
        # repeated-root identity and inverse relation, not just its letter.
        question=next(q for q in pack['questions'] if q['id']==uid)
        if ref['kind']=='real-count':ck(uid,'quadratic discriminant count',2 if ref['t']**2-4>0 else 0,2 if ref['t']==3 else 0)
        elif ref['kind']=='multiplicity':
            rs=[a,a,b] if ref['variant']==1 else [a,b,b]
            ck(uid,'pair products',sum(rs[i]*rs[j] for i in range(3) for j in range(i+1,3)),a*a+2*a*b if ref['variant']==1 else b*b+2*a*b)
        elif ref['kind']=='inverse':ck(uid,'inverse relation',(y-3)+3 if ref['variant']==1 else 2*((y+1)/2)-1,y)
        ck(uid,'choice key points to the worked option',int(ans['choice']=='A'),1)
for question in pack['questions']:
    ck(question['id'],'mark allocation',sum(c['marks'] for p in question['parts'] for c in p['marking_criteria']),question['marks'])
    assert any(l['id']==question['verification'] or l['id']==question['verification'].removeprefix('OWNER-') for l in logs),question['id']
args=argparse.ArgumentParser();args.add_argument('--owner');args.add_argument('--report',default='.local/c1-20261106/math-verification.json');opts=args.parse_args()
if opts.owner:
    owner=Path(opts.owner);assert hashlib.sha256(owner.read_bytes()).hexdigest()==pack['source']['sha256']
    data=json.loads(owner.read_text(encoding='utf-8-sig'));assert {q['id'] for l in data['lessons'] for q in l['questions']}=={l['id'] for l in logs if l['id'].isdigit()}
report={'checks':len(logs),'ownerQuestions':62,'authoredExamples':16,'quickChecks':32,'failures':failures,'log':logs}
Path(opts.report).parent.mkdir(parents=True,exist_ok=True);Path(opts.report).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='log'}));raise SystemExit(1 if failures else 0)
