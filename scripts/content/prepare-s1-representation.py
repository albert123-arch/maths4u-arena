"""Immutable projection of the copied 9709 S1 owner package; never modify the source."""
import json,hashlib,re,xml.etree.ElementTree as ET
from pathlib import Path
from html import escape
from s1_representation_teaching import lessons,questions,models
root=Path(r'E:\my folder\questions_data\original\Statistics1 9709\01_Representation_of_data')
source=root/'server/01_Representation_of_data_9709_S1_50x4.json';bank=json.loads(source.read_text('utf-8'))
source_hash=hashlib.sha256(source.read_bytes()).hexdigest();raw_questions=[q for l in bank['lessons'] for q in l['questions']]
assert len(raw_questions)==200 and sum(q['variant_index']==0 for q in raw_questions)==50
assert len(lessons)==5 and len(questions)==40
source_map=json.loads((root/'review/source_skill_map.json').read_text('utf-8'))
target=Path('content/original/9709-s1');media=target/'representation';media.mkdir(parents=True,exist_ok=True)
assets=[];mapping=[]
digest=lambda text:hashlib.sha256(text.encode('utf-8')).hexdigest()

def book_tables(html):
 def change(m):
  head,attrs,body=m.groups();back=body.split('</thead>')[0].count('<th ')==3
  return head+'<table class="stem-leaf'+(' stem-leaf-back' if back else '')+'"'+attrs+'>'+body
 return re.sub(r'(<div class="stem">[\s\S]*?)<table([^>]*)>([\s\S]*?</table>)',change,html)

def convention(q):
 rules=[]
 if q['topic_id'] in ('stem_reading','stem_comparison','boxplots') or any('quartile' in a for a in q['skills']):rules.append('Raw-data quartiles: medians of halves, excluding the overall median when n is odd.')
 if q['topic_id']=='boxplots' or 'boxplot_construction' in q['skills']:rules.append('Whiskers reach the minimum and maximum, including outliers, unless stated otherwise.')
 if q['topic_id'] in ('histograms','cumulative'):rules.append('Grouped graph readings are estimates; accept sensible readings of a carefully drawn graph. Numerical estimates: 3 significant figures unless specified otherwise.')
 if any('standard_deviation' in a or 'moments' in a for a in q['skills']):rules.append('Descriptive variance and SD use divisor n.')
 return '<p><em>'+escape(' '.join(rules))+'</em></p>' if rules else ''

for raw in raw_questions:
 uid=raw['content_uid'];per=[]
 for item in raw['images']:
  relative=Path(item['path']);assert not relative.is_absolute() and '..' not in relative.parts
  data=(root/relative).read_bytes();h=hashlib.sha256(data).hexdigest();xml=ET.fromstring(data)
  if 'width' in xml.attrib and 'height' in xml.attrib:w,hgt=int(xml.attrib['width']),int(xml.attrib['height'])
  else:
   box=xml.attrib['viewBox'].split();assert box[:2]==['0','0'];w,hgt=int(box[2]),int(box[3])
  dest=media/(h+'.svg');dest.write_bytes(data)
  a=dict(question_uid=uid,file_id='pkg_s1r_'+h,path=dest.as_posix(),sha256=h,size=len(data),width=w,height=hgt,mime='image/svg+xml',role='STATEMENT' if item['role']=='question' else 'SOLUTION',caption=item['alt']);assets.append(a);per.append((item['path'],a))
 def project(html):
  for old,a in per:html=html.replace('src="'+old+'"','src="/api/files/'+a['file_id']+'"')
  assert not re.search(r'src=[\"\']assets/',html)
  return book_tables(html)
 prereq='<p><strong>Mixed-topic prerequisite:</strong> '+escape('; '.join(raw['prerequisites']))+'.</p>' if raw['prerequisites'] else ''
 prompt=convention(raw)+prereq+project(raw['question_html'])
 parts=[dict(label=p['label'],marking_criteria=[dict(code=c['code'],marks=c['marks'],description_html=c['description_html'],**({'guidance_html':'Accept correct follow-through where the criterion allows it.'} if c.get('follow_through') else {})) for c in p['criteria']]) for p in raw['parts']]
 ref=next(row for row in source_map if row['family_id']==raw['question_family_id'])
 q=dict(id=uid,family_uid=raw['question_family_id'],lesson=raw['topic_id'],title=raw['title'],collection='exam',variant_index=raw['variant_index'],prompt_html=prompt,answer_html=project(raw['answer_html']),solution_html=project(raw['solution_html']),hint_html=project(raw['hint_html']),marks=raw['marks'],difficulty={'foundation':1,'standard':2,'demanding':3,'challenge':4}[raw['difficulty']],fields=[],parts=parts,verification='OWNER-BANK-'+uid,provenance=dict(original_id=ref['source_id'],original_uid=ref['source_uid'],archiveTaskId='',sourceSha256=source_hash,ownerProvenance=dict(source=ref,review=raw['review'],prerequisites=raw['prerequisites'],conventions=bank['conventions'],checkSpecs=[p['check_spec'] for p in raw['parts']],markingGuidance=raw['marking_guidance'],verificationInputsSha256=digest(json.dumps(raw['verification_inputs'],sort_keys=True)))))
 questions.append(q)
 mapping.append(dict(uid=uid,lesson=q['lesson'],family=raw['family_number'],variant=q['variant_index'],marks=q['marks'],sourceUid=ref['source_uid'],originalAnswerSha256=digest(raw['answer_html']),originalSolutionSha256=digest(raw['solution_html']),originalHintSha256=digest(raw['hint_html']),projectedAnswerSha256=digest(q['answer_html']),projectedSolutionSha256=digest(q['solution_html']),projectedHintSha256=digest(q['hint_html']),criteriaSha256=digest(json.dumps([[[c['code'],c['marks'],c['description_html']] for c in p['criteria']] for p in raw['parts']],ensure_ascii=False,separators=(',',':')))))

