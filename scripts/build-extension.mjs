import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const distRoot = path.join(projectRoot, "dist");
const buildMode = process.argv[2];

if (buildMode !== "dev") {
  throw new Error(`Unsupported build mode: ${buildMode || "missing"}`);
}

const outputDirectory = path.join(distRoot, buildMode);
const expectedOutputDirectory = path.join(projectRoot, "dist", "dev");

if (outputDirectory !== expectedOutputDirectory) {
  throw new Error(`Refusing to replace unexpected directory: ${outputDirectory}`);
}

const runtimePaths = [
  "manifest.json",
  "background.js",
  "filters.js",
  "price-utils.js",
  "tab-state.js",
  "api-logger.js",
  "search-cache.js",
  "piqo-api-client.js",
  "content",
  "sidebar",
  "icons",
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const relativePath of runtimePaths) {
  const sourcePath = path.join(projectRoot, relativePath);
  const destinationPath = path.join(outputDirectory, relativePath);
  await cp(sourcePath, destinationPath, { recursive: true });
}

const outputManifestPath = path.join(outputDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(outputManifestPath, "utf8"));

manifest.name = "PIQO DEV — مقایسه قیمت هوشمند";
manifest.short_name = "PIQO DEV";
manifest.version_name = `${manifest.version}-dev`;
manifest.action = {
  ...manifest.action,
  default_title: "PIQO DEV",
};

await writeFile(
  outputManifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Built PIQO DEV at ${outputDirectory}`);
