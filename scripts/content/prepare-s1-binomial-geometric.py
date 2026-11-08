"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_binomial_geometric_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\07_Binomial_and_geometric_distributions')
source=root/'server/07_Binomial_and_geometric_distributions_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/family_source_map.json').read_text('utf-8'))['families']
target=Path('content/original/9709-s1');media=target/'binomial-geometric';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):return html

def convention(q):
 return ''

prerequisite_labels={'additional_combinations_5.2':'Combinations (syllabus 5.2)', 'conditional_probability_5.3':'Conditional probability (syllabus 5.3)', 'finite_distribution_table_5.4':'Finite probability tables and moments (syllabus 5.4)', 'geometric_within_chapter':'First-success geometric models in this chapter'}


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
  a=dict(question_uid=uid,file_id='pkg_s1bg_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
 def project(html,include_figures=False):
  # Typography adapter only: MathJax tolerates these source forms, KaTeX does not.
  # Numerical values and criteria remain unchanged in the owner package.
  html=html.replace(r'\text{ %}',r'\text{ \%}').replace(r'\text{ g²}',r'\text{ g}^2')
  # F010 uses literal currency dollars, not TeX delimiters. Keep the same visible
  # currency/amount without allowing legacy $...$ parsing to swallow HTML.
  if raw['family_number']==10:
   assert r'\$' not in html
   html=html.replace('$','&#36;')
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

pack=dict(schema_version=1,key='9709-s1-binomial-geometric',version='1.0.1',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_binomial_geometric',slug='binomial-and-geometric-distributions',title='Binomial and geometric distributions',position=6),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):
 path=Path(path);body=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if path.exists() and path.read_text('utf-8')==body:return
 pending=path.with_name(path.name+'.writing');pending.write_text(body,encoding='utf-8');pending.replace(path)
write(target/'binomial-geometric-v1.json',pack);write(target/'binomial-geometric-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-BINOMIAL-GEOMETRIC-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='165–186 (chapter 7)',pdf_pages='177–198',sections=[dict(section='7.1',lesson='binomial_models'),dict(section='7.1',lesson='inverse_binomial'),dict(section='7.1; probability 4.4–4.5',lesson='mixed_binomial'),dict(section='7.2',lesson='geometric'),dict(section='7.1–7.2; finite tables chapter 6',lesson='success_sequences')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_scope'],syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written explanations, model assumptions, integer bounds, stopped histories and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-binomial-geometric');public.mkdir(parents=True,exist_ok=True)

def text(x,y,value,size=20):return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}">{escape(value)}</text>'

def svg(name,title,body):
 value='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" viewBox="0 0 640 350" role="img" aria-labelledby="title desc"><title id="title">'+title+'</title><desc id="desc">'+title+'</desc><rect width="640" height="350" fill="white"/><g font-family="Arial, sans-serif" fill="#172033">'+body+'</g></svg>'
 path=public/(name+'.svg')
 if not path.exists() or path.read_text('utf-8')!=value:path.write_text(value,encoding='utf-8')

from fractions import Fraction as F
body=text(320,32,'Four trials, success probability 1/2')+'<path d="M65 70V265H595" fill="none" stroke="#172033" stroke-width="2"/>'
for i,p in enumerate([F(1,16),F(1,4),F(3,8),F(1,4),F(1,16)]):
 x=110+105*i;h=float(p)*400
 body+=f'<rect x="{x-22}" y="{265-h}" width="44" height="{h}" fill="#2857a5"/>'+text(x,292,str(i))+text(x,250-h,str(p),18)
body+=text(320,330,'X counts successes; every count from 0 to 4 is possible',17)
svg('binomial-counts','Binomial with four trials and success probability one half has probabilities 1/16,1/4,3/8,1/4,1/16 at counts zero to four.',body)
body=text(320,30,'First success: p = 1/3')+text(145,62,'History shown',17)+text(335,62,'Event',17)+text(510,62,'Probability',17)
for i,(history,event,prob) in enumerate([('S','T = 1','1/3'),('FS','T = 2','2/9'),('FFS','T = 3','4/27'),('FFFS','T = 4','8/81'),('FFFF','T > 4','16/81')]):
 y=88+44*i;body+=text(145,y,history,22)+text(335,y,event,20)+text(510,y,prob,20)
body+=text(320,332,'FFFF is a remaining tail, not a success on trial 5',17)
svg('first-success','First-success paths for success probability one third. The final FFFF row groups all waiting times beyond four, not a point at five.',body)
body=text(320,32,'Stop at two successes or two failures')
for x,history in [(210,'SS'),(430,'FF')]:body+=f'<rect x="{x-60}" y="70" width="120" height="52" rx="6" fill="#dbeafe" stroke="#173b70"/>'+text(x,104,history,24)
body+=text(320,155,'These stop after two trials',18)
for i,history in enumerate(['SFS','SFF','FSS','FSF']):
 x=95+150*i;body+=f'<rect x="{x-55}" y="190" width="110" height="52" rx="6" fill="#e1f0e8" stroke="#173b70"/>'+text(x,224,history,24)
body+=text(320,279,'Only SF and FS continue to trial three',18)+text(320,327,'Six disjoint terminal histories; no extra trials after stopping',17)
svg('stopped-tree','A race to two successes or two failures ends on SS or FF at trial two, or SFS,SFF,FSS,FSF at trial three. No other histories are allowed.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
