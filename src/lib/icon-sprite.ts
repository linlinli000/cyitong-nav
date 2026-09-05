/** 构建运行期图标 sprite（服务端专用：内含 lucide + simple-icons 全量 JSON，禁被客户端导入）*/
import lucide from '@iconify-json/lucide/icons.json';
import simpleIcons from '@iconify-json/simple-icons/icons.json';

interface IconifyDataSet {
  icons: Record<string, { body: string }>;
  aliases?: Record<string, { parent: string }>;
}

/** 按语义名生成 `<symbol>` 串，id 形如 icon-<name>，供 web 组件 `<use href="#icon-x">` 引用 */
export function buildIconSprite(names: readonly string[]): string {
  const bodyOf = (name: string, data: IconifyDataSet): string | undefined => {
    const aliases = data.aliases ?? {};
    return data.icons[name]?.body ?? (name in aliases ? data.icons[aliases[name].parent]?.body : undefined);
  };
  // lucide 优先：`x`/`search` 等常规字形两集同名（simple-icons 的 x 是 Twitter 标），先查 lucide 才不串味
  return names
    .map((name) => {
      const body = bodyOf(name, lucide as IconifyDataSet) ?? bodyOf(name, simpleIcons as IconifyDataSet);
      if (!body) {
        throw new Error(`[icon-sprite] lucide/simple-icons 均缺少图标/别名 "${name}"`);
      }
      return `<symbol id="icon-${name}" viewBox="0 0 24 24">${body}</symbol>`;
    })
    .join('');
}
