/**
 * 物流費ベンチマーク — 契約時点と現時点のあいだで市場が何%動いたかを出し、
 * その内訳を「運賃要因」と「為替要因」に分ける。
 *
 * ■ なぜ分けるのか
 * 荷主が値上げを通告されたとき、要るのは「市場が何%上がったか」ではない。
 * 「そのうちいくらが運賃で、いくらが為替か」である。為替ぶんは相手の原価が
 * 上がったわけではないから、交渉の扱いが変わる。
 *
 * ■ 分けられる根拠
 * SPPI は同じ系列を二つの基準で出す。
 *   円ベース       = 運賃の動き × 為替の動き
 *   契約通貨ベース = 運賃の動きだけ
 * よって 円 ÷ 契約通貨 が為替の動きになる。
 * 実データで確かめられる — 外航貨物輸送 2026年6月は円 233.8 / 契約通貨 160.8 で
 * 比が 1.454。ドル円は2020年平均108円から157円前後で 157/108 = 1.45 と一致する。
 *
 * ■ 分けられない系列
 * 国内の系列(道路・鉄道・内航・港湾運送・倉庫)は契約通貨ベースを公表しない。
 * 円で契約するので為替要因がそもそもないからである。その場合は分解せず、
 * 円ベースの変動だけを返す。
 */

import { queryOptions } from "@tanstack/react-query";

import { getBenchmarkData } from "./benchmark.functions";

export const benchmarkQueryOptions = () =>
  queryOptions({
    queryKey: ["jp_price_indices", "benchmark"],
    queryFn: () => getBenchmarkData(),
    staleTime: 30 * 60 * 1000,
  });

/** 계열 하나의 두 시점 값. null은 그 시점에 그 기준의 공표가 없다는 뜻. */
export type BenchmarkPoint = {
  period: string; // "2024-04"
  yen: number | null;
  contract: number | null;
};

export type BenchmarkResult = {
  /** 円ベースの変動率(%)。市場全体としての動き。 */
  marketPct: number;
  /** 運賃要因(%)。契約通貨ベースの変動。国内系列では null。 */
  freightPct: number | null;
  /** 為替要因(%)。円 ÷ 契約通貨 から導く。国内系列では null。 */
  fxPct: number | null;
  /** 自社単価を市場と同じだけ動かした場合の金額。単価未入力なら null。 */
  marketAlignedPrice: number | null;
};

/**
 * 変動率を出す。
 *
 * 為替要因は差ではなく比で出す。円ベース = 運賃 × 為替 という積の関係なので、
 * 単純に引くと動きが大きいときにずれる。
 * 例: 運賃 +60%・為替 +45% のとき 円ベースは +105% ではなく +132% になる。
 */
export function benchmark(
  from: BenchmarkPoint,
  to: BenchmarkPoint,
  unitPrice: number | null,
): BenchmarkResult | null {
  if (from.yen === null || to.yen === null || from.yen === 0) return null;

  const marketRatio = to.yen / from.yen;
  const marketPct = (marketRatio - 1) * 100;

  let freightPct: number | null = null;
  let fxPct: number | null = null;
  if (from.contract !== null && to.contract !== null && from.contract !== 0) {
    const freightRatio = to.contract / from.contract;
    freightPct = (freightRatio - 1) * 100;
    fxPct = (marketRatio / freightRatio - 1) * 100;
  }

  return {
    marketPct,
    freightPct,
    fxPct,
    marketAlignedPrice:
      unitPrice !== null && Number.isFinite(unitPrice) ? unitPrice * marketRatio : null,
  };
}

/** 実際の提示額が市場並みからどれだけ離れているか(%)。 */
export function gapVsMarket(offered: number, marketAligned: number): number | null {
  if (!Number.isFinite(offered) || !Number.isFinite(marketAligned) || marketAligned === 0) {
    return null;
  }
  return (offered / marketAligned - 1) * 100;
}

/** 日本の財務表記。マイナスは ▲。 */
export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n < 0 ? `▲${Math.abs(n).toFixed(digits)}%` : `+${n.toFixed(digits)}%`;
}

export function yen(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("ja-JP");
}
