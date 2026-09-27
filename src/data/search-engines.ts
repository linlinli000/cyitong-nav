/** 搜索引擎数据（纯数据模块） */

export type SearchScope = 'site' | 'search' | 'community' | 'literature';

export interface Engine {
  name: string;
  url: string;
  icon: string;
  /** 按类型检索 */
  modes?: EngineMode[];
}

export interface EngineMode {
  label: string;
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
    {
      name: 'Gitea',
      url: 'https://gitea.com/explore/repos?q={q}',
      icon: 'gitea',
      modes: [
        { label: '仓库', url: 'https://gitea.com/explore/repos?q={q}' },
        { label: '用户', url: 'https://gitea.com/explore/users?q={q}' },
        { label: '组织', url: 'https://gitea.com/explore/organizations?q={q}' },
      ],
    },
    {
      name: 'GitHub',
      url: 'https://github.com/search?q={q}&type=repositories',
      icon: 'github',
      modes: [
        { label: '仓库', url: 'https://github.com/search?q={q}&type=repositories' },
        { label: '用户', url: 'https://github.com/search?q={q}&type=users' },
      ],
    },
  ],
  literature: [
    {
      name: 'PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}',
      icon: 'pubmed',
      modes: [
        { label: '综合', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}' },
        { label: '作者', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}[Author]' },
        { label: '标题', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}[Title]' },
        { label: 'DOI', url: 'https://pubmed.ncbi.nlm.nih.gov/?term={q}[DOI]' },
      ],
    },
    { name: 'MeSH', url: 'https://www.ncbi.nlm.nih.gov/mesh/?term={q}', icon: 'tags' },
    {
      name: '知网',
      url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=SU&kw={q}',
      icon: 'database',
      // kns8s 字段码（2026-09-27 逐个实测）：SU 主题 / TI 篇名 / KY 关键词 / AB 摘要 / FT 全文 / AU 作者 / AF 作者单位 / DOI；JN 不生效（回退主题）
      modes: [
        { label: '主题', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=SU&kw={q}' },
        { label: '篇名', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=TI&kw={q}' },
        { label: '关键词', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=KY&kw={q}' },
        { label: '摘要', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=AB&kw={q}' },
        { label: '全文', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=FT&kw={q}' },
        { label: '作者', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=AU&kw={q}' },
        { label: '作者单位', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=AF&kw={q}' },
        { label: 'DOI', url: 'https://kns.cnki.net/kns8s/defaultresult/index?korder=DOI&kw={q}' },
      ],
    },
    {
      name: '万方',
      url: 'https://s.wanfangdata.com.cn/paper?q={q}',
      icon: 'library',
      modes: [
        { label: '论文', url: 'https://s.wanfangdata.com.cn/paper?q={q}' },
        { label: '期刊', url: 'https://s.wanfangdata.com.cn/periodical?q={q}' },
        { label: '学位', url: 'https://s.wanfangdata.com.cn/thesis?q={q}' },
        { label: '会议', url: 'https://s.wanfangdata.com.cn/conference?q={q}' },
        { label: '专利', url: 'https://s.wanfangdata.com.cn/patent?q={q}' },
        { label: '标准', url: 'https://s.wanfangdata.com.cn/standard?q={q}' },
      ],
    },
    { name: '百度学术', url: 'https://xueshu.baidu.com/s?wd={q}', icon: 'graduation-cap' },
    {
      name: '谷歌学术',
      url: 'https://scholar.google.com/scholar?q={q}',
      icon: 'googlescholar',
      modes: [
        { label: '综合', url: 'https://scholar.google.com/scholar?q={q}' },
        { label: '作者', url: 'https://scholar.google.com/scholar?as_sauthors={q}' },
        { label: '标题', url: 'https://scholar.google.com/scholar?q=allintitle:{q}' },
      ],
    },
  ],
};

export const PLACEHOLDERS: Record<SearchScope, string> = {
  site: '搜索站内链接…',
  search: '在搜索引擎中搜索…',
  community: '在社区中搜索…',
  literature: '检索文献…',
};

export function placeholderFor(scope: SearchScope, engineIdx: number): string {
  return scope === 'site' ? PLACEHOLDERS.site : `在 ${ENGINES[scope][engineIdx].name} 中搜索…`;
}

export function engineUrlFor(engine: Engine, modeIdx: number, q: string): string {
  const tpl = engine.modes?.[modeIdx]?.url ?? engine.url;
  return tpl.replace('{q}', encodeURIComponent(q));
}
