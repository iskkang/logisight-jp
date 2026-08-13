import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  decideCacheFreshness,
  normalizeQuery,
  toHsLine,
  type HsLine,
  type LandedIqResponse,
} from "./hs-lines";

/**
 * キャッシュ表 jp_tariff_cache は姉妹リポジトリ logisight の
 * supabase/migrations/20260812000004_jp_tariff_cache.sql にある。
 * この表が無いと毎回 LandedIQ を呼ぶことになる。
 *
 * 生成済み Database 型にはまだ無いので、レポ慣例どおりキャストして使う。
 */
const sb = supabaseAdmin as unknown as SupabaseClient;

/**
 * LandedIQ の所在。この URL は秘密ではない —— LandedIQ 自身の /hts が同じものを
 * ブラウザに出している。秘密でない値を設定必須にすると、鍵だけ入って URL が
 * 入らず静かに動かない、という事故が起きる(実際に起きた)。既定値を持たせ、
 * 移設したときだけ環境変数で上書きする。
 */
const LANDEDIQ_URL =
  process.env.LANDEDIQ_SUPABASE_URL || "https://hwcfjxwdmmlydnrfyjqk.supabase.co";

/**
 * 原産地は品目カタログに関係しない —— description も leaf も code だけで決まる。
 * ただしエッジ関数が引数として受けるので、固定値を渡してキャッシュキーを揺らさない。
 */
const ORIGIN_FIXED = "JP";

/** 失敗・欠測の応答を長く CDN に貼り付けない。相手が戻っても表示が古いままになる。 */
const DEGRADED_SWR_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=60";

const today = () => new Date().toISOString().slice(0, 10);

async function callLandedIq(q: string): Promise<LandedIqResponse | null> {
  const key = process.env.LANDEDIQ_ANON_KEY;
  if (!key) {
    // 黙って null を返すと「相手が落ちている」と区別が付かない。設定漏れは
    // 相手の障害ではなくこちらの落ち度なので、必ず記録に残す。
    console.error("[hs] LANDEDIQ_ANON_KEY が実行環境に無い。Production に入れて再デプロイする。");
    return null;
  }
  const t0 = Date.now();
  try {
    const r = await fetch(`${LANDEDIQ_URL}/functions/v1/hts-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ q, origin: ORIGIN_FIXED }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error(`[hs] hts-lookup HTTP ${r.status} (${q}) ${Date.now() - t0}ms`);
      return null;
    }
    return (await r.json()) as LandedIqResponse;
  } catch (e) {
    console.error(`[hs] hts-lookup 失敗 (${q}) ${Date.now() - t0}ms: ${(e as Error).message}`);
    return null;
  }
}

/**
 * キャッシュ → 無ければ相手。相手が取れなければ、期限切れの行でも使う。
 * カタログは動きが遅いので、古い行を出すことの害は小さく、出せない害のほうが大きい。
 */
async function lookup(hs6: string): Promise<{ res: LandedIqResponse | null; stale: boolean }> {
  const qNorm = normalizeQuery(hs6);
  let hit: { payload: unknown; fetched_at: string } | null = null;
  try {
    const { data, error } = await sb
      .from("jp_tariff_cache")
      .select("payload,fetched_at")
      .eq("q_norm", qNorm)
      .eq("origin", ORIGIN_FIXED)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error(`[hs] キャッシュ読み込み失敗: ${error.message}`);
    else hit = data as typeof hit;
  } catch (e) {
    // キャッシュは速くするための層であって、真実の持ち主ではない。
    // ここで投げると、表が丸ごと出なくなる。読めなければ相手を呼べばよい。
    console.error(`[hs] キャッシュ読み込み例外: ${(e as Error).message}`);
  }

  if (decideCacheFreshness(hit?.fetched_at ?? null, Date.now()) === "fresh") {
    return { res: hit!.payload as LandedIqResponse, stale: false };
  }

  const res = await callLandedIq(hs6);
  if (!res) {
    if (hit) return { res: hit.payload as LandedIqResponse, stale: true };
    return { res: null, stale: false };
  }

  try {
    const { error } = await sb.from("jp_tariff_cache").upsert(
      {
        q_norm: qNorm,
        origin: ORIGIN_FIXED,
        as_of: today(),
        payload: res,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "q_norm,origin,as_of" },
    );
    if (error) console.error(`[hs] キャッシュ書き込み失敗: ${error.message}`);
  } catch (e) {
    console.error(`[hs] キャッシュ書き込み例外: ${(e as Error).message}`);
  }
  return { res, stale: false };
}

export type HsLinesResult = {
  hs6: string;
  asOf: string | null;
  lines: HsLine[];
  /** 相手に届かなかった。0 件とは別物である。 */
  upstreamFailed: boolean;
  /** 相手が答えたうえで 0 件だった。「そんな番号は無い」。 */
  notFound: boolean;
  /** 期限切れのキャッシュで代替した。 */
  stale: boolean;
  /** 相手が上限で切った(20 件)。全部ではないと伝える必要がある。 */
  truncated: boolean;
};

export const getHsLines = createServerFn({ method: "GET" })
  .inputValidator(z.object({ hs6: z.string().regex(/^\d{4,10}$/) }))
  .handler(async ({ data }): Promise<HsLinesResult> => {
    const { res, stale } = await lookup(data.hs6);

    if (!res) {
      setResponseHeader("cache-control", DEGRADED_SWR_CACHE);
      return {
        hs6: data.hs6,
        asOf: null,
        lines: [],
        upstreamFailed: true,
        notFound: false,
        stale: false,
        truncated: false,
      };
    }

    const lines = (res.results ?? []).map(toHsLine);
    // 0 件は確定した答えなので長く貼っても嘘にならない。古い行での代替だけ短くする。
    setResponseHeader("cache-control", stale ? DEGRADED_SWR_CACHE : PUBLIC_SWR_CACHE);
    return {
      hs6: data.hs6,
      asOf: res.as_of ?? null,
      lines,
      upstreamFailed: false,
      notFound: lines.length === 0,
      stale,
      truncated: Boolean(res.truncated),
    };
  });
