import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const distRoot = path.join(projectRoot, "dist");
const buildMode = process.argv[2];

if (buildMode !== "dev" && buildMode !== "release") {
  throw new Error(`Unsupported build mode: ${buildMode || "missing"}`);
}

const outputDirectory = path.join(distRoot, buildMode);
const expectedOutputDirectory = buildMode === "dev"
  ? path.join(projectRoot, "dist", "dev")
  : path.join(projectRoot, "dist", "release");

if (outputDirectory !== expectedOutputDirectory) {
  throw new Error(`Refusing to replace unexpected directory: ${outputDirectory}`);
}

const runtimePaths = [
  "manifest.json",
  "background.js",
  "filters.js",
  "price-utils.js",
  "digikala-offer.js",
  "merchant-price.js",
  "tab-state.js",
  "api-logger.js",
  "diagnostics.js",
  "request-diagnostics.js",
  "survey.js",
  "usage.js",
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

if (buildMode === "dev") {
  // Only diagnostics/surveys are local. Search requires the configured PIQO API.
  const clientPath = path.join(outputDirectory, 'piqo-api-client.js');
  await writeFile(clientPath, (await readFile(clientPath, 'utf8')).replace(
    'export const PIQO_MONITORING_BASE_URL = "https://api.piqoo.ir";',
    'export const PIQO_MONITORING_BASE_URL = "http://127.0.0.1:3000";',
  ));
  manifest.host_permissions.push('http://127.0.0.1:3000/*');
  manifest.name = "پیکو | PIQO DEV — مقایسه قیمت";
  manifest.short_name = "PIQO DEV";
  manifest.version_name = `${manifest.version}-dev`;
  manifest.action = {
    ...manifest.action,
    default_title: "PIQO DEV",
  };
}

await writeFile(
  outputManifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Built PIQO ${buildMode.toUpperCase()} at ${outputDirectory}`);
