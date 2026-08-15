import { createFileRoute } from "@tanstack/react-router";

import { railMapQueryOptions } from "@/lib/api/rail-map";
import { seoHead } from "@/lib/seo";
import { RailAmericasMap } from "@/components/rail-page/RailAmericasMap";

// 미주 — 북미 인터모달 철도 코리도 지도(기존 rail-map 로직 재사용).
export const Route = createFileRoute("/rail/americas")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(railMapQueryOptions());
  },
  head: () =>
    seoHead({
      title: "北米鉄道コリドー — Logisight",
      description: "北米インターモーダル鉄道コリドーの状態マップ(Watch/Delayed/Normal)。",
      path: "/rail/americas",
      koPath: "/rail/americas",
    }),
  component: RailAmericasMap,
});
