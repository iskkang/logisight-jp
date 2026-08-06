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

// 日本版の GA4 プロパティ(2026-08 作成)。
// 韓国版(G-8NG0LJGF23)を使い回してはならない — セッション→登録率などの指標に
// 日本の流入が混ざり、計測そのものが壊れる。必ず別プロパティを使う。
// 測定 ID はブラウザに出るもので、秘匿する値ではない。
// 型を string にしておく。リテラル型に絞られると、下の空文字ガードが
// 「起こりえない比較」として型エラーになる。ID を外したいときに備えて残す。
const GA_MEASUREMENT_ID: string = "G-QNC4SY7VP4";

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
      // GA4 — 태그는 구글이 안내하는 그대로 정적으로 심는다.
      //
      // 예전에는 스크립트 자체를 JS로 만들어 넣었는데, 구글의 태그 감지 도구는
      // 정적 HTML만 훑기 때문에 실제로는 동작해도 "설치되지 않음"으로 보고한다.
      // 감지 도구와 실제 동작이 어긋나면 확인할 방법이 없어진다.
      //
      // 대신 config 호출만 정본 호스트로 제한한다. 프리뷰(*.vercel.app)·localhost
      // 트래픽이 섞이면 유입 분석이 오염된다. config 를 부르지 않으면 gtag.js 가
      // 실려도 조회는 전송되지 않는다.
      //
      // SPA 라우트 이동은 GA4 향상된 측정(브라우저 방문 기록 이벤트)이 처리한다.
      ...(GA_MEASUREMENT_ID === ""
        ? []
        : [
            {
              async: true,
              src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
            },
            {
              children: `window.dataLayer=window.dataLayer||[];
window.gtag=function(){window.dataLayer.push(arguments)};
window.gtag('js',new Date());
if(location.hostname===${JSON.stringify(SITE_HOST)}){window.gtag('config','${GA_MEASUREMENT_ID}')}`,
            },
          ]),
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
