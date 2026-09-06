# 成医通（cyitong-nav）

成都医学院师生导航页，汇集校内系统、医学文献、AI 工具与实用工具；支持站内/引擎搜索、扫码、镜像站。

线上地址：<https://nav.cyitong.top>

## 添加一个链接

数据是三层结构：**一级分类 → 二级分类 → 链接**，存在 `src/data/sites/*.yaml`。加一条链接只需三步。

### 1. 确定分类

七个一级分类，文件同名（`src/data/sites/{id}.yaml`）：

| id | 名称 | | id | 名称 |
|---|---|---|---|---|
| `campus` | 成医生活 | | `enlit` | 英文文献 |
| `study` | 线上学习 | | `aitool` | AI 工具 |
| `exam` | 考试比赛 | | `tools` | 实用工具 |
| `cnlit` | 中文文献 | | | |

链接加进最贴切的二级分类 `subs[].links[]` 即可（必要时也可新增一个二级分类）。

### 2. 放图标

图标保存为 webp，放到 `public/icons/{一级分类}/{链接id}.webp`，如：

```
public/icons/campus/alipay.webp
```

建议从官网取 favicon，压缩到小尺寸。

### 3. 写数据条目

在对应 yaml 的 `links[]` 追加一条，**必填**字段要齐，**可选**按需：

```yaml
subs:
  - id: finance            # 二级分类 id（新增时自取小写英文）
    name: 财务
    links:
      - id: alipay             # 必填：小写字母/数字，与图标文件名一致
        title: 计划财务处       # 必填：卡片显示名
        pinyin: jihuacaiwuchu  # 必填：全拼
        pinyinFirst: jhcwc     # 必填：首字母
        url: "alipays://…"     # 必填：带协议头的绝对地址；含 # & ? 需加引号
        desc: 校园缴费支付宝服务号  # 可选：一行简介（≤40 字）
        qr: true               # 可选：点击弹二维码
        qrNote: 请使用支付宝扫码   # qr 提示语
        mirrors:               # 可选：镜像站列表（点击优先弹镜像）
          - label: 镜像一
            url: https://…
```

> `pinyin` / `pinyinFirst` 供站内搜索命中（全拼与首字母都能搜到）；`desc` 会出现在卡片、悬浮提示和搜索结果里。

### 4. 校验

在仓库根目录跑：

```bash
npm run build
```

构建期自动拦截以下问题，出错会报文件与原因：

- 图标文件缺失，或 `id` 与图标文件名不一致；
- `url` 没有协议头（须为 `https://`、`alipays://` 这类绝对地址）；
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
public/icons/        # 链接图标：{一级分类}/{链接id}.webp
src/
├── content.config.ts     # 数据 schema 与构建期校验（Zod）
├── data/sites/*.yaml     # 唯一数据源
├── styles/global.css     # 颜色令牌、暗色覆盖与全局状态样式
├── layouts/Layout.astro  # 页面壳：防闪烁主题、图标 sprite、搜索索引
├── pages/                # index.astro / 404.astro
└── components/           # 页面组件与 web/ 客户端运行时（原生 TS）
```

## 技术栈与部署

Astro 7 纯静态站（Content Layer + Zod v4）+ Tailwind CSS v4 + 原生 TypeScript Web Components。部署只需把 `npm run build` 产出的 `dist/` 托管到任意静态平台。
