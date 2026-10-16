export default function PaperPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="stage">
      <div className="paper-shadow">
        <div className="paper">
          <div className="paper-grain" aria-hidden="true" />
          <div className="paper-art" aria-hidden="true" />
          <div className="header-space" aria-hidden="true" />
          {children}
          <footer className="paper-footer">
            <span>星汉扶犁</span>
            <span>中医药 · 草木 · 日常</span>
            <a href="#main">回到页首 ↑</a>
          </footer>
        </div>
      </div>
    </div>
  );
}
