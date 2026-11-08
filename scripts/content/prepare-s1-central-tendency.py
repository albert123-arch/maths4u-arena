"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_central_tendency_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\02_Measures_of_central_tendency')
source=root/'server/02_Measures_of_central_tendency_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/source_skill_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'central-tendency';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):
 def change(m):
  head,attrs,body=m.groups();back=body.split('</thead>')[0].count('<th ')==3
  return head+'<table class="stem-leaf'+(' stem-leaf-back' if back else '')+'"'+attrs+'>'+body
 return re.sub(r'(<div class="stem">[\s\S]*?)<table([^>]*)>([\s\S]*?</table>)',change,html)

def convention(q):
 rules=['All stated summary values are exact unless described as estimates. Keep unrounded intermediate totals.']
 if 'chapter_03_variation' in q['prerequisites']:rules.append('Descriptive variance and SD use divisor n, not n−1.')
 if any('quartile' in k or 'iqr' in k for k in q['skills']):rules.append('Raw-data quartiles use medians of halves, excluding an odd-sample overall median.')
 if any('grouped' in k for k in q['skills']):rules.append('Grouped mean/SD use class midpoints; median interpolation uses the stated within-class assumption.')
 rules.append('Non-exact numerical answers: 3 significant figures; exact equivalent forms are accepted.')
 return '<p><em>'+escape(' '.join(rules))+'</em></p>'

prerequisite_labels={'chapter_03_variation':'Measures of variation: descriptive variance and standard deviation','chapter_01_representation':'Representation of data','9709_P1_quadratics':'9709 Pure 1: quadratic expressions and inequalities'}

for raw in raw_questions:
 uid=raw['content_uid'];per=[]
 for item in raw['images']:
  relative=Path(item['path']);assert not relative.is_absolute() and '..' not in relative.parts
  data=(root/relative).read_bytes();h=hashlib.sha256(data).hexdigest();xml=ET.fromstring(data)
  if 'width' in xml.attrib and 'height' in xml.attrib:w,hgt=int(xml.attrib['width']),int(xml.attrib['height'])
  else:
   box=xml.attrib['viewBox'].split();assert box[:2]==['0','0'];w,hgt=int(box[2]),int(box[3])
  dest=media/(h+'.svg');dest.write_bytes(data)
  a=dict(question_uid=uid,file_id='pkg_s1ct_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
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
 q=dict(id=uid,family_uid=raw['question_family_id'],lesson=raw['topic_id'],title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=project(raw['answer_html']),solution_html=project(raw['solution_html'],include_figures=True),hint_html=project(raw['hint_html']),marks=raw['marks'],difficulty={'foundation':1,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=str(ref.get('source_id') or ''),original_uid=ref.get('source_uid') or '',archiveTaskId='',sourceSha256=source_hash,ownerProvenance=dict(source=ref,review=raw['review'],prerequisites=raw['prerequisites'],conventions=bank['conventions'],checkSpecs=[p['check_spec'] for p in raw['parts']],markingGuidance=raw['marking_guidance'],verificationInputsSha256=digest(json.dumps(raw['verification_inputs'],sort_keys=True)))))
 questions.append(q)
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref.get('source_uid') or '',sourceRelationship=ref['relationship'],originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-central-tendency',version='1.0.3',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_central_tendency',slug='measures-of-central-tendency',title='Measures of central tendency',position=1),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(target/'central-tendency-v1.json',pack);write(target/'central-tendency-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-CENTRAL-TENDENCY-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='26–53; supporting descriptive-variation primer 65–82',pdf_pages='38–65; 77–94',sections=[dict(section='2.1–2.3',lesson='centre_raw'),dict(section='2.2, supporting 3.3',lesson='coding'),dict(section='2.1–2.3',lesson='frequency'),dict(section='2.2, supporting 3.3',lesson='combining'),dict(section='2.2, supporting 3.3; P1 quadratic application',lesson='changes')],policy='Book informs concepts and teaching structure; notes, numerical examples and short checks are independently written. No textbook exercises or artwork are copied.'),source_scope=bank['source_scope'],syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only; written reasoning, final-answer rounding judgement and method marks use the existing manual/teacher workflow.'))

public=Path('public/assets/original/s1-central-tendency');public.mkdir(parents=True,exist_ok=True)
def line(x1,y1,x2,y2,colour='#172033'):
 return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" stroke-width="2"/>'
def text(x,y,label):return f'<text x="{x}" y="{y}" text-anchor="middle">{label}</text>'
def svg(name,description,body):
 (public/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" viewBox="0 0 640 350" role="img" aria-labelledby="title desc"><title id="title">'+description+'</title><desc id="desc">'+description+'</desc><rect width="640" height="350" fill="white"/><g font-family="Arial, sans-serif" font-size="16" fill="#172033">'+body+'</g></svg>',encoding='utf-8')
body=line(60,270,600,270)+text(320,325,'Repair time (minutes)')+text(320,25,'Data: 8, 9, 10, 12, 81')
for v in range(0,91,10):body+=line(60+5.8*v,265,60+5.8*v,275)+text(60+5.8*v,299,str(v))
for v,Y in [(8,180),(9,155),(10,180),(12,155),(81,180)]:body+=f'<circle cx="{60+5.8*v}" cy="{Y}" r="5" fill="#172033"/>'
body+=line(118,65,118,260,'#2457d6')+text(118,50,'Median 10')+line(199.2,105,199.2,260,'#a1540b')+text(247,92,'Mean 24')
svg('raw-centres','A long repair pulls the mean to 24 minutes while the median is 10 minutes.',body)
body=line(60,280,590,280)+line(60,280,60,40)+text(320,330,'Measurement')+text(170,25,'Frequency density')
for lo,hi,d in [(0,5,1.6),(5,15,1.2),(15,20,1.2)]:body+=f'<rect x="{60+25*lo}" y="{280-125*d}" width="{25*(hi-lo)}" height="{125*d}" fill="#dbeafe" stroke="#172033" stroke-width="2"/>'
for v in (0,5,10,15,20):body+=text(60+25*v,307,str(v))
for v in (.4,.8,1.2,1.6):body+=text(35,286-125*v,str(v))
svg('modal-density','Frequencies 8, 12, 6 in widths 5, 10, 5 give densities 1.6, 1.2, 1.2. The modal and greatest-frequency classes differ.',body)
body=line(60,250,580,250)+text(320,325,'Observed-value scale')
for v in range(0,26,5):body+=line(60+20*v,245,60+20*v,255)+text(60+20*v,285,str(v))
for v,Y,label in [(10,90,'Group A: mean 10, n = 4'),(20,140,'Group B: mean 20, n = 6'),(16,195,'Combined mean 16')]:body+=line(60+20*v,Y+10,60+20*v,240,'#2457d6')+text(60+20*v,Y,label)
svg('weighted-means','Group sizes 4 and 6 weight means 10 and 20 to a combined mean of 16.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
