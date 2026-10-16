"use client";
import Link from "next/link";
import AmbientScene from "./AmbientScene";
export default function OpeningTransition() {
  return (
    <main id="main" className="cover">
      <AmbientScene />
      <div className="header-space" aria-hidden="true" />
      <div className="cover-center">
        <h1 tabIndex={-1}>
          星汉扶犁
          <span className="title-seal" aria-hidden="true">
            扶<br />犁
          </span>
        </h1>
        <p>中医药实践 · 草木与日常</p>
        <Link href="/archive" className="enter-button">
          <span>点击进入</span>
          <span className="enter-arrow" aria-hidden="true">
            ⟶
          </span>
        </Link>
      </div>
      <div className="cover-bottom">
        <span>星汉扶犁 · 个人文集</span>
        <span>九篇记录，慢慢读。</span>
      </div>
    </main>
  );
}
