/** 构建运行期图标 sprite（服务端专用：内含 lucide 全量 JSON 与 src/icons 本地 SVG，禁被客户端导入）*/
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import lucide from '@iconify-json/lucide/icons.json';

interface IconifyDataSet {
  icons: Record<string, { body: string }>;
  aliases?: Record<string, { parent: string }>;
}

/** src/icons/*.svg 本地图标：文件名即图标名，本地命中优先于 iconify；单色靠 symbol 的 fill=currentColor 着色 */
const LOCAL_ICON_DIR = 'src/icons';
let localIcons: Map<string, { viewBox: string; body: string }> | null = null;

function loadLocalIcons(): Map<string, { viewBox: string; body: string }> {
  if (localIcons) return localIcons;
  localIcons = new Map();
  if (!existsSync(LOCAL_ICON_DIR)) return localIcons;
  for (const file of readdirSync(LOCAL_ICON_DIR)) {
    if (!file.endsWith('.svg')) continue;
    const raw = readFileSync(`${LOCAL_ICON_DIR}/${file}`, 'utf8');
    const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1];
    const body = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
    if (viewBox && body) localIcons.set(file.replace(/\.svg$/, ''), { viewBox, body });
  }
  return localIcons;
}

export function buildIconSprite(names: readonly string[]): string {
  const locals = loadLocalIcons();
  const bodyOf = (name: string, data: IconifyDataSet): string | undefined => {
    const aliases = data.aliases ?? {};
    return data.icons[name]?.body ?? (name in aliases ? data.icons[aliases[name].parent]?.body : undefined);
  };
  return names
    .map((name) => {
      const local = locals.get(name);
      if (local) return `<symbol id="icon-${name}" viewBox="${local.viewBox}" fill="currentColor">${local.body}</symbol>`;
      const body = bodyOf(name, lucide as IconifyDataSet);
      if (!body) {
        throw new Error(`[icon-sprite] lucide 与 src/icons 均缺少图标 "${name}"`);
      }
      return `<symbol id="icon-${name}" viewBox="0 0 24 24">${body}</symbol>`;
    })
    .join('');
}
