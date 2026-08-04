import { queryOptions } from "@tanstack/react-query";

import { getJpTrade } from "./jp-trade.functions";

/**
 * 財務省貿易統計の国名は英字略号("HG KONG" "SNGAPOR")。
 * 月次レポート(generators/jp-report/research/facts.js)と同じ対応表を持つ。
 * 表に無い相手国は原文のまま出す — 新しい相手国が入っても表が空欄にならない。
 */
const COUNTRY_JA: Record<string, string> = {
  USA: "米国",
  CHINA: "中国",
  TAIWAN: "台湾",
  "R KOREA": "韓国",
  "HG KONG": "香港",
  THAILND: "タイ",
  SNGAPOR: "シンガポール",
  VIETNAM: "ベトナム",
  INDIA: "インド",
  AUSTRAL: "オーストラリア",
  MALYSIA: "マレーシア",
  GERMANY: "ドイツ",
  CANADA: "カナダ",
  MEXICO: "メキシコ",
  "U KING": "英国",
  INDNSIA: "インドネシア",
  PHILPIN: "フィリピン",
  FRANCE: "フランス",
  ITALY: "イタリア",
  NETHRLD: "オランダ",
  BRAZIL: "ブラジル",
  RUSSIA: "ロシア",
  "SAUDI A": "サウジアラビア",
  UAE: "アラブ首長国連邦",
};

export const countryJa = (name: string): string => COUNTRY_JA[name] ?? name;

export type JpTradeCountry = {
  name: string;
  exportJpy: number | null;
  importJpy: number | null;
  balanceJpy: number | null;
  yoyExportPct: number | null;
  yoyImportPct: number | null;
};

export type JpTradeCommodity = {
  name: string;
  valueJpy: number;
  sharePct: number;
};

export type JpTradeData = {
  period: string | null; // "2026-06"
  total: JpTradeCountry | null;
  countries: JpTradeCountry[];
  exportItems: JpTradeCommodity[];
  importItems: JpTradeCommodity[];
};

export const jpTradeQueryOptions = () =>
  queryOptions({
    queryKey: ["jp_trade", "latest"],
    queryFn: () => getJpTrade(),
    staleTime: 30 * 60 * 1000,
  });

/** "2026-06" → "2026年6月" */
export function formatJpPeriod(p: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})$/.exec(p ?? "");
  return m ? `${m[1]}年${Number(m[2])}月` : "—";
}

/** 千円 → 兆・億円。レポート本文と単位を揃える。 */
export function formatJpy(thousandYen: number | null | undefined): string {
  if (thousandYen == null || !Number.isFinite(thousandYen)) return "—";
  const yen = Math.abs(thousandYen) * 1000;
  const sign = thousandYen < 0 ? "▲" : "";
  if (yen >= 1e12) {
    const cho = Math.floor(yen / 1e12);
    const oku = Math.round((yen % 1e12) / 1e8);
    return `${sign}${cho}兆${oku > 0 ? `${oku.toLocaleString("ja-JP")}億` : ""}円`;
  }
  return `${sign}${Math.round(yen / 1e8).toLocaleString("ja-JP")}億円`;
}

/** 前年同月比。日本の財務表記に合わせ、マイナスは ▲。 */
export function formatYoy(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n < 0 ? `▲${Math.abs(n).toFixed(1)}%` : `+${n.toFixed(1)}%`;
}
