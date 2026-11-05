import test from 'node:test';
import assert from 'node:assert/strict';
import {materialGrant,readMaterialGrant} from '../src/lib/material-grant';
test('material grants are signed, scoped and expire without changing account permissions',()=>{
 const data={fileId:'file',versionId:'version',role:'MARK_SCHEME',actorId:'actor'},token=materialGrant(data),read=readMaterialGrant(token)!;
 for(const key of ['fileId','versionId','role','actorId'] as const)assert.equal(read[key],data[key]);
 assert.equal(readMaterialGrant(token+'x'),null);assert.equal(readMaterialGrant(token+'.extra'),null);
 const [value,sig]=token.split('.'),changed=Buffer.from(JSON.stringify({...read,fileId:'another'})).toString('base64url');assert.equal(readMaterialGrant(changed+'.'+sig),null);
 const now=Date.now;try{Date.now=()=>read.expires+1;assert.equal(readMaterialGrant(token),null);}finally{Date.now=now;}
 assert.equal(readMaterialGrant(undefined),null);assert(value);
});
