import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import type { SppiData, SppiSeries } from "./sppi";

const sb = supabasePublicServer as unknown as SupabaseClient;

type Row = {
  series_name: string;
  basis: string; // 'yen' | 'contract'
  category: string;
  year: number;
  month: number;
  value: number | null;
  base_year: string | null;
};

/** 指数の基準年の値。契約通貨ベースがこれを下回る = 実質の運賃が基準年以下。 */
const INDEX_BASE = 100;

/** 表示順。海上→航空→陸上→港湾・倉庫。全系列を並べるだけでは読めない。 */
const CATEGORY_ORDER = ["ocean", "air", "land", "port", "warehouse", "total"];

export const getSppi = createServerFn({ method: "GET" }).handler(async (): Promise<SppiData> => {
  setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

  // 直近2年ぶんを取り、最新月と前年同月を突き合わせる。
  const { data, error } = await sb
    .from("jp_price_indices")
    .select("series_name,basis,category,year,month,value,base_year")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return { period: null, baseYear: "2020", series: [], belowBase: [] };

  const { year, month } = rows[0];
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const baseYear = rows[0].base_year ?? "2020";

  const at = (y: number, m: number) => rows.filter((r) => r.year === y && r.month === m);
  const current = at(year, month);
  const prev = at(year - 1, month);

  const valueOf = (list: Row[], name: string, basis: string): number | null => {
    const hit = list.find((r) => r.series_name === name && r.basis === basis);
    return hit && hit.value !== null ? Number(hit.value) : null;
  };

  const yoy = (now: number | null, before: number | null): number | null =>
    now === null || before === null || before === 0 ? null : ((now - before) / before) * 100;

  const names: string[] = [];
  for (const r of current) if (!names.includes(r.series_name)) names.push(r.series_name);

  const series: SppiSeries[] = names.map((name) => {
    const category = current.find((r) => r.series_name === name)?.category ?? "total";
    const yen = valueOf(current, name, "yen");
    const contract = valueOf(current, name, "contract");
    return {
      name,
      category,
      yen,
      contract,
      yoyYenPct: yoy(yen, valueOf(prev, name, "yen")),
      yoyContractPct: yoy(contract, valueOf(prev, name, "contract")),
    };
  });

  series.sort((a, b) => {
    const d = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return d !== 0 ? d : (b.yen ?? 0) - (a.yen ?? 0);
  });

  return {
    period,
    baseYear,
    series,
    belowBase: series.filter((s) => s.contract !== null && s.contract < INDEX_BASE),
  };
});
