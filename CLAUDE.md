# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

成医导航（cyitong-nav）：成都医学院师生导航站，经典 WebStack 侧边栏布局，Astro 7 纯静态站。7 个一级分类 → 35 个二级分类 → 96 个链接。部署目标 `https://nav.cyitong.top`。

技术栈：Astro 7 + Content Layer（Zod v4）+ Tailwind CSS v4 + 原生 TS Web Components + `qrcode`（二维码）。

## 常用命令

```bash
npm run dev       # 开发服务器（http://localhost:4321）
npm run build     # 生产构建 = astro check && astro build（产物在 dist/）
npm run check     # 仅类型检查（astro check）
npm run preview   # 本地预览构建产物
```

本项目无测试框架。改完代码必须跑 `npm run build`——Content Layer 的 Zod schema 会在构建期拦截 YAML 数据错误。

## 架构要点

### 数据链路（唯一数据源 → 页面 → 客户端）

1. **`src/data/sites/*.yaml` 是唯一数据源**（7 个文件，一个一级分类一个文件），经 `src/content.config.ts` 的 `glob()` loader + Zod 校验加载。
2. `src/pages/index.astro` 用 `getCollection('sites')` 按 `order` 排序，拍平成 `SiteRecord[]` 后 `JSON.stringify` 经 Layout 输出为内联 `<script type="application/json" id="site-index">`。
3. `nav-search` 在 `connectedCallback` 里读取该 JSON 做站内搜索。

**改数据结构时同步改两处**：`index.astro` 的拍平逻辑 和 `search-utils.ts` 的 `SiteRecord` 接口，二者必须一致。

### 自定义元素：禁止 island（本项目最大的坑）

所有交互组件（`src/components/web/nav-*.ts`）是自注册自定义元素，**绝不能挂 `client:*` 指令**——Astro 对自定义元素 island 无开箱支持，裸标签 `<nav-dialog client:load />` 会抛 `NoMatchingImport` 构建失败（`componentExport` 为空）。正确做法是在使用它的 `.astro` 组件里用 `<script>` 导入模块：

```astro
<nav-search />
<script>
  import '../components/web/nav-search';
</script>
```

`web/` 下也有**非自定义元素**的普通增强模块（如 `header-dropdown.ts`，不注册新标签、只挂事件监听），处理方式同上——副作用导入 + 在使用处 `<script>` 引入，不挂 `client:*`，不能省略导入。

### 搜索算法

`src/components/web/search-utils.ts`：多分隔符分词 → token AND → 多字段加权（标题 100 / 分类 45 / 子分类 40 / 拼音 30 / 首字母 22 / URL 18）→ bigram-Dice 模糊回退。1–2 字短词跳过 URL 与模糊档。

### 二维码 / 镜像弹窗

`nav-dialog` 用**文档级事件委托**拦截所有 `a[data-mirrors]` / `a[data-qr]` 点击（镜像优先），弹原生 `<dialog>`。**凡是可交互的链接（LinkCard 卡片 + 搜索结果项）都必须带这两个 data 属性**，否则点击不会走弹窗。

## 关键约定与坑

