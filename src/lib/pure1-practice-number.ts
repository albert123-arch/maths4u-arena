/** Opt-in format for new editorial identities. Legacy numeric grading is unchanged. */
export const isPure1ShortUid = (uid?: string | null) => !!uid && /^M4U-P1-QP-[A-Z]+(?:-[A-Z]+)*-0[1-6]$/.test(uid);
export function pure1PracticeNumber(input: string): number | null {
  const value=input.trim().replaceAll("−","-");
  if(value.length>100)return null;
  const number="[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d{1,2})?";
  const match=new RegExp(`^(${number})(?:\\s*/\\s*(${number}))?$`).exec(value);
  if(!match)return null;
  const a=Number(match[1]),b=match[2]===undefined?1:Number(match[2]),result=a/b;
  return Number.isFinite(a)&&Number.isFinite(b)&&b!==0&&Number.isFinite(result)&&Math.abs(result)<=1e12?result:null;
}
