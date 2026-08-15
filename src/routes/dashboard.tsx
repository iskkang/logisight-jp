import { createFileRoute } from "@tanstack/react-router";

import { globalIndicesQueryOptions } from "@/lib/api/global-indices";
import { sppiQueryOptions } from "@/lib/api/sppi";
import { portThroughputQueryOptions } from "@/lib/api/ports";
import { jpTradeQueryOptions } from "@/lib/api/jp-trade";
import { JpDashboard } from "@/components/jp/JpDashboard";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/dashboard")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    return Promise.all([
      qc.ensureQueryData(globalIndicesQueryOptions()),
      qc.ensureQueryData(sppiQueryOptions()),
      qc.ensureQueryData(portThroughputQueryOptions()),
      qc.ensureQueryData(jpTradeQueryOptions()),
    ]);
  },
  head: () =>
    seoHead({
      title: "総合ダッシュボード — 世界の運賃と日本の物流 | Logisight",
      description:
        "SCFI・CCFI・WCI・FBX・BDI など世界の運賃指数と、日本の企業向けサービス価格指数・主要6港のコンテナ取扱量・財務省貿易統計を一画面で対比します。",
      path: "/dashboard",
      koPath: "/dashboard",
    }),
  component: JpDashboard,
});
