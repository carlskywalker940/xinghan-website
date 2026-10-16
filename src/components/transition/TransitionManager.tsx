"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { isAppPath, routePath } from "@/lib/paths";
import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";

export type SceneState = "HOME_IDLE" | "OPENING" | "CONTENT_IDLE" | "CLOSING";
interface SceneContext {
  state: SceneState;
  target: string | null;
  navigate: (href: string) => void;
}
const Context = createContext<SceneContext | null>(null);
export const useSceneTransition = () => {
  const value = useContext(Context);
  if (!value) throw new Error("Scene transition provider missing");
  return value;
};
const easing = "cubic-bezier(.42,0,.18,1)";

function routeReady(root: HTMLElement, href: string, signal: AbortSignal) {
  const target = new URL(href, location.href);
  target.pathname = routePath(target.pathname);
  return new Promise<void>((resolve, reject) => {
    const clean = () => {
      observer?.disconnect();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      clean();
      reject(new DOMException("Transition cancelled", "AbortError"));
    };
    const check = () => {
      let found = false;
      if (target.pathname === "/") found = !!root.querySelector(".cover");
      else if (target.pathname === "/archive")
        found = !!root.querySelector(".archive-content");
      else found = !!root.querySelector(".article-main");
      if (routePath(location.pathname) === target.pathname && found) {
        clean();
        resolve();
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(root, { childList: true, subtree: true });
    const timeout = setTimeout(() => {
      clean();
      reject(new Error("目标页面未能及时加载"));
    }, 8000);
    signal.addEventListener("abort", abort, { once: true });
    check();
  });
}
function copyViewport(source: HTMLElement, host: HTMLElement, scroll: number) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script,[id]").forEach((el) => {
    if (el.tagName === "SCRIPT") el.remove();
    else el.removeAttribute("id");
  });
  const selectors = ".foliage,.wall-shadow-cast,.valley-cloud";
  const originals = source.querySelectorAll(selectors);
  clone.querySelectorAll<HTMLElement>(selectors).forEach((el, i) => {
    const css = getComputedStyle(originals[i]);
    el.style.transform = css.transform;
    el.style.opacity = css.opacity;
    el.style.animation = "none";
  });
  clone.inert = true;
  clone.style.transform = `translateY(${-scroll}px)`;
  clone.style.transformOrigin = "top center";
  host.replaceChildren(clone);
}

