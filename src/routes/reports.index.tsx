import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { reportsQueryOptions } from "@/lib/api/reports";
import LogisightReports from "@/components/reports-page/LogisightReports";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/reports/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(reportsQueryOptions()),
  head: () =>
    seoHead({
      title: "マーケットレポート — Logisight",
      description:
        "毎月発行する物流マーケットレポート。運賃(SPPI)・港湾・貿易を一本の記事にまとめ、出典と基準月を明示して掲載します。",
      path: "/reports",
    }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data } = useSuspenseQuery(reportsQueryOptions());
  return (
    // ダークラッパー: 半透明 HomeNav の背景をホームと同じ暗さに揃える。
    <div className="min-h-screen bg-[#070b16]">
      <HomeNav active="reports" />
      {/*
        日本版は月次のみ。週次ブリーフィング(weekly_briefings)は韓国語コンテンツで、
        日本向けの発行体制がないため一覧・アーカイブとも出さない。
      */}
      <LogisightReports
        showNav={false}
        latestWeekly={null}
        latestMonthly={data.monthly}
        archive={data.archive}
        regionOrder={[]}
      />
      <HomeFooter />
    </div>
  );
}
