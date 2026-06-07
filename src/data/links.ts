/** 成医通链接数据 */

import type { IconKey } from './icons';

export type CategoryId = 'common' | 'study' | 'life' | 'campus' | 'other';

export interface Category {
  id: CategoryId;
  name: string;
  icon: IconKey;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: CategoryId;
  icon?: IconKey;
  /** 设为 true 则点击弹窗显示二维码，不直接跳转 */
  qr?: boolean;
  /** 弹窗/二维码的说明文字 */
  qrNote?: string;
}

export const categories: Category[] = [
  { id: 'common', name: '常用入口', icon: 'star' },
  { id: 'study', name: '学习学术', icon: 'book' },
  { id: 'life', name: '生活服务', icon: 'home' },
  { id: 'campus', name: '校园平台', icon: 'building' },
  { id: 'other', name: '其他', icon: 'more' },
];

/** 本地开发时将链接统一替换为 cn.xxx.com，方便预览样式 */
function devUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://cn.xxx.com${u.pathname}${u.search}${u.hash}`;
  } catch {
    return `https://cn.xxx.com`;
  }
}

const _links: LinkItem[] = [
  // 常用入口
  {
    id: 'jwxt', title: '教务管理系统', url: 'https://jw.cmc.edu.cn',
    category: 'common', icon: 'clipboard',
  },
  {
    id: 'lib', title: '图书馆', url: 'https://lib.cmc.edu.cn',
    category: 'common', icon: 'library',
  },
  {
    id: 'email', title: '校园邮箱', url: 'https://mail.cmc.edu.cn',
    category: 'common', icon: 'mail',
  },
  {
    id: 'ykt', title: '一卡通服务', url: 'https://ecard.cmc.edu.cn',
    category: 'common',
    icon: 'credit-card', qr: true, qrNote: '微信/支付宝扫码进入一卡通服务',
  },
  {
    id: 'cwjf', title: '财务缴费平台', url: 'https://cwc.cmc.edu.cn',
    category: 'common',
    icon: 'currency-dollar', qr: true, qrNote: '支持微信/支付宝扫码缴费',
  },

  // 学习学术
  {
    id: 'tzgg', title: '教务通知公告', url: 'https://jw.cmc.edu.cn/tzgg',
    category: 'study', icon: 'megaphone',
  },
  {
    id: 'wlkj', title: '网络教学平台', url: 'https://eol.cmc.edu.cn',
    category: 'study', icon: 'computer-desktop',
  },
  {
    id: 'yjsy', title: '研究生院', url: 'https://yjs.cmc.edu.cn',
    category: 'study', icon: 'academic-cap',
  },
  {
    id: 'jxjy', title: '继续教育学院', url: 'https://jxjy.cmc.edu.cn',
    category: 'study', icon: 'pencil',
  },
  {
    id: 'sjjx', title: '实践教学管理', url: 'https://sjjx.cmc.edu.cn',
    category: 'study', icon: 'beaker',
  },

  // 生活服务
  {
    id: 'hqfw', title: '后勤服务大厅', url: 'https://hq.cmc.edu.cn',
    category: 'life', icon: 'wrench',
  },
  {
    id: 'xljk', title: '心理健康中心', url: 'https://xljk.cmc.edu.cn',
    category: 'life', icon: 'heart',
  },
  {
    id: 'xsh', title: '学生会', url: 'https://xsh.cmc.edu.cn',
    category: 'life', icon: 'user-group',
  },
  {
    id: 'xyy', title: '校医院', url: 'https://xyy.cmc.edu.cn',
    category: 'life', icon: 'plus-circle',
  },
  {
    id: 'xymap', title: '校园地图', url: 'https://map.cmc.edu.cn',
    category: 'life', icon: 'map',
  },

  // 校园平台
  {
    id: 'main', title: '学校官网', url: 'https://www.cmc.edu.cn',
    category: 'campus', icon: 'compass',
  },
  {
    id: 'xgw', title: '学生工作部', url: 'https://xgw.cmc.edu.cn',
    category: 'campus', icon: 'flag',
  },
  {
    id: 'jyw', title: '就业信息网', url: 'https://jy.cmc.edu.cn',
    category: 'campus', icon: 'briefcase',
  },
  {
    id: 'tw', title: '团委', url: 'https://tw.cmc.edu.cn',
    category: 'campus', icon: 'flag',
  },
  {
    id: 'wljb', title: '网络报修系统', url: 'https://net.cmc.edu.cn',
    category: 'campus', icon: 'wifi',
  },

  // 其他
  {
    id: 'xyl', title: '校友会', url: 'https://alumni.cmc.edu.cn',
    category: 'other', icon: 'hand-shake',
  },
  {
    id: 'gjjl', title: '国际交流合作处', url: 'https://gjjl.cmc.edu.cn',
    category: 'other', icon: 'globe',
  },
];

/** 开发模式下统一替换域名，生产构建保持原链接不变 */
export const links: LinkItem[] = import.meta.env.DEV
  ? _links.map(link => ({ ...link, url: devUrl(link.url) }))
  : _links;