export default function TransitionManager({
  children,
  header,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = routePath(usePathname());
  const [state, setState] = useState<SceneState>(
    pathname === "/" ? "HOME_IDLE" : "CONTENT_IDLE",
  );
  const [target, setTarget] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const capture = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const animations = useRef<Animation[]>([]);
  const previous = useRef(pathname);
  const cleanup = useCallback(() => {
    animations.current.forEach((a) => a.cancel());
    animations.current = [];
    controller.current?.abort();
    controller.current = null;
    root.current?.removeAttribute("inert");
    if (root.current) {
      root.current.style.opacity = "";
      root.current.style.transform = "";
    }
    document.body.style.overflow = "";
    capture.current?.replaceChildren();
    lock.current = false;
    setState(
      routePath(location.pathname) === "/" ? "HOME_IDLE" : "CONTENT_IDLE",
    );
    setTarget(null);
  }, []);
  const play = useCallback(
    async (
      href: string,
      historyNavigation = false,
      sourcePath = routePath(location.pathname),
    ) => {
      if (lock.current) return;
      const destination = new URL(href, location.href);
      const fromHome = sourcePath === "/";
      const toHome = routePath(destination.pathname) === "/";
      if (fromHome === toHome) {
        setTarget(href);
        if (!historyNavigation) router.push(href);
        return;
      }
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        if (!historyNavigation) router.push(href);
        try {
          if (!toHome) sessionStorage.setItem("xinghan:entered:v1", "1");
        } catch {}
        return;
      }
      lock.current = true;
      const abort = new AbortController();
      controller.current = abort;
      const sourceScroll = window.scrollY;
      const direction = toHome ? "CLOSING" : "OPENING";
      flushSync(() => {
        setState(direction);
        setTarget(href);
      });
      const page = root.current,
        layer = overlay.current,
        snapshot = capture.current;
      if (!page || !layer || !snapshot) {
        cleanup();
        if (!historyNavigation) router.push(href);
        return;
      }
      layer.dataset.transitionStage = "preparing";
      const watchdog = setTimeout(() => {
        if (controller.current === abort) cleanup();
      }, 10000);
      copyViewport(page, snapshot, sourceScroll);
      page.inert = true;
      document.body.style.overflow = "hidden";
      const mobile = matchMedia("(max-width:560px)").matches;
      const duration = mobile ? 750 : 1500;
      let timelineStart: number | null = null;
      const run = (el: Element, frames: Keyframe[], delay = 0) => {
        timelineStart ??= Number(document.timeline.currentTime);
        const a = el.animate(frames, {
          duration: duration - delay,
          delay,
          easing,
          fill: "both",
        });
        a.startTime = timelineStart;
        animations.current.push(a);
        return a;
      };
      const doors = [...layer.querySelectorAll<HTMLElement>(".scene-door")];
      try {
        if (!toHome) {
          page.style.opacity = "0";
          page.style.transform = "scale(.74)";
          const ready = routeReady(page, href, abort.signal);
          if (!historyNavigation) router.push(href, { scroll: true });
          await ready;
          // Decode the actual incoming directory's covers before uncovering the page.
          await Promise.all(
            [...page.querySelectorAll<HTMLImageElement>(".card-image img")].map(
              (img) => {
                img.loading = "eager";
                return img.decode().catch(() => {});
              },
            ),
          );
          if (abort.signal.aborted) return;
          window.scrollTo(0, 0);
          layer.dataset.transitionStage = "animating";
          const a = run(
            page,
            [
              { transform: "scale(.74)", opacity: 0 },
              { transform: "scale(.84)", opacity: 0.55, offset: 0.48 },
              { transform: "scale(1)", opacity: 1 },
            ],
            100,
          );
          run(snapshot, [
            { opacity: 1 },
            { opacity: 0, offset: 0.18 },
            { opacity: 0 },
          ]);
          doors.forEach((door, i) =>
            run(
              door,
              [
                {
                  transform: "perspective(1500px) rotateY(0deg) translateX(0%)",
                  opacity: 1,
                },
                {
                  transform: `perspective(1500px) rotateY(${i ? "-" : ""}68deg) translateX(${i ? "" : "-"}104%)`,
                  opacity: 0,
                },
              ],
              60,
            ),
          );
          await a.finished;
          try {
            sessionStorage.setItem("xinghan:entered:v1", "1");
          } catch {}
        } else {
          // A real DOM copy preserves the exact scrolled article during reverse / history navigation.
          page.style.opacity = "0";
          layer.dataset.transitionStage = "animating";
          const a = run(snapshot, [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(.74)", opacity: 0 },
          ]);
          doors.forEach((door, i) =>
            run(
              door,
              [
                {
                  transform: `perspective(1500px) rotateY(${i ? "-" : ""}68deg) translateX(${i ? "" : "-"}104%)`,
                  opacity: 0,
                },
                {
                  transform: "perspective(1500px) rotateY(0deg) translateX(0%)",
                  opacity: 1,
                },
              ],
              40,
            ),
          );
          await a.finished;
          const ready = routeReady(page, href, abort.signal);
          if (!historyNavigation) router.push(href, { scroll: true });
          await ready;
          page.style.opacity = "1";
          page.style.transform = "";
          window.scrollTo(0, 0);
          const reveal = layer.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 180,
            fill: "both",
            easing: "ease-out",
          });
          animations.current.push(reveal);
          await reveal.finished;
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          console.warn("场景转场已安全恢复：", error);
      } finally {
        clearTimeout(watchdog);
        if (controller.current === abort) {
          cleanup();
          requestAnimationFrame(() => {
            const heading = document.querySelector<HTMLElement>(
              toHome ? ".cover h1" : "#archive-heading",
            );
            heading?.focus({ preventScroll: true });
          });
        }
      }
    },
    [router, cleanup],
  );
  const navigate = useCallback(
    (href: string) => {
      void play(href);
    },
    [play],
  );
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const a = (event.target as Element)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !a ||
        a.target === "_blank" ||
        a.hasAttribute("download") ||
        a.closest(".scene-overlay")
      )
        return;
      const url = new URL(a.href, location.href);
      if (
        url.origin !== location.origin ||
        !isAppPath(url.pathname) ||
        (url.hash && url.pathname === location.pathname)
      )
        return;
      if (lock.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (
        (routePath(location.pathname) === "/") !==
        (routePath(url.pathname) === "/")
      ) {
        event.preventDefault();
        event.stopPropagation();
        void play(routePath(url.pathname) + url.search);
      } else setTarget(routePath(url.pathname) + url.search);
    };
    const pop = () => {
      setTarget(null);
      const old = previous.current;
      const current = routePath(location.pathname);
      previous.current = current;
      if (lock.current) {
        cleanup();
        return;
      }
      if ((old === "/") !== (current === "/"))
        void play(routePath(location.pathname) + location.search, true, old);
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop);
    };
  }, [play, cleanup]);
  useEffect(() => {
    previous.current = pathname;
  }, [pathname]);
  useEffect(
    () => () => {
      controller.current?.abort();
      animations.current.forEach((a) => a.cancel());
      document.body.style.overflow = "";
    },
    [],
  );
  const busy = state === "OPENING" || state === "CLOSING";
  return (
    <Context.Provider value={{ state, target, navigate }}>
      <div
        className="scene-shell"
        data-scene-state={
          busy ? state : pathname === "/" ? "HOME_IDLE" : "CONTENT_IDLE"
        }
      >
        {header}
        <div className="route-content" ref={root}>
          {children}
        </div>
        <div
          ref={overlay}
          className={`scene-overlay ${busy ? "scene-overlay-active" : ""} ${state === "CLOSING" ? "scene-closing" : "scene-opening"}`}
          aria-hidden="true"
          inert
        >
          <div className="scene-capture" ref={capture} />
          <div className="scene-door scene-door-left" />
          <div className="scene-door scene-door-right" />
        </div>
        {busy && (
          <button className="transition-recover" onClick={cleanup}>
            结束转场 →
          </button>
        )}
      </div>
    </Context.Provider>
  );
}
