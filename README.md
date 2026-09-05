# 成医通 (cyitong-nav)

成都医学院师生专属导航页，WebStack 侧边栏风格。汇集校内系统、医学文献、AI 工具与常用在线工具的快捷入口，另有搜索、二维码/镜像弹窗、顶部快捷下拉等增强。

## 技术栈

| 层面 | 方案 |
|---|---|
| 框架 | **Astro 7**（纯静态输出，Content Layer API） |
| 数据层 | Content Layer + **glob() loader** + **Zod v4** 校验（YAML） |
| 样式 | **Tailwind CSS v4**（`@tailwindcss/vite`，`@theme` 语义令牌，类名暗色） |
| 图标 | `astro-icon` 构建期内联（heroicons v2 / lucide，模板内）；运行期走 lucide symbol sprite（Web 组件 `<use>`） |
| 交互 | 原生 **TypeScript Web Components** + 普通增强模块（自注册/副作用导入，无框架） |
| 二维码 | `qrcode` npm 包（浏览器端生成） |

## 快速开始

```bash
npm install
npm run dev      # 开发服务器 → http://localhost:4321
npm run build    # 类型检查(astro check) + 生产构建 → dist/
npm run preview  # 本地预览构建产物
```

## 目录结构

```
cyitong-nav/
├── astro.config.ts          # site、vite 插件（tailwindcss）
├── package.json             # 脚本：dev / build / preview / check
├── tsconfig.json            # extends astro/tsconfigs/strict
├── public/                  # 静态资源（构建时原样拷贝到 dist/）
│   ├── logo.svg             # 侧边栏/移动端 header 品牌 logo + favicon
│   ├── cmc.webp             # 首页搜索 Hero 的背景图（宽幅横幅）
│   ├── favicon.ico
│   └── icons/               # 链接图标，路径约定：/icons/{分类id}/{链接id}.webp
│       ├── aitool/ campus/  cnlit/ enlit/ exam/
│       ├── study/  webtools/   topbar/（顶栏下拉 favicon 3 张，非链接图标）
│       └── （共 93 个 .webp，与 YAML 里的链接 id 一一对应）
└── src/
    ├── content.config.ts    # ★ Content Layer 定义：glob 加载 + Zod 两级模型校验 + 导出 Mirror 类型
    ├── data/
    │   ├── sites/           # ★ 7 个一级分类，每个分类一个 YAML 文件（唯一数据源）
    │   ├── category-icons.ts # yaml 分类 icon 语义键 → heroicons v2 solid 图标名（categoryIcon()）
    │   └── search-engines.ts # 搜索范围 tab（站内/搜索/社区/文献检索）+ 各 scope 外部引擎（{q} 模板）
    ├── lib/
    │   └── icon-sprite.ts   # ★ 运行期图标 symbol sprite（服务端专用，勿被客户端导入）
    ├── styles/global.css    # Tailwind v4 + @theme 令牌 + .dark 覆盖 + 折叠/分段控件等样式
    ├── layouts/
    │   └── Layout.astro     # html 壳：SEO/OG、防闪烁主题、注入 icon sprite + #site-index
    ├── pages/
    │   ├── index.astro      # 唯一首页：getCollection → 组装页面 + 序列化搜索索引
    │   └── 404.astro
    └── components/          # 服务端渲染组件（.astro，纯静态标记）
        ├── Sidebar.astro    # 左侧分类导航（默认展开 + localStorage 记忆 + 折叠图标条）
        ├── TopBar.astro     # 顶部栏（详情见「顶部栏」）：wiki、移动端居中品牌、快捷工具下拉、明暗、GitHub
        ├── SearchPanel.astro# 搜索 Hero：cmc.webp 背景图 + <nav-search> 搜索岛
        ├── SiteGrid.astro   # 循环一级分类 → CategoryBlock（间距 space-y-6）
        ├── CategoryBlock.astro # <section id={catId} data-spy> 单容器 + 子分类 tab + 链接网格
        ├── LinkCard.astro   # 单个链接卡片（图标 + 标题 + 镜像/扫码角标 + data-sub/data-*）
        ├── Footer.astro     # 收录统计 + GitHub/反馈/投稿链接
        ├── BackToTop.astro  # <nav-backtotop> 宿主 + <script> 导入
        └── web/             # ★ 交互层：原生 TS（自注册自定义元素 + 普通增强模块，无 shadow）
            ├── nav-search.ts       # 搜索岛：站内/引擎/历史/键盘导航/下拉过滤
            ├── search-utils.ts     # 搜索算法（供 nav-search 使用）
            ├── nav-dialog.ts       # 二维码 + 镜像站弹窗（文档级事件委托）
            ├── nav-cat-tabs.ts     # 子分类 tab 过滤 + 卡片折叠 + 侧边栏子链接联动
            ├── nav-sidebar.ts      # 折叠持久化 + 滚动高亮 + 移动端抽屉
            ├── nav-theme-toggle.ts # 暗色切换（localStorage 持久化）
            ├── nav-backtotop.ts    # 回到顶部
            ├── icons.ts            # 运行期图标：RUNTIME_ICON_NAMES + iconEl()（<use href> 引用 sprite）
            ├── html-escape.ts      # HTML 文本/属性转义（客户端模板拼串用）
            └── header-dropdown.ts  # 顶部栏快速下拉（hover 展开；普通模块，非自定义元素）
```

