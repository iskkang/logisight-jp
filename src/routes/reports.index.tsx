import { createFileRoute } from "@tanstack/react-router";

import { jpReportsQueryOptions } from "@/lib/api/jp-reports";
import { LogisightJpReports } from "@/components/reports-page/LogisightJpReports";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/reports/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(jpReportsQueryOptions()),
  head: () =>
    seoHead({
      title: "マーケットレポート — Logisight",
      description:
        "運賃(企業向けサービス価格指数)・主要6港のコンテナ取扱量・財務省貿易統計を毎月ひとつにまとめたマーケットレポート。出典と基準月を明記して発行します。",
      path: "/reports",
    }),
  component: LogisightJpReports,
});
