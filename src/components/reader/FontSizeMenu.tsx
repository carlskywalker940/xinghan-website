"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
const KEY = "xinghan:reader:font-size:v2";
const choices = [
  { name: "小号", size: 16 },
  { name: "中号", size: 18 },
  { name: "大号", size: 21 },
];
let memorySize = 18;
function snapshot() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return choices.some((c) => c.size === v) ? v : memorySize;
  } catch {
    return memorySize;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("xinghan:font-size", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("xinghan:font-size", callback);
  };
}
export function useReaderFont() {
  const size = useSyncExternalStore(subscribe, snapshot, () => 18);
  const setSize = (n: number) => {
    memorySize = n;
    try {
      localStorage.setItem(KEY, String(n));
    } catch {}
    window.dispatchEvent(new Event("xinghan:font-size"));
  };
  return [size, setSize] as const;
}
export default function FontSizeMenu({
  size,
  onChange,
}: {
  size: number;
  onChange: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressHover = useRef(false);
  const clear = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const collapse = () => {
    clear();
    setOpen(false);
  };
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);
  return (
    <div
      className={`font-menu ${open ? "font-menu-open" : ""}`}
      ref={container}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") {
          clear();
          if (!suppressHover.current) setOpen(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") {
          suppressHover.current = false;
          closeTimer.current = setTimeout(() => setOpen(false), 200);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) collapse();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          collapse();
          trigger.current?.focus();
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          requestAnimationFrame(() =>
            container.current
              ?.querySelector<HTMLButtonElement>(
                '[role="menuitemradio"][aria-checked="true"]',
              )
              ?.focus(),
          );
        }
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const options = [
            ...container.current!.querySelectorAll<HTMLButtonElement>(
              '[role="menuitemradio"]',
            ),
          ];
          const i = options.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          if (i >= 0) {
            e.preventDefault();
            options[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3].focus();
          }
        }
      }}
    >
      <button
        ref={trigger}
        className="font-menu-trigger"
        onClick={() => {
          clear();
          setOpen(!open);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="字号"
      >
        字号
      </button>
      <div
        className="font-size-options"
        role="menu"
        aria-label="正文字号"
        inert={!open}
      >
        {choices.map((c) => (
          <button
            key={c.size}
            role="menuitemradio"
            aria-checked={size === c.size}
            onClick={() => {
              onChange(c.size);
              suppressHover.current = true;
              collapse();
              trigger.current?.focus();
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
