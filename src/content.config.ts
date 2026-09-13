import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { existsSync } from 'node:fs';

const CATEGORY_IDS = ['campus', 'study', 'exam', 'academic', 'scitools', 'aitool', 'tools'] as const;

const absoluteUrl = z.string().refine((s) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s), {
  message: 'url 必须是带 scheme 的绝对地址（如 https:// 或 alipays://）',
});

/** 入口条目：每条都必须带 label（没有默认值） */
const entrySchema = z.object({
  label: z.string().min(1),
  url: absoluteUrl,
});

export type Entry = z.infer<typeof entrySchema>;

const linkBaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+$/i, '链接 id 需与图标文件名一致（小写字母/数字）'),
  title: z.string().min(1),
  desc: z.string().max(40).optional(),
  pinyin: z.string().min(1, 'pinyin 必填：漏写这条链接搜不到'),
  pinyinFirst: z.string().min(1, 'pinyinFirst 必填：漏写这条链接搜不到'),
  url: z.union([
    absoluteUrl,
    z.array(entrySchema).min(2, '多入口列表至少两条；只有一条时直接写成字符串'),
  ]),
  badge: z.string().min(1).optional(),
  qr: z.boolean().optional(),
  qrNote: z.string().optional(),
}).strict();

/** url 收窄成字符串 */
type Link = Omit<z.infer<typeof linkBaseSchema>, 'url'> & {
  url: string;
  entries?: Entry[];
};

/** 单条直接跳转，列表弹窗选入口 */
const linkSchema = linkBaseSchema.transform((link): Link => {
  if (!Array.isArray(link.url)) return { ...link, url: link.url };
  const entries = link.url;
  return { ...link, url: entries[0].url, entries };
});

const subSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/i),
  name: z.string().min(1),
  links: z.array(linkSchema).min(1, '二级分类下至少一个链接'),
});

const sites = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/data/sites' }),
  schema: z
    .object({
      order: z.number().int(),
      id: z.enum(CATEGORY_IDS),
      name: z.string().min(1),
      icon: z.string().min(1),
      subs: z.array(subSchema).min(1, '至少一个二级分类'),
    })
    .superRefine((data, ctx) => {
      const seen = new Set<string>();
      for (const link of data.subs.flatMap((s) => s.links)) {
        const where = `（链接 "${link.title}"）`;
        const issue = (message: string): void => {
          ctx.addIssue({ code: 'custom', message: `${message}${where}` });
        };
        if (!existsSync(`public/icons/${data.id}/${link.id}.webp`)) {
          issue(`图标缺失：public/icons/${data.id}/${link.id}.webp`);
        }
        if (seen.has(link.id)) {
          issue(`同一分类下 id 重复："${link.id}" 会跟前面的链接共用同一个图标`);
        }
        seen.add(link.id);
        if (link.qr && link.entries) {
          issue('qr 与多入口 url 只能二选一：点击只会弹入口列表，二维码点不到');
        }
        if (link.qrNote && !link.qr) {
          issue('qrNote 需要配合 qr: true，否则不会显示');
        }
      }
    }),
});

export const collections = { sites };
