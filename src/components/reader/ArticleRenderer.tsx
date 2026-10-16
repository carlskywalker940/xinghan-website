"use client";
import { publicAsset } from "@/lib/paths";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { articles, shortDate } from "@/content/registry";
import type {
  ArticleLayout,
  ArticleMeta,
  ContentBlock,
  InlineRun,
} from "@/content/types";
import ImageLightbox from "./ImageLightbox";
import FontSizeMenu, { useReaderFont } from "./FontSizeMenu";
function Run({ run: r }: { run: InlineRun }) {
  let content: React.ReactNode = r.text;
  if (r.bold) content = <strong>{content}</strong>;
  if (r.italic) content = <em>{content}</em>;
  if (r.underline) content = <u>{content}</u>;
  if (r.href)
    content = (
      <a href={r.href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  return <>{content}</>;
}
export default function ArticleRenderer({
  article: a,
  blocks,
  layout,
}: {
  article: ArticleMeta;
  blocks: ContentBlock[];
  layout: ArticleLayout;
}) {
  const router = useRouter();
  const [index, setIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [fontSize, setFontSize] = useReaderFont();
  const [message, setMessage] = useState("");
  const [tocActive, setTocActive] = useState("");
  const articleRef = useRef<HTMLElement>(null);
  const media = blocks.filter((b) => b.asset);
  const captionIds = new Set(Object.values(layout.captions || {}).flat());
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const series = a.series
    ? articles
        .filter((x) => x.series === a.series)
        .sort((x, y) => (x.seriesOrder || 0) - (y.seriesOrder || 0))
    : [];
  const pos = series.findIndex((x) => x.id === a.id);
  const related = series.length
    ? series.filter((x) => x.id !== a.id)
    : articles.filter((x) => x.category === a.category && x.id !== a.id);
  const chronological = [...articles].sort(
    (x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt),
  );
  const datePos = chronological.findIndex((x) => x.id === a.id);
  const prev = series.length ? series[pos - 1] : chronological[datePos - 1];
  const next = series.length ? series[pos + 1] : chronological[datePos + 1];
  useEffect(() => {
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = articleRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const start = window.scrollY + rect.top;
        const range = Math.max(1, rect.height - window.innerHeight);
        setProgress(
          Math.min(
            100,
            Math.max(0, Math.round(((window.scrollY - start) / range) * 100)),
          ),
        );
        const active = layout.toc
          .filter(
            (t) =>
              (document.getElementById(t.id)?.getBoundingClientRect().top ??
                Infinity) <
              window.innerHeight * 0.4,
          )
          .at(-1);
        setTocActive(active?.id || "");
      });
    };
    update();
    const resizeObserver = new ResizeObserver(update);
    if (articleRef.current) resizeObserver.observe(articleRef.current);
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [layout.toc]);
  const back = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    try {
      const returnTo = sessionStorage.getItem("xinghan:archive:return");
      if (returnTo?.startsWith("/archive")) {
        e.preventDefault();
        router.push(returnTo);
      }
    } catch {}
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setMessage("文章链接已复制");
    } catch {
      setMessage("复制此页地址即可分享");
    }
    setTimeout(() => setMessage(""), 3000);
  };
  return (
    <main id="main" className="reader">
      <div className="reading-progress" aria-label={`阅读进度 ${progress}%`}>
        <div style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <div className="reader-breadcrumb">
        <Link href="/archive" onClick={back}>
          ← 返回文章
        </Link>
        <span>/</span>
        <Link href={`/archive?category=${encodeURIComponent(a.category)}`}>
          {a.category}
        </Link>
      </div>
      <div className="reader-grid">
        <div className="reader-tools" aria-label="阅读工具">
          <FontSizeMenu size={fontSize} onChange={setFontSize} />
          <button onClick={share} aria-label="复制文章链接">
            <span className="share-symbol">↗</span>
            <span>分享</span>
          </button>
          <a href="#main" aria-label="回到页首">
            ↑<span>顶部</span>
          </a>
        </div>
        <article className="article-main" data-article={a.id} ref={articleRef}>
          <header className="article-heading">
            <h1>{a.title}</h1>
            <div className="article-byline">
              <time dateTime={a.publishedAt}>{shortDate(a.publishedAt)}</time>
              <span>{a.author}</span>
              <a href={a.sourceUrl} target="_blank" rel="noreferrer">
                公众号原文 ↗
              </a>
            </div>
          </header>
          {layout.toc.length > 0 && (
            <details className="mobile-toc">
              <summary>文章目录</summary>
              {layout.toc.map((t) => (
                <a key={t.id} href={`#${t.id}`}>
                  {t.title}
                </a>
              ))}
            </details>
          )}
          <div className="article-body" style={{ fontSize }}>
            {blocks.map((b) => {
              if (captionIds.has(b.id)) return null;
              if (b.asset) {
                const config = layout.images[
                  b.asset.split("/").at(-1) || ""
                ] || { layout: "contained", maxWidth: 760 };
                return (
                  <figure
                    key={b.id}
                    id={b.id}
                    data-source-order={b.sourceOrder}
                    className={`media-block media-${config.layout}`}
                    style={{ maxWidth: config.maxWidth }}
                  >
                    <button
                      className="media-trigger"
                      onClick={() =>
                        setIndex(media.findIndex((m) => m.id === b.id))
                      }
                      aria-label={`放大${b.alt}`}
                    >
                      <img
                        src={publicAsset(b.asset)}
                        alt={b.alt}
                        width={b.width}
                        height={b.height}
                        loading="lazy"
                      />
                      <span className="image-expand" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                    {(layout.captions?.[b.id] || []).map((id) => {
                      const caption = byId.get(id);
                      return caption ? (
                        <figcaption
                          key={id}
                          id={id}
                          data-source-order={caption.sourceOrder}
                          data-source-text
                        >
                          {caption.runs?.map((r, i) => (
                            <Run key={i} run={r} />
                          ))}
                        </figcaption>
                      ) : null;
                    })}
                  </figure>
                );
              }
              const content = b.runs?.map((r, i) => <Run key={i} run={r} />);
              return layout.toc.some((t) => t.id === b.id) ? (
                <h2
                  key={b.id}
                  id={b.id}
                  data-source-order={b.sourceOrder}
                  data-source-text
                >
                  {content}
                </h2>
              ) : (
                <p
                  key={b.id}
                  id={b.id}
                  data-source-order={b.sourceOrder}
                  data-source-text
                  className={b.align === "center" ? "source-center" : undefined}
                >
                  {content}
                </p>
              );
            })}
          </div>
          <div className="article-end">
            <span className="seal" aria-hidden="true">
              记
            </span>
            <p>— 全文完 —</p>
            <a href={a.sourceUrl} target="_blank" rel="noreferrer">
              在公众号查看原文 ↗
            </a>
          </div>
          <nav
            className="article-pagination"
            aria-label={series.length ? "连载阅读顺序" : "按发布日期浏览"}
          >
            {prev ? (
              <Link href={`/articles/${prev.id}`}>
                <small>{series.length ? "系列前篇" : "较新一篇"}</small>
                <span>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/articles/${next.id}`}>
                <small>{series.length ? "系列后篇" : "较早一篇"}</small>
                <span>{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
        <aside className="reader-sidebar">
          <div className="reader-sidebar-sticky">
            {layout.toc.length > 0 && (
              <section className="side-box">
                <h2>目录</h2>
                <nav aria-label="章节目录">
                  {layout.toc.map((t) => (
                    <a
                      className={tocActive === t.id ? "toc-active" : ""}
                      key={t.id}
                      href={`#${t.id}`}
                    >
                      {t.title}
                    </a>
                  ))}
                </nav>
              </section>
            )}
            <section className="side-box article-note">
              <p>{a.category}</p>
              <h2>这篇记录</h2>
              <dl>
                <div>
                  <dt>发布日期</dt>
                  <dd>{shortDate(a.publishedAt)}</dd>
                </div>
              </dl>
              <p className="progress-label">已读 {progress}%</p>
              <div className="side-progress">
                <span style={{ width: `${progress}%` }} />
              </div>
            </section>
            {related.length > 0 && (
              <section className="side-box">
                <h2>{series.length ? "目系与眼科连载" : "同题再读"}</h2>
                {related.map((x) => (
                  <Link
                    className="related-link"
                    href={`/articles/${x.id}`}
                    key={x.id}
                  >
                    <span>{x.title}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </section>
            )}
            <Link className="back-list" href="/archive" onClick={back}>
              ← 回到文集
            </Link>
          </div>
        </aside>
      </div>
      <div className="reader-toast" role="status">
        {message}
      </div>
      <ImageLightbox
        media={media}
        index={index}
        onChange={setIndex}
        onClose={() => setIndex(null)}
      />
    </main>
  );
}
