import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { portThroughputQueryOptions } from "@/lib/api/ports";
import { LogisightPorts } from "@/components/ports-page/LogisightPorts";

export const Route = createFileRoute("/ports")({
  // 数値そのものが検索対象になるページなので、クライアント取得ではなく SSR に載せる。
  loader: ({ context }) => context.queryClient.ensureQueryData(portThroughputQueryOptions()),
  head: () =>
    seoHead({
      title: "主要6港 コンテナ取扱量 — 港湾統計 | Logisight",
      description:
        "東京・横浜・名古屋・神戸・大阪・川崎の外国貿易コンテナ取扱量。国土交通省 港湾統計にもとづく月次の実数と前年同月比を掲載。",
      path: "/ports",
    }),
  component: LogisightPorts,
});
