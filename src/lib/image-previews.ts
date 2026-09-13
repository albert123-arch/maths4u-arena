import sharp from "sharp";
import { AppError, ensure } from "./errors";

sharp.cache({ memory: 24, files: 0, items: 20 });
sharp.concurrency(1);
let processing = 0;
const waiting: (() => void)[] = [];
export function maxImagePixels() {
  const value = Number(process.env.MATHS4U_MAX_IMAGE_PIXELS ?? 40_000_000);
  ensure(Number.isSafeInteger(value) && value >= 1_000_000 && value <= 80_000_000, 503, "IMAGE_LIMIT_CONFIGURATION");
  return value;
}
export type ImagePreview = { kind: "preview" | "thumbnail"; data: Buffer; width: number; height: number; mimeType: string };
export async function imagePreviews(data: Buffer, mime: string) {
  if (!mime.startsWith("image/")) return { derivatives: [] as ImagePreview[] };
  ensure(processing < 2 || waiting.length < 4, 429, "IMAGE_PROCESSOR_BUSY");
  if (processing >= 2) await new Promise<void>(resolve => waiting.push(resolve));
  else processing++;
  try {
    // Header-only read, before any pixel decoding; the decoder also enforces it.
    const metadata = await sharp(data, { limitInputPixels: false }).metadata().catch(() => { throw new AppError(415, "INVALID_IMAGE"); });
    ensure(metadata.width && metadata.height && ["png", "jpeg"].includes(metadata.format ?? ""), 415, "INVALID_IMAGE");
    ensure(metadata.width * metadata.height <= maxImagePixels(), 413, "IMAGE_PIXEL_LIMIT");
    ensure((metadata.pages ?? 1) === 1, 415, "ANIMATED_IMAGE_UNSUPPORTED");
    // Validate the full pixel stream before accepting the original. Conversion
    // failure after validation must not discard an otherwise valid upload.
    try { await sharp(data, { limitInputPixels: maxImagePixels(), failOn: "warning" }).timeout({ seconds: 12 }).stats(); }
    catch { throw new AppError(415, "IMAGE_DECODE_FAILED"); }
    let preview;
    try {
      preview = await sharp(data, { limitInputPixels: maxImagePixels(), failOn: "warning", autoOrient: true })
        .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 6 }).timeout({ seconds: 12 }).toBuffer({ resolveWithObject: true });
    } catch { return { width: metadata.autoOrient.width, height: metadata.autoOrient.height, derivatives: [] as ImagePreview[], previewError: "PREVIEW_UNAVAILABLE" }; }
    const derivatives: ImagePreview[] = [{ kind: "preview", data: preview.data, width: preview.info.width, height: preview.info.height, mimeType: "image/png" }];
    let previewError: string | undefined;
    try {
      const thumb = await sharp(preview.data).resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true })
        .png().timeout({ seconds: 5 }).toBuffer({ resolveWithObject: true });
      derivatives.push({ kind: "thumbnail", data: thumb.data, width: thumb.info.width, height: thumb.info.height, mimeType: "image/png" });
    } catch { previewError = "THUMBNAIL_UNAVAILABLE"; }
    return { width: metadata.autoOrient.width, height: metadata.autoOrient.height, derivatives, previewError };
  } finally {
    const next = waiting.shift();
    if (next) next(); else processing--;
  }
}
