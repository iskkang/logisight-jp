import { createFileRoute } from "@tanstack/react-router";

import { LogisightForecast } from "@/components/forecast-page/LogisightForecast";
import {
  publishedForecastsQueryOptions,
  forecastSeriesQueryOptions,
} from "@/lib/api/forecasts";
import { eurasiaRailBriefQueryOptions } from "@/lib/api/eurasia-rail-brief";
import { seoHead } from "@/lib/seo";

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : [];

type Search = {
  cadence?: "weekly" | "monthly";
  dir: string[];
  series: string[];
  sel?: string;
  mod?: string;
};

export const Route = createFileRoute("/forecasts")({
  // 本文が韓国語のままのため、日本語コンテンツが用意できるまで非公開扱いにする。
  // メニューとサイトマップから外すだけでは、クローラが URL を辿って索引しうる。
  head: () => {
    const base = seoHead({
      title: "物流市場の見通し — Logisight",
      description:
        "海上運賃指数・航路の今後2〜4週の方向を定量モデルで採点し、編集を経て発行する AI 見通し。判定日の実測で事後の的中を評価する。",
      path: "/forecasts",
      koPath: "/forecasts",
    });
    return { ...base, meta: [...base.meta, { name: "robots", content: "noindex,nofollow" }] };
  },
  validateSearch: (s: Record<string, unknown>): Search => ({
    cadence: s.cadence === "weekly" || s.cadence === "monthly" ? s.cadence : undefined,
    dir: arr(s.dir),
    series: arr(s.series),
    sel: typeof s.sel === "string" ? s.sel : undefined,
    mod: typeof s.mod === "string" ? s.mod : undefined,
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(publishedForecastsQueryOptions()),
      context.queryClient.ensureQueryData(forecastSeriesQueryOptions()),
      context.queryClient.ensureQueryData(eurasiaRailBriefQueryOptions()),
    ]);
  },
  component: LogisightForecast,
});
