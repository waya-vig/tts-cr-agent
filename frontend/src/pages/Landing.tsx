import { Link } from "react-router";

const features = [
  {
    title: "Market Intelligence",
    titleJa: "市場インテリジェンス",
    description:
      "トレンド商品やトップパフォーマンスのクリエイティブを分析。データドリブンな意思決定をサポートします。",
    icon: (
      <svg
        className="h-8 w-8 text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    title: "AI Creative Generation",
    titleJa: "AIクリエイティブ生成",
    description:
      "売れている動画データを基に、AIが動画の構成案・台本・フックを自動生成。効果的なコンテンツ戦略を提案します。",
    icon: (
      <svg
        className="h-8 w-8 text-purple-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
    ),
  },
  {
    title: "AI Copilot",
    titleJa: "AIコパイロット",
    description:
      "TikTok Shopの販売に関するあらゆる質問に、ナレッジベースを活用したAIアシスタントがお答えします。",
    icon: (
      <svg
        className="h-8 w-8 text-green-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
    ),
  },
  {
    title: "Knowledge Management",
    titleJa: "ナレッジ管理",
    description:
      "チーム共有のナレッジベースを構築。蓄積されたノウハウをAIが活用し、チーム全体のパフォーマンスを向上させます。",
    icon: (
      <svg
        className="h-8 w-8 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.25_0.05_260)_0%,transparent_50%)]" />

      <div className="relative">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <img
                src="/vigsella-logo.png"
                alt="vigSella"
                className="h-9 w-9 rounded"
              />
              <span className="text-xl font-bold tracking-tight">vigSella</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                ログイン
              </Link>
              <Link
                to="/login?register=1"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                新規登録
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <div className="flex justify-center mb-6">
            <img
              src="/vigsella-logo.png"
              alt="vigSella"
              className="h-20 w-20 rounded-xl shadow-lg shadow-primary/20"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            vigSella
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            AI-powered creative production tool for TikTok Shop sellers
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground/80">
            市場データ × AI で、TikTok Shopの売れるクリエイティブを誰でも簡単に。
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/login?register=1"
              className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              無料で始める
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-border px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
            >
              ログイン
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <h2 className="mb-12 text-center text-2xl font-bold sm:text-3xl">
            主な機能
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-border hover:bg-card/80"
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {f.titleJa}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/40 bg-card/30 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              TikTok Shopの売上を加速させましょう
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              vigSellaがあなたのクリエイティブ制作を強力にサポートします。
            </p>
            <div className="mt-8">
              <Link
                to="/login?register=1"
                className="inline-block rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
              >
                今すぐ始める
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <img
                  src="/vigsella-logo.png"
                  alt="vigSella"
                  className="h-5 w-5 rounded"
                />
                <span>&copy; {new Date().getFullYear()} Vig Inc.</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link to="/terms" className="transition-colors hover:text-foreground hover:underline">
                  Terms of Service
                </Link>
                <Link to="/privacy" className="transition-colors hover:text-foreground hover:underline">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
