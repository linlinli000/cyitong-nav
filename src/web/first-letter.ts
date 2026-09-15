/** 图标缺失时色块显示的字，空标题给中性点号（SSR 与客户端共用） */
export function firstLetter(title: string): string {
  return title.trim().charAt(0) || '·';
}
