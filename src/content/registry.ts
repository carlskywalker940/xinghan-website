import data from "./registry.json";
import type { ArticleMeta } from "./types";
export const articles = data as ArticleMeta[];
export const categories = [
  "全部",
  "目系与眼科",
  "制药实践",
  "医理随笔",
  "生活记录",
  "草木札记",
];
export const byPublishedDate = (a: ArticleMeta, b: ArticleMeta) =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
export const latest = [...articles].sort(byPublishedDate);
export const shortDate = (date: string) =>
  date.slice(0, 10).replaceAll("-", ".");
