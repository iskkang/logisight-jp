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
  // 省略可にする —— URL に無いときはキー自体を返さないため(韓国版と同じ形)
  dir?: string[];
  series?: string[];
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
        "海上運賃指数・航路の今後2〜4週の方向を定量モデルで採点して発行する。判定日の実測で事後の的中を評価する。",
      path: "/forecasts",
      koPath: "/forecasts",
    });
    return { ...base, meta: [...base.meta, { name: "robots", content: "noindex,nofollow" }] };
  },
  // URL に無いキーは返さない ★
  // dir・series が常に [] を返していたため、ルーターがアドレスを
  // ?dir=%5B%5D&series=%5B%5D に正規化して毎回 307 を出していた。
  // 全ページのヘッダーがこのリンクを貼っているので、訪問のたびに 1 ホップ余計に踏む。
  // 韓国版は既にこの書き方になっている(logisight-core/src/routes/forecasts.tsx)。
  validateSearch: (s: Record<string, unknown>): Search => {
    const dir = arr(s.dir);
    const series = arr(s.series);
    return {
      ...(s.cadence === "weekly" || s.cadence === "monthly" ? { cadence: s.cadence } : {}),
      ...(dir.length > 0 ? { dir } : {}),
      ...(series.length > 0 ? { series } : {}),
      ...(typeof s.sel === "string" ? { sel: s.sel } : {}),
      ...(typeof s.mod === "string" ? { mod: s.mod } : {}),
    };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(publishedForecastsQueryOptions()),
      context.queryClient.ensureQueryData(forecastSeriesQueryOptions()),
      context.queryClient.ensureQueryData(eurasiaRailBriefQueryOptions()),
    ]);
  },
  component: LogisightForecast,
});
