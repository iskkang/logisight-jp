import { queryOptions } from "@tanstack/react-query";

import { getPortThroughput } from "./ports.functions";

/** 主要6港。国土交通省 港湾統計の外国貿易コンテナ取扱量。 */
export const JP_PORT_NAMES: Record<string, string> = {
  JPTYO: "東京港",
  JPYOK: "横浜港",
  JPNGO: "名古屋港",
  JPUKB: "神戸港",
  JPOSA: "大阪港",
  JPKWS: "川崎港",
};

export const JP_MAJOR6 = "JP_MAJOR6";

export type PortThroughputRow = {
  port_code: string;
  year: number;
  month: number;
  teu: number | null;
  export_teu: number | null;
  import_teu: number | null;
  yoy_pct: number | null;
  is_preliminary: boolean | null;
};

/** 並べ替え・比較用のキー。"2026-05" */
export function periodKey(row: { year: number; month: number }): string {
  return `${row.year}-${String(row.month).padStart(2, "0")}`;
}

export type PortSeriesPoint = {
  period: string;
  teu: number | null;
  yoyPct: number | null;
  isPreliminary: boolean;
};

export type PortLatest = {
  code: string;
  name: string;
  teu: number | null;
  exportTeu: number | null;
  importTeu: number | null;
  yoyPct: number | null;
  isPreliminary: boolean;
};

export type PortThroughputData = {
  /** 直近月。合計行(JP_MAJOR6)を含まない港別。 */
  latest: PortLatest[];
  /** 主要6港 合計の直近月。 */
  total: PortLatest | null;
  /** 合計の時系列(古い順)。 */
  totalSeries: PortSeriesPoint[];
  /** 直近月の年月。データが無ければ null。 */
  period: string | null;
};

export const portThroughputQueryOptions = () =>
  queryOptions({
    queryKey: ["port_throughput", "jp"],
    queryFn: () => getPortThroughput(),
    staleTime: 30 * 60 * 1000,
  });

/** "2026-05" → "2026年5月" */
export function formatPortPeriod(p: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})$/.exec(p ?? "");
  if (!m) return "—";
  return `${m[1]}年${Number(m[2])}月`;
}

export function formatTeu(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ja-JP");
}

/**
 * 前年同月比。日本の財務表記に合わせ、マイナスは ▲ で表す。
 * 月次レポート(generators/jp-report)と表記を揃えている。
 */
export function formatYoy(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n < 0 ? `▲${Math.abs(n).toFixed(1)}%` : `+${n.toFixed(1)}%`;
}
