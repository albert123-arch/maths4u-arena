// TeX delimiters are parsed before HTML so an unescaped inequality such as x<y
// cannot be consumed as an HTML tag. No mathematical expressions are evaluated.
export const mathPattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|(?<!\\)\$\$([\s\S]*?)\$\$|(?<![\\$])\$([^$\n]+?)(?<!\\)\$(?!\$)/g;
export function protectMathHtml(raw) {
  return raw.replace(mathPattern, match => match.replace(/<br\s*\/?\s*>/gi,'\n').replaceAll('<','&lt;').replaceAll('>','&gt;'));
}
export function normalizeSourceMath(raw) {
  return protectMathHtml(raw.replace(mathPattern,(full,inline,display,double,single)=>{
    let value=inline??display??double??single;
    value=value.replace(/(?<!\\)#/g,'\\#');
    if(/\\begin\{(?:cases|array)\}/.test(value)) value=value.replace(/(?<!\\)\\\[(\d+(?:\.\d+)?pt)\]/g,'\\\\[$1]').replace(/(?<!\\)\\(?=\r?\n)/g,'\\\\');
    if(inline!==undefined)return /\\tag\{/.test(value)?'\\['+value+'\\]':'\\('+value+'\\)';
    if(display!==undefined)return '\\['+value+'\\]';
    return double!==undefined?'$$'+value+'$$':'$'+value+'$';
  }));
}
