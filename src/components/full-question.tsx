"use client";

import type { TeacherPreviewQuestion } from "@/lib/teacher-task-preview-model";
import { MaterialAsset, MathContent } from "./ui";

type Question = Pick<TeacherPreviewQuestion, "statement" | "separatePartPrompts" | "parts" | "assets">;
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|#160);/g, " ").replace(/\s+/g, " ").trim();
const containsAsset = (html: string, id: string) => ["\"", "'"].some(quote => html.includes(`src=${quote}/api/files/${id}${quote}`));
// HTML's ol[type] selector is case-insensitive in Chromium. Give upper-case
// option lists a presentation class without changing their text or part lists.
function displayHtml(html: string) {
  return html.replace(/<ol\b[^>]*>/gi, tag => {
    if (!/\btype=(["'])A\1/.test(tag)) return tag;
    return /\bclass=(["'])(.*?)\1/.test(tag) ? tag.replace(/\bclass=(["'])(.*?)\1/, (_match, quote, names) => `class=${quote}${names} full-question-embedded-options${quote}`) : tag.replace(/>$/, ' class="full-question-embedded-options">');
  });
}

/** The same read-only question is used while choosing and ordering questions. */
export function FullQuestion({ question }: { question: Question }) {
  const statementText = plain(question.statement), embeddedParts = /<ol\b[^>]*(?:type=["']a["']|class=["'][^"']*\bparts\b)/i.test(question.statement);
  const showPrompt = (prompt: string) => !!plain(prompt) && (question.separatePartPrompts || !embeddedParts && !statementText.includes(plain(prompt)));
  const visibleHtml = [question.statement, ...question.parts.filter(part => showPrompt(part.prompt)).map(part => part.prompt)].join("\n");
  const assets = [...new Map(question.assets.filter(asset => (!asset.role || asset.role === "STATEMENT") && !(asset.mimeType.startsWith("image/") && containsAsset(visibleHtml, asset.id))).map(asset => [asset.id, asset])).values()];
  const stemAssets = assets.filter(asset => asset.partPosition == null || asset.partPosition >= question.parts.length);
  return <div className="full-question"><MathContent html={displayHtml(question.statement)} />{stemAssets.map(asset => <MaterialAsset key={asset.id} asset={asset} />)}
    {question.parts.map((part, index) => {
      const prompt = showPrompt(part.prompt), partAssets = assets.filter(asset => asset.partPosition === index);
      // Some legacy statements already include an A/B option list. Keep it once.
      const optionLists = Array.from((question.statement + (prompt ? part.prompt : "")).matchAll(/<ol\b[^>]*type=["']A["'][^>]*>([\s\S]*?)<\/ol>/g), match => plain(match[1]));
      const embeddedOptions = part.options.length > 0 && optionLists.some(list => part.options.every(option => plain(option.text) && list.includes(plain(option.text))));
      const heading = question.separatePartPrompts || prompt || !embeddedParts;
      if (!heading && !partAssets.length && (!part.options.length || embeddedOptions)) return null;
      return <section className="full-question-part" key={part.id} aria-label={"Part " + String.fromCharCode(97 + index)}>{heading && <div className="full-question-part-heading"><span>({String.fromCharCode(97 + index)})</span><span className="full-question-marks">{part.maxPoints} {part.maxPoints === 1 ? "mark" : "marks"}</span></div>}
        {prompt && <MathContent html={displayHtml(part.prompt)} />}{partAssets.map(asset => <MaterialAsset key={asset.id} asset={asset} />)}
        {!embeddedOptions && part.options.length > 0 && <ol className="full-question-options" type="A" aria-label={"Answer options for part " + String.fromCharCode(97 + index)}>{part.options.map(option => <li key={option.id}><MathContent html={option.text} /></li>)}</ol>}
      </section>;
    })}
  </div>;
}
