import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

type Environment = Record<string, string | undefined>;
const aliases = {
  CLOUD_NAME: "CLOUDINARY_CLOUD_NAME",
  CLOUD_API_KEY: "CLOUDINARY_API_KEY",
  CLOUD_SECRET_KEY: "CLOUDINARY_API_SECRET",
  jwt_key: "JWT_SECRET",
  admin_email: "ADMIN_EMAIL",
  admin_psd: "ADMIN_PASSWORD",
} as const;

function normalize(values: Environment): Environment {
  const result = { ...values };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (result[canonical] === undefined && values[alias] !== undefined) result[canonical] = values[alias];
    delete result[alias];
  }
  return result;
}

/** Deployment variables win over market/.env, the project's only env file. */
export function resolveApiEnvironment(root: Environment, inherited: Environment): Environment {
  return { ...normalize(root), ...normalize(inherited) };
}

function packageDirectory(name: string): string | null {
  let current = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = join(current, "package.json");
    if (existsSync(manifest) && (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === name) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function readEnvironment(directory: string | null): Environment {
  const path = directory ? join(directory, ".env") : null;
  return path && existsSync(path) ? parse(readFileSync(path)) : {};
}

export function loadApiEnvironment(): void {
  // Tests must never load real database, admin or signing credentials.
  if (process.env.NODE_ENV === "test") return;
  const resolved = resolveApiEnvironment(readEnvironment(packageDirectory("aba-mart")), process.env);
  // Windows preserves the first casing of an environment key. Remove aliases
  // first so enumeration exposes ADMIN_EMAIL to the case-sensitive schema.
  for (const alias of Object.keys(aliases)) delete process.env[alias];
  Object.assign(process.env, resolved);
}
