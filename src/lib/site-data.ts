/** 站点数据读取口（服务端专用） */

import { getCollection, type CollectionEntry } from 'astro:content';
import type { SiteRecord } from '../web/search-utils';
import { iconPath } from '../web/icon-path';

export interface SiteData {
  categories: CollectionEntry<'sites'>[];
  searchIndex: SiteRecord[];
  totalLinks: number;
}

export async function getSiteData(): Promise<SiteData> {
  const categories = (await getCollection('sites')).sort((a, b) => a.data.order - b.data.order);

  const searchIndex: SiteRecord[] = categories.flatMap((c) =>
    c.data.subs.flatMap((s) =>
      s.links.map((l) => ({
        ...l,
        desc: l.desc ?? '',
        catId: c.data.id,
        catName: c.data.name,
        subName: s.name,
        icon: iconPath(c.data.id, l.id),
      })),
    ),
  );

  return { categories, searchIndex, totalLinks: searchIndex.length };
}
