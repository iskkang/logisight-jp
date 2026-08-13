/**
 * 日本の輸出統計品目番号から、米国側の HTS ラインを引く —— 型と純粋な変換。
 *
 * ■ 税率は出さない
 * 以前ここで原産地別の税率を並べていたが、原簿は MFN と追加関税しか持たず、
 * 特恵税率(USMCA・KORUS など)も Section 232 も入っていない。しかも USMCA を
 * 使えるかは部品構成で決まるので、品目番号だけでは判定できない。
 * だから税率には触れない。**「どのラインになるか」までを答え、いくら払うかは
 * 通関業者と輸入者に渡す。** 品目カタログ自体は USITC の公式 export そのままで、
 * 欠けている部分が無い。出せるものだけを出す。
 *
 * ■ なぜ橋渡しなのか
 * 日本の荷主が持っているのは輸出統計品目番号(9桁)である。分からないのは
 * それが米国側でどの 10 桁になるかで、米国の税率を分けるのはその 10 桁である。
 * 頭 6 桁(HS6)は国際共通なので、ここで両者がつながる。
 * 米国の公式サイトは日本の番号を知らず、日本の税関サイトは米国のラインを知らない。
 *
 * LandedIQ のエッジ関数の応答の形を知っているのは、このファイルだけである。
 */
import { queryOptions } from "@tanstack/react-query";

import { lookupHs, type HsTerm } from "./hs-dictionary";
import { getHsLines } from "./hs-lines.functions";

// ── LandedIQ の応答(必要な分だけ) ──────────────────────────────

export type LandedIqLine = {
  code: string;
  description: string;
  leaf: string | null;
};

export type LandedIqResponse = {
  as_of: string;
  query: string;
  results: LandedIqLine[];
  truncated?: boolean;
};

// ── 画面に出す形 ───────────────────────────────────────────────

export type HsLine = {
  /** 米国 HTS の 10 桁。 */
  code: string;
  /** その行自身の末尾の節。行どうしを見分ける主な手がかり。 */
  leaf: string;
  /** 末尾の一つ上の階層。「Other」が並ぶときはここでしか区別が付かない。 */
  parent: string;
  /** 入れ子の全文。切らずに渡す。 */
  description: string;
};

// ── 入力の判別 ─────────────────────────────────────────────────

export type InputKind = {
  kind: "code" | "term" | "unknown";
  /** 照会に使う HS6(数字のみ)。unknown のときは空。 */
  hs6: string;
  /** 入力そのもの。画面に出し戻すのに使う。 */
  raw: string;
  term?: HsTerm;
};

/**
 * 受け取れるもの:
 *   - 日本の輸出統計品目番号   8708.29-090 / 870829090
 *   - 米国 HTS                8708.29 / 8708291500
 *   - 辞書にある日本語の品目名  自動車部品
 *
 * どれも頭 6 桁に落とす。HS6 は国際共通なので、そこまでは同じものを指す。
 * 6 桁に満たない入力(章や項だけ)も、そのまま前方一致で引ける。
 */
export function classifyInput(raw: string): InputKind {
  const q = raw.trim();
  if (!q) return { kind: "unknown", hs6: "", raw: q };

  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4) return { kind: "code", hs6: digits.slice(0, 6), raw: q };

  const term = lookupHs(q);
  if (term) return { kind: "term", hs6: term.hs.replace(/\D/g, ""), raw: q, term };

  return { kind: "unknown", hs6: "", raw: q };
}

/** キャッシュキー。数字だけなので表記ゆれで別物として貯まらない。 */
export function normalizeQuery(hs6: string): string {
  return hs6.replace(/\D/g, "");
}

/**
 * 末尾の一つ上の階層を取り出す。
 *
 * 原簿の説明文は「大分類 > 中分類 > 小分類 > 末端」と入れ子で長い。
 * 末尾から一定文字数で切ると語の途中から始まって読めない(以前それをやって
 * 「ines: > Of a cylinder…」のような表示になった)。かといって末端だけでは
 * 足りない —— 8703.23 では「Other」が 3 行あり、違いは一つ上の階層にしかない。
 */
export function parentOf(description: string, leaf: string | null): string {
  const parts = description
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);
  const end = leaf && parts[parts.length - 1] === leaf ? parts.length - 1 : parts.length;
  return parts[end - 1] ?? "";
}

export function toHsLine(l: LandedIqLine): HsLine {
  return {
    code: l.code,
    leaf: l.leaf ?? "",
    parent: parentOf(l.description, l.leaf),
    description: l.description,
  };
}

/**
 * 8708291500 → 8708.29.15.00。区切りが見えないと、書類と読み合わせができない。
 * 項(4)・号(6)・8桁・10桁のどれで来ても、そこまでを区切って返す。
 * 想定外の桁数は、無理に区切らずそのまま返す —— 嘘の形にするほうが害が大きい。
 */
export function dotted(code: string): string {
  const d = code.replace(/\D/g, "");
  const cuts: Record<number, number[]> = { 4: [4], 6: [4, 6], 8: [4, 6, 8], 10: [4, 6, 8, 10] };
  const at = cuts[d.length];
  if (!at) return code;
  return at.map((end, i) => d.slice(i === 0 ? 0 : at[i - 1], end)).join(".");
}

// ── キャッシュの新鮮さ ────────────────────────────────────────

/** 相手は IP 当たり毎分 30 回。品目カタログはほぼ動かないので長めに持つ。 */
export const HS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CacheFreshness = "fresh" | "stale" | "miss";

/**
 * キャッシュ行の新鮮さ。lookup() の中に直書きすると、Supabase をモックしないと
 * 境界値(TTL ちょうど・行が無い)を試せない。素の値だけで試せるよう切り出す。
 */
export function decideCacheFreshness(fetchedAt: string | null, now: number): CacheFreshness {
  if (fetchedAt == null) return "miss";
  const age = now - new Date(fetchedAt).getTime();
  return age < HS_CACHE_TTL_MS ? "fresh" : "stale";
}

// ── React Query の入口 ────────────────────────────────────────

export const hsLinesQueryOptions = (hs6: string) =>
  queryOptions({
    queryKey: ["hs", "lines", hs6],
    queryFn: () => getHsLines({ data: { hs6 } }),
    staleTime: 60 * 60 * 1000,
    enabled: /^\d{4,10}$/.test(hs6),
  });
