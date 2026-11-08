import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
type Grant = { fileId:string;versionId:string;role:string;actorId:string|null;expires:number;context?:'teacher-preview' };
const state=globalThis as unknown as {maths4uMaterialGrantKey?:string};
function key(){return process.env.MATHS4U_MATERIAL_GRANT_SECRET??(state.maths4uMaterialGrantKey??=randomBytes(32).toString('base64url'));}
const signature=(value:string)=>createHmac('sha256',key()).update(value).digest();
export function materialGrant(data:Omit<Grant,'expires'>){const value=Buffer.from(JSON.stringify({...data,expires:Date.now()+3600000})).toString('base64url');return value+'.'+signature(value).toString('base64url');}
export function readMaterialGrant(token:string|undefined):Grant|null {
  if(!token||token.length>2048)return null;
  try{const [value,sig,...extra]=token.split('.');if(extra.length||!value||!sig)return null;const bytes=Buffer.from(sig,'base64url'),expected=signature(value);if(bytes.length!==expected.length||!timingSafeEqual(bytes,expected))return null;const g=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));return typeof g.fileId==='string'&&typeof g.versionId==='string'&&typeof g.role==='string'&&(g.actorId===null||typeof g.actorId==='string')&&Number.isFinite(g.expires)&&g.expires>Date.now()&&(g.context===undefined||g.context==='teacher-preview')?g:null;}catch{return null;}
}
