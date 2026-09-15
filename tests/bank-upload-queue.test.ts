import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bankUploadQueue} from '../src/lib/bank-upload-queue';

test('upload queue bounds concurrency and processes each item exactly once',async()=>{
  let active=0,maximum=0;const seen:number[]=[];
  const completed=await bankUploadQueue(Array.from({length:17},(_,i)=>i),async i=>{
    active++;maximum=Math.max(maximum,active);
    await new Promise(resolve=>setTimeout(resolve,2));seen.push(i);active--;
  },()=>false);
  assert.equal(completed,true);assert.equal(maximum,4);assert.equal(active,0);
  assert.deepEqual(seen.sort((a,b)=>a-b),Array.from({length:17},(_,i)=>i));
});

test('failure waits for in-flight uploads and prevents new work',async()=>{
  let active=0;const started:number[]=[],finished:number[]=[];const failure=new Error('test failure');
  await assert.rejects(bankUploadQueue([0,1,2,3,4,5],async i=>{
    started.push(i);active++;
    try{if(i===0)throw failure;await new Promise(resolve=>setTimeout(resolve,10));finished.push(i);}finally{active--;}
  },()=>false),error=>error===failure);
  assert.deepEqual(started,[0,1,2,3]);assert.deepEqual(finished,[1,2,3]);assert.equal(active,0);
});

test('pause finishes active uploads and reports incomplete work for safe resume',async()=>{
  let paused=false;const started:number[]=[],finished:number[]=[];
  const completed=await bankUploadQueue([0,1,2,3,4,5],async i=>{
    started.push(i);await new Promise(resolve=>setTimeout(resolve,2));paused=true;finished.push(i);
  },()=>paused);
  assert.equal(completed,false);assert.deepEqual(started,[0,1,2,3]);assert.deepEqual(finished,[0,1,2,3]);
});
