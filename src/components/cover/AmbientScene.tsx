"use client";
import { useEffect, useRef, useState } from "react";
import { useSceneTransition } from "../transition/TransitionManager";

export default function AmbientScene() {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { state } = useSceneTransition();
  const sceneRef = useRef<HTMLDivElement>(null);
  const windAnimations = useRef<Animation[]>([]);
  const stopped =
    paused || hidden || state === "OPENING" || state === "CLOSING";
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const samples = [-0.22, 0.55, 1, 0.12, -0.22],
      offsets = [0, 0.24, 0.48, 0.72, 1];
    const start = Number(document.timeline.currentTime);
    const projectWall = () => {
      const r = scene.getBoundingClientRect(),
        s = Math.max(r.width / 1672, r.height / 941),
        x = (r.width - 1672 * s) / 2,
        y = (r.height - 941 * s) / 2;
      const pts = [
        [1438, 0],
        [1610, 0],
        [1610, 595],
        [1438, 574],
      ].map(([px, py]) => `${x + px * s}px ${y + py * s}px`);
      scene.style.setProperty("--wall-clip", `polygon(${pts.join(",")})`);
    };
    projectWall();
    const observer = new ResizeObserver(projectWall);
    observer.observe(scene);
    const animate = (
      selector: string,
      transform: (wind: number) => string,
      phase = 0,
    ) => {
      for (const el of scene.querySelectorAll(selector)) {
        const a = el.animate(
          samples.map((w, i) => ({
            transform: transform(w),
            offset: offsets[i],
          })),
          {
            duration: 6800,
            iterations: Infinity,
            easing: "ease-in-out",
            fill: "both",
          },
        );
        a.startTime = start - phase;
        windAnimations.current.push(a);
      }
    };
    animate(
      ".foliage-upper",
      (w) => `translate(${w * 3}px,${w * -1.5}px) rotate(${w * 1.25}deg)`,
    );
    animate(
      ".foliage-lower",
      (w) => `translate(${w * 2}px,${w * -0.8}px) rotate(${w * -0.65}deg)`,
      1400,
    );
    animate(
      ".wall-shadow-cast:not(.shadow-secondary)",
      (w) =>
        `translate(calc(79% + ${w * 10}px),calc(13% - ${w * 6}px)) rotate(${14 + w * 2.2}deg)`,
    );
    animate(
      ".shadow-secondary",
      (w) =>
        `translate(calc(84% + ${w * 7}px),calc(31% - ${w * 5}px)) rotate(${28 + w * 1.6}deg)`,
    );
    return () => {
      observer.disconnect();
      windAnimations.current.forEach((a) => a.cancel());
      windAnimations.current = [];
    };
  }, []);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      windAnimations.current.forEach((a) => {
        if (stopped || query.matches) a.pause();
        else a.play();
      });
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [stopped]);
  return (
    <>
      <div
        ref={sceneRef}
        className={`ambient-scene wind-field ${stopped ? "paused" : ""}`}
        aria-hidden="true"
        data-wind-direction="southwest-to-northeast"
      >
        <div className="scene-image" />
        <div className="foliage-underlay" />
        <div className="wall-underlay" />
        <div className="valley-cloud cloud-a" />
        <div className="valley-cloud cloud-b" />
        <div className="valley-cloud cloud-c" />
        <div className="foliage foliage-upper" />
        <div className="foliage foliage-lower" />
        <div className="wall-shadow">
          <div className="wall-shadow-cast" />
          <div className="wall-shadow-cast shadow-secondary" />
        </div>
      </div>
      <button
        className="ambient-toggle"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
      >
        {paused ? "继续动态" : "暂停动态"}{" "}
        <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
      </button>
    </>
  );
}
