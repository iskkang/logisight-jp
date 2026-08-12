/**
 * 原産地別 対米関税比較 —— 型と純粋な変換。
 *
 * LandedIQ のエッジ関数 hts-lookup の応答の形を知っているのは、この
 * ファイルだけである。相手の API が変わったときに直す場所を 1 か所に
 * 保つため、ここから外へ生の形を漏らさない。
 */
import { queryOptions } from "@tanstack/react-query";

import { lookupHs, type HsTerm } from "./hs-dictionary";
import { getOriginComparison, getTariffCandidates } from "./tariff.functions";

// ── LandedIQ の応答 ────────────────────────────────────────────

export type LandedIqProgram = {
  code: string;
  name: string;
  authority: string;
  /** 加算分。上限補正の場合は「差額」がすでに入っている。 */
  rate: number;
  rate_type: "additive" | "top_up_to_total";
  exclusion: "none" | "confirmed" | "unverified";
};

export type LandedIqLine = {
  code: string;
  description: string;
  leaf: string | null;
  base_mfn: number | null;
  programs: LandedIqProgram[];
  /** 従量税・複合税の行は null で返る(原簿 19,831 行のうち 2,198 行)。 */
  duty_rate_total: number | null;
  unresolved: string[];
  exclusion_status: "none" | "confirmed" | "unverified";
  warnings: string[];
};

export type LandedIqResponse = {
  as_of: string;
  query: string;
  results: LandedIqLine[];
  truncated?: boolean;
};

// ── 画面に出す形 ───────────────────────────────────────────────

export type OriginRow = {
  origin: string;
  labelJa: string;
  /**
   * ok             税率が出た
   * unavailable    取れなかった(相手が落ちている・制限に掛かった)
   * non_ad_valorem 従量税なので比べられない
   *
   * unavailable を 0% として描いてはいけない。「関税が無い」と
   * 「取れなかった」は別のことである。
   */
  status: "ok" | "unavailable" | "non_ad_valorem";
  totalPct: number | null;
  breakdown: { label: string; pct: number }[];
  warnings: string[];
};

/** 日本の製造業が実際に検討する移転先。 */
export const DEFAULT_ORIGINS = [
  { code: "JP", ja: "日本" },
  { code: "CN", ja: "中国" },
  { code: "VN", ja: "ベトナム" },
  { code: "TH", ja: "タイ" },
  { code: "MX", ja: "メキシコ" },
  { code: "KR", ja: "韓国" },
];

/**
 * 原産地 1 つが LandedIQ 呼び出し 1 回になる。相手は IP 当たり毎分 30 回
 * なので、上限が無いと一人で使い切ってしまう。
 */
export const MAX_ORIGINS = 8;

// ── 入力の判別 ─────────────────────────────────────────────────

export type InputKind = {
  kind: "code" | "term" | "english" | "unknown";
  q: string;
  term?: HsTerm;
};

const CODE_SHAPE = /^[\d.\s-]+$/;
const ASCII_ONLY = /^[ -~]+$/;

/**
 * 数字4桁以上 → コード。辞書に当たれば → その HS。ASCII なら → 英語。
 * それ以外(未登録の日本語)は unknown にして、辞書のチップを出す。
 * 機械翻訳して当てにいかない。
 */
export function classifyInput(raw: string): InputKind {
  const q = raw.trim();
  if (!q) return { kind: "unknown", q: "" };
  if (CODE_SHAPE.test(q) && q.replace(/\D/g, "").length >= 4) return { kind: "code", q };
  const term = lookupHs(q);
  if (term) return { kind: "term", q, term };
  if (ASCII_ONLY.test(q)) return { kind: "english", q };
  return { kind: "unknown", q };
}

/** キャッシュキー用。表記ゆれで別物として貯めない。 */
export function normalizeQuery(raw: string): string {
  const q = raw.trim();
  if (CODE_SHAPE.test(q)) return q.replace(/\D/g, "");
  return q.toLowerCase().replace(/\s+/g, " ");
}

// ── 応答 → 行 ─────────────────────────────────────────────────

/** 原簿のコードを日本語にする。知らないものは相手の名前をそのまま出す。 */
const PROGRAM_JA: Record<string, string> = {
  mfn: "MFN",
  "301-forced-labor-topup": "上限補正",
  "301-forced-labor": "強制労働301",
  "301-china-list1": "301リスト1",
  "301-china-list2": "301リスト2",
  "301-china-list3": "301リスト3",
  "301-china-list4a": "301リスト4A",
};

const pct1 = (r: number) => Math.round(r * 1000) / 10;

export function toOriginRow(origin: string, labelJa: string, line: LandedIqLine | null): OriginRow {
  if (!line) {
    return { origin, labelJa, status: "unavailable", totalPct: null, breakdown: [], warnings: [] };
  }

  const warnings = [
    ...(line.warnings ?? []),
    ...(line.unresolved ?? []).map((u) => `未確定: ${u}`),
    ...(line.exclusion_status === "unverified"
      ? ["除外の根拠が未確認のため、全額を課税として表示している"]
      : []),
  ];

  if (line.duty_rate_total == null) {
    return { origin, labelJa, status: "non_ad_valorem", totalPct: null, breakdown: [], warnings };
  }

  return {
    origin,
    labelJa,
    status: "ok",
    totalPct: pct1(line.duty_rate_total),
    breakdown: [...line.programs]
      .sort((a, b) => b.rate - a.rate)
      .map((p) => ({ label: PROGRAM_JA[p.code] ?? p.name, pct: pct1(p.rate) })),
    warnings,
  };
}

/**
 * 合計は各プログラムの単純合計に一致する。上限補正の rate には差額が
 * 入っているので、特別扱いは要らない(実測: MFN 2.5 + 上限補正 10.0 = 12.5)。
 * ここが崩れたら原簿側で意味が変わったということなので、契約テストで見張る。
 */
export function totalMatchesPrograms(line: LandedIqLine): boolean {
  if (line.duty_rate_total == null) return true;
  const sum = line.programs.reduce((s, p) => s + p.rate, 0);
  return Math.abs(sum - line.duty_rate_total) < 1e-6;
}

// ── React Query の入口 ────────────────────────────────────────

export const tariffCandidatesQueryOptions = (q: string) =>
  queryOptions({
    queryKey: ["tariff", "candidates", q],
    queryFn: () => getTariffCandidates({ data: { q } }),
    staleTime: 60 * 60 * 1000,
    enabled: q.trim().length > 0,
  });

export const originComparisonQueryOptions = (code: string, origins?: string[]) =>
  queryOptions({
    queryKey: ["tariff", "compare", code, origins ?? []],
    queryFn: () => getOriginComparison({ data: { code, origins } }),
    staleTime: 60 * 60 * 1000,
    enabled: /^\d{10}$/.test(code),
  });
