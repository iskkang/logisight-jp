import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import { countryJa, type JpTradeCommodity, type JpTradeCountry, type JpTradeData } from "./jp-trade";

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

type CommodityRow = {
  direction: string;
  commodity_name: string;
  year: number;
  month: number;
  value_jpy: number | null;
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

/** 方向ごとに構成比を出す。分母はその月・その方向の合計。 */
function toItems(rows: CommodityRow[], direction: string): JpTradeCommodity[] {
  const mine = rows.filter((r) => r.direction === direction && Number(r.value_jpy) > 0);
  const total = mine.reduce((a, r) => a + Number(r.value_jpy), 0);
  if (total === 0) return [];
  return mine
    .map((r) => ({
      name: r.commodity_name,
      valueJpy: Number(r.value_jpy),
      sharePct: (Number(r.value_jpy) / total) * 100,
    }))
    .sort((a, b) => b.valueJpy - a.valueJpy);
}

export const getJpTrade = createServerFn({ method: "GET" }).handler(
  async (): Promise<JpTradeData> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

    const { data: cData, error: cErr } = await sb
      .from("jp_trade_stats")
      .select("country_name,is_aggregate,year,month,export_jpy,import_jpy,yoy_export_pct,yoy_import_pct")
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

    const { data: iData, error: iErr } = await sb
      .from("jp_trade_by_commodity")
      .select("direction,commodity_name,year,month,value_jpy")
      .eq("year", year)
      .eq("month", month)
      .limit(1000);
    if (iErr) throw new Error(iErr.message);

    const items = (iData ?? []) as CommodityRow[];

    return {
      period,
      total: totalRow ? toCountry(totalRow) : null,
      countries,
      exportItems: toItems(items, "export"),
      importItems: toItems(items, "import"),
    };
  },
);
