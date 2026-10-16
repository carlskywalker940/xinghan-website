export interface ArticleMeta {
  id: string;
  slug: string;
  title: string;
  author: string;
  publishedAt: string;
  sourceDate: string;
  sourceUrl: string;
  category: string;
  series: string | null;
  seriesOrder: number | null;
  cover: string;
  excerpt: string;
  sourcePath: string;
}
export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
}
export interface ContentBlock {
  id: string;
  sourceOrder: number;
  kind: string;
  runs?: InlineRun[];
  align?: string;
  asset?: string;
  sourceSrc?: string;
  alt?: string;
  width?: number;
  height?: number;
}
export interface ArticleLayout {
  articleId: string;
  images: Record<string, { layout: string; maxWidth: number }>;
  toc: { id: string; title: string }[];
  captions?: Record<string, string[]>;
  preserveSourceOrder: boolean;
}
