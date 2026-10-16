import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import PaperPanel from "@/components/layout/PaperPanel";
import ArticleRenderer from "@/components/reader/ArticleRenderer";
import { articles } from "@/content/registry";
import type { ArticleLayout, ContentBlock } from "@/content/types";
export const dynamicParams = false;
export function generateStaticParams() {
  return articles.map((a) => ({ id: a.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = articles.find((a) => a.id === id);
  return { title: a?.title || "文章未找到" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = articles.find((a) => a.id === id);
  if (!a) notFound();
  const dir = path.join(process.cwd(), "src/content/articles", id);
  const blocks = JSON.parse(
    fs.readFileSync(path.join(dir, "blocks.json"), "utf8"),
  ) as ContentBlock[];
  const layout = JSON.parse(
    fs.readFileSync(path.join(dir, "layout.json"), "utf8"),
  ) as ArticleLayout;
  return (
    <PaperPanel>
      <ArticleRenderer article={a} blocks={blocks} layout={layout} />
    </PaperPanel>
  );
}
