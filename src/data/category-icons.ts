/** yaml 分类 icon 语义键 → iconify heroicons v2 solid 名。换图标只改这里 */
export const CATEGORY_ICON_NAMES: Record<string, string> = {
  building: 'building-office-2-solid',
  book: 'book-open-solid',
  'academic-cap': 'academic-cap-solid',
  'document-text': 'document-text-solid',
  newspaper: 'newspaper-solid',
  sparkles: 'sparkles-solid',
  wrench: 'wrench-solid',
};

/** 语义键 → 完整 iconify 名（heroicons: 前缀）；未收录的键原样透传，便于直接写 iconify 全名 */
export function categoryIcon(key: string): string {
  return CATEGORY_ICON_NAMES[key] ? `heroicons:${CATEGORY_ICON_NAMES[key]}` : key;
}
