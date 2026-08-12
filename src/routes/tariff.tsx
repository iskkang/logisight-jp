import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { JpTariff } from "@/components/tariff/JpTariff";
import { seoHead } from "@/lib/seo";

const tariffSearchSchema = z.object({
  /** 10 桁の HTS コード。リンクで共有できるように search に置く。 */
  code: z
    .string()
    .regex(/^\d{10}$/)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/tariff")({
  validateSearch: tariffSearchSchema,
  head: () =>
    seoHead({
      title: "原産地別 対米関税比較 — Logisight",
      description:
        "同じ品目を日本・中国・ベトナム・タイ・メキシコ・韓国から米国に出したとき、関税がどれだけ違うかを並べて比べます。MFN・Section 301・上限補正の内訳つき。",
      path: "/tariff",
    }),
  component: TariffPage,
});

function TariffPage() {
  const { code } = Route.useSearch();
  return <JpTariff code={code ?? ""} />;
}
