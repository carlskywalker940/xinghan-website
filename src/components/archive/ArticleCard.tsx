import { publicAsset, routePath } from "@/lib/paths";
import Link from "next/link";
import { shortDate } from "@/content/registry";
import type { ArticleMeta } from "@/content/types";
export default function ArticleCard({ article: a }: { article: ArticleMeta }) {
  return (
    <article className="article-card">
      <Link
        href={`/articles/${a.id}`}
        onClick={() => {
          try {
            sessionStorage.setItem(
              "xinghan:archive:return",
              routePath(location.pathname) + location.search,
            );
            sessionStorage.setItem(
              "xinghan:archive:scroll",
              String(window.scrollY),
            );
          } catch {}
        }}
      >
        <div className="card-image">
          <img
            src={publicAsset(a.cover)}
            alt={`${a.title} · 原文封面`}
            loading="lazy"
          />
          <span className="card-category">{a.category}</span>
        </div>
        <div className="card-copy">
          <h2>{a.title}</h2>
          <div className="card-meta">
            <time dateTime={a.publishedAt}>{shortDate(a.publishedAt)}</time>
            <span className="card-arrow" aria-hidden="true">
              ⟶
            </span>
          </div>
          <p className="card-excerpt">{a.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}
