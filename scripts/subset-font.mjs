/** 按 src/ 实际文本子集化钉钉进步体，把 public/fonts/DDjinbuti.woff2 从 984KB 压到约 143KB */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const subsetFont = createRequire(import.meta.url)('subset-font');

const TEXT_EXT = new Set(['.astro', '.ts', '.yaml', '.yml', '.md', '.json', '.css']);
// 与站点文本无关但一定会渲染的：数字、拉丁、中英文标点、单位、希腊字母、带圈序号
const SAFETY = [
  ...'!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ',
  ...'，。、；：？！“”‘’（）《》〈〉【】〔〕—～·…‧‐–―',
  ...'　①②③④⑤⑥⑦⑧⑨⑩',
  ...'±×÷≈≠≤≥∞∑∏√∫∂∇∈∉⊂⊃∪∩⇔⇒→←↑↓',
  ...'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
  ...'℃°μÅΩéñüß₹€£¥$',
];

function collectFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collectFiles(p, out);
    else if (TEXT_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

const chars = new Set(SAFETY);
for (const file of collectFiles('src')) {
  for (const ch of readFileSync(file, 'utf8')) chars.add(ch);
}
// 排序保证同一份内容产出同一个字节序列，避免无谓的 git diff
const text = [...chars].sort().join('');

const MASTER = 'assets/fonts/DDjinbuti.full.woff2';
const TARGET = 'public/fonts/DDjinbuti.woff2';

const master = readFileSync(MASTER);
const subset = await subsetFont(master, text, { targetFormat: 'woff2' });
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const previous = (() => {
  try {
    return readFileSync(TARGET);
  } catch {
    return null;
  }
})();

if (previous && previous.equals(subset)) {
  console.log(`字体子集未变：${text.length} 字符 / ${kb(subset.length)}`);
} else {
  mkdirSync('public/fonts', { recursive: true });
  writeFileSync(TARGET, subset);
  console.log(
    `字体子集已生成：${text.length} 字符 ${kb(master.length)} → ${kb(subset.length)}`
    + `（${((subset.length / master.length) * 100).toFixed(1)}%）`,
  );
}
