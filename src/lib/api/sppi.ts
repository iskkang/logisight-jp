import { queryOptions } from "@tanstack/react-query";

import { getSppi } from "./sppi.functions";

/**
 * 企業向けサービス価格指数(SPPI)の運輸関連系列。
 * 円ベース = 運賃の動き + 為替の動き / 契約通貨ベース = 運賃そのものの動きに近い。
 * 両者を必ず区別して見せる — 混同すると解釈が逆になる。
 */
export type SppiSeries = {
  name: string;
  category: string;
  yen: number | null;
  contract: number | null;
  yoyYenPct: number | null;
  yoyContractPct: number | null;
};

/** 折れ線用の1点。円ベースと契約通貨ベースを同じ月で並べる。 */
export type SppiPoint = {
  period: string; // "2026-06"
  label: string; // "26/06"
  yen: number | null;
  contract: number | null;
};

export type SppiData = {
  period: string | null; // "2026-06"
  baseYear: string;
  series: SppiSeries[];
  /** 契約通貨ベースが基準年(100)を下回る系列。実質の運賃水準が2020年以下という意味。 */
  belowBase: SppiSeries[];
  /** 主要系列の推移(古い順)。単月の表だけでは水準の動きが読めない。 */
  history: { name: string; points: SppiPoint[] }[];
};

/** 折れ線に出す系列。全系列を重ねると読めないので、海上・航空の代表に絞る。 */
export const CHART_SERIES = ["外航貨物輸送", "国際航空貨物輸送", "海上貨物輸送"] as const;

export const sppiQueryOptions = () =>
  queryOptions({
    queryKey: ["jp_price_indices", "sppi"],
    queryFn: () => getSppi(),
    staleTime: 30 * 60 * 1000,
  });

export function formatIndex(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? "—" : n.toFixed(1);
}

/** 前年同月比。日本の財務表記に合わせ、マイナスは ▲。 */
export function formatYoy(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n < 0 ? `▲${Math.abs(n).toFixed(1)}%` : `+${n.toFixed(1)}%`;
}

export function formatSppiPeriod(p: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})$/.exec(p ?? "");
  return m ? `${m[1]}年${Number(m[2])}月` : "—";
}
