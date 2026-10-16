import { Suspense } from "react";
import PaperPanel from "@/components/layout/PaperPanel";
import ArticleGrid from "@/components/archive/ArticleGrid";
export const metadata = { title: "文章" };
export default function Page() {
  return (
    <PaperPanel>
      <main id="main">
        <Suspense fallback={<p className="loading">文集正在展开…</p>}>
          <ArticleGrid />
        </Suspense>
      </main>
    </PaperPanel>
  );
}
