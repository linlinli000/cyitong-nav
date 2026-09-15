/** 图标路径约定：public/icons/<分类id>/<链接id>.webp，与 content.config.ts 的校验同源 */
export function iconPath(categoryId: string, linkId: string): string {
  return `/icons/${categoryId}/${linkId}.webp`;
}
