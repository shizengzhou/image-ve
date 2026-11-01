/**
 * electron-magickwand 在 `npm install` 时只会把原生模块产物放在
 * `lib/binding/<platform>-<arch>/magickwand.node`（Conan/Meson 构建），
 * 而 `native/index.cjs` 固定从 `build/Release/magickwand.node` 加载。
 * 没有手动执行 `node-gyp build` 的环境（比如 CI）就会缺少这个文件，
 * 打包后应用启动即报 "Cannot find module ... magickwand.node"。
 * 这里在缺失时补一份，保证 `npm ci` 之后即可直接打包。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.join(scriptDir, '..', 'node_modules', 'electron-magickwand');
const platformId = `${process.platform}-${process.arch}`;
const builtPath = path.join(pkgDir, 'lib', 'binding', platformId, 'magickwand.node');
const targetPath = path.join(pkgDir, 'build', 'Release', 'magickwand.node');

if (fs.existsSync(targetPath)) {
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
