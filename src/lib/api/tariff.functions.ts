import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  DEFAULT_ORIGINS,
  MAX_ORIGINS,
  classifyInput,
  normalizeQuery,
  toOriginRow,
  type LandedIqLine,
  type LandedIqResponse,
  type OriginRow,
} from "./tariff";

// jp_tariff_cache は生成済み Database 型にまだ無い → レポ慣例どおりキャストする。
const sb = supabaseAdmin as unknown as SupabaseClient;

const TTL_MS = 24 * 60 * 60 * 1000;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * 相手を 1 回だけ呼ぶ。落ちても投げない —— 1 か国が取れなくても、
 * 残りの国は見せたい。呼び出し側が null を「取れなかった」として扱う。
 */
async function callLandedIq(
  q: string,
  origin: string,
  asOf: string,
): Promise<LandedIqResponse | null> {
  const url = process.env.LANDEDIQ_SUPABASE_URL;
  const key = process.env.LANDEDIQ_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/functions/v1/hts-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ q, origin, asOf }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null; // 429 もここに落ちる。古いキャッシュで凌ぐ。
    return (await r.json()) as LandedIqResponse;
  } catch {
    return null;
  }
}

/**
 * キャッシュ → 無ければ相手。期限切れでも、相手が取れなければそれを使う。
 * 戻り値の stale は画面の時点表示に使う。
 */
async function lookup(
  qNorm: string,
  q: string,
  origin: string,
  asOf: string,
): Promise<{ res: LandedIqResponse | null; fetchedAt: string | null }> {
  const { data: hit } = await sb
    .from("jp_tariff_cache")
    .select("payload,fetched_at")
    .eq("q_norm", qNorm)
    .eq("origin", origin)
    .eq("as_of", asOf)
    .maybeSingle();

  const fresh = hit && Date.now() - new Date(hit.fetched_at as string).getTime() < TTL_MS;
  if (fresh) return { res: hit!.payload as LandedIqResponse, fetchedAt: hit!.fetched_at as string };

  const res = await callLandedIq(q, origin, asOf);
  if (!res) {
    // 相手が駄目でも、古い値があるなら見せる。時点は正直に出す。
    if (hit) return { res: hit.payload as LandedIqResponse, fetchedAt: hit.fetched_at as string };
    return { res: null, fetchedAt: null };
  }

  const now = new Date().toISOString();
  await sb
    .from("jp_tariff_cache")
    .upsert(
      { q_norm: qNorm, origin, as_of: asOf, payload: res, fetched_at: now },
      { onConflict: "q_norm,origin,as_of" },
    );
  return { res, fetchedAt: now };
}

/**
 * 候補行を返す。10 桁のコードなら 1 行に決まるが、それ以外(頭・英語)は
 * 数行返るので、利用者に選んでもらう。勝手に先頭を使わない ——
 * 8703.23 の先頭は「Motor homes」(キャンピングカー)である。
 */
export const getTariffCandidates = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string().min(1).max(120) }))
  .handler(
    async ({
      data,
    }): Promise<{ asOf: string; lines: { code: string; leaf: string; description: string }[] }> => {
      setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

      const kind = classifyInput(data.q);
      if (kind.kind === "unknown") return { asOf: today(), lines: [] };

      // 辞書に当たったら、その HS の頭で照会する。
      const q = kind.kind === "term" ? kind.term!.hs : kind.q;
      const asOf = today();
      // 候補を出すだけなので、代表として 1 か国(日本)だけ引く。
      const { res } = await lookup(normalizeQuery(q), q, "JP", asOf);
      if (!res) return { asOf, lines: [] };

      return {
        asOf: res.as_of ?? asOf,
        lines: res.results.map((l) => ({
          code: l.code,
          leaf: l.leaf ?? "",
          description: l.description,
        })),
      };
    },
  );

/** 10 桁のコード 1 つを、原産地ごとに引き比べる。 */
export const getOriginComparison = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      code: z.string().regex(/^\d{10}$/),
      origins: z.array(z.string().length(2)).max(MAX_ORIGINS).optional(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ asOf: string; code: string; description: string; rows: OriginRow[] }> => {
      setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

      const asOf = today();
      const qNorm = normalizeQuery(data.code);
      const wanted = data.origins?.length
        ? DEFAULT_ORIGINS.filter((o) => data.origins!.includes(o.code))
        : DEFAULT_ORIGINS;

      const settled = await Promise.all(
        wanted.map(async (o) => {
          const { res } = await lookup(qNorm, data.code, o.code, asOf);
          const line: LandedIqLine | null = res?.results?.[0] ?? null;
          return { o, line };
        }),
      );

      const first = settled.find((s) => s.line)?.line ?? null;
      const rows = settled
        .map(({ o, line }) => toOriginRow(o.code, o.ja, line))
        // 低い順。「どこから出せば安いか」が読む順序である。
        .sort(
          (a, b) =>
            (a.totalPct ?? Number.POSITIVE_INFINITY) - (b.totalPct ?? Number.POSITIVE_INFINITY),
        );

      return { asOf, code: data.code, description: first?.description ?? "", rows };
    },
  );
