// Narrow, byte-preserving removal of the editorial wrappers approved in Stage 6b.
// Do not use HTML parsing, sanitising, whitespace normalisation or broad UID removal.
export function cleanAuthoredTitle(value: string) {
  return value.replace(/^Maths4U Original · /, "").replace(/ · Maths4U Original$/, "");
}
export function cleanAuthoredMarkup(value: string) {
  return value.replace(/<p><strong>Maths4U Original · M4U-[\w-]+ · \d+ marks?<\/strong><\/p>/g, "")
    .replace(/<p><strong>Maths4U Original<\/strong> · /g, "<p>")
    .replace(/<strong>Maths4U Original · Short practice · /g, "<strong>Short practice · ")
    .replace(/<p>AI-assisted preparation from independent skill briefs\. Teacher editorial review is pending\.<\/p>/g, "");
}
