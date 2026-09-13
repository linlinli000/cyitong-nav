# 成医通（cyitong-nav）

成都医学院师生导航页，汇集校内系统、医学文献、AI 工具与实用工具；支持站内/引擎搜索、扫码、镜像站。

线上地址：<https://nav.cyitong.top>

## 添加一个链接

数据是三层结构：**一级分类 → 二级分类 → 链接**，存在 `src/data/sites/*.yaml`。加一条链接按下面步骤操作。

### 1. 确定分类

七个一级分类，文件同名（`src/data/sites/{id}.yaml`）：

| id | 名称 | | id | 名称 |
|---|---|---|---|---|
| `campus` | 成医生活 | | `exam` | 考试比赛 |
| `study` | 线上学习 | | `academic` | 学术文献 |
| `scitools` | 科研服务 | | `aitool` | AI 工具 |
| `tools` | 实用工具 | | | |

链接加进最贴切的二级分类 `subs[].links[]` 即可（必要时也可新增一个二级分类）。

### 2. 放图标

图标保存为 webp，放到 `public/icons/{一级分类}/{链接id}.webp`，如：

```
public/icons/campus/alipay.webp
```

建议从官网取 favicon，压缩到小尺寸。

### 3. 写数据条目

在对应 yaml 的 `links[]` 追加一条：

```yaml
subs:
  - id: finance            # 二级分类 id（新增时自取小写英文）
    name: 财务
    links:
      - id: alipay              # 必填，小写字母/数字，与图标文件名一致
        title: 计划财务处         # 必填，卡片显示名
        desc: 校园缴费支付宝服务号  # 可选，一行简介（≤40 字），卡片、悬浮提示、搜索都用
        pinyin: jihuacaiwuchu   # 必填，全拼，供搜索
        pinyinFirst: jhcwc      # 必填，首字母，供搜索
        url: "alipays://…"      # 必填，带协议头的绝对地址；含 # & ? 要加引号
        badge: 扫码              # 可选，卡片徽章文案；不写就没有徽章
        qr: true                # 可选，点击弹二维码（只在单入口时有效）
        qrNote: 请使用支付宝扫码   # qr 的提示语
```

**多入口**：`url` 也能写成列表，点击时弹窗选入口。列表**至少两条**、**每条都要写 `label`**（写什么弹窗就显示什么），列表第一条是默认入口——卡片点开的就是它。多入口时点击只会弹这个列表，`qr` 不生效。

```yaml
        url:
          - { label: 主站, url: https://sci-hub.ru/ }
          - { label: 主站, url: https://sci-hub.st/ }
          - { label: 镜像导航, url: https://sci-hub.shop/ }
```



### 4. 校验

在仓库根目录跑 `npm run build`，构建期会拦下这些问题，并指出是哪个文件、哪条链接：

- 图标文件缺失，或 `id` 与图标文件名不一致；
- 同一分类下 `id` 重复（两条链接会共用同一个图标）；
- 漏写 `pinyin` / `pinyinFirst`（这条链接会搜不到）；
- `url` 没有协议头（须为 `https://`、`alipays://` 这类绝对地址）；
- 入口列表少于两条，或某条漏写 `label`；
- `qr` 跟多入口 `url` 同时写，或写了 `qrNote` 却没写 `qr: true`（这两种写法不会生效）；
- 写了 schema 里没有的字段（拼错，或沿用了旧写法）；
- 新增一级分类缺 `order` 排序号。

构建通过后，在 GitHub 提 Pull Request（页面侧栏有「添加链接」直达入口）。

## 本地运行

```bash
npm install
npm run dev       # 开发预览 → http://localhost:4321
npm run build     # 类型检查 + 构建（改数据/代码后必跑）
```

## 目录简览

```
public/
├── icons/            # 链接图标 {一级分类}/{链接id}.webp
└── logo.svg          # 站点图标

src/
├── content.config.ts     # 数据 schema 与构建期校验
├── data/
│   ├── sites/*.yaml      # 唯一数据源
│   ├── category-icons.ts # 分类 icon 语义键 → iconify 包名
│   └── search-engines.ts # 搜索引擎与品牌字形
├── lib/
│   └── icon-sprite.ts    # 运行期图标 → <symbol>（服务端）
├── layouts/Layout.astro  # 页面壳：防闪烁主题 / 图标 sprite / 搜索索引
├── pages/                # index / 404
├── components/           # 纯 .astro 模板组件
├── styles/global.css     # 颜色令牌与全局状态
└── web/                  # 客户端运行时（原生 TS）
    ├── elements/         # 自注册元素 <nav-*>，副作用导入
    ├── card-attrs.ts     # 扫码/入口 data 属性契约（SSR LinkCard 与 nav-search 共用）
    ├── breakpoints.ts    # 视口断点常量（与 Tailwind lg / global.css 同步）
    └── *.ts              # 纯工具 / 文档增强（storage、html-escape…）
```

## 技术栈与部署

Astro 7 纯静态站（Content Layer + Zod v4）+ Tailwind CSS v4 + 原生 TypeScript Web Components。部署只需把 `npm run build` 产出的 `dist/` 托管到任意静态平台。
