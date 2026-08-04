import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { sppiQueryOptions } from "@/lib/api/sppi";
import { LogisightJpRates } from "@/components/rates-page/LogisightJpRates";

export const Route = createFileRoute("/rates")({
  // 数値そのものが検索対象になるページなので SSR に載せる。
  loader: ({ context }) => context.queryClient.ensureQueryData(sppiQueryOptions()),
  head: () =>
    seoHead({
      title: "運輸関連の企業向けサービス価格指数(SPPI) | Logisight",
      description:
        "外航・国際航空・陸上・港湾運送・倉庫の価格指数を、円ベースと契約通貨ベースに分けて掲載。日本銀行 企業向けサービス価格指数にもとづく月次データ。",
      path: "/rates",
    }),
  component: LogisightJpRates,
});
