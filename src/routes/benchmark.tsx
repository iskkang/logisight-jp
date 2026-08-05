import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { benchmarkQueryOptions } from "@/lib/api/benchmark";
import { FreightBenchmark } from "@/components/tools/FreightBenchmark";

export const Route = createFileRoute("/benchmark")({
  loader: ({ context }) => context.queryClient.ensureQueryData(benchmarkQueryOptions()),
  head: () =>
    seoHead({
      title: "物流費ベンチマーク — 値上げの何%が為替か | Logisight",
      description:
        "契約時点から現在までに物流の市場価格が何%動いたかを算出し、運賃要因と為替要因に分解します。日本銀行 企業向けサービス価格指数の円ベースと契約通貨ベースにもとづく。",
      path: "/benchmark",
    }),
  component: FreightBenchmark,
});
