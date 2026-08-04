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
  // 本文が韓国語のままのため、日本語コンテンツが用意できるまで非公開扱いにする。
  // メニューとサイトマップから外すだけでは、クローラが URL を辿って索引しうる。
  head: () => {
    const base = seoHead({
      title: "世界の気象リスク — Logisight",
      description: SUBTITLE,
      path: "/climate",
    });
    return { ...base, meta: [...base.meta, { name: "robots", content: "noindex,nofollow" }] };
  },
  component: LogisightClimate,
});