`dist/`（构建产物，不入库）在仓库根目录，非 src 内。

## 数据模型（二级分类）

`src/data/sites/*.yaml` 是**唯一数据源**，结构为「一级分类 → 二级分类 → 链接」三级。

```yaml
# src/data/sites/campus.yaml
order: 1              # 一级分类排序（glob 不保证顺序，必须显式给出）
id: campus            # 分类 id，需与文件名一致
name: 成医生活
icon: building        # 语义键 → category-icons.ts → heroicons v2 solid 图标
subs:
  - id: finance       # 二级分类 id
    name: 财务
    links:
      - id: alipay    # 链接 id，需与图标文件名一致（icons/campus/alipay.webp）
        title: 计划财务处
        pinyin: jihuacaiwuchu    # 全拼，用于搜索
        pinyinFirst: jhcwc       # 拼音首字母，用于搜索
        url: "alipays://…"        # 支持非 http scheme；含特殊字符须加引号
        qr: true                 # 可选：点击弹二维码
        qrNote: 请使用支付宝扫码…  # 可选：二维码说明文字
        mirrors:                 # 可选：镜像站列表（优先级高于 qr）
          - label: 镜像一
            url: https://…
```

**图标路径约定：** `/icons/{一级分类id}/{链接id}.webp`，图片缺失时 LinkCard 会降级为标题首字。

### 7 个一级分类速览（共 35 个子分类 / 93 个链接）

| id | 分类 | 子分类数 | 内容 |
|---|---|---|---|
| `campus` | 成医生活 | 6 | 门户、教学管理、财务、校园生活、通讯、学籍/升学 |
| `study` | 线上学习 | 5 | 课程学习、网课工具/题库、图书资源、医学讯息、技能拓展 |
| `exam` | 考试比赛 | 4 | 国内通用考试、医学考试、外语考试、大学生比赛 |
| `cnlit` | 中文文献 | 4 | 期刊评价、中文数据库、医学专业文献、综合学术搜索 |
| `enlit` | 英文文献 | 6 | 免费全文、学术搜索、综合数据库、医学数据库、开放获取、顶刊 |
| `aitool` | AI 工具 | 3 | 国产大模型、国外大模型、AI 应用 |
| `webtools` | 在线工具 | 7 | 文件处理、设计/图片、媒体下载、翻译/英语、排版/写作、软件下载、其他工具 |

## 交互与数据流

### 自定义元素如何加载（重要约定）

所有交互组件是**自注册自定义元素**，**不挂 `client:*` 指令**——Astro 对自定义元素 island 无开箱支持（裸标签 `client:load` 会抛 `NoMatchingImport`）。做法是在用到它的 `.astro` 组件里用 `<script>` 导入模块，模块 `customElements.define()` 注册后自动升级服务端渲染的宿主标签：

```astro
<!-- 例：SearchPanel.astro 内部 -->
<nav-search />
<script>
  import '../components/web/nav-search';
</script>
```

**`web/` 下也有非自定义元素的普通增强模块**（如 `header-dropdown.ts`），它不定义元素、只挂事件监听，同样是「副作用导入 + 在使用处 `<script>` 引入」，同样不能省略或挂 `client:*`。

### 两套图标系统（勿混淆）

- **SSR 模板图标**（`.astro` 里静态标记，顶栏/分类/箭头等）：`astro-icon` `<Icon name="heroicons:…|lucide:…">`，构建期内联成 sprite，零运行时 JS。来源本地 `@iconify-json/heroicons|lucide`，换图直接用 iconify 集内名字，勿手抄 path。
- **运行期图标**（自定义元素 `innerHTML` 里动态拼的，如搜索/历史/明暗/关闭/回顶 + 搜索栏引擎 chip）：用 **symbol sprite**——`src/lib/icon-sprite.ts` 构建期生成 `<symbol>` 注入页面，组件用 `web/icons.ts` 的 `iconEl()` 输出 `<svg><use href="#icon-x">`。字形源：UI 图标走 lucide（加语义名到 `RUNTIME_ICON_NAMES`）；**搜索栏引擎 chip 的品牌字形走 `search-engines.ts` 各引擎 `icon` 字段**（simple-icons 品牌标，lucide 无该名时回退；MeSH/万方/百度学术无品牌标用 lucide 兜底），Layout 从 ENGINES 自动汇总生成。

