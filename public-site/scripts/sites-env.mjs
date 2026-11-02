import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureToolEnvironment } from "./tool-environment.mjs";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
configureToolEnvironment(projectRoot);

process.chdir(projectRoot);
// The production config lives in dist/server; resolve checkout-local secrets
// explicitly so `pnpm run start` reads the same .dev.vars as development.
const localSecrets = path.join(projectRoot, ".dev.vars");
if (existsSync(localSecrets) && !process.argv.some(arg => arg === "--env-file" || arg.startsWith("--env-file="))) {
  process.argv.push("--env-file", localSecrets);
}
for (const directory of [
  path.dirname(process.env.WRANGLER_LOG_PATH),
  process.env.WRANGLER_REGISTRY_PATH,
  process.env.MINIFLARE_REGISTRY_PATH,
]) {
  mkdirSync(directory, { recursive: true });
}
