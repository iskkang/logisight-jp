import { createFileRoute } from "@tanstack/react-router";

import { climateRiskQueryOptions } from "@/lib/api/climate";
import { seoHead } from "@/lib/seo";
import { LogisightClimate } from "@/components/climate-page/LogisightClimate";

const SUBTITLE =
  "世界の主要港湾・海峡・内陸拠点の気象リスクを予報にもとづいて監視し、影響を受ける航路を示します。";

export const Route = createFileRoute("/climate")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(climateRiskQueryOptions());
  },
  // noindex を外した(2026-08-13)。付けた理由は「本文が韓国語のままだから」で、
  // その理由はもう無い —— 画面の文言・地名・凡例・読み方まで日本語で、韓国語は 0 文字。
  // 理由が消えた印は、理由と一緒に消す。残しておくと次の人が根拠を探して迷う。
  head: () =>
    seoHead({
      title: "世界の気象リスク — Logisight",
      description: SUBTITLE,
      path: "/climate",
      koPath: "/climate",
    }),
  component: LogisightClimate,
});
