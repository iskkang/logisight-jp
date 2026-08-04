import { queryOptions } from "@tanstack/react-query";

import { getGlobalIndices } from "./global-indices.functions";

/**
 * 日本版で扱う世界の運賃指数。
 *
 * KCCI(韓国発)・KITA(韓国貿易協会)は韓国発着が基準なので載せない。
 * SCFI・CCFI・WCI・FBX・BDI とバンカーは発表元が世界共通で、日本の荷主にも意味がある。
 * 日本の SPPI は「日本国内の価格」、これらは「世界のスポット」— 並べて初めて
 * 日本の動きが世界の流れの中でどこにあるかが読める。
 */
export const GLOBAL_INDEX_META: {
  code: string;
  label: string;
  unit: string;
  group: "container" | "bulk" | "bunker";
}[] = [
  { code: "SCFI", label: "SCFI 総合", unit: "指数", group: "container" },
  { code: "SCFI_EU", label: "SCFI 上海→欧州", unit: "$/TEU", group: "container" },
  { code: "SCFI_USWC", label: "SCFI 上海→米西岸", unit: "$/FEU", group: "container" },
  { code: "SCFI_USEC", label: "SCFI 上海→米東岸", unit: "$/FEU", group: "container" },
  { code: "CCFI", label: "CCFI 総合", unit: "指数", group: "container" },
  { code: "WCI", label: "WCI 総合", unit: "$/FEU", group: "container" },
  { code: "FBX", label: "FBX 総合", unit: "$/FEU", group: "container" },
  { code: "BDI", label: "BDI(バルク)", unit: "指数", group: "bulk" },
  { code: "VLSFO", label: "VLSFO(低硫黄C重油)", unit: "$/t", group: "bunker" },
  { code: "HSFO", label: "HSFO(高硫黄C重油)", unit: "$/t", group: "bunker" },
];

export const GLOBAL_INDEX_CODES = GLOBAL_INDEX_META.map((m) => m.code);

export const GROUP_LABEL: Record<string, string> = {
  container: "コンテナ",
  bulk: "バルク",
  bunker: "燃料",
};

export type GlobalIndex = {
  code: string;
  label: string;
  unit: string;
  group: string;
  value: number | null;
  changePct: number | null;
  weekDate: string | null;
  source: string | null;
};

export type GlobalIndicesData = {
  /** 掲載順に並べた指数。値が無い系列も「—」で残す — 欠測を隠さない。 */
  indices: GlobalIndex[];
  /** 直近の基準日。系列で揃わないことがあるので最も新しいものを出す。 */
  asOf: string | null;
};

export const globalIndicesQueryOptions = () =>
  queryOptions({
    queryKey: ["freight_indices", "global"],
    queryFn: () => getGlobalIndices(),
    staleTime: 30 * 60 * 1000,
  });

export function formatIndexValue(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

/** 変化率。日本の財務表記に合わせマイナスは ▲。 */
export function formatChange(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v < 0 ? `▲${Math.abs(v).toFixed(1)}%` : `+${v.toFixed(1)}%`;
}

/** "2026-08-01" → "2026年8月1日" */
export function formatAsOf(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : "—";
}
