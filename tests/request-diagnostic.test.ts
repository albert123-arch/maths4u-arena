import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BankStageError,requestDiagnostic} from '../src/lib/request-diagnostic';
test('administrative diagnostics retain machine codes but suppress SQL, secrets and arbitrary values',()=>{
  const secret='mysql://private-user:private-password@private-host/private-db';
  const error=Object.assign(new Error(secret),{name:'PrismaClientKnownRequestError',code:'P2010',meta:{driverAdapterError:{cause:{originalCode:'1267',originalMessage:'Illegal mix of collations (utf8mb4_unicode_ci,IMPLICIT) and (utf8mb4_general_ci,COERCIBLE) '+secret}}}});
  const diagnostic=requestDiagnostic(new BankStageError('write',error));
  assert.match(diagnostic,/bank.stage.write/);assert.match(diagnostic,/P2010/);assert.match(diagnostic,/DB_1267/);assert.match(diagnostic,/DB_COLLATION/);assert.ok(!diagnostic.includes('private-'));
  assert.equal(requestDiagnostic({name:secret,code:secret,message:secret,cause:{originalCode:secret}}),'UNCLASSIFIED');
  assert.match(diagnostic,/utf8mb4_unicode_ci/);assert.match(diagnostic,/utf8mb4_general_ci/);
});
test('diagnostics handle circular errors, absent fields and module failures',()=>{
  const e:{cause?:unknown;code:string}={code:'ERR_MODULE_NOT_FOUND'};e.cause=e;
  assert.equal(requestDiagnostic(e),'ERR_MODULE_NOT_FOUND');assert.equal(requestDiagnostic(null),'UNCLASSIFIED');
  assert.match(requestDiagnostic(new BankStageError('html',new TypeError('hidden is not a function'))),/JS_NOT_CALLABLE/);
});
