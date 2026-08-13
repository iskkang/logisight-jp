import { createFileRoute } from "@tanstack/react-router";

import { sppiQueryOptions } from "@/lib/api/sppi";
import { portThroughputQueryOptions } from "@/lib/api/ports";
import { jpTradeSummaryQueryOptions } from "@/lib/api/jp-trade";
import { jpReportsQueryOptions } from "@/lib/api/jp-reports";
import { latestNewsQueryOptions } from "@/lib/api/news";
import { JpHome } from "@/components/jp/JpHome";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    return Promise.all([
      qc.ensureQueryData(sppiQueryOptions()),
      qc.ensureQueryData(portThroughputQueryOptions()),
      qc.ensureQueryData(jpTradeSummaryQueryOptions()),
      qc.ensureQueryData(jpReportsQueryOptions()),
      qc.ensureQueryData(latestNewsQueryOptions({ lang: "ja", limit: 14 })),
    ]);
  },
  head: () =>
    seoHead({
      title: "Logisight — 運賃・港湾・貿易の公的統計",
      description:
        "企業向けサービス価格指数(運賃)、主要6港のコンテナ取扱量、財務省貿易統計を、出典と基準月を明示して毎月まとめる物流インテリジェンス媒体。",
      path: "/",
      koPath: "/",
    }),
  component: JpHome,
});
