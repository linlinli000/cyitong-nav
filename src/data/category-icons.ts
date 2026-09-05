/** yaml 分类 icon 语义键 → iconify heroicons v2 solid 名 */
export const CATEGORY_ICON_NAMES: Record<string, string> = {
  building: 'building-library-solid',
  book: 'book-open-solid',
  'academic-cap': 'academic-cap-solid',
  'document-text': 'document-text-solid',
  newspaper: 'newspaper-solid',
  sparkles: 'sparkles-solid',
  wrench: 'wrench-screwdriver-solid',
};

export function categoryIcon(key: string): string {
  return CATEGORY_ICON_NAMES[key] ? `heroicons:${CATEGORY_ICON_NAMES[key]}` : key;
}
