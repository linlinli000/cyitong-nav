/** 搜索引擎数据（纯数据模块） */

export type SearchScope = 'site' | 'search' | 'community' | 'literature';

export interface Engine {
  name: string;
  url: string;
  icon: string;
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
    { name: 'Bing', url: 'https://www.bing.com/search?q={q}', icon: 'microsoftbing' },
    { name: 'Google', url: 'https://www.google.com/search?q={q}', icon: 'google' },
    { name: '百度', url: 'https://www.baidu.com/s?wd={q}', icon: 'baidu' },
    { name: '搜狗', url: 'https://www.sogou.com/web?query={q}', icon: 'sogou' },
  ],
  community: [
    { name: '知乎', url: 'https://www.zhihu.com/search?type=content&q={q}', icon: 'zhihu' },
    { name: '公众号', url: 'https://weixin.sogou.com/weixin?type=2&query={q}', icon: 'wechat' },
    { name: '微博', url: 'https://s.weibo.com/weibo?q={q}', icon: 'sinaweibo' },
    { name: '豆瓣', url: 'https://www.douban.com/search?q={q}', icon: 'douban' },
  ],
  literature: [
    { name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}', icon: 'pubmed' },
    { name: 'MeSH', url: 'https://www.ncbi.nlm.nih.gov/mesh/?term={q}', icon: 'tags' },
    { name: '知网', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=&kw={q}', icon: 'database' },
    { name: '万方', url: 'https://s.wanfangdata.com.cn/paper?q={q}', icon: 'library' },
    { name: '百度学术', url: 'https://xueshu.baidu.com/s?wd={q}', icon: 'graduation-cap' },
    { name: '谷歌学术', url: 'https://scholar.google.com/scholar?q={q}', icon: 'googlescholar' },
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
