import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const backendDir = path.join(rootDir, "backend");
const distDir = path.join(backendDir, "dist");
const outputDir = path.join(backendDir, "lambda");
const outputNodeModulesDir = path.join(outputDir, "node_modules");
const rootNodeModulesDir = path.join(rootDir, "node_modules");
const packageDirs = [
  "@aws",
  "@aws-crypto",
  "@aws-sdk",
  "@smithy",
  "bowser",
  "fast-xml-builder",
  "fast-xml-parser",
  "mnemonist",
  "obliterator",
  "path-expression-matcher",
  "strnum",
  "tslib",
  "zod"
];

await rm(outputDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
await mkdir(outputNodeModulesDir, { recursive: true });

await cp(distDir, outputDir, { recursive: true });

for (const packageDir of packageDirs) {
  await cp(
    path.join(rootNodeModulesDir, packageDir),
    path.join(outputNodeModulesDir, packageDir),
    { recursive: true }
  );
}

console.log(`Lambda assets prepared in ${outputDir}`);
