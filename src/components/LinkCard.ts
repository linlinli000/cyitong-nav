/** LinkCard — 链接卡片 */

import type { LinkItem } from '../data/links';

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  } catch {
    return '';
  }
}

export function createLinkCard(
  link: LinkItem,
  onQrClick?: (link: LinkItem) => void,
): HTMLElement {
  const card = document.createElement('a');

  // QR 模式，点击弹窗
  if (link.qr && onQrClick) {
    card.href = 'javascript:void(0)';
    card.addEventListener('click', (e) => {
      e.preventDefault();
      onQrClick(link);
    });
  } else {
    card.href = link.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
  }

  card.title = link.description ? `${link.title} — ${link.description}` : link.title;

  card.className = [
    'dir-card',
    'flex flex-col items-center gap-1.5',
    'w-[100px] sm:w-[110px] px-1 py-3',
    'rounded-xl no-underline text-inherit',
    'bg-white/70 dark:bg-slate-800/70',
    'border border-gray-100 dark:border-slate-700/50',
  ].join(' ');

  const faviconUrl = getFaviconUrl(link.url);

  card.innerHTML = `
    <div class="dir-icon-wrap w-[44px] h-[44px] p-2
                bg-white/80 dark:bg-slate-700/80
                backdrop-blur-sm
                border border-gray-200/80 dark:border-slate-600/60
                rounded-xl mx-auto shrink-0">
      ${
        faviconUrl
          ? `
        <img
          src="${faviconUrl}" alt=""
          class="dir-favicon w-full h-full object-contain"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <span class="dir-fallback hidden w-full h-full items-center justify-center">${escapeHtml(link.title.charAt(0))}</span>
      `
          : `
        <span class="dir-fallback flex w-full h-full items-center justify-center">${escapeHtml(link.title.charAt(0))}</span>
      `
      }
    </div>

    <span class="dir-name w-full text-center text-[12px] sm:text-[13px]
                 text-gray-700 dark:text-slate-300
                 leading-tight overflow-hidden line-clamp-1">
      ${escapeHtml(link.title)}
    </span>

  `;

  return card;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
