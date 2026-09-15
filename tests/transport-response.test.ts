import assert from 'node:assert/strict';
import {test} from 'node:test';
import {api,ApiError} from '../src/components/ui';
test('non-JSON hosting rejection retains HTTP status without displaying response contents',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response('Forbidden: private-response-never-display',{status:403,headers:{'content-type':'text/plain'}});
  try{await assert.rejects(api('admin/bank/stage','POST',{}),e=>e instanceof ApiError&&e.status===403&&e.code==='UNEXPECTED_SERVER_RESPONSE'&&e.diagnostic==='HTTP_403 / NON_JSON'&&!e.message.includes('private-response'));}
  finally{globalThis.fetch=previous;}
});
