"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_normal_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\08_Normal_distribution')
source=root/'server/08_Normal_distribution_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/family_source_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'normal';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):return html

def convention(q):
 return ''

prerequisite_labels={'binomial_distribution':'Binomial models and moments', 'discrete_distributions':'Finite probability tables', 'logarithms':'Logarithms and integer probability bounds', 'probability':'Conditional probability', 'quadratics':'Quadratic equations and valid roots', 'representation_of_data':'Rounding intervals and data interpretation'}


for raw in raw_questions:
 uid=raw['content_uid'];per=[]
 for item in raw['images']:
  relative=Path(item['path']);assert not relative.is_absolute() and '..' not in relative.parts
  data=(root/relative).read_bytes();h=hashlib.sha256(data).hexdigest();xml=ET.fromstring(data)
  if 'width' in xml.attrib and 'height' in xml.attrib:w,hgt=int(xml.attrib['width']),int(xml.attrib['height'])
  else:
   box=xml.attrib['viewBox'].split();assert box[:2]==['0','0'];w,hgt=int(box[2]),int(box[3])
  dest=media/(h+'.svg')
  if dest.exists():assert dest.read_bytes()==data
  else:dest.write_bytes(data)
  a=dict(question_uid=uid,file_id='pkg_s1normal_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
 def project(html,include_figures=False):
  # Typography adapter only: MathJax tolerates these source forms, KaTeX does not.
  # Numerical values and criteria remain unchanged in the owner package.
  html=html.replace(r'\text{ %}',r'\text{ \%}').replace(r'\text{ g²}',r'\text{ g}^2')
  for old,a in per:html=html.replace('src="'+old+'"','src="/api/files/'+a['file_id']+'"')
  if include_figures:
   # The supplied SVGs are separate solution illustrations, not embedded HTML.
   for _,a in per:
    url='/api/files/'+a['file_id']
    if a['role']=='SOLUTION' and url not in html:
     html+='<p><img src="'+url+'" alt="'+escape(a['caption'],quote=True)+'"></p>'
  assert not re.search(r'src=[\"\']assets/',html)
  return book_tables(html)
 prereq='<p><strong>Mixed-topic prerequisite:</strong> '+escape('; '.join(prerequisite_labels.get(k,k) for k in raw['prerequisites']))+'.</p>' if raw['prerequisites'] else ''
 prompt=convention(raw)+prereq+project(raw['question_html'])
 parts=[dict(label=p['label'],marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['description_html'],**({'guidance_html':'Accept correct follow-through where the criterion allows it.'} if c.get('follow_through') else {})) for c in p['criteria']]) for p in raw['parts']]
 ref=next(row for row in source_map if row['family']==raw['question_family_id'])
 q=dict(id=uid,family_uid=raw['question_family_id'],lesson=raw['topic_id'],title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=project(raw['answer_html']),solution_html=project(raw['solution_html'],include_figures=True),hint_html=project(raw['hint_html']),marks=raw['marks'],difficulty={'foundation':1,'moderate':2,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=str(ref.get('source_record_id') or ''),original_uid=ref.get('source_uid') or '',archiveTaskId='',sourceSha256=source_hash,ownerProvenance=dict(source=ref,sourceDifficulty=raw['difficulty'],review=raw['review'],prerequisites=raw['prerequisites'],conventions=bank.get('conventions',bank.get('instructions',{})),checkSpecs=[p['check_spec'] for p in raw['parts']],markingGuidance=raw['marking_guidance'],verificationInputsSha256=digest(json.dumps(raw['verification_inputs'],sort_keys=True)))))
 questions.append(q)
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],sourceDifficulty=raw['difficulty'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref.get('source_uid') or '',sourceRelationship='selected_source_skill_redevelopment',originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-normal',version='1.0.1',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_normal',slug='normal-distribution',title='Normal distribution',position=7),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):
 path=Path(path);body=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if path.exists() and path.read_text('utf-8')==body:return
 pending=path.with_name(path.name+'.writing');pending.write_text(body,encoding='utf-8');pending.replace(path)
write(target/'normal-v1.json',pack);write(target/'normal-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-NORMAL-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='187–216 (chapter 8)',pdf_pages='199–228',sections=[dict(section='8.1–8.2',lesson='normal_areas'),dict(section='8.2–8.3',lesson='inverse_normal'),dict(section='8.3; probability chapter 4',lesson='normal_models'),dict(section='8.4',lesson='binomial_approximation'),dict(section='8.2–8.4; finite tables chapter 6',lesson='mixed_inverse')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_snapshot'],syllabus=bank['syllabus_check'],conventions=bank.get('conventions',bank.get('instructions',{})),mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written explanations, model assumptions, integer bounds, stopped histories and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-normal');public.mkdir(parents=True,exist_ok=True)
import math

def text(x,y,value,size=19):return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}">{escape(value)}</text>'

def svg(name,title,body):
 value='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" viewBox="0 0 640 350" role="img" aria-labelledby="title desc"><title id="title">'+title+'</title><desc id="desc">'+title+'</desc><rect width="640" height="350" fill="white"/><g font-family="Arial, sans-serif" fill="#172033">'+body+'</g></svg>'
 path=public/(name+'.svg')
 if not path.exists() or path.read_text('utf-8')!=value:path.write_text(value,encoding='utf-8')

def point(z):return 320+75*z,265-190*math.exp(-z*z/2)
def path(points):return ' '.join(('M' if i==0 else 'L')+f'{x:.2f},{y:.2f}' for i,(x,y) in enumerate(points))
def curve(lo,hi,title):
 points=[point(-3.6+i*7.2/240) for i in range(241)];shade=[(point(lo)[0],265)]+[point(lo+i*(hi-lo)/140) for i in range(141)]+[(point(hi)[0],265)]
 body=text(320,30,title)+f'<path d="{path(shade)} Z" fill="#dbeafe"/><path d="{path(points)}" fill="none" stroke="#173b70" stroke-width="2.5"/><path d="M45,265 H595" stroke="#172033" stroke-width="1.5"/>'
 for z in [lo,0,hi]:
  if z<=-3.5:continue
  x,y=point(z);body+=f'<path d="M{x:.2f},265 V{y:.2f}" stroke="#63718a" stroke-dasharray="4 4"/>'+text(x,293,'0' if z==0 else f'{z:.4g}',17)
 return body

svg('normal-region','Standard normal area between z=-1 and z=1.5. The shaded area represents probability, not density height.',curve(-1,1.5,'Probability is an area under the density')+text(320,331,'Subtract the left cumulative area from the right',17))
svg('normal-quantile','The standard normal 90th percentile is approximately 1.2816; the area to its left is 0.90.',curve(-3.6,1.2815515655,'A lower-tail area of 0.90 determines the cutoff')+text(320,331,'The upper tail is 0.10; use the stated tail',17))
body=text(320,32,'A count of 40 becomes a continuous strip')+'<path d="M55,200 H590" stroke="#172033" stroke-width="2"/>'
for i in [38,39,40,41,42]:
 x=320+100*(i-40);body+=f'<path d="M{x},191 V209" stroke="#172033" stroke-width="2"/>'+text(x,239,str(i),20)
body+='<rect x="270" y="95" width="100" height="105" fill="#dbeafe" stroke="#173b70" stroke-width="2"/>'+text(270,278,'39.5',18)+text(370,278,'40.5',18)+text(320,327,'P(X = 40) is approximated by P(39.5 < Y < 40.5)',17)
svg('continuity-strip','The unit-width strip for the count X=40 runs from Y=39.5 to Y=40.5 in the continuous approximation.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
