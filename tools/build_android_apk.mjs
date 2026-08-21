import { access, copyFile, rm } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(projectRoot, "android");
const apkPath = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const outputApkPath = path.join(androidDir, "ehoeho-debug.apk");
const webDir = path.join(projectRoot, "www");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

function run(command, args, cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} exited with ${signal || `code ${code}`}`));
    });
  });
}

await run(npmCommand, ["run", "web:build"]);

try {
  if (!existsSync(androidDir)) {
    console.log("Android 工程不存在，正在首次创建…");
    await run(npmCommand, ["exec", "--", "cap", "add", "android"]);
  }

  await run(npmCommand, ["exec", "--", "cap", "sync", "android"]);
  await run(gradleCommand, ["assembleDebug"], androidDir);

  await access(apkPath, constants.R_OK);
  await copyFile(apkPath, outputApkPath);
} finally {
  // The native project already contains the synced web bundle, so the temporary
  // Capacitor input directory does not need to remain beside the Android folder.
  await rm(webDir, { recursive: true, force: true });
}

console.log(`APK 已生成: ${path.relative(projectRoot, outputApkPath)}`);
