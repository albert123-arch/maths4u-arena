type Edit = readonly [before: string, after: string];
type TaskFields = { statement?: Edit; hint?: Edit; solution?: Edit };
type TaskEdit = { legacyId: string; questionNumber: string; en: TaskFields; ru: TaskFields };

export function reviseBook2Text(text: string, [before, after]: Edit): string {
  const index = text.indexOf(before);
  if (index !== -1 && text.indexOf(before, index + before.length) === -1 && !text.includes(after)) {
    return text.slice(0, index) + after + text.slice(index + before.length);
  }
  const applied = text.indexOf(after);
  if (index === -1 && applied !== -1 && text.indexOf(after, applied + after.length) === -1) return text;
  throw new Error("BOOK2_REVISION_TEXT_CONFLICT");
}

export const lessonEdits: Record<"en" | "ru", Edit[]> = {
  en: [
    [String.raw`\gcd(a,b)=\gcd(a, b \bmod a) \), and the fact`, String.raw`\gcd(a,b)=\gcd(a, b \bmod a) \) for \(a>0\), and the fact`],
    ["For powers, the key identity is", String.raw`For integers \(a>1\) and positive integer exponents \(m,n\), the key identity is`],
    [String.raw`Prove that \( \gcd(2^m-1,2^n-1)`, String.raw`For positive integers \(m,n\), prove that \( \gcd(2^m-1,2^n-1)`],
    [String.raw`Therefore the only possible prime divisor is \(2\), so the whole gcd divides \(2\).`, String.raw`Therefore the only possible prime divisor is \(2\). A factor of \(2\) is possible only when both \(a\) and \(b\) are odd, since they are coprime. Then \(a^2+b^2\equiv2\pmod4\), so there is at most one factor of \(2\). Thus the gcd divides \(2\).`],
    [String.raw`Let \(a>b>0\) and \( \gcd(a,b)=1 \). Prove that \( \gcd(a^m-b^m`, String.raw`Let \(a>b>0\) be coprime integers and \(m,n\) positive integers. Prove that \( \gcd(a^m-b^m`],
    [String.raw`Prove that \( \gcd(n!+1,(n+1)!+1)=1 \).`, String.raw`Prove that \( \gcd(n!+1,(n+1)!+1)=1 \) for every positive integer \(n\).`],
  ],
  ru: [
    [String.raw`\gcd(a,b)=\gcd(a, b \bmod a) \), а также факт`, String.raw`\gcd(a,b)=\gcd(a, b \bmod a) \) при \(a>0\), а также факт`],
    ["Для степеней особенно важна формула", String.raw`Для целого \(a>1\) и положительных целых показателей \(m,n\) особенно важна формула`],
    [String.raw`Докажите, что \( \gcd(2^m-1,2^n-1)`, String.raw`Для положительных целых \(m,n\) докажите, что \( \gcd(2^m-1,2^n-1)`],
    [String.raw`Следовательно, единственный возможный простой делитель - \(2\), и весь НОД делит \(2\).`, String.raw`Следовательно, единственный возможный простой делитель — \(2\). Число \(2\) делит НОД только тогда, когда \(a\) и \(b\) оба нечётные, так как они взаимно просты. Тогда \(a^2+b^2\equiv2\pmod4\), поэтому \(4\) не делит НОД. Значит, НОД делит \(2\).`],
    [String.raw`Пусть \(a>b>0\) и \( \gcd(a,b)=1 \). Докажите, что \( \gcd(a^m-b^m`, String.raw`Пусть \(a>b>0\) — взаимно простые целые числа, а \(m,n\) — положительные целые числа. Докажите, что \( \gcd(a^m-b^m`],
    [String.raw`Докажите, что \( \gcd(n!+1,(n+1)!+1)=1 \).`, String.raw`Докажите, что \( \gcd(n!+1,(n+1)!+1)=1 \) для любого положительного целого \(n\).`],
  ],
};

export const taskEdits: TaskEdit[] = [
  {
    legacyId: "498", questionNumber: "NT-B2-M01-P006",
    en: {
      statement: [String.raw`for \(n>1\),`, String.raw`for every integer \(n>1\),`],
      solution: [String.raw`for \(n\equiv-1\),`, String.raw`for \(n\equiv-1\pmod{n+1}\),`],
    },
    ru: {
      statement: [String.raw`для \(n>1\)`, String.raw`для любого целого \(n>1\)`],
      solution: [String.raw`при \(n\equiv-1\)`, String.raw`при \(n\equiv-1\pmod{n+1}\)`],
    },
  },
  {
    legacyId: "501", questionNumber: "NT-B2-M01-P009",
    en: { solution: [String.raw`because modulo \(m\) it has remainder \(1\).`, String.raw`because \(m^2-m+1-m(m-1)=1\). This identity also holds when \(m=0\).`] },
    ru: { solution: [String.raw`потому что по модулю \(m\) оно даёт остаток \(1\).`, String.raw`потому что \(m^2-m+1-m(m-1)=1\). Это равенство верно и при \(m=0\).`] },
  },
  {
    legacyId: "502", questionNumber: "NT-B2-M01-P010",
    en: { statement: [String.raw`Let \(a>1\),`, String.raw`Let \(a>1\) be an integer,`] },
    ru: { statement: [String.raw`Пусть \(a>1\), \(m,n\) - натуральные числа`, String.raw`Пусть \(a>1\) — целое число, а \(m,n\) — положительные целые числа`] },
  },
  {
    legacyId: "507", questionNumber: "NT-B2-M01-P015",
    en: { statement: [String.raw`Let \(a>b>0\), \( \gcd(a,b)=1 \).`, String.raw`Let \(a>b>0\) be coprime integers and \(m,n\) positive integers.`] },
    ru: { statement: [String.raw`Пусть \(a>b>0\), \( \gcd(a,b)=1 \).`, String.raw`Пусть \(a>b>0\) — взаимно простые целые числа, а \(m,n\) — положительные целые числа.`] },
  },
  {
    legacyId: "508", questionNumber: "NT-B2-M01-P016",
    en: { statement: [String.raw`in terms of \(m\) and \(n\).`, String.raw`in terms of the positive integers \(m\) and \(n\).`] },
    ru: { statement: [String.raw`через \(m\) и \(n\).`, String.raw`через положительные целые числа \(m\) и \(n\).`] },
  },
  {
    legacyId: "509", questionNumber: "NT-B2-M01-P017",
    en: {
      hint: [String.raw`Modulo \(x+y\), replace \(x\) by \(-y\).`, String.raw`If \(d\) is a common divisor, replace \(x\) by \(-y\) modulo \(d\).`],
      solution: [String.raw`Modulo \(x+y\), \(x\equiv-y\), hence`, String.raw`Since \(d\mid x+y\), we have \(x\equiv-y\pmod d\), even when \(x+y=0\). Hence`],
    },
    ru: {
      hint: [String.raw`По модулю \(x+y\) замените \(x\) на \(-y\).`, String.raw`Пусть \(d\) — общий делитель. Замените \(x\) на \(-y\) по модулю \(d\).`],
      solution: [String.raw`По модулю \(x+y\) имеем \(x\equiv-y\), поэтому`, String.raw`Так как \(d\mid x+y\), получаем \(x\equiv-y\pmod d\), даже если \(x+y=0\). Поэтому`],
    },
  },
];
