import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { Analytics } from "@vercel/analytics/react";

import appCss from "../styles.css?url";
import LogisightLoader from "@/components/LogisightLoader";
import { SITE_URL, SITE_HOST } from "@/lib/seo";
import { usePageView } from "@/lib/track";

// 日本版の GA4 プロパティ。未作成のため空にしてある —
// 韓国版(G-8NG0LJGF23)を使い回すと、観測期間の指標(セッション→登録率など)に
// 日本の流入が混ざり、計測そのものが壊れる。プロパティ作成後にここへ入れる。
const GA_MEASUREMENT_ID = "";

// 404・エラー画面用の最小の枠。QueryClientProvider の外でも使えるよう
// データ取得を伴う JpPage は使わない。
function MinimalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1a1f26]">
      <div className="border-b border-[#d5d9de]">
        <div className="mx-auto max-w-[1120px] px-4 py-4">
          <a href="/" className="text-[22px] font-bold tracking-[-0.02em] text-[#0b2d52]">
            Logisight
          </a>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <MinimalShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-lg font-semibold">ページが見つかりません</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            お探しのページは存在しないか、移動しました。
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    </MinimalShell>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <MinimalShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">ページを読み込めませんでした</h1>
          <p className="mt-2 text-sm text-muted-foreground">しばらくしてから再度お試しください。</p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              再試行
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              ホーム
            </a>
          </div>
        </div>
      </div>
    </MinimalShell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Logisight — 物流を読む、新しい視点" },
      {
        name: "description",
        content:
          "日本の荷主・フォワーダーのための物流インテリジェンス。企業向けサービス価格指数(運賃)、主要6港のコンテナ取扱量、財務省貿易統計を毎月ひとつのレポートにまとめます。",
      },
      { name: "author", content: "Logisight" },
      { property: "og:title", content: "Logisight — 物流を読む、新しい視点" },
      {
        property: "og:description",
        content: "運賃・港湾・貿易の動きを、出典と基準月を明示して毎月お届けします。",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Logisight" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Logisight — 物流を読む、新しい視点" },
      {
        name: "twitter:description",
        content: "運賃・港湾・貿易の動きを、出典と基準月を明示して毎月お届けします。",
      },
      {
        property: "og:image",
        content: `${SITE_URL}/og-default.jpg`,
      },
      {
        name: "twitter:image",
        content: `${SITE_URL}/og-default.jpg`,
      },
    ],
    links: [
      // 폰트는 HTML link로 로드한다. styles.css의 @import url(...)은 Tailwind v4 빌드에서
      // 다른 규칙 뒤에 위치해 드롭되므로(브라우저 미요청) Noto Sans JP가 로드되지 않았다.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500;700;900&family=Playfair+Display:wght@700;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Logisight",
          url: SITE_URL,
          logo: `${SITE_URL}/logisight_logo.svg`,
          // 운영 법인은 상위 조직으로 공시한다. sameAs로 두면 Logisight와 mtlship.com을
          // 동일 주체로 선언하는 셈이라 미디어 브랜드의 독립성이 구조화 데이터에서 사라진다.
          parentOrganization: {
            "@type": "Organization",
            name: "MTL Shipping Agency",
            url: "https://www.mtlship.com",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Logisight",
          url: SITE_URL,
        }),
      },
      // GA4 — 정본 호스트에서만 로드한다. 프리뷰(*.vercel.app)·localhost 트래픽이
      // 섞이면 유입 분석이 오염되므로, 태그 자체를 심지 않는다.
      // SPA 라우트 이동은 GA4 향상된 측정(브라우저 방문 기록 이벤트)이 처리한다.
      {
        children: GA_MEASUREMENT_ID === "" ? "" : `if(location.hostname===${JSON.stringify(SITE_HOST)}){
  var s=document.createElement('script');
  s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments)};
  window.gtag('js',new Date());
  window.gtag('config','${GA_MEASUREMENT_ID}');
}`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // 열람 기록. 무료 기간 종료 시 결제 요청 대상을 고르는 근거가 된다.
  usePageView();
  // 최초 풀 로드(SSR→하이드레이션) 동안만 브랜드 로더 노출. SPA 내비게이션엔 RootComponent가
  // 다시 마운트되지 않으므로 재노출되지 않는다(서브내비 클릭마다 깜빡이는 문제 방지).
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SiteShell>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </SiteShell>
      {/* 로더는 콘텐츠 뒤(DOM 순서)에 배치한다 — position:fixed라 시각적으로는 전체를 덮지만,
          크롤러·텍스트 추출 기준 첫 본문이 로딩 문구가 아니라 각 페이지의 실제 콘텐츠가 되도록 한다. */}
      <LogisightLoader show={loading} />
    </QueryClientProvider>
  );
}


/**
 * 全ページが JpPage(ヘッダー・パンくず・フッター)を自前で持つ。
 * 以前はここでグローバルの Navigation/Footer を被せる分岐があり、
 * ページごとにヘッダーが違って見える原因になっていた。
 */
function SiteShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
