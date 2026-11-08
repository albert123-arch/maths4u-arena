import { parseDocument } from "htmlparser2";
import type { Element } from "domhandler";
import { ensure } from "./errors";

// Trusted editorial packages only. User uploads continue to reject SVG.
// Reject rather than repair: the manifest hash always identifies the bytes served.
export function validatePackageSvg(data: Buffer, width: number, height: number) {
  const text = data.toString("utf8");
  ensure(!/<!|<\?|\u0000|\ufffd/.test(text), 409, "INVALID_PACKAGE_SVG");
  const doc = parseDocument(text, { xmlMode: true, decodeEntities: true });
  const roots = doc.children.filter(n => n.type !== "text" || n.data.trim());
  ensure(roots.length === 1 && roots[0].type === "tag" && roots[0].name === "svg", 409, "INVALID_PACKAGE_SVG");
  const root = roots[0] as Element;
  ensure(root.attribs.xmlns === "http://www.w3.org/2000/svg" && root.attribs.width === String(width) && root.attribs.height === String(height), 409, "INVALID_PACKAGE_SVG");
  const tags = new Set(["svg", "g", "defs", "clipPath", "rect", "line", "path", "polyline", "polygon", "circle", "ellipse", "text", "tspan", "title", "desc"]);
  const attributes = new Set(["xmlns", "viewBox", "width", "height", "role", "aria-labelledby", "id", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline", "clip-path", "transform", "opacity"]);
  function visit(node: typeof doc.children[number]) {
    if (node.type === "text") return;
    ensure(node.type === "tag" && tags.has(node.name), 409, "INVALID_PACKAGE_SVG");
    for (const [name, value] of Object.entries(node.attribs)) {
      ensure((attributes.has(name) || /^data-(curve|circle|line)-index$/.test(name) && /^\d+$/.test(value)) && !/[<>\\]|(?:javascript|data|https?):|\/\//i.test(name === "xmlns" ? "" : value), 409, "INVALID_PACKAGE_SVG");
      ensure(!/url\s*\(/i.test(value) || name === "clip-path" && /^url\(#[a-zA-Z][\w-]*\)$/.test(value), 409, "INVALID_PACKAGE_SVG");
    }
    node.children.forEach(visit);
  }
  visit(root);
}