> 为什么不用一套：astro-icon 是 SSR 组件，无法在浏览器端 innerHTML 里用；sprite 方案让 Web 组件与模板图标同源（都是 iconify JSON）、零 path 复制。

### 搜索数据链路

1. 构建期 `index.astro` 用 `getCollection('sites')` 拍平所有链接为 `SiteRecord[]`；
2. `JSON.stringify` 后经 `Layout.astro` 输出为内联 `<script type="application/json" id="site-index">`；
3. `nav-search` 在 `connectedCallback` 里读取该 JSON，供站内搜索、下拉结果使用；
4. 搜索算法（`search-utils.ts`）：多分隔符分词 → token AND → 多字段加权（标题 100 / 分类 45 / 子分类 40 / 拼音 30 / 首字母 22 / URL 18）→ bigram-Dice 模糊回退。

**搜索下拉交互**：下拉锚定在输入框正下方（与输入框同处一个 `relative`），打开时盖住下方的统计/引擎 chips；站内结果过多时 `max-h-96 + overflow-y-auto` 内滚。搜索输入框聚焦**不显示**蓝色描边/外圈（已移除）。

### 搜索 Hero

首页搜索区（`SearchPanel.astro`）把 `public/cmc.webp` 作为 section 的 **CSS 背景图**铺满（`background-size: cover`，随圆角裁剪），搜索岛叠于其上，另有一层轻量暗色遮罩保证对比度。想换图直接替换该文件。

### 二维码 / 镜像弹窗

带 `data-qr` / `data-mirrors` 的链接（网格卡片与搜索结果统一）由 `nav-dialog` 用**文档级事件委托**拦截点击，弹原生 `<dialog>` 展示二维码（qrcode 包生成）或镜像列表。镜像优先级高于二维码。

### 顶部栏

`TopBar.astro` 现状（左 → 右）：
- **左**：汉堡（移动端开抽屉）＋ 桌面端折叠/展开侧栏钮（lg）＋ wiki 链接（wiki.cyitong.top，带书图标）；
- **中**：移动端居中的品牌（logo + 「成医通」＋域名小字，`lg:hidden` 绝对居中）；
- **右**：**翻译 / 网盘 / 邮箱** 三个快速工具下拉（hover 展开，`lg` 起显示）→ 明暗切换 → GitHub 图标（源码仓库）。

**快速下拉的数据在 `TopBar.astro` 顶部 `TOOLS` 数组**：三个分组的名称、URL、图标直接内联；服务项图标本站无素材，暂用「首字色块」占位。交互由 `header-dropdown.ts` 提供（hover 开 / 移出延迟关 / 外点或 Esc 关，互斥单选）。翻译 URL 为精确指定值，网盘/邮箱按官方入口填写——改地址或增删分组只需动这一处。

### 响应式网格与卡片折叠

- **列数**：`.cat-grid` 按 `grid-cols-2 sm:3 md:4 lg:5 xl:6` 断点自适应（≥1280px 桌面为 6 列，侧栏折叠/展开列数不变、仅卡片变宽）；
- **内容区**：首页 `<main>` 为 `px-4 py-6 sm:px-6`，**无 max-width 居中**，从侧边栏右侧铺满视口（与侧栏保持 24px 间距）；
- **折叠**：「全部」视图下每容器桌面最多 3 排、移动 5 排（真实列数 × 排数），超出显示「查看更多」；点子分类 tab 的过滤视图展示全部命中卡片、不受折叠限制（见 `nav-cat-tabs.ts`）；
- **子分类 tab 风格**：圆角长方形分段控件（`rounded-xl` 外框一体，`.cat-tab` 小圆角、选中白/品牌高亮），与搜索栏上方的全圆胶囊有意区分。

## 添加一个链接

1. 把图标放到 `public/icons/{分类id}/{新链接id}.webp`；
2. 在对应 `src/data/sites/{分类id}.yaml` 的某个 `subs[].links[]` 下追加条目（id 与图标一致，补全 pinyin/pinyinFirst）；
3. `npm run build` —— Content Layer 的 Zod schema 会拦截任何格式错误（拼错分类 id、URL 缺 scheme、id 格式非法等）；
4. 需要扫码/镜像的链接加 `qr: true` / `mirrors: [...]` 字段。

## 构建与部署

```bash
npm run build    # = astro check && astro build，产物在 dist/
```

纯静态输出，`dist/` 可直接托管到任意静态平台（Nginx / Vercel / Cloudflare / GH Pages），目标域名 `nav.cyitong.top`。Nginx 伪静态：

```nginx
root …/dist;
try_files $uri $uri/ /404.html;
```
