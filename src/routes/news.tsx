import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { latestNewsQueryOptions } from "@/lib/api/news";
import { JpNews } from "@/components/jp/JpNews";
import { seoHead } from "@/lib/seo";

const newsSearchSchema = z.object({
  cat: z.string().min(1).max(40).optional(),
});

export const Route = createFileRoute("/news")({
  validateSearch: newsSearchSchema,
  loaderDeps: ({ search }) => ({ cat: search.cat }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      latestNewsQueryOptions({ lang: "ja", limit: 50, category: deps.cat }),
    ),
  head: () =>
    seoHead({
      title: "物流ニュース — Logisight",
      description:
        "海上・航空・港湾・貿易。世界の運賃とサプライチェーンを動かすニュースを選んでお届けします。",
      path: "/news",
      koPath: "/news",
    }),
  component: NewsPage,
});

function NewsPage() {
  const { cat } = Route.useSearch();
  return <JpNews category={cat} />;
}
