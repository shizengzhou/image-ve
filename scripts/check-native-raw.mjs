/**
 * 检查 Electron 用的 magickwand.node 是否真的带 LibRaw。
 * ImageMagick 没有编入 libraw 时，RAW（RAF/DNG/ARW/NEF/ORF 等）会退回调用
 * 外部的 ufraw-batch 委托，而该程序并不存在，主图解码直接失败。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetPath = path.join(
  rootDir,
  'node_modules',
  'electron-magickwand',
  'build',
  'Release',
  'magickwand.node'
);

if (!fs.existsSync(targetPath)) {
  console.error(`[check-native-raw] 找不到 ${targetPath}，原生模块未构建。`);
  process.exit(1);
}

const binary = fs.readFileSync(targetPath).toString('latin1').toLowerCase();

if (!binary.includes('libraw')) {
  console.error(
    '[check-native-raw] 当前 magickwand.node 没有编入 LibRaw，RAW 解码会退回不存在的 ufraw-batch。\n' +
      '[check-native-raw] 请在全新依赖下重编：npm ci（会构建带 libraw 的 ImageMagick）后执行 npm run rebuild:native。'
  );
  process.exit(1);
}

console.log('[check-native-raw] LibRaw 已编入原生模块，RAW 解码可用');
