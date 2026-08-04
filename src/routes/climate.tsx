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
  head: () =>
    seoHead({
      title: "世界の気象リスク — Logisight",
      description: SUBTITLE,
      path: "/climate",
    }),
  component: LogisightClimate,
});
