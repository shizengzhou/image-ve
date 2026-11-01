/**
 * binding.gyp 编译 electron-magickwand 时需要 preconf/MagickCore 下由 CMake
 * 生成的两个头文件（magick-baseconfig.h、version.h）。发布出去的 npm 包里
 * 不一定带这两个文件，CI 上重编就会报
 * "Cannot open include file: 'MagickCore/magick-baseconfig.h'"。
 * 安装阶段 Conan/Meson 已经把同一份生成头文件装到
 * lib/binding/<platform>-<arch>/include/ImageMagick-7，缺失时从这里补。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(rootDir, 'node_modules', 'electron-magickwand');
const platformId = `${process.platform}-${process.arch}`;
const preconfDir = path.join(pkgDir, 'preconf', 'MagickCore');
const installedDir = path.join(
  pkgDir,
  'lib',
  'binding',
  platformId,
  'include',
  'ImageMagick-7',
  'MagickCore'
);

const headers = ['magick-baseconfig.h', 'version.h'];
const missing = headers.filter((name) => !fs.existsSync(path.join(preconfDir, name)));

if (missing.length === 0) {
  process.exit(0);
}

const available = missing.filter((name) => fs.existsSync(path.join(installedDir, name)));
if (available.length === 0) {
  console.error(
    `[prepare-native] preconf/MagickCore 缺少 ${missing.join(', ')}，且 ${installedDir} 里也找不到可复制的版本。`
  );
  process.exit(1);
}

fs.mkdirSync(preconfDir, { recursive: true });
for (const name of available) {
  fs.copyFileSync(path.join(installedDir, name), path.join(preconfDir, name));
}
console.log(`[prepare-native] 已从 ${platformId} 安装产物补齐 ${available.join(', ')}`);
