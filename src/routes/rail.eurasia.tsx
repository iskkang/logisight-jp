import { createFileRoute } from "@tanstack/react-router";

import { eurasiaChartsQueryOptions } from "@/lib/api/eurasia-charts";
import { eurasiaRailBriefQueryOptions } from "@/lib/api/eurasia-rail-brief";
import { euRailTerminalsQueryOptions } from "@/lib/api/eu-rail-terminals";
import { seoHead } from "@/lib/seo";
import { RailEurasiaContent } from "@/components/rail-page/RailEurasiaContent";

// 유라시아 — ERAI 차트 포털(index1520 스냅샷). 내부 TCR ETA 제거.
export const Route = createFileRoute("/rail/eurasia")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eurasiaChartsQueryOptions());
    context.queryClient.ensureQueryData(eurasiaRailBriefQueryOptions());
    context.queryClient.ensureQueryData(euRailTerminalsQueryOptions());
  },
  head: () =>
    seoHead({
      title: "ユーラシア鉄道 — ERAI 指数・運賃 — Logisight",
      description:
        "ERAI(Eurasian Rail Alliance Index)にもとづくユーラシア鉄道の運賃・輸送日数・地域別輸送量を地図とチャートで。",
      path: "/rail/eurasia",
    }),
  component: RailEurasiaContent,
});
