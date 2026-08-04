import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { jpTradeQueryOptions } from "@/lib/api/jp-trade";
import { LogisightJpTrade } from "@/components/trade-page/LogisightJpTrade";

export const Route = createFileRoute("/trade")({
  // 数値そのものが検索対象になるページなので SSR に載せる。
  loader: ({ context }) => context.queryClient.ensureQueryData(jpTradeQueryOptions()),
  head: () =>
    seoHead({
      title: "輸出入 相手国・品目別 — 貿易統計 | Logisight",
      description:
        "財務省貿易統計にもとづく月次の輸出入額。相手国別の上位10か国と、概況品目の大分類による輸出入構成を掲載。",
      path: "/trade",
    }),
  component: LogisightJpTrade,
});
