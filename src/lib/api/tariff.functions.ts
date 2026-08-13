import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  DEFAULT_ORIGINS,
  classifyInput,
  decideCacheFreshness,
  normalizeQuery,
  resolveAsOf,
  toOriginRow,
  type LandedIqLine,
  type LandedIqResponse,
  type OriginRow,
} from "./tariff";

// jp_tariff_cache は生成済み Database 型にまだ無い → レポ慣例どおりキャストする。
// テーブルの DDL は本リポジトリには無い —— logisight(姉妹リポジトリ)の
// supabase/migrations/20260812000004_jp_tariff_cache.sql が定義側。jp_* テーブルは
// 全て向こうに集約する慣例どおりで、これはその慣例に従っているだけである。
// ただし忘れやすいので明記しておく: 向こうで migration を適用しない限り永続キャッシュは
// 効かず、§4 のとおり原産地6か国×比較5件で毎分30回の枠を使い切る。
const sb = supabaseAdmin as unknown as SupabaseClient;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * この 2 つの関数はレポ慣例([error] なら throw する)とあえて違え、相手が
 * 落ちても投げない —— 理由は lookup() の JSDoc のとおり。ただし成功と失敗を
 * 同じ 200 で返す以上、CDN のキャッシュヘッダーまで PUBLIC_SWR_CACHE 固定に
 * すると、30 秒の不通が「取得できず」を CDN に 1 時間・stale-while-revalidate
 * で 1 日、生かし続けてしまう。DB 側キャッシュ(jp_tariff_cache)には正しく
 * 届かない層で埋まるので、失敗・欠測の応答だけ短い TTL に落とす。
 */
const DEGRADED_SWR_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=60";

/**
 * 相手を 1 回だけ呼ぶ。落ちても投げない —— 1 か国が取れなくても、
 * 残りの国は見せたい。呼び出し側が null を「取れなかった」として扱う。
 */
/**
 * LandedIQ の所在。既定値を持たせる。
 *
 * この URL は秘密ではない —— LandedIQ 自身の /hts が同じものをブラウザに出している。
 * 秘密でない値を設定必須にしたせいで、鍵だけ入って URL が入らず、本番が静かに
 * 動かないという状態を作ってしまった(ログには url=無 key=有 と出た)。
 * 設定が要るのは鍵だけにして、間違えられる箇所を半分に減らす。
 *
 * 移設したときだけ LANDEDIQ_SUPABASE_URL で上書きする。
 */
const LANDEDIQ_URL =
  process.env.LANDEDIQ_SUPABASE_URL || "https://hwcfjxwdmmlydnrfyjqk.supabase.co";

