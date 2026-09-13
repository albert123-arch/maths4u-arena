import { cp, mkdir } from 'node:fs/promises';
// Public renderer code only. No student files or previews enter public/.
await mkdir('public/pdfjs', { recursive: true });
await cp('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdfjs/pdf.worker.min.mjs');
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await cp(`node_modules/pdfjs-dist/${folder}`, `public/pdfjs/${folder}`, { recursive: true });
