import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { imagePreviews } from "../src/lib/image-previews";
test("native image processing limits, orientation and bounded previews on the build platform",async()=>{
  const png=await sharp({create:{width:3200,height:1200,channels:3,background:"white"}}).png().toBuffer();
  const source=await sharp(png).jpeg().withMetadata({orientation:6}).toBuffer();
  const result=await imagePreviews(source,"image/jpeg");
  assert.equal(result.width,1200);assert.equal(result.height,3200);
  const preview=result.derivatives.find(d=>d.kind==="preview");assert.ok(preview);
  const decoded=await sharp(preview.data).metadata();assert.equal(decoded.height,2560);assert.equal(decoded.width,960);
  assert.ok(result.derivatives.find(d=>d.kind==="thumbnail"));
  await assert.rejects(imagePreviews(png.subarray(0,60),"image/png"),/INVALID_IMAGE|IMAGE_DECODE_FAILED/);
  const big=await sharp({create:{width:6400,height:6400,channels:3,background:"white"}}).png().toBuffer();
  await assert.rejects(imagePreviews(big,"image/png"),/IMAGE_PIXEL_LIMIT/);
  const pdf=await imagePreviews(Buffer.from("%PDF-1.4"),"application/pdf");assert.equal(pdf.derivatives.length,0);
});
