import { createFileRoute } from "@tanstack/react-router";

import { JpHs } from "@/components/hs/JpHs";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/hs")({
  head: () =>
    seoHead({
      title: "HSコード対照 — 日本の品目番号から米国のHTSラインへ | Logisight",
      description:
        "輸出統計品目番号(9桁)を入れると、米国側で該当する HTS ライン(10桁)を並べます。頭6桁が国際共通であることを利用した対照表です。関税率は扱いません。",
      path: "/hs",
    }),
  component: JpHs,
});
