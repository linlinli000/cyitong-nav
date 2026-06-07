/** LinkGrid — 分类板块布局 */

import type { LinkItem, CategoryId, Category } from '../data/links';
import { iconSvg } from '../data/icons';
import { createLinkCard } from './LinkCard';

export function createLinkSections(
  grouped: Map<CategoryId, LinkItem[]>,
  categories: Category[],
  onQrClick?: (link: LinkItem) => void,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6';
  container.setAttribute('id', 'link-sections');

  let totalCount = 0;

  for (const cat of categories) {
    const items = grouped.get(cat.id);
    if (!items || items.length === 0) continue;
    totalCount += items.length;

    const section = createSection(cat, items, onQrClick);
    container.appendChild(section);
  }

  if (totalCount === 0) {
    container.innerHTML = `
      <div class="text-center py-24">
        <div class="text-6xl mb-5">🔍</div>
        <p class="text-gray-400 dark:text-slate-500 text-lg font-medium">未找到相关链接</p>
        <p class="text-gray-300 dark:text-slate-600 text-sm mt-2">试试换个关键词，或者检查一下拼写</p>
      </div>
    `;
  }

  return container;
}

function createSection(
  cat: Category,
  items: LinkItem[],
  onQrClick?: (link: LinkItem) => void,
): HTMLElement {
  const section = document.createElement('section');
  section.setAttribute('id', `section-${cat.id}`);

  const header = document.createElement('div');
  header.className = 'section-header flex items-center gap-2 mb-3';
  header.innerHTML = `
    <span class="text-primary dark:text-blue-400">${iconSvg(cat.icon, 'w-4 h-4')}</span>
    <h2 class="text-sm sm:text-base font-semibold text-gray-800 dark:text-slate-200">${cat.name}</h2>
    <span class="text-xs text-gray-400 dark:text-slate-500 font-normal">${items.length} 个链接</span>
  `;
  section.appendChild(header);

  const box = document.createElement('div');
  box.className = [
    'dir-box',
    'bg-white/90 dark:bg-slate-800/90',
    'rounded-2xl',
    'border border-gray-100 dark:border-slate-700/50',
    'p-3 sm:p-4',
  ].join(' ');

  const list = document.createElement('div');
  list.className = 'flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2';

  for (let i = 0; i < items.length; i++) {
    list.appendChild(createLinkCard(items[i], onQrClick));
  }

  box.appendChild(list);
  section.appendChild(box);

  return section;
}
