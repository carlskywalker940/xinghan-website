"use client";
import { publicAsset, routePath } from "@/lib/paths";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { useSceneTransition } from "../transition/TransitionManager";
export default function SiteHeader() {
  const pathname = routePath(usePathname());
  const params = useSearchParams();
  const { target, state } = useSceneTransition();
  const cover = pathname === "/" || state === "OPENING" || state === "CLOSING";
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const active =
    target && (state === "OPENING" || state === "CLOSING")
      ? new URL(target, "http://local")
      : new URL(pathname + "?" + params.toString(), "http://local");
  const activePath = routePath(active.pathname);
  const selected =
    activePath === "/"
      ? "home"
      : activePath === "/archive" && active.searchParams.has("category")
        ? "topic"
        : "articles";
  useLayoutEffect(() => {
    const node = nav.current,
      line = indicator.current;
    if (!node || !line) return;
    const update = () => {
      const el = node.querySelector<HTMLElement>(`[data-nav="${selected}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect(),
        n = node.getBoundingClientRect();
      line.style.transform = `translateX(${r.left - n.left}px) scaleX(${r.width})`;
      line.style.opacity = "1";
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    for (const el of node.children) if (el !== line) observer.observe(el);
    document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, [selected]);
  return (
    <header
      className={`site-header global-header ${cover ? "on-cover" : ""}`}
      data-transitioning={state === "OPENING" || state === "CLOSING"}
    >
      <Link href="/" className="brand" aria-label="星汉扶犁首页">
        星汉扶犁
        <span className="seal" aria-hidden="true">
          记
        </span>
      </Link>
      <nav ref={nav} aria-label="主导航">
        <Link
          href="/"
          data-nav="home"
          aria-current={selected === "home" ? "page" : undefined}
        >
          首页
        </Link>
        <Link
          href="/archive"
          data-nav="articles"
          aria-current={selected === "articles" ? "page" : undefined}
        >
          文章
        </Link>
        <Link
          href="/archive?category=目系与眼科"
          data-nav="topic"
          aria-current={selected === "topic" ? "page" : undefined}
        >
          专题
        </Link>
        <span
          className="active-nav-indicator"
          ref={indicator}
          aria-hidden="true"
        />
      </nav>
      <img
        className="avatar"
        src={publicAsset("/branding/author-avatar.jpg")}
        width={48}
        height={48}
        alt="星汉扶犁作者头像"
      />
    </header>
  );
}
