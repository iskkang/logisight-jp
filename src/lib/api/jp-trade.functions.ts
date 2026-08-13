import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  aggregateCommodities,
  countryJa,
  type CommodityRow,
  type JpTradeCountry,
  type JpTradeData,
} from "./jp-trade";

// jp_* は生成済み Database 型にまだ無い → レポ慣例どおりキャストして使う。
const sb = supabasePublicServer as unknown as SupabaseClient;

type CountryRow = {
  country_name: string;
  is_aggregate: boolean;
  year: number;
  month: number;
  export_jpy: number | null;
  import_jpy: number | null;
  yoy_export_pct: number | null;
  yoy_import_pct: number | null;
};

const num = (v: number | null) => (v === null ? null : Number(v));

function toCountry(r: CountryRow): JpTradeCountry {
  const ex = num(r.export_jpy);
  const im = num(r.import_jpy);
  return {
    name: countryJa(r.country_name),
    exportJpy: ex,
    importJpy: im,
    balanceJpy: ex === null || im === null ? null : ex - im,
    yoyExportPct: num(r.yoy_export_pct),
    yoyImportPct: num(r.yoy_import_pct),
  };
}

/**
 * 品目の内訳まで取るかどうかを分ける。
 *
 * 品目表は「品目 × 相手国」の粒度で、1か月でも約 2,900 行ある。PostgREST は
 * 1回 1,000 行までなので全部取るのに 3〜4 往復し、1往復 ≈ 0.6 秒なので
 * ここだけで 2 秒強かかっていた。
 *
 * ところがトップ画面が使うのは総額と対象月だけで、品目の内訳は一行も描かない
 * (描いているのは /trade だけ)。描かないものを取るために、最初の 1 バイトが
 * 2 秒遅れていた —— TTFB 2.7 秒のほとんどがこれだった。
 *
 * 待たされる時間はそのまま読者の損なので、取る量を画面に合わせる。
 */
async function loadJpTrade(withItems: boolean): Promise<JpTradeData> {
  setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

  {
    const { data: cData, error: cErr } = await sb
      .from("jp_trade_stats")
      .select(
        "country_name,is_aggregate,year,month,export_jpy,import_jpy,yoy_export_pct,yoy_import_pct",
      )
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("export_jpy", { ascending: false })
      .limit(1000);
    if (cErr) throw new Error(cErr.message);

    const rows = (cData ?? []) as CountryRow[];
    if (rows.length === 0) {
      return { period: null, total: null, countries: [], exportItems: [], importItems: [] };
    }

    const { year, month } = rows[0];
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const sameMonth = rows.filter((r) => r.year === year && r.month === month);

    // Grand Total は is_aggregate=true の行。地域集計(ASIA など)も同じ印がつくので
    // 名前で総額行だけを取り、国別一覧からは集計行をすべて除く。
    const totalRow = sameMonth.find((r) => r.country_name === "Grand Total");
    const countries = sameMonth
      .filter((r) => !r.is_aggregate)
      .map(toCountry)
      .sort((a, b) => (b.exportJpy ?? 0) - (a.exportJpy ?? 0))
      .slice(0, 10);

    if (!withItems) {
      return {
        period,
        total: totalRow ? toCountry(totalRow) : null,
        countries,
        exportItems: [],
        importItems: [],
      };
    }

    // 品目 × 相手国の粒度なので1か月でも数千行になる。PostgREST の既定上限(1000)で
    // 黙って切れると合計が過少になるため、必ずページングして全件取る。
    const items: CommodityRow[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: iData, error: iErr } = await sb
        .from("jp_trade_by_commodity")
        .select("direction,commodity_name,value_jpy")
        .eq("year", year)
        .eq("month", month)
        .range(from, from + PAGE - 1);
      if (iErr) throw new Error(iErr.message);
      const page = (iData ?? []) as CommodityRow[];
      items.push(...page);
      if (page.length < PAGE) break;
    }

    return {
      period,
      total: totalRow ? toCountry(totalRow) : null,
      countries,
      exportItems: aggregateCommodities(items, "export"),
      importItems: aggregateCommodities(items, "import"),
    };
  }
}

/** /trade 用。品目の内訳まで取る。 */
export const getJpTrade = createServerFn({ method: "GET" }).handler(() => loadJpTrade(true));

/** トップ画面用。総額と対象月しか描かないので、品目の内訳は取らない。 */
export const getJpTradeSummary = createServerFn({ method: "GET" }).handler(() =>
  loadJpTrade(false),
);
