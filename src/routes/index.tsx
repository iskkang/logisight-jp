import { createFileRoute } from "@tanstack/react-router";

import { sppiQueryOptions } from "@/lib/api/sppi";
import { portThroughputQueryOptions } from "@/lib/api/ports";
import { jpTradeQueryOptions } from "@/lib/api/jp-trade";
import { LogisightJpHome } from "@/components/home/LogisightJpHome";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    return Promise.all([
      qc.ensureQueryData(sppiQueryOptions()),
      qc.ensureQueryData(portThroughputQueryOptions()),
      qc.ensureQueryData(jpTradeQueryOptions()),
    ]);
  },
  head: () =>
    seoHead({
      title: "Logisight — 公的統計で読む日本の物流",
      description:
        "運賃(企業向けサービス価格指数)・主要6港のコンテナ取扱量・財務省貿易統計を、出典と基準月を明示して毎月まとめます。",
      path: "/",
    }),
  component: LogisightJpHome,
});
