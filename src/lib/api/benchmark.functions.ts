import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";

const sb = supabasePublicServer as unknown as SupabaseClient;

/**
 * 系列 × 月 の指数をまとめて返す。
 *
 * 時点を変えるたびにサーバーを呼ばない。13系列 × 78か月ぶんでも圧縮すれば
 * 10KB ほどで、一度渡してしまえば操作が即座に返る。利用者は契約時点をあれこれ
 * 動かして試すので、その都度待たせる作りにはしない。
 *
 * 自社単価は受け取らない。計算はすべてブラウザの中で終わる。
 */

/** [円ベース, 契約通貨ベース]。契約通貨を公表しない国内系列は 2番目が null。 */
export type ValuePair = [number | null, number | null];

export type BenchmarkSeries = {
  name: string;
  category: string;
  /** 契約通貨ベースの公表があるか。無ければ運賃/為替の分解ができない。 */
  hasContract: boolean;
};

export type BenchmarkData = {
  baseYear: string;
  /** 古い順の "YYYY-MM"。選べる時点そのもの。 */
  periods: string[];
  series: BenchmarkSeries[];
  /** values[系列名][period] */
  values: Record<string, Record<string, ValuePair>>;
};

type Row = {
  series_name: string;
  basis: string;
  category: string;
  year: number;
  month: number;
  value: number | null;
  base_year: string | null;
};

/** 表示順。海上→航空→陸上→港湾・倉庫→全体。 */
const CATEGORY_ORDER = ["ocean", "air", "land", "port", "warehouse", "total"];

export const getBenchmarkData = createServerFn({ method: "GET" }).handler(
  async (): Promise<BenchmarkData> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

    // yen と contract だけ。ex_tax は円ベースと同値で、増やすと選択肢が濁る。
    //
    // 分けて取る。PostgREST は1回あたり1000行で頭打ちになり、limit を大きくしても
    // 増えない。この道具は全期間を並べて選ばせるので、途中で切れると最新月が
    // 消える(実際に最新が2024年5月として出た)。
    const rows: Row[] = [];
    const PAGE = 1000;
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await sb
        .from("jp_price_indices")
        .select("series_name,basis,category,year,month,value,base_year")
        .in("basis", ["yen", "contract"])
        .order("year")
        .order("month")
        .order("series_name")
        .order("basis")
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as Row[];
      rows.push(...page);
      if (page.length < PAGE) break;
    }

    if (rows.length === 0) {
      return { baseYear: "2020", periods: [], series: [], values: {} };
    }

    const values: Record<string, Record<string, ValuePair>> = {};
    const periodSet = new Set<string>();
    const meta = new Map<string, { category: string; hasContract: boolean }>();

    for (const r of rows) {
      const period = `${r.year}-${String(r.month).padStart(2, "0")}`;
      periodSet.add(period);

      const m = meta.get(r.series_name) ?? { category: r.category, hasContract: false };
      if (r.basis === "contract" && r.value !== null) m.hasContract = true;
      meta.set(r.series_name, m);

      const byPeriod = (values[r.series_name] ??= {});
      const pair = (byPeriod[period] ??= [null, null]);
      pair[r.basis === "yen" ? 0 : 1] = r.value === null ? null : Number(r.value);
    }

    const series = [...meta.entries()]
      .map(([name, m]) => ({ name, category: m.category, hasContract: m.hasContract }))
      .sort((a, b) => {
        const d = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        return d !== 0 ? d : a.name.localeCompare(b.name, "ja");
      });

    return {
      baseYear: rows[0].base_year ?? "2020",
      periods: [...periodSet].sort(),
      series,
      values,
    };
  },
);
