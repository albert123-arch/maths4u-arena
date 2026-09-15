"use client";
import { MathContent, useLocale } from "./ui";
export function MarkSchemeText({html,status}:{html?:string;status?:string}) {
  const {t}=useLocale();if(!html)return null;
  const labels:Record<string,string>={NONE:t("Не оцифровано", "Not transcribed"),SOURCE_TEXT:t("Текст из источника; проверка в Arena не выполнена", "Source text; not verified in Arena"),OCR_UNVERIFIED:t("OCR — не проверено", "OCR — unverified"),DRAFT:t("Черновик", "Draft"),VERIFIED:t("Текст проверен", "Text verified")};
  return <details className="ms-transcription"><summary>{t("Текстовая версия MS", "MS transcription")} · {labels[status??"NONE"]}</summary><MathContent html={html}/></details>;
}
export function MarkSchemeStatusField({value,onChange}:{value?:string;onChange:(s:"NONE"|"SOURCE_TEXT"|"OCR_UNVERIFIED"|"DRAFT"|"VERIFIED")=>void}) {
  const {t}=useLocale();return <label>{t("Статус текстовой версии MS", "MS transcription status")}<select value={value??"NONE"} onChange={e=>onChange(e.target.value as Parameters<typeof onChange>[0])}>
    <option value="NONE">{t("Текст отсутствует (только скан / нет MS)", "No text (scan only / no MS)")}</option><option value="SOURCE_TEXT">{t("Имеющийся текст источника", "Existing source text")}</option><option value="OCR_UNVERIFIED">{t("OCR — не проверено", "OCR — unverified")}</option><option value="DRAFT">{t("Черновик", "Draft")}</option><option value="VERIFIED">{t("Проверено вручную по оригиналу", "Manually verified against original")}</option>
  </select></label>;
}
