/** 搜索引擎数据（纯数据模块） */

export type SearchScope = 'site' | 'search' | 'community' | 'literature';

export interface Engine {
  name: string;
  /** URL 模板，{q} 为查询词占位 */
  url: string;
}

export interface ScopeTab {
  id: SearchScope;
  label: string;
}

export const SCOPE_TABS: ScopeTab[] = [
  { id: 'site', label: '站内' },
  { id: 'search', label: '搜索' },
  { id: 'community', label: '社区' },
  { id: 'literature', label: '文献检索' },
];

export const ENGINES: Record<SearchScope, Engine[]> = {
  site: [],
  search: [
    { name: 'Bing', url: 'https://www.bing.com/search?q={q}' },
    { name: 'Google', url: 'https://www.google.com/search?q={q}' },
    { name: '百度', url: 'https://www.baidu.com/s?wd={q}' },
    { name: '搜狗', url: 'https://www.sogou.com/web?query={q}' },
  ],
  community: [
    { name: '知乎', url: 'https://www.zhihu.com/search?type=content&q={q}' },
    { name: '公众号', url: 'https://weixin.sogou.com/weixin?type=2&query={q}' },
    { name: '微博', url: 'https://s.weibo.com/weibo?q={q}' },
    { name: '豆瓣', url: 'https://www.douban.com/search?q={q}' },
  ],
  literature: [
    { name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}' },
    { name: 'MeSH', url: 'https://www.ncbi.nlm.nih.gov/mesh/?term={q}' },
    { name: '万方', url: 'https://s.wanfangdata.com.cn/paper?q={q}' },
    { name: '百度学术', url: 'https://xueshu.baidu.com/s?wd={q}' },
    { name: '谷歌学术', url: 'https://scholar.google.com/scholar?q={q}' },
  ],
};

export const PLACEHOLDERS: Record<SearchScope, string> = {
  site: '搜索站内链接…',
  search: '在搜索引擎中搜索…',
  community: '在社区中搜索…',
  literature: '检索文献…',
};

export function engineUrl(engine: Engine, q: string): string {
  return engine.url.replace('{q}', encodeURIComponent(q));
}
