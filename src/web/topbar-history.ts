/** 顶栏搜索历史面板：开合、tab 切换、回放与清空 */
import { isSearchScope, type SearchScope } from '../config/search-engines';
import { announceOverlayOpen, isDialogEsc, onOverlayOpen } from './overlay';
import {
  DEFAULT_HISTORY_TAB,
  clearAll,
  clearScope,
  renderHistoryPanel,
  replaySearch,
} from './search-history-panel';

export function initTopbarHistory(): void {
  const histPop = document.querySelector<HTMLElement>('[data-topbar-history]');
  const histBtn = document.querySelector<HTMLElement>('[data-topbar-history-open]');
  if (!histPop || !histBtn) return;
  const histBody = histPop.querySelector<HTMLElement>('[data-history-body]');

  let histTab: SearchScope = DEFAULT_HISTORY_TAB;
  let closing = false;

  const renderHist = (): void => {
    if (histBody) renderHistoryPanel(histBody, histTab);
  };

  const finishClose = (restoreFocus: boolean): void => {
    closing = false;
    histPop.classList.remove('closing');
    histPop.hidden = true;
    histBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) histBtn.focus({ preventScroll: true });
  };

  const openHist = (): void => {
    announceOverlayOpen('history');
    histTab = DEFAULT_HISTORY_TAB;
    renderHist();
    closing = false;
    histPop.classList.remove('closing');
    histPop.hidden = false;
    histBtn.setAttribute('aria-expanded', 'true');
    histPop.focus({ preventScroll: true });
  };

  /** Esc / 开关按钮播退出动画；外部点击 / 回放 / 互斥让位立即隐藏，不 lingering 盖住新内容 */
  const closeHist = (animated: boolean): void => {
    if (histPop.hidden || closing) return;
    histBtn.setAttribute('aria-expanded', 'false');
    if (!animated) {
      finishClose(false);
      return;
    }
    closing = true;
    histPop.classList.add('closing');
  };

  histPop.addEventListener('animationend', (e) => {
    // 入场动画也落在 histPop 上，只认退出态
    if (e.target === histPop && closing) finishClose(histPop.contains(document.activeElement));
  });

  onOverlayOpen('history', () => {
    if (!histPop.hidden) finishClose(false);
  });

  histBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (histPop.hidden) openHist();
    else closeHist(true);
  });

  histPop.addEventListener('click', (e) => {
    const t = e.target as Element;

    const tab = t.closest<HTMLElement>('[data-history-tab]');
    if (tab) {
      const scope = tab.dataset.historyTab;
      if (isSearchScope(scope) && scope !== histTab) {
        histTab = scope;
        renderHist();
      }
      return;
    }

    const item = t.closest<HTMLElement>('[data-q]');
    if (item) {
      const scope = item.dataset.scope;
      const q = item.dataset.q;
      if (isSearchScope(scope) && q) {
        replaySearch(scope, q);
        closeHist(false);
      }
      return;
    }

    if (t.closest('[data-clear-current]')) {
      clearScope(histTab);
      renderHist();
      return;
    }

    if (t.closest('[data-clear-all]')) {
      clearAll();
      renderHist();
    }
  });

  document.addEventListener('click', (e) => {
    if (histPop.hidden) return;
    // 面板内切 tab 会重建 innerHTML，target 已脱离文档，用事件路径判断归属
    const path = e.composedPath();
    if (path.includes(histPop)) return;
    if (path.some((n) => n instanceof Element && n.hasAttribute('data-topbar-history-open'))) return;
    closeHist(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !histPop.hidden && !isDialogEsc(e)) closeHist(true);
  });
}