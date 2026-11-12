# 成医通（cyitong-nav）

成都医学院师生导航页，汇集校内系统、医学文献、AI 工具与实用工具；支持站内/引擎搜索、扫码、镜像站与首页常用磁贴。

线上地址：<https://nav.cyitong.top>（另有 /about 使用说明、/contribute 投稿页）。

## 添加一个链接

数据是三层结构：**一级分类 → 二级分类 → 链接**，存在 `src/content/sites/*.yaml`。七个一级分类文件同名：`campus`(成医生活) `study`(线上学习) `exam`(考试比赛) `academic`(学术文献) `scitools`(科研服务) `aitool`(AI 工具) `tools`(实用工具)。

### 1. 放图标

保存为 webp 到 `public/icons/{一级分类}/{链接id}.webp`（建议官网 favicon 压缩），如 `public/icons/campus/alipay.webp`。

### 2. 写数据条目

在对应 yaml 的 `subs[].links[]` 追加一条：

```yaml
- id: alipay              # 必填，小写字母/数字，与图标文件名一致
  title: 计划财务处         # 必填，卡片显示名
  desc: 校园缴费支付宝服务号  # 可选，一行简介（≤40 字），卡片/悬浮提示/搜索共用
  pinyin: jihuacaiwuchu   # 必填，全拼，供搜索
  pinyinFirst: jhcwc      # 必填，首字母，供搜索
  url: "alipays://…"      # 必填，带协议头；含 # & ? 加引号
  badge: 扫码              # 可选，徽章文案；不写就没有
  qr: true                # 可选，点击弹二维码（仅单入口时有效）
```

**多入口**：`url` 也可写成列表（至少两条、每条带 `label`，第一条是默认入口），点击弹窗选入口，此时 `qr` 不生效：

```yaml
        url:
          - { label: 主站, url: https://sci-hub.ru/ }
          - { label: 主站, url: https://sci-hub.st/ }
          - { label: 镜像导航, url: https://sci-hub.shop/ }
```

### 3. 校验

`npm run build` 会拦下：图标缺失、同一分类 id 重复、漏 pinyin、url 无协议头、入口列表不规范、qr 与多入口冲突、schema 外字段、新增一级分类缺 `order`。

构建通过后在 GitHub 提 PR；<https://nav.cyitong.top/contribute/> 是面向投稿者的简版说明。

## 本地运行

```bash
npm install
npm run dev       # 开发预览 → http://localhost:4321
npm run build     # 类型检查 + 构建（改数据/代码后必跑）
```

## 目录结构

```
public/
├── icons/{一级分类}/   # 链接图标 {链接id}.webp
├── icons/topbar/       # 顶栏快捷下拉的站点图标
├── fonts/              # 自托管字体
└── logo.svg favicon.ico og.png robots.txt _headers ...

src/
├── content.config.ts    # 数据 schema + 构建期校验
├── content/sites/*.yaml # 唯一内容数据源（7 个分类，贡献者编辑）
├── config/              # 开发者维护的静态配置（搜索/顶栏/页脚/分类图标）
├── lib/                 # 服务端专用（icon-sprite / site-data）
├── layouts/             # Layout(文档壳) / SiteLayout(侧栏+顶栏+页脚)
├── pages/               # index / about / contribute / 404
├── components/          # 纯 .astro 模板组件
├── styles/              # 分层 CSS（入口 global.css 按层 @import）
│   ├── base.css         #   基础层（设计令牌 + 字体 + 元素基础）
│   ├── components.css   #   组件样式（卡片/顶栏/搜索/磁贴/弹窗）
│   ├── theme.css        #   视觉主题（页面骨架/侧栏/Hero 布局）
│   └── states.css       #   状态覆盖（激活/展开/显隐态）
└── web/                 # 客户端运行时（原生 TS）
    ├── elements/        # 自注册元素 <nav-*>，副作用导入
    ├── quick-bar/       # 常用磁贴行（存储/磁贴结构/行控制器）
    ├── shared/          # SSR/客户端共享的纯模块（无 DOM）
    │   ├── card-attrs.ts    # 卡片 data 契约
    │   ├── search-utils.ts  # 站内搜索 + SiteRecord 类型
    │   ├── icons.ts         # 运行期图标名 + iconEl
    │   ├── icon-path.ts     # 图标路径约定
    │   └── html-escape / breakpoints / site-icon
    └── *.ts             # DOM 增强（link-tip / header-dropdown / scroll-lock / storage…）
```

## 技术栈与部署

Astro 7 纯静态站（Content Layer + Zod v4）+ Tailwind CSS v4 + 原生 TypeScript Web Components。部署只需把 `npm run build` 产出的 `dist/` 托管到任意静态平台。
