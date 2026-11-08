import test from 'node:test';
import assert from 'node:assert/strict';
import {checkExact,type ExactField} from '../src/lib/exact-answer';
import {automaticPoints} from '../src/lib/works';
import {contentPackage} from '../src/lib/content-package-content';
import {contentPackageSchema} from '../src/lib/content-package-schema';
import {packageTask} from '../src/lib/content-packages';
import {answerFormat} from '../src/lib/square-presentation';

const field:ExactField={key:'p',label:'Probability (4 d.p.)',type:'approximate',expected:'0.682689492137086',absolute_tolerance:.00005,minimum:0,maximum:1};
test('approximate opt-in accepts requested rounding, calculator precision and equivalent fractions',()=>{
 for(const input of ['0.6827','0.682689492137086','6827/10000','6.827e-1'])assert(checkExact(field,input),input);
 for(const input of ['0.682','0.683','0.3173','68.27'])assert(!checkExact(field,input),input);
 assert(checkExact({...field,expected:String(Math.SQRT1_2)},'1/sqrt(2)'));
});
test('probability bounds, nonfinite values and malformed input never become a correct answer',()=>{
 const tiny={...field,expected:'0.000001'};assert(checkExact(tiny,'0'));assert(!checkExact(tiny,'-0.000001'));
 const nearOne={...field,expected:'0.999999'};assert(checkExact(nearOne,'1'));assert(!checkExact(nearOne,'1.000001'));
 for(const value of ['1e999','-1e999'])assert(!checkExact(field,value));
 for(const value of ['', 'NaN', 'Infinity', '1/0', 'globalThis.secret', '1;process.exit()'])assert.throws(()=>checkExact(field,value));
});
test('tolerance boundaries and exact fields keep their distinct semantics',()=>{
 const bound={...field,expected:'0.68'};assert(checkExact(bound,'0.68005'));assert(!checkExact(bound,'0.680051'));
 assert(!checkExact({key:'x',label:'Exact fraction',type:'number',expected:'1/3'},'0.3333'));
 assert(checkExact({key:'x',label:'Exact fraction',type:'number',expected:'1/3'},'2/6'));
 assert(!checkExact({key:'k',label:'Exact integer',type:'number',expected:'57'},'56.9999'));
});
test('invalid approximate descriptors and non-opted-in metadata are rejected',()=>{
 for(const extra of [{absolute_tolerance:undefined},{absolute_tolerance:0},{absolute_tolerance:-1},{absolute_tolerance:Infinity},{absolute_tolerance:2},{expected:'NaN'},{expected:''},{minimum:1,maximum:0}])assert.throws(()=>checkExact({...field,...extra},'.6827'));
 const p=structuredClone(contentPackage('9709-s1-normal')),q=p.questions.find(q=>q.fields.some(f=>f.type==='approximate'))!,f=q.fields.find(f=>f.type==='approximate')!;
 f.absolute_tolerance=0;assert(!contentPackageSchema.safeParse(p).success);f.absolute_tolerance=.00005;f.type='number';assert(!contentPackageSchema.safeParse(p).success);
});
test('the native assignment path uses the same saved descriptor, including its tolerance and bounds',()=>{
 const p=contentPackage('9709-s1-normal'),q=p.questions.find(q=>q.id==='M4U-9709-S1-NORM-CHECK-NORMAL_AREAS-1-0')!;
 const input=packageTask(p,q).parts[2],assigned={...input,acceptedAnswers:input.acceptedAnswers!.map(value=>({value}))} as unknown as Parameters<typeof automaticPoints>[0];
 assert.equal(automaticPoints(assigned,{value:'0.1587'}),1);assert.equal(automaticPoints(assigned,{value:'0.8413'}),0);
 assert.equal(automaticPoints(assigned,{value:'-0.001'}),0);
 const saved=JSON.parse(assigned.acceptedAnswers[0].value);assert.equal(saved.field.type,'approximate');assert.equal(saved.field.minimum,0);assert.equal(saved.field.maximum,1);
 const current=structuredClone(q);current.fields[2].expected='0.8';assert.equal(automaticPoints(assigned,{value:'0.1587'}),1);
 assert(answerFormat({key:'p',label:'p',type:'approximate'}).en.includes('calculator'));
});
