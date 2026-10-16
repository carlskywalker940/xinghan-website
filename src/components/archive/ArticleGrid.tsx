"use client";
import { publicAsset } from "@/lib/paths";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { articles, categories, byPublishedDate } from "@/content/registry";
import ArticleCard from "./ArticleCard";
export default function ArticleGrid() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("category") || "全部";
  const category = categories.includes(raw) ? raw : "全部";
  const query = params.get("q") || "";
  useEffect(() => {
    try {
      const y = sessionStorage.getItem("xinghan:archive:scroll");
      if (y) {
        sessionStorage.removeItem("xinghan:archive:scroll");
        requestAnimationFrame(() => window.scrollTo(0, +y));
      }
      if (sessionStorage.getItem("xinghan:focusArchive")) {
        sessionStorage.removeItem("xinghan:focusArchive");
        document
          .getElementById("archive-heading")
          ?.focus({ preventScroll: true });
      }
    } catch {}
  }, []);
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString());
    if (value && value !== "全部" && value !== "latest") p.set(key, value);
    else p.delete(key);
    router.push(`/archive${p.size ? "?" + p.toString() : ""}`, {
      scroll: false,
    });
  };
  const filtered = useMemo(
    () =>
      articles
        .filter(
          (a) =>
            (category === "全部" || a.category === category) &&
            a.title.includes(query),
        )
        .sort(byPublishedDate),
    [category, query],
  );
  return (
    <div className="archive-layout">
      <aside className="category-sidebar">
        <p className="category-caption">文集分类</p>
        <nav aria-label="文章分类">
          {categories.map((c) => (
            <a
              key={c}
              href={publicAsset(
                c === "全部"
                  ? "/archive/"
                  : `/archive/?category=${encodeURIComponent(c)}`,
              )}
              onClick={(e) => {
                e.preventDefault();
                update("category", c);
              }}
              className={c === category ? "active" : ""}
              aria-current={c === category ? "true" : undefined}
            >
              <span>{c}</span>
              <span>
                {c === "全部"
                  ? articles.length
                  : articles.filter((a) => a.category === c).length}
              </span>
            </a>
          ))}
        </nav>
        <p className="sidebar-note">
          纸上得来，
          <br />
          也在日常里生长。
        </p>
      </aside>
      <section className="archive-content" aria-labelledby="archive-heading">
        <div className="archive-intro">
          <div>
            <h1 id="archive-heading" tabIndex={-1}>
              文章
            </h1>
            <p>
              记录、思考与实践的片段，
              <br />
              也可能是通向更大问题的线索。
            </p>
          </div>
        </div>
        <div className="archive-tools">
          <form
            key={query}
            onSubmit={(e) => {
              e.preventDefault();
              update("q", String(new FormData(e.currentTarget).get("q") || ""));
            }}
            role="search"
          >
            <label className="sr-only" htmlFor="search">
              搜索文章标题
            </label>
            <input
              id="search"
              placeholder="寻一篇文章"
              name="q"
              defaultValue={query}
            />
            <button type="submit" aria-label="搜索">
              ⌕
            </button>
          </form>
          <span className="date-order">按发布日期 · 从新到旧</span>
          <span className="result-count" aria-live="polite">
            {filtered.length} 篇
          </span>
        </div>
        <div className="article-grid">
          {filtered.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <p>没有找到这篇文章。</p>
            <button
              onClick={() => {
                router.push("/archive", { scroll: false });
              }}
            >
              清除筛选
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
