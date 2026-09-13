import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { materializeNextAliases } from "../scripts/repair-package-links.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const localRoot = path.join(projectRoot, ".local");

async function fixture(context) {
  await fs.mkdir(localRoot, { recursive: true });
  const temporaryRoot = await fs.mkdtemp(path.join(localRoot, "package-links-test-"));
  context.after(async () => {
    const resolved = await fs.realpath(temporaryRoot);
    assert.ok(path.dirname(resolved) === await fs.realpath(localRoot) &&
      path.basename(resolved).startsWith("package-links-test-"), "Cleanup must remain within this generated workspace fixture.");
    await fs.rm(resolved, { recursive: true, force: true });
  });
  const artifact = path.join(temporaryRoot, "artifact");
  const sourceDependencies = path.join(temporaryRoot, "source", "node_modules");
  const packagedDependency = path.join(artifact, "node_modules", "fake-package");
  const sourceDependency = path.join(sourceDependencies, "fake-package");
  const alias = path.join(artifact, ".next", "node_modules", "fake-hash");
  await fs.mkdir(packagedDependency, { recursive: true });
  await fs.mkdir(sourceDependency, { recursive: true });
  await fs.mkdir(path.dirname(alias), { recursive: true });
  await fs.writeFile(path.join(packagedDependency, "value.txt"), "PACKAGED_DEPENDENCY_CONTENT");
  await fs.writeFile(path.join(sourceDependency, "value.txt"), "SOURCE_DEPENDENCY_CONTENT");
  return { temporaryRoot, artifact, sourceDependencies, sourceDependency, alias };
}

async function directoryLink(target, link) {
  await fs.symlink(target, link, process.platform === "win32" ? "junction" : "dir");
  assert.ok((await fs.lstat(link)).isSymbolicLink(), "The fixture must reproduce a real directory alias.");
}

test("Next aliases materialize from packaged dependencies and survive artifact relocation", async (context) => {
  const { temporaryRoot, artifact, sourceDependencies, sourceDependency, alias } = await fixture(context);
  await directoryLink(sourceDependency, alias);

  assert.equal(materializeNextAliases(artifact, [sourceDependencies]), 1);
  const materialized = await fs.lstat(alias);
  assert.ok(materialized.isDirectory() && !materialized.isSymbolicLink(), "The Next alias must become a real packaged directory.");
  assert.equal(await fs.readFile(path.join(alias, "value.txt"), "utf8"), "PACKAGED_DEPENDENCY_CONTENT",
    "The release dependency must supply the contents, rather than the original build checkout.");
  assert.equal(materializeNextAliases(artifact, [sourceDependencies]), 0, "Repeated materialization must make no further changes.");

  const relocated = path.join(temporaryRoot, "relocated-artifact");
  await fs.cp(artifact, relocated, { recursive: true, verbatimSymlinks: true });
  const relocatedAlias = path.join(relocated, ".next", "node_modules", "fake-hash");
  assert.ok(!(await fs.lstat(relocatedAlias)).isSymbolicLink(), "Relocation must retain an ordinary directory.");
  assert.equal(await fs.readFile(path.join(relocatedAlias, "value.txt"), "utf8"), "PACKAGED_DEPENDENCY_CONTENT");
});

test("Next aliases reject a private folder outside approved dependency roots", async (context) => {
  const { temporaryRoot, artifact, sourceDependencies, alias } = await fixture(context);
  const privateFolder = path.join(temporaryRoot, "private-folder");
  await fs.mkdir(privateFolder);
  // This artificial private file is never read by the test. The implementation
  // must reject the target from its location before copying any private content.
  await fs.writeFile(path.join(privateFolder, "private.txt"), "ARTIFICIAL_PRIVATE_FIXTURE");
  await directoryLink(privateFolder, alias);

  assert.throws(() => materializeNextAliases(artifact, [sourceDependencies]), /unapproved source/);
  assert.ok((await fs.lstat(alias)).isSymbolicLink(), "An unapproved alias must be rejected before unlinking or materializing it.");
});
