# 成医通

成都医学院学生专属导航页，汇集教务系统、图书馆、一卡通等校内常用链接。

## 技术栈

- TypeScript
- Vite
- Tailwind CSS

## 目录结构

```
成医通/
├── public/
│   ├── favicon.svg          # 网站 favicon
│   └── icons/               # 链接图标（自维护 PNG/WebP）
├── src/
│   ├── data/
│   │   ├── links.ts         # 链接数据（添加/修改链接改这里）
│   │   └── icons.ts         # SVG 图标库（分类图标 + 链接图标）
│   ├── components/
│   │   ├── Header.ts        # 顶部导航栏（Logo + 分类锚点 + 暗色模式）
│   │   ├── LinkCard.ts      # 单个链接卡片
│   │   ├── LinkGrid.ts      # 分类板块布局
│   │   └── Dialog.ts        # 二维码弹窗（QR 链接用）
│   ├── main.ts              # 入口：页面组装 + 搜索 + 引擎切换
│   └── style.css            # 全局样式 + 动画
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## 开发

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run preview    # 预览生产构建
```

## 添加/修改链接

编辑 `src/data/links.ts`，按格式添加条目：

```ts
{
  id: 'xxx',           // 唯一标识
  title: '站点名称',
  url: 'https://...',
  category: 'common',  // common | study | life | campus | other
  icon: 'clipboard',   // 对应 src/data/icons.ts 中的 SVG 图标名
  qr: true,            // 可选，设为 true 则点击弹二维码而非直接跳转
  qrNote: '说明文字',   // 可选，二维码弹窗的提示文字
}
```

## 图标方案

目前使用 DuckDuckGo favicon API 自动获取链接图标（`icons.duckduckgo.com/ip3/{domain}.ico`），图标加载失败时显示站点名首字作为 fallback。

计划迁移为自维护 WebP 图片（`public/icons/`），提升国内加载速度和稳定性。
