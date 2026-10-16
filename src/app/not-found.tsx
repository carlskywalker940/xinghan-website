import Link from "next/link";
import PaperPanel from "@/components/layout/PaperPanel";
export default function NotFound() {
  return (
    <PaperPanel>
      <main id="main" className="empty-state">
        <h1>这一页暂未写下</h1>
        <Link href="/archive">回到文章目录 →</Link>
      </main>
    </PaperPanel>
  );
}
