/**
 * electron-magickwand 在 `npm install` 时只会把原生模块产物放在
 * `lib/binding/<platform>-<arch>/magickwand.node`（Conan/Meson 构建），
 * 而 `native/index.cjs` 固定从 `build/Release/magickwand.node` 加载。
 *
 * - macOS/Linux：产物里的 N-API 符号由宿主进程在加载时解析，直接复制即可。
 * - Windows：该产物链接的是 node.exe，Electron 进程名是自己的 exe，加载时会报
 *   "The specified module could not be found"，必须用 electron-rebuild 针对
 *   Electron 重新编译（`npm run rebuild:native`，CI 中由 workflow 显式执行）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(rootDir, 'node_modules', 'electron-magickwand');
const platformId = `${process.platform}-${process.arch}`;
const builtPath = path.join(pkgDir, 'lib', 'binding', platformId, 'magickwand.node');
const targetPath = path.join(pkgDir, 'build', 'Release', 'magickwand.node');

if (fs.existsSync(targetPath)) {
  process.exit(0);
}

if (process.platform === 'win32') {
  console.log(
    '[ensure-magickwand] Windows 需要针对 Electron 编译原生模块：请运行 npm run rebuild:native（需要 VS2022 的 v143 工具集）'
  );
  process.exit(0);
}

if (!fs.existsSync(builtPath)) {
  console.error(
    `[ensure-magickwand] 未找到 ${platformId} 的原生模块：${builtPath}\n` +
      '[ensure-magickwand] 请确认 electron-magickwand 安装阶段已成功完成 Conan/Meson 构建。'
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.copyFileSync(builtPath, targetPath);
console.log(`[ensure-magickwand] 已从 ${platformId} 构建产物补齐 build/Release/magickwand.node`);
