import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  articleQueryOptions,
  articleParam,
  relatedArticlesQueryOptions,
  isRedirectableUrl,
} from "@/lib/api/article";
import { SITE_URL } from "@/lib/seo";
import { JpArticle } from "@/components/jp/JpArticle";

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ params, context }) => {
    const slug = params.slug?.trim();
    if (!slug) throw notFound();
    const article = await context.queryClient.ensureQueryData(articleQueryOptions(slug));
    if (
      article.agent_type === "external" &&
      !article.content?.trim() &&
      isRedirectableUrl(article.url)
    ) {
      throw redirect({ href: article.url });
    }
    context.queryClient.prefetchQuery(
      relatedArticlesQueryOptions({ id: article.id, category: article.category }),
    );
    return { article };
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const title = a ? `${a.title} — Logisight` : "記事 — Logisight";
    const desc =
      (a?.summary && a.summary.trim().length > 0 ? a.summary : a?.title) ??
      "Logisight がキュレーションする物流ニュースの記事。";
    const slugParam = a?.slug && a.slug.length > 0 ? a.slug : a ? String(a.id) : params.slug;
    // canonical·og:url은 sitemap <loc>와 문자 단위로 일치해야 통합이 작동 — 동일하게 percent-인코딩
    const url = `${SITE_URL}/article/${encodeURIComponent(slugParam)}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: a?.title ?? "記事 — Logisight" },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:title", content: a?.title ?? "記事 — Logisight" },
      { name: "twitter:description", content: desc },
    ];
    if (a?.image_url) {
      meta.push({ property: "og:image", content: a.image_url });
      meta.push({ name: "twitter:image", content: a.image_url });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (a) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: a.title,
          description: desc,
          image: a.image_url ? [a.image_url] : undefined,
          datePublished: a.published_at ?? undefined,
          dateModified: a.published_at ?? undefined,
          author: {
            "@type": "Organization",
            name: a.source ?? "Logisight",
          },
          publisher: {
            "@type": "Organization",
            name: "Logisight",
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/logisight_logo.svg`,
            },
          },
          mainEntityOfPage: url,
        }),
      });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">404</p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--color-ink)]">記事が見つかりません</h1>
      <Link
        to="/news"
        className="mt-6 inline-block text-sm font-semibold text-[var(--color-navy-600)] underline"
      >
        物流ニュースに戻る
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <p className="text-sm text-red-600">{error.message}</p>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article } = useSuspenseQuery(articleQueryOptions(slug));
  const { data: related } = useSuspenseQuery(
    relatedArticlesQueryOptions({ id: article.id, category: article.category }),
  );
  return <JpArticle article={article} related={related} />;
}