- **图标路径**：`/icons/{一级分类id}/{链接id}.webp`，YAML 里的链接 `id` 必须与图标文件名一致（缺失时 LinkCard 降级为首字）。图标共 96 个。
- **Zod 导入**：用 `import { z } from 'astro/zod'`。**不要**从 `'astro:content'` 导入 `z`（Astro 7 已废弃）。
- **URL 校验**：`content.config.ts` 里 url 用自定义 `refine` 放行非 http scheme（如 `alipays://`）。YAML 中含 `#`、`&`、`?` 的 URL **必须加引号**。
- **`order` 字段必需**：`glob()` 不保证 YAML 顺序，一级分类靠显式 `order` 排序；YAML 里的 `id` 需与文件名一致。
- **Tailwind v4**：用 `@tailwindcss/vite` 插件（**不要**加已废弃的 `@astrojs/tailwind`）；暗色用 `@custom-variant dark (&:where(.dark, .dark *))` + `@theme` 语义令牌（`--color-surface/card/ink/muted/line/brand`），`.dark` 类由 Layout 防闪烁内联脚本控制。
- **分类容器 + tab 联动**：每个一级分类是一个带 `data-cat-block` 的卡片容器（CategoryBlock），标题后跟「全部 + 子分类」tab（`nav-cat-tabs` 按 `data-filter`/卡片 `data-sub` 显隐，默认全部）。侧边栏子分类链接带 `data-sub-id`/`data-cat`，点击由 `nav-cat-tabs` 委托切换到对应 tab 并滚动到容器（无 JS 时回退为滚动到 `#catId`）。`nav-sidebar` 用 `data-spy`（CategoryBlock 的 section）做滚动高亮。移动端抽屉由 `[data-mobile-nav-open]` 触发。
- **卡片折叠（同一 `nav-cat-tabs` 负责）**：「全部」视图下每个容器最多展示 **3 排（桌面 ≥1024px）/ 5 排（移动端）** 卡片，网格（`.cat-grid`）实际列数由 `getComputedStyle().gridTemplateColumns` 读取、随断点自适应，溢出卡片用内联 `style.display` 隐藏；超出时底部 `.cat-more` 按钮出现（`hidden` 属性切换，配 `.cat-more[hidden]{display:none}` 兜底——`.cat-more` 是 `display:flex` 会覆盖 UA 样式），点击展开/收起。**过滤视图（点 tab）展示全部命中卡片、不受折叠限制**，「查看更多」同时隐藏。
- **搜索索引体积**：`#site-index` JSON 约 12KB，走内联 script 而非属性，避免转义问题——不要改成 attr。
- **内容区布局（2025-09 现状）**：`index.astro` 的 `<main>` 是 `px-4 py-6 sm:px-6`，**没有 `max-w-7xl`/`mx-auto`**——内容从侧边栏右侧铺满视口，与侧栏保持 24px 间距。侧栏占位由 `.site-content` 的 `lg:pl-56` + `global.css` 里 `nav-sidebar:has(#sidebar…) + .site-content` 的 padding-left 覆盖承担（折叠 = 4rem / 展开 = 14rem）。**改侧栏宽要三处同步**：`Sidebar.astro`(w-56)、`index.astro`(lg:pl-56)、`global.css` 的 14rem/4rem。
- **分类网格列数**：`CategoryBlock` 网格为 `grid-cols-2 sm:3 md:4 lg:5 xl:6`；卡片折叠上限 = 真实列数 × 3 排(桌面)/5 排(移动)（`nav-cat-tabs` 读 `getComputedStyle().gridTemplateColumns`）。分类卡片间距在 `SiteGrid` `space-y-6`；首页 Hero 到网格的间距在 `index.astro` 的 `mt-10`。
- **搜索 Hero（SearchPanel.astro）**：`public/cmc.webp` 是 section 的 CSS `background-image`（inline style）+ 轻量暗色遮罩；Hero **绝不能加 `overflow:hidden`**（搜索下拉要溢出到下一层），圆角由 background 随 `rounded-2xl` 自动裁剪。换图 = 换 `public/cmc.webp`。
- **nav-search 下拉定位**：输入框与其 `[data-role=dropdown]` 同处一个 `relative` 容器；下拉 absolute 落在输入框正下方并**盖住第三层**（统计/引擎 chips，在容器外、relativeless），超高用 `max-h-96 overflow-y-auto`（配 `.search-dropdown` 细滚动条）。别把下拉挪回整块外层 `top-full`——会掉到第三层下面。搜索输入框聚焦的蓝色 brand 描边/外圈已移除，勿加回。
- **顶部栏全貌**：左「汉堡(<lg) + 桌面折叠钮(lg) + wiki」；中「移动端居中品牌 logo+成医通（lg:hidden，绝对居中）」；右「**翻译/网盘/邮箱** 下拉 + 明暗 toggle + GitHub」。wiki→`wiki.cyitong.top`；GitHub→`linlinli000/cyitong-nav`。
- **顶部快捷下拉数据**：入口与 URL 在 `TopBar.astro` 顶部 `TOOLS` 数组（翻译 URL 是用户精确指定值；网盘/邮箱为官方入口，随官网调整）。服务项图标本站无素材，用「首字色块」占位（可换品牌 logo）。交互 = `web/header-dropdown.ts`（hover 开 / 移出延迟 150ms 关 / 外点 Esc 关 / 同组互斥 / 点击不再收起 hover 开的菜单）。三按钮 `lg` 以下隐藏（会与移动居中品牌相撞）。
- **两类分段控件风格不同（有意）**：分类容器子分类 tab 是**圆角长方形**分段控件（容器 `rounded-xl border bg-surface p-1`，`.cat-tab` `rounded-lg` 透明底、`.active` 亮=白底品牌字 / 暗=品牌底深字，样式在 global.css）；搜索栏 scope tab 才是**全圆胶囊**。区分清楚，别互相套用。
- **静态资源**：`public/icons/**` 96 张链接图标 + `public/cmc.webp` 搜索 Hero 背景图 + `public/logo.svg`。

## 目录结构速览

```
src/
├── content.config.ts      # Content Layer：glob + Zod 两级模型
├── data/
│   ├── sites/*.yaml       # 唯一数据源（7 分类）
│   ├── search-engines.ts  # 搜索范围 tab + 13 个外部引擎（{q} 模板）
│   └── category-icons.ts  # 7 个分类图标 → heroicons SVG 路径
├── layouts/Layout.astro   # html 壳 + 防闪烁主题 + #site-index 输出
├── pages/index.astro      # 首页（含搜索索引拍平逻辑）
├── components/            # 服务端渲染 .astro 组件
│   └── web/               # 客户端增强 .ts（自定义元素 + search-utils）
└── styles/global.css      # Tailwind v4 令牌 + .dark 覆盖
```

完整目录说明见 [README.md](README.md)。
