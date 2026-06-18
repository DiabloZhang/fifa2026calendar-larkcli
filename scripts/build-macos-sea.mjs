import { mkdir, chmod, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const distDir = path.join(cwd, "dist");
const bundlePath = path.join(distDir, "cli-bundle.cjs");
const seaConfigPath = path.join(distDir, "sea-config.json");
const seaBlobPath = path.join(distDir, "fifa2026calendar-larkcli.blob");
const outputPath = path.join(distDir, "fifa2026calendar-larkcli-macos");
const sentinelFuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

await mkdir(distDir, { recursive: true });
await rm(bundlePath, { force: true });
await rm(seaConfigPath, { force: true });
await rm(seaBlobPath, { force: true });
await rm(outputPath, { force: true });

await run("npm", ["run", "build:bundle"]);

await writeFile(
  seaConfigPath,
  JSON.stringify(
    {
      main: bundlePath,
      output: seaBlobPath,
      disableExperimentalSEAWarning: true
    },
    null,
    2
  )
);

await run(process.execPath, ["--experimental-sea-config", seaConfigPath]);
await copyFile(process.execPath, outputPath);

if (process.platform === "darwin") {
  await run("codesign", ["--remove-signature", outputPath], { allowFailure: true });
}

const postjectArgs = [
  "postject",
  outputPath,
  "NODE_SEA_BLOB",
  seaBlobPath,
  "--sentinel-fuse",
  sentinelFuse
];

if (process.platform === "darwin") {
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
}

await run("npx", postjectArgs);

if (process.platform === "darwin") {
  await run("codesign", ["--sign", "-", outputPath], { allowFailure: true });
}

await chmod(outputPath, 0o755);
process.stdout.write(`Built macOS executable: ${outputPath}\n`);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code) => {
      if (code === 0 || options.allowFailure) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });

    child.on("error", reject);
  });
}
