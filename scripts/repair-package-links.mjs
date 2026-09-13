import fs from "node:fs";
import path from "node:path";

function inside(root, filename) {
  const relative = path.relative(root, filename);
  return relative && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

// Turbopack's hashed external aliases must refer to the installed release
// dependencies, never to its build checkout. No arbitrary external files are read.
export function materializeNextAliases(artifact, sourceDependencyRoots) {
  const root = fs.realpathSync(artifact);
  const sources = sourceDependencyRoots.filter(source => fs.existsSync(source)).map(source => fs.realpathSync(source));
  let count = 0;
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const resolved = fs.realpathSync(filename);
        let packagedTarget = resolved;
        if (!inside(root, resolved)) {
          const source = sources.find(candidate => inside(candidate, resolved));
          if (!source) throw new Error("Next alias targets an unapproved source: " + path.relative(root, filename));
          packagedTarget = path.join(root, "node_modules", path.relative(source, resolved));
        }
        if (!fs.existsSync(packagedTarget)) throw new Error("Next alias has no corresponding production dependency: " + path.relative(root, filename));
        const actualTarget = fs.realpathSync(packagedTarget);
        if (!inside(root, actualTarget) || inside(actualTarget, filename)) throw new Error("Invalid release dependency alias.");
        const directoryTarget = fs.statSync(actualTarget).isDirectory();
        fs.unlinkSync(filename);
        fs.cpSync(actualTarget, filename, { recursive: directoryTarget, dereference: true });
        count++;
        if (directoryTarget) visit(filename);
      } else if (entry.isDirectory()) visit(filename);
    }
  }
  visit(path.join(root, ".next", "node_modules"));
  return count;
}
