"use client";
import { publicAsset } from "@/lib/paths";
import { useEffect, useRef } from "react";
import type { ContentBlock } from "@/content/types";
export default function ImageLightbox({
  media,
  index,
  onChange,
  onClose,
}: {
  media: ContentBlock[];
  index: number | null;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index !== null) document.body.style.overflow = "hidden";
    if (index !== null && !dialog.open) {
      origin.current = document.activeElement as HTMLElement;
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (index === null && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
      origin.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [index]);
  useEffect(
    () => () => {
      origin.current?.focus();
    },
    [],
  );
  const move = (d: number) => {
    if (index !== null) onChange((index + d + media.length) % media.length);
  };
  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="原文图片查看器"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      <div className="lightbox-top">
        <span>{index === null ? "" : `${index + 1} / ${media.length}`}</span>
        <button onClick={onClose} autoFocus aria-label="关闭图片查看器">
          关闭 ×
        </button>
      </div>
      <button
        className="lightbox-prev"
        onClick={() => move(-1)}
        aria-label="上一张图片"
      >
        ‹
      </button>
      {index !== null && (
        <img
          src={publicAsset(media[index].asset || "")}
          alt={media[index].alt}
        />
      )}
      <button
        className="lightbox-next"
        onClick={() => move(1)}
        aria-label="下一张图片"
      >
        ›
      </button>
      <p className="lightbox-hint">← → 切换图片 · Esc 关闭</p>
    </dialog>
  );
}
