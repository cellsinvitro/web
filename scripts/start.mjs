import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(root, "apps", "server");

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Add it on the Render service Environment tab, then redeploy.",
  );
  process.exit(1);
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

// Migrations run during build (render.yaml buildCommand), not at startup.
// Running them here caused advisory lock timeouts on Neon serverless Postgres.
await run("node", ["dist/index.js"], serverDir);
