import { test } from "node:test";
import assert from "node:assert/strict";
import { presentationLink } from "../src/lib/presentation-url";

test("Slides share, presentation, account-specific and published links normalize safely", () => {
  for (const suffix of ["edit?usp=sharing#slide=id.p", "present", "preview", "embed?start=true&loop=true", "view", ""]) {
    const link = presentationLink("https://docs.google.com/presentation/d/test_123-/" + suffix)!;
    assert.equal(link.url, "https://docs.google.com/presentation/d/test_123-/edit");
    assert.equal(link.openUrl, "https://docs.google.com/presentation/d/test_123-/present");
    assert.equal(link.embedUrl, "https://docs.google.com/presentation/d/test_123-/embed?start=false&loop=false&delayms=3000");
  }
  assert.equal(presentationLink("https://docs.google.com/presentation/u/1/d/test/edit")?.sourceKey, "file:test");
  for (const suffix of ["pub", "embed", "pubembed"]) {
    const link = presentationLink("https://docs.google.com/presentation/d/e/published_123/" + suffix)!;
    assert.equal(link.sourceKey, "published:published_123");
    assert.equal(link.openUrl, "https://docs.google.com/presentation/d/e/published_123/pub");
    assert.match(link.embedUrl, /\/d\/e\/published_123\/embed\?/);
  }
});
test("Drive share links preserve resource keys and identity without forwarding arbitrary parameters", () => {
  for (const url of ["https://drive.google.com/file/d/abc123/view?usp=sharing&resourcekey=0_safe-123", "https://drive.google.com/open?id=abc123&resourcekey=0_safe-123", "https://drive.google.com/file/u/0/d/abc123/preview?resourcekey=0_safe-123"]) {
    const link = presentationLink(url)!;
    assert.equal(link.embedUrl, "https://drive.google.com/file/d/abc123/preview?resourcekey=0_safe-123");
    assert.equal(link.sourceKey, "file:abc123");
  }
  const slides = presentationLink("https://docs.google.com/presentation/d/abc123/edit?resourcekey=0_safe-123&redirect=https://example.org")!;
  assert.equal(new URL(slides.embedUrl).searchParams.get("resourcekey"), "0_safe-123");
  assert.equal(new URL(slides.embedUrl).searchParams.has("redirect"), false);
});
test("untrusted origins, credentials, folders, HTML and malformed URLs are rejected", () => {
  for (const url of ["javascript:alert(1)", "http://docs.google.com/presentation/d/a/edit", "https://docs.google.com.evil.test/presentation/d/a/edit", "https://docs.google.com@evil.test/presentation/d/a/edit", "https://user:password@docs.google.com/presentation/d/a/edit", "https://drive.google.com:444/file/d/a/view", "https://drive.google.com/drive/folders/abc", "https://drive.google.com/open?id=a/b", "https://docs.google.com/document/d/a/edit", "https://docs.google.com/presentation/d/a/edit/evil", "https://docs.google.com/presentation/d/a%2fb/edit", "https://docs.google.com/presentation/d/a/edit?resourcekey=%26evil", "<iframe src='https://docs.google.com/presentation/d/a/embed'></iframe>", "https://docs.google.com/\npresentation/d/a/edit", "https://docs.google.com\\evil.test/presentation/d/a/edit", "https://docs.google.com/presentation/d/" + "a".repeat(201) + "/edit"]) assert.equal(presentationLink(url), null, url);
});
