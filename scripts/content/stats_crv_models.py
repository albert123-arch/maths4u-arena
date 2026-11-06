"""Statement-derived models for the owner's 38 revised questions (no source text edits)."""
def model(pdf, **kwargs):return dict(pdf=pdf,**kwargs)
models={
1:model([('log(3)/240*exp(-x*log(3)/240)',0,'oo')],calibration=['exp(-240*log(3)/240)-1/3'],scalars=[(0,0,'log(3)/240')],density_parts=[(0,'inline')],probabilities=[(1,120,360)],quantiles=[(2,'1/2')]),
2:model([('log(5/2)/60*exp(-x*log(5/2)/60)',0,'oo')],calibration=['1-exp(-60*log(5/2)/60)-3/5'],scalars=[(0,0,'log(5/2)/60')],probabilities=[(1,0,120)],least_independent=dict(part=2,time=120,target='99/100',n=27)),
3:model([('exp(-(x-2)/6)/6',2,'oo')],density_parts=[(0,'cases')],probabilities=[(1,5,11)],quantiles=[(2,'9/10')]),
4:model([('m*x',0,1),('k/x**2+c',1,3)],params={'m':'3/4','k':'21/32','c':'3/32'},parameter_part=0,constraints=['mass:1:3/8','join:1'],iqr_parts=[1]),
5:model([('k*(2+x)',0,1),('k*(4-x)',1,3)],params={'k':'2/13'},parameter_part=0,iqr_parts=[1],moments=[(2,'x','variance')]),
6:model([('(2+3/x**2)/6',1,3)],cdf_parts=[(0,'X')],iqr_parts=[1]),
7:model([('3*exp(-3*(x-1))',1,'oo')],cdf_parts=[(0,'X')],conditional=[(1,2,'3/2')],quantiles=[(2,'1/2')]),
8:model([('2*x*exp(-x**2/9)/9',0,'oo')],given_cdf=[('1-exp(-x**2/9)',0,'oo')],tails=[(0,'3*sqrt(2)')],iqr_parts=[1]),
9:model([('1/6',2,5),('x/56',5,9)],scalars=[(0,0,'-2'),(0,1,'31'),(0,2,'1/2')],density_parts=[(1,'cases')],moments=[(2,'x','variance')],multiple_quantiles=[(3,['1/10','9/10'])],given_mean='449/84',cdf_parameter_check=True),
10:model([('(x+2)/12',-2,1),('(6-x)/20',1,6)],given_cdf=[('(x+2)**2/24',-2,1),('1-(6-x)**2/40',1,6)],density_parts=[(0,'cases')],sketch_part=0,moments=[(1,'x','mean')],iqr_parts=[2]),
11:model([('a*x-b*x**3',0,2),('c',2,4)],params={'a':'11/16','b':'5/32','c':'1/8'},parameter_part=0,constraints=['mass:2:3/4','join:2'],quantiles=[(1,'1/2')],moments=[(2,'sqrt(x)','mean')],rounding={2:('dp',2)}),
12:model([('k*x*(3-x)',0,1),('k*(3-x)',1,3)],params={'k':'6/19'},parameter_part=0,moments=[(1,'x','variance')],given_mean='49/38',quantiles=[(2,'1/2')]),
13:model([('3*x**2/64',0,4)],given_cdf=[('x**3/64',0,4)],moments=[(0,'sqrt(x)','mean'),(1,'sqrt(x)','variance')],transform=dict(h='y**4',direction=1),transform_pdf_parts=[2]),
14:model([('(x+2)/3',-2,0),('2*(1-x)/3',0,1)],given_cdf=[('(x+2)**2/6',-2,0),('1-(1-x)**2/3',0,1)],density_parts=[(0,'cases')],probabilities=[(1,-1,'1/2')],moments=[(2,'x**2','mean'),(3,'x**2','variance')]),
15:model([('a+x/6',0,2),('2*a-x/12',2,4)],params={'a':'7/36'},parameter_part=0,moments=[(1,'x**2','mean')],cdf_parts=[(2,'X')]),
16:model([('x/12',0,3),('(8-x)/20',3,8)],cdf_parts=[(0,'X')],quantiles=[(1,'1/2')],moments=[(2,'x**2','mean')],probabilities=[(3,2,5)]),
17:model([('k*x**2',0,2),('k*(6-x)',2,6)],params={'k':'3/32'},parameter_part=1,sketch_part=0,cdf_parts=[(2,'X')],quantiles=[(3,'1/2')]),
18:model([('k*x**2',0,1),('k*(2*x+1)',1,2)],params={'k':'3/13'},parameter_part=0,cdf_parts=[(1,'X')],quantiles=[(2,'1/2')],moments=[(3,'1/x','mean')]),
19:model([('(3*sqrt(x)-2/sqrt(x))/34',4,9)],cdf_parts=[(0,'X')],transform=dict(h='y**2',direction=1),transform_pdf_parts=[1]),
20:model([('(x**2+2/x**2)/10',1,3)],cdf_parts=[(0,'X')],transform=dict(h='1/y',direction=-1),transform_pdf_parts=[1],transform_quantiles=[(2,'4/5')],rounding={2:('sf',3)}),
21:model([('(2*x+8*x**3)/36',0,2)],given_cdf=[('(x**2+2*x**4)/36',0,2)],transform=dict(h='sqrt(y-1)',direction=1),transform_pdf_parts=[0],transform_moments=[(1,'y','mean')]),
22:model([('(x+1)/6',1,3)],cdf_parts=[(0,'X')],transform=dict(h='y**(1/3)-1',direction=1),transform_pdf_parts=[1],transform_quantiles=[(2,'1/2')]),
23:model([('a*exp(-3*x*log(2))',0,'oo')],params={'a':'3*log(2)'},parameter_part=0,moments=[(1,'x','mean')],iqr_parts=[2],transform=dict(h='-log(y)/log(2)',direction=-1),transform_cdf_parts=[3],transform_pdf_parts=[3]),
24:model([('(4-1/sqrt(x))/10',1,4)],transform=dict(h='y**2',direction=1),transform_pdf_parts=[0],transform_moments=[(1,'y','mean'),(2,'y','variance')]),
25:model([('sqrt(x)/54',0,9),('1/(k*sqrt(x))',9,16)],params={'k':'3'},parameter_part=0,quantiles=[(1,'1/2')],transform=dict(h='(y+1)**2',direction=1),transform_cdf_parts=[2],transform_pdf_parts=[2]),
26:model([('2*x/3',0,1),('(3-x)**2/4',1,3)],cdf_parts=[(0,'X')],quantiles=[(1,'1/2')],transform=dict(h='y**2',direction=1),transform_cdf_parts=[2],median_comparison_part=3),
27:model([('a',0,3),('b-c*x',3,7)],params={'a':'1/5','b':'7/20','c':'1/20'},parameter_part=0,constraints=['join:3','zero:7'],moments=[(1,'x','mean')],quantiles=[(2,'1/2')],transform=dict(h='sqrt(y)-1',direction=1),transform_cdf_parts=[3]),
28:model([('k*x',0,2),('k*(10-x)',2,10)],params={'k':'1/34'},parameter_part=0,quantiles=[(1,'1/2')],transform=dict(h='y**3-1',direction=1),transform_pdf_parts=[2]),
29:model([('4*x*(9-x**2)/81',0,3)],moments=[(0,'sqrt(x)','variance')],transform=dict(h='sqrt(9-y)',direction=-1),transform_pdf_parts=[1],transform_quantiles=[(2,'1/2')]),
30:model([('3*(exp(x/2)+2*exp(-x/2))/20',0,'2*log(3)')],cdf_parts=[(0,'X')],transform=dict(h='2*log(y)',direction=1),transform_pdf_parts=[1],transform_quantiles=[(2,'3/5')],transform_moments=[(3,'y**4','mean')]),
31:model([('(2*x**(-1/3)-x**(-2/3))/6',1,8)],cdf_parts=[(0,'X')],transform=dict(h='y**3',direction=1),transform_pdf_parts=[1],transform_quantiles=[(2,'1/2')]),
32:model([('4*(1+1/x**2)/15',1,4)],moments=[(0,'sqrt(x)','mean')],transform=dict(h='1/sqrt(y)',direction=-1),transform_pdf_parts=[1],transform_quantiles=[(2,'2/5')]),
33:model([('3*(10-x)**2/1000',0,10)],given_cdf=[('1-(10-x)**3/1000',0,10)],quantiles=[(0,'3/4')],moments=[(1,'x**2','variance')],given_second='10',transform=dict(h='y**2',direction=1),transform_pdf_parts=[2]),
34:model([('1/6',0,2),('(6-x)/12',2,6)],cdf_parts=[(0,'X')],quantiles=[(1,'5/6')],transform=dict(h='y**3-2',direction=1),transform_pdf_parts=[2]),
35:model([('3*(3-sqrt(x))/32',0,4),('3/(16*sqrt(x))',4,9)],moments=[(0,'x','mean')],transform=dict(h='y**2',direction=1),transform_cdf_parts=[1],transform_pdf_parts=[1]),
36:model([('(15-2*x)/50',0,5)],given_cdf=[('(15*x-x**2)/50',0,5)],iqr_parts=[0],moments=[(1,'x**3','mean')],transform=dict(h='y**2-4',direction=1),transform_pdf_parts=[2]),
37:model([('x/36',3,9)],given_cdf=[('(x**2-9)/72',3,9)],probabilities=[(0,4,7)],moments=[(1,'sqrt(x)','mean'),(2,'sqrt(x)','variance')],transform=dict(h='y**(1/3)+1',direction=1),transform_pdf_parts=[3]),
38:model([('3*(x+1)**2/56',1,3)],cdf_parts=[(0,'X')],transform=dict(h='exp(y)-1',direction=1),transform_pdf_parts=[1],transform_quantiles=[(2,'1/2')],transform_moments=[(3,'y','mean')])
}

# Transformed support endpoints and breakpoints, in increasing order.
transformed_support={
13:[0,'sqrt(2)'],19:[2,3],20:['1/3',1],21:[1,5],22:[8,64],23:[0,1],24:[1,2],25:[-1,2,3],26:[0,1,'sqrt(3)'],27:[1,16,64],28:[1,'3**(1/3)','11**(1/3)'],29:[0,9],30:[1,3],31:[1,2],32:['1/16',1],33:[0,'sqrt(10)'],34:['2**(1/3)','4**(1/3)',2],35:[0,2,3],36:[2,3],37:[8,512],38:['log(2)','log(4)']}
