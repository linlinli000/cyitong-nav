/** 顶栏快捷下拉（翻译 / 网盘 / 邮箱）的数据 */
export const TOOLS = [
  {
    id: 'translate',
    label: '翻译',
    icon: 'lucide:languages',
    items: [
      { name: '百度翻译', url: 'https://fanyi.baidu.com/', icon: '/icons/topbar/baidu.webp' },
      {
        name: '有道翻译',
        url: 'https://fanyi.youdao.com/indexLLM.html#/',
        icon: '/icons/topbar/youdao.webp',
      },
      { name: '搜狗翻译', url: 'https://fanyi.sogou.com/text', icon: '/icons/topbar/sogou.webp' },
      { name: 'DeepL', url: 'https://www.deepl.com/zh/translator', icon: '/icons/topbar/deepl.webp' },
      {
        name: '讯飞翻译',
        url: 'https://fanyi.xfyun.cn/console/trans/text',
        icon: '/icons/topbar/iflytek.webp',
      },
    ],
  },
  {
    id: 'drive',
    label: '网盘',
    icon: 'lucide:cloud-download',
    items: [
      { name: '百度网盘', url: 'https://pan.baidu.com', icon: '/icons/topbar/baidupan.webp' },
      {
        name: '阿里云盘',
        url: 'https://www.alipan.com',
        icon: '/icons/topbar/alipan.webp',
      },
      {
        name: '夸克网盘',
        url: 'https://pan.quark.cn',
        icon: '/icons/topbar/quark.webp',
      },
      { name: '蓝奏云', url: 'https://www.lanzou.com', icon: '/icons/topbar/lanzou.webp' },
      { name: '迅雷网盘', url: 'https://pan.xunlei.com', icon: '/icons/topbar/xunlei.webp' },
    ],
  },
  {
    id: 'mail',
    label: '邮箱',
    icon: 'lucide:mail',
    items: [
      {
        name: 'QQ邮箱',
        url: 'https://mail.qq.com',
        icon: '/icons/topbar/qqmail.webp',
      },
      { name: '163邮箱', url: 'https://mail.163.com', icon: '/icons/topbar/mail163.webp' },
      { name: 'Outlook', url: 'https://outlook.live.com', icon: '/icons/topbar/outlook.webp' },
      { name: 'Gmail', url: 'https://mail.google.com', icon: '/icons/topbar/gmail.webp' },
    ],
  },
] as const;
