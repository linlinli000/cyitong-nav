/** 构建运行期图标 sprite（服务端专用：内含整个 lucide JSON，禁被客户端导入）*/
import iconsData from '@iconify-json/lucide/icons.json';

interface IconifyDataSet {
  icons: Record<string, { body: string }>;
  aliases?: Record<string, { parent: string }>;
}

/** 按语义名生成 `<symbol>` 串，id 形如 icon-<name>，供 web 组件 `<use href="#icon-x">` 引用 */
export function buildIconSprite(names: readonly string[]): string {
  const data = iconsData as unknown as IconifyDataSet;
  const aliases = data.aliases ?? {};
  return names
    .map((name) => {
      const def = data.icons[name] ?? (name in aliases ? data.icons[aliases[name].parent] : undefined);
      if (!def) {
        throw new Error(`[icon-sprite] 本地 @iconify-json/lucide 缺少图标/别名 "${name}"`);
      }
      return `<symbol id="icon-${name}" viewBox="0 0 24 24">${def.body}</symbol>`;
    })
    .join('');
}
