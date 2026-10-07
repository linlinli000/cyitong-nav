/** yaml 分类 icon 语义键 → iconify lucide 名 */
export const CATEGORY_ICON_NAMES: Record<string, string> = {
  building: 'school',
  book: 'presentation',
  'academic-cap': 'graduation-cap',
  'document-text': 'file-text',
  beaker: 'flask-conical',
  sparkles: 'sparkles',
  wrench: 'wrench',
};

export function categoryIcon(key: string): string {
  return CATEGORY_ICON_NAMES[key] ? `lucide:${CATEGORY_ICON_NAMES[key]}` : key;
}