pack=dict(schema_version=1,key='9709-s1-representation',version='1.0.1',course=dict(slug='maths4u-9709-s1',title='Probability & Statistics 1 (9709)',code='9709',direction='a-level'),chapter=dict(id='orig_9709_s1_representation',slug='representation-of-data',title='Representation of data',position=0),source=dict(sha256=source_hash,supplied=200,held=[]),lessons=lessons,questions=questions,marking_status='DRAFT',assets=assets)
def write(path,data):Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
write(target/'representation-v1.json',pack);write(target/'representation-math-models.json',models)
book=Path(r'D:\new_books\9709 cambridge\statistics1.pdf')
write('docs/ARENA-9709-S1-REPRESENTATION-SOURCE-AUDIT-20261108.json',dict(source=str(source),sha256=source_hash,book=dict(path=str(book),sha256=hashlib.sha256(book.read_bytes()).hexdigest(),title='Cambridge International AS & A Level Mathematics: Probability & Statistics 1',author='Dean Chalmers',publisher='Cambridge University Press',year=2018,printed_pages='1–25; supporting quartile/boxplot material 56–64',pdf_pages='13–37; 68–76',sections=[dict(section='1.1–1.2',lesson='stem_reading'),dict(section='1.2, 1.5; mixed 2–3 applications',lesson='stem_comparison'),dict(section='1.3',lesson='histograms'),dict(section='1.4',lesson='cumulative'),dict(section='1.5, 3.2',lesson='boxplots')],policy='Book supplies sequence and methods; notes, examples and quick checks are independently written. No book exercises or artwork are reproduced.'),syllabus=bank['syllabus_check'],conventions=bank['conventions'],mapping=mapping,assets=len(assets),sourceCheckSpecifications='Retained privately as specifications only. Written diagrams, explanations and graphical estimates use the existing manual/teacher workflow. Full method marks are not awarded for a numerical final answer.'))

# Small independently constructed teaching vectors; no question/solution asset is made public.
public=Path('public/assets/original/s1-representation');public.mkdir(parents=True,exist_ok=True)
def svg(name,title,body):
 text='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350" role="img" aria-labelledby="title desc"><title id="title">'+title+'</title><desc id="desc">'+title+'</desc><rect width="600" height="350" fill="white"/><g font-family="Arial, sans-serif" font-size="16" fill="#172033">'+body+'</g></svg>'
 (public/(name+'.svg')).write_text(text,encoding='utf-8')
def line(x1,y1,x2,y2):return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#172033" stroke-width="1.5"/>'
def label(x,y,text):return f'<text x="{x}" y="{y}" text-anchor="middle">{text}</text>'
body=line(60,280,550,280)+line(60,280,60,40)+label(300,330,'Recorded value')+label(140,25,'Frequency density')
for lo,hi,height in [(0,5,1),(5,15,1),(15,20,2)]:body+=f'<rect x="{60+24*lo}" y="{280-100*height}" width="{24*(hi-lo)}" height="{100*height}" fill="#dbeafe" stroke="#172033" stroke-width="2"/>'
for v in (0,5,10,15,20):body+=label(60+24*v,306,str(v))
for v in (1,2):body+=label(35,286-100*v,str(v))
svg('histogram','Classes 0 to 5, 5 to 15, 15 to 20 have frequencies 5, 10, 10 and densities 1, 1, 2.',body)
body=line(65,280,550,280)+line(65,280,65,35)+label(310,330,'Measurement')+label(175,23,'Cumulative frequency')
pts=[(65,280),(185,208),(305,112),(545,40)]
body+='<polyline points="'+' '.join(str(a)+','+str(b) for a,b in pts)+'" fill="none" stroke="#2457d6" stroke-width="3"/>'
for X,Y in pts:body+=f'<circle cx="{X}" cy="{Y}" r="4" fill="#2457d6"/>'
for v in (0,10,20,30,40):body+=label(65+12*v,306,str(v))+label(38,286-6*v,str(v))
svg('cumulative','Straight cumulative segments join boundary-count pairs (0,0), (10,12), (20,28), (40,40).',body)
body=line(65,245,550,245)+label(300,320,'Measurement')
for v in range(0,26,5):body+=line(70+18*v,240,70+18*v,252)+label(70+18*v,280,str(v))
body+=line(106,145,520,145)+line(106,120,106,170)+line(520,120,520,170)+'<rect x="151" y="110" width="180" height="70" fill="#dbeafe" stroke="#172033" stroke-width="2"/>'+line(214,110,214,180)
for v in (2,4.5,8,14.5,25):body+=label(70+18*v,95,str(v))
svg('boxplot','Minimum 2, lower quartile 4.5, median 8, upper quartile 14.5 and maximum 25; whiskers use min and max.',body)
print(json.dumps(dict(lessons=5,examples=20,quick=40,exam=200,main=50,analogues=150,svg=len(assets),teachingSvg=3)))