async function callLandedIq(
  q: string,
  origin: string,
  asOf: string,
): Promise<LandedIqResponse | null> {
  const url = LANDEDIQ_URL;
  const key = process.env.LANDEDIQ_ANON_KEY;
  if (!key) {
    // 黙って null を返すと「相手が落ちている」と区別が付かない。実際にそうなった —
    // 設定漏れのまま本番が動き、たまたまキャッシュに残っていた行だけが表示されて
    // 正常に見えていた。設定漏れは相手の障害ではなくこちらの落ち度なので記録に残す。
    console.error(
      "[tariff] LANDEDIQ_ANON_KEY が実行環境に無い。Production に入れて再デプロイする。",
    );
    return null;
  }
  const t0 = Date.now();
  try {
    const r = await fetch(`${url}/functions/v1/hts-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ q, origin, asOf }),
      signal: AbortSignal.timeout(8000),
    });
    // 429 もここに落ちる。古いキャッシュで凌ぐが、なぜ凌いだかは残す。
    if (!r.ok) {
      console.error(`[tariff] hts-lookup HTTP ${r.status} (${origin} ${q}) ${Date.now() - t0}ms`);
      return null;
    }
    return (await r.json()) as LandedIqResponse;
  } catch (e) {
    // 8 秒の打ち切りもここに来る。時間を出しておかないと、切れたのか
    // 届かなかったのかが後から分からない。
    console.error(
      `[tariff] hts-lookup 失敗 (${origin} ${q}) ${Date.now() - t0}ms: ${(e as Error).message}`,
    );
    return null;
  }
}

/**
 * キャッシュ → 無ければ相手。当日分の行が無くても、この (q_norm, origin) で
 * 一番新しい行を「相手が止まったときの代替」として使う。戻り値の fetchedAt は
 * 画面の時点表示に使う。stale は「今回相手が落ちて、古い行で代替した」経路を
 * 通ったときだけ true になる —— フレッシュなキャッシュ命中はここに含めない。
 *
 * select・upsert は失敗しても投げない。ここは高速化のための層であって
 * 正の情報源ではない(sppi.functions.ts / ports.functions.ts が `if (error)
 * throw` するのとはあえて違えてある)。1 か国のキャッシュ障害で
 * Promise.all(getOriginComparison)全体を落とすと、6 か国の比較が丸ごと
 * 失敗する ── キャッシュ層はミス扱いにして相手を呼びにいけば十分。
 */
async function lookup(
  qNorm: string,
  q: string,
  origin: string,
  asOf: string,
): Promise<{ res: LandedIqResponse | null; fetchedAt: string | null; stale: boolean }> {
  let hit: { payload: LandedIqResponse; fetched_at: string } | null = null;
  try {
    // as_of では絞らない —— 今日の行が無くても、この (q_norm, origin) の
    // 中で一番新しい行を拾う。ここを as_of = 今日 に絞ると、今日まだ
    // 1 回も取れていない日は必ず miss になり、過去の行に永遠に届かない。
    const { data, error } = await sb
      .from("jp_tariff_cache")
      .select("payload,fetched_at")
      .eq("q_norm", qNorm)
      .eq("origin", origin)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error(`[tariff] cache select failed (${origin}):`, error.message);
    else if (data) hit = data as { payload: LandedIqResponse; fetched_at: string };
  } catch (e) {
    console.error(`[tariff] cache select threw (${origin}):`, e);
  }

  if (decideCacheFreshness(hit?.fetched_at ?? null, Date.now()) === "fresh") {
    return { res: hit!.payload, fetchedAt: hit!.fetched_at, stale: false };
  }

  const res = await callLandedIq(q, origin, asOf);
  if (!res) {
    // 相手が駄目でも、古い値があるなら見せる。時点は正直に出す。この経路を
    // 通ったことを stale で呼び出し側(画面)に伝え、「以前の値」と明示させる。
    if (hit) return { res: hit.payload, fetchedAt: hit.fetched_at, stale: true };
    return { res: null, fetchedAt: null, stale: false };
  }

  const now = new Date().toISOString();
  try {
    const { error } = await sb
      .from("jp_tariff_cache")
      .upsert(
        { q_norm: qNorm, origin, as_of: asOf, payload: res, fetched_at: now },
        { onConflict: "q_norm,origin,as_of" },
      );
    if (error) console.error(`[tariff] cache upsert failed (${origin}):`, error.message);
  } catch (e) {
    console.error(`[tariff] cache upsert threw (${origin}):`, e);
  }
  return { res, fetchedAt: now, stale: false };
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
    }): Promise<{
      asOf: string;
      lines: { code: string; leaf: string; description: string }[];
      /** 相手に届かなかった(0件と別)。TariffSearch はここを見てメッセージを分ける。 */
      upstreamFailed?: boolean;
    }> => {
      const kind = classifyInput(data.q);
      if (kind.kind === "unknown") {
        // 相手を呼んですらいない、辞書と正規表現だけで決まる確定的な答え。
        // 長く CDN に置いて構わない。
        setResponseHeader("cache-control", PUBLIC_SWR_CACHE);
        return { asOf: today(), lines: [] };
      }

      // 辞書に当たったら、その HS の頭で照会する。
      const q = kind.kind === "term" ? kind.term!.hs : kind.q;
      const asOfParam = today();
      // 候補を出すだけなので、代表として 1 か国(日本)だけ引く。
      const { res, fetchedAt } = await lookup(normalizeQuery(q), q, "JP", asOfParam);
      if (!res) {
        // 相手に届かなかった。長く CDN に固定すると、一時的な不通が
        // 1 時間ぶん「取得できませんでした」に化けたままになる。
        setResponseHeader("cache-control", DEGRADED_SWR_CACHE);
        return { asOf: asOfParam, lines: [], upstreamFailed: true };
      }

      setResponseHeader("cache-control", PUBLIC_SWR_CACHE);
      return {
        asOf: resolveAsOf(res, fetchedAt) ?? asOfParam,
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
  .inputValidator(z.object({ code: z.string().regex(/^\d{10}$/) }))
  .handler(
    async ({
      data,
    }): Promise<{
      asOf: string;
      code: string;
      description: string;
      rows: OriginRow[];
      /** 表示中の値のうち少なくとも1つが「相手が落ちたので古い値で代替した」経路を通った。 */
      stale: boolean;
      /** 相手には届いたが、このコードに該当する行が無い。取得失敗とは別に扱う。 */
      notFound: boolean;
    }> => {
      const asOfParam = today();
      const qNorm = normalizeQuery(data.code);

      const settled = await Promise.all(
        DEFAULT_ORIGINS.map(async (o) => {
          const { res, fetchedAt, stale } = await lookup(qNorm, data.code, o.code, asOfParam);
          const line: LandedIqLine | null = res?.results?.[0] ?? null;
          // 相手には届いたが results が 0 件 = そのコードは存在しない。
          // 相手に届かなかった(res === null)とは違う話なので別に持つ。
          const notFound = res != null && res.results.length === 0;
          return { o, line, date: line ? resolveAsOf(res, fetchedAt) : null, stale, notFound };
        }),
      );

      if (settled.some((s) => s.notFound)) {
        // 存在しないコードは「もう一度試せば出る」障害ではない。表も
        // 時点footnoteも出さない —— 空の表に時点だけ付くと、何かは
        // 取れたかのように見えてしまう。
        setResponseHeader("cache-control", PUBLIC_SWR_CACHE);
        return {
          asOf: asOfParam,
          code: data.code,
          description: "",
          rows: [],
          stale: false,
          notFound: true,
        };
      }

      const first = settled.find((s) => s.line)?.line ?? null;
      const rows = settled
        .map(({ o, line }) => toOriginRow(o.code, o.ja, line))
        // 低い順。「どこから出せば安いか」が読む順序である。
        .sort(
          (a, b) =>
            (a.totalPct ?? Number.POSITIVE_INFINITY) - (b.totalPct ?? Number.POSITIVE_INFINITY),
        );

      // 表示する時点は一番古いものを採る —— 原産地ごとに取得時刻がずれるので、
      // 一番慎重な(=一番古い)主張にする。
      const dates = settled
        .map((s) => s.date)
        .filter((d): d is string => d != null)
        .sort();
      const asOf = dates[0] ?? asOfParam;
      const stale = settled.some((s) => s.stale);
      const degraded = stale || rows.some((r) => r.status === "unavailable");

      // 失敗・欠測を成功と同じ長さ CDN に固定しない。理由は DEGRADED_SWR_CACHE の定義を参照。
      setResponseHeader("cache-control", degraded ? DEGRADED_SWR_CACHE : PUBLIC_SWR_CACHE);

      return {
        asOf,
        code: data.code,
        description: first?.description ?? "",
        rows,
        stale,
        notFound: false,
      };
    },
  );
