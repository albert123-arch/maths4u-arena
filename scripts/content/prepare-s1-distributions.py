"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_distributions_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\06_Probability_distributions')
source=root/'server/06_Probability_distributions_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/source_skill_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'distributions';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):return html

def convention(q):
 return ''

prerequisite_labels={'combinations_5.2':'Combinations: physical subsets (syllabus 5.2)'}


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
  a=dict(question_uid=uid,file_id='pkg_s1dist_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
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
 ref=next(row for row in source_map if row['question_family_id']==raw['question_family_id'])
 q=dict(id=uid,family_uid=raw['question_family_id'],lesson=raw['topic_id'],title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=project(raw['answer_html']),solution_html=project(raw['solution_html'],include_figures=True),hint_html=project(raw['hint_html']),marks=raw['marks'],difficulty={'foundation':1,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=str(ref.get('source_record_id') or ''),original_uid=ref.get('source_uid') or '',archiveTaskId='',sourceSha256=source_hash,ownerProvenance=dict(source=ref,review=raw['review'],prerequisites=raw['prerequisites'],conventions=bank['conventions'],checkSpecs=[p['check_spec'] for p in raw['parts']],markingGuidance=raw['marking_guidance'],verificationInputsSha256=digest(json.dumps(raw['verification_inputs'],sort_keys=True)))))
 questions.append(q)
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref.get('source_uid') or '',sourceRelationship='selected_source_skill_redevelopment',originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-distributions',version='1.0.1',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_distributions',slug='probability-distributions',title='Probability distributions',position=5),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):
 path=Path(path);body=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if path.exists() and path.read_text('utf-8')==body:return
 pending=path.with_name(path.name+'.writing');pending.write_text(body,encoding='utf-8');pending.replace(path)
write(target/'distributions-v1.json',pack);write(target/'distributions-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-DISTRIBUTIONS-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='149–164 (chapter 6)',pdf_pages='161–176',sections=[dict(section='6.1–6.3',lesson='tables_parameters'),dict(section='6.1–6.3',lesson='finite_experiments'),dict(section='6.2–6.3; counting 5.4',lesson='without_replacement'),dict(section='6.2–6.3; probability 4.4–4.5',lesson='conditional_processes'),dict(section='6.3',lesson='inverse_applications')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_scope'],syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written reasoning, finite distribution interpretation and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-distributions');public.mkdir(parents=True,exist_ok=True)

def svg(name,title,body):
 value='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" viewBox="0 0 640 350" role="img" aria-labelledby="title desc"><title id="title">'+title+'</title><desc id="desc">'+title+'</desc><rect width="640" height="350" fill="white"/><g font-family="Arial, sans-serif" fill="#172033">'+body+'</g></svg>'
 path=public/(name+'.svg')
 if not path.exists() or path.read_text('utf-8')!=value:path.write_text(value,encoding='utf-8')

def text(x,y,value,size=19):return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}">{escape(value)}</text>'

def bars(xs,ps,title,foot):
 body=text(320,32,title)+text(320,332,foot,17)+'<path d="M70 65V265H595" fill="none" stroke="#172033" stroke-width="2"/>'
 for i,(x,p) in enumerate(zip(xs,ps)):
  at=125+(x-min(xs))*420/(max(xs)-min(xs));h=float(p)*330
  body+=f'<rect x="{at-22}" y="{265-h}" width="44" height="{h}" fill="#2857a5"/>'+text(at,292,str(x))+text(at,250-h,str(p),17)
 return body

from fractions import Fraction as F
svg('probability-bars','Probabilities at values −2, 0, 1, 4 are 1/10, 3/10, 2/5, 1/5, respectively. Separate bars represent discrete masses.',bars([-2,0,1,4],[F(1,10),F(3,10),F(2,5),F(1,5)],'A finite discrete distribution','Separate bars; probabilities sum to 1'))
body=text(320,32,'Nine ordered pairs; six possible sums')
labels=[0,1,3]
for i,a in enumerate(labels):
 body+=text(125,114+i*64,str(a),21)+text(235+i*100,64,str(a),21)
 for j,b in enumerate(labels):
  x,y=195+j*100,80+i*64
  body+=f'<rect x="{x}" y="{y}" width="80" height="50" rx="5" fill="#dbeafe" stroke="#173b70"/>'+text(x+40,y+32,str(a+b),24)
body+=text(320,300,'Sum 3 has two pairs; sum 2 has one',18)+text(320,330,'Each cell has probability 1/9',17)
svg('sum-grid','Independent spins with labels 0,1,3 produce nine equally likely ordered pairs. Sum 3 has probability 2/9 and sum 2 has probability 1/9.',body)
svg('stopping-positions','With two marked and three unmarked counters, the first marked draw is at position 1,2,3,4 with probabilities 2/5,3/10,1/5,1/10.',bars([1,2,3,4],[F(2,5),F(3,10),F(1,5),F(1,10)],'First marked draw: two marked, three unmarked','Position counts draws, including the marked draw'))
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
