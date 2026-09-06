# 成医通（cyitong-nav）

成都医学院师生专属导航页，WebStack 侧边栏风格：汇集校内系统、医学文献、AI 工具与实用工具，另有站内/引擎搜索、二维码/镜像弹窗等增强。

线上地址：<https://nav.cyitong.top>

## 技术栈

| 层面 | 方案 |
|---|---|
| 框架 | Astro 7（纯静态输出，Content Layer） |
| 数据 | `src/data/sites/*.yaml` 唯一数据源 + Zod v4 构建期校验 |
| 样式 | Tailwind CSS v4（`@theme` 语义令牌 + 类名暗色） |
| 图标 | `astro-icon` 构建期内联；运行期走 lucide symbol sprite |
| 交互 | 原生 TypeScript Web Components（无框架，无 island） |
| 二维码 | `qrcode`（浏览器端生成） |

## 常用命令

```bash
npm install
npm run dev       # 开发服务器 → http://localhost:4321
npm run build     # 类型检查(astro check) + 生产构建 → dist/
npm run check     # 仅类型检查
npm run preview   # 本地预览构建产物
```

无测试框架：**改完代码必须 `npm run build`**，Content Layer 的 Zod 会在构建期拦截数据错误。

## 目录结构

```
cyitong-nav/
├── astro.config.ts      # site、astro-icon integration、vite 插件(tailwindcss)
├── public/
│   ├── logo.svg         # 品牌 logo / favicon
│   ├── cmc.webp         # 首页搜索 Hero 背景图
│   └── icons/           # 链接图标：/icons/{分类id}/{链接id}.webp（93 张）
│       └── topbar/      # 顶栏下拉本地 favicon（有道/讯飞/Gmail，共 3 张）
└── src/
    ├── content.config.ts    # Content Layer：glob + Zod 校验 + 图标存在性对账
    ├── data/
    │   ├── sites/*.yaml     # 数据源：一个一级分类一个文件（7 个）
    │   ├── search-engines.ts# 搜索范围 tab + 外部引擎（{q} 模板）
    │   └── category-icons.ts# yaml icon 语义键 → heroicons 名
    ├── lib/icon-sprite.ts   # 运行期图标 symbol sprite（服务端专用）
    ├── styles/global.css    # Tailwind 颜色/投影令牌 + .dark 覆盖 + 状态类样式
    ├── layouts/Layout.astro # html 壳：防闪烁主题、图标 sprite、搜索索引
    ├── pages/               # index.astro（首页）、404.astro
    └── components/
        ├── Sidebar.astro  TopBar.astro  SearchPanel.astro
        ├── CategoryBlock.astro  LinkCard.astro  SiteGrid.astro
        ├── Footer.astro   BackToTop.astro
        └── web/              # 客户端运行时（自定义元素 + 纯工具）
            ├── nav-search.ts  nav-dialog.ts  nav-cat-tabs.ts
            ├── nav-sidebar.ts nav-theme-toggle.ts  nav-backtotop.ts
            ├── header-dropdown.ts  link-tip.ts  search-utils.ts  icons.ts  html-escape.ts
            ├── storage.ts         # localStorage 安全读写（原值/JSON 两组）
```

`dist/`（构建产物，不入库）位于仓库根目录。

## 数据与添加链接

数据是三级结构：**一级分类 → 二级分类 → 链接**。

```yaml
# src/data/sites/campus.yaml
order: 1              # 一级分类排序（glob 不保证顺序，必填）
id: campus            # 与文件名一致
name: 成医生活
icon: building        # 语义键 → category-icons.ts → heroicons 图标
subs:
  - id: finance       # 二级分类 id
    name: 财务
    links:
      - id: alipay    # 链接 id，必须与图标文件名一致
        title: 计划财务处
        desc: 计划财务处服务号，扫码打开   # 可选：卡片简介/悬浮 tip/站内搜索
        pinyin: jihuacaiwuchu    # 全拼，供搜索
        pinyinFirst: jhcwc       # 拼音首字母，供搜索
        url: "alipays://…"        # 支持非 http scheme；含 # & ? 须加引号
        qr: true                 # 可选：点击弹二维码
        qrNote: 请使用支付宝扫码…
        mirrors:                 # 可选：镜像站（优先级高于 qr）
          - label: 镜像一
            url: https://…
```

### 添加一个链接

1. 下载图标为 webp，放入 `public/icons/{分类id}/{链接id}.webp`（id 与文件名必须一致）；
2. 在对应 `src/data/sites/{分类id}.yaml` 的 `subs[].links[]` 追加条目，补全 `pinyin` / `pinyinFirst`；
3. 需要卡片简介就加 `desc`（一行 ≤40 字中文；卡片第二行 + 悬浮白字黑底 tip，并参与站内搜索匹配）；
4. 需扫码/镜像就加 `qr: true` / `mirrors` 字段；
5. 跑 `npm run build` —— 缺图、id 不一致、URL 无 scheme 等都会在构建期报错。

新图标建议用 favicon.io 或官方站点抓取，压缩到 favicon 级尺寸。

### 7 个一级分类

`campus` 成医生活 · `study` 线上学习 · `exam` 考试比赛 · `cnlit` 中文文献 · `enlit` 英文文献 · `aitool` AI 工具 · `tools` 实用工具（共 35 子分类 / 93 链接）。

## 部署

纯静态站，`npm run build` 后把 `dist/` 托管到任意静态平台（Nginx / Vercel / Cloudflare / GitHub Pages）即可，目标域名 `nav.cyitong.top`。Nginx 伪静态示例：

```nginx
root /var/www/nav/dist;
try_files $uri $uri/ /404.html;
```
