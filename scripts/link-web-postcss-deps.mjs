import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const rootNodeModules = join(root, "node_modules");
const webNodeModules = join(root, "apps", "web", "node_modules");

const packages = [
  ["@tailwindcss", "postcss"],
  ["@tailwindcss", "node"],
  ["@tailwindcss", "oxide"],
  ["@tailwindcss", "oxide-win32-x64-msvc"],
  "tailwindcss",
  "postcss",
  "lightningcss",
  "lightningcss-win32-x64-msvc",
];

function getPaths(packageEntry) {
  if (Array.isArray(packageEntry)) {
    const [scope, name] = packageEntry;
    return {
      source: join(rootNodeModules, scope, name),
      target: join(webNodeModules, scope, name),
      marker: join(webNodeModules, scope, name, "package.json"),
    };
  }

  return {
    source: join(rootNodeModules, packageEntry),
    target: join(webNodeModules, packageEntry),
    marker: join(webNodeModules, packageEntry, "package.json"),
  };
}

function linkPackage(packageEntry) {
  const { source, target, marker } = getPaths(packageEntry);

  if (!existsSync(source)) {
    return;
  }

  if (existsSync(marker)) {
    return;
  }

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }

  mkdirSync(join(target, ".."), { recursive: true });

  if (process.platform === "win32") {
    execSync(`cmd /c mklink /J "${target}" "${source}"`, { stdio: "ignore" });
    return;
  }

  execSync(`ln -s "${source}" "${target}"`, { stdio: "ignore" });
}

if (existsSync(join(webNodeModules, "@tailwindcss"))) {
  rmSync(join(webNodeModules, "@tailwindcss"), { recursive: true, force: true });
}

for (const packageEntry of packages) {
  linkPackage(packageEntry);
}
