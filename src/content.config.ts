import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const CATEGORY_IDS = ['campus', 'study', 'exam', 'cnlit', 'enlit', 'aitool', 'webtools'] as const;

const mirrorSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
});

/** 链接：url 需为绝对地址，放行 alipays:// 等非 http scheme */
const linkSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+$/i, '链接 id 需与图标文件名一致（小写字母/数字）'),
  title: z.string().min(1),
  pinyin: z.string().default(''),
  pinyinFirst: z.string().default(''),
  url: z.string().refine((s) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s), {
    message: 'url 必须是带 scheme 的绝对地址（如 https:// 或 alipays://）',
  }),
  qr: z.boolean().optional(),
  qrNote: z.string().optional(),
  mirrors: z.array(mirrorSchema).optional(),
});

const subSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/i),
  name: z.string().min(1),
  links: z.array(linkSchema).min(1, '二级分类下至少一个链接'),
});

const sites = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/data/sites' }),
  schema: z.object({
    /** 显式排序：glob 不保证顺序 */
    order: z.number().int(),
    /** 与文件名一致的分类 id */
    id: z.enum(CATEGORY_IDS),
    name: z.string().min(1),
    icon: z.string().min(1),
    subs: z.array(subSchema).min(1, '至少一个二级分类'),
  }),
});

export const collections = { sites };
