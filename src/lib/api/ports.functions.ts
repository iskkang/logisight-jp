import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  JP_MAJOR6,
  JP_PORT_NAMES,
  periodKey,
  type PortLatest,
  type PortThroughputData,
  type PortThroughputRow,
} from "./ports";

// port_throughput は生成済み Database 型にまだ無い → レポ慣例どおりキャストして使う
// (climate/industries.functions.ts と同じ)。
const sb = supabasePublicServer as unknown as SupabaseClient;

// 期間は period ではなく year/month の2列で持つ。
const SELECT = "port_code,year,month,teu,export_teu,import_teu,yoy_pct,is_preliminary";

function toLatest(row: PortThroughputRow): PortLatest {
  return {
    code: row.port_code,
    name: row.port_code === JP_MAJOR6 ? "主要6港 合計" : (JP_PORT_NAMES[row.port_code] ?? row.port_code),
    teu: row.teu === null ? null : Number(row.teu),
    exportTeu: row.export_teu === null ? null : Number(row.export_teu),
    importTeu: row.import_teu === null ? null : Number(row.import_teu),
    yoyPct: row.yoy_pct === null ? null : Number(row.yoy_pct),
    isPreliminary: Boolean(row.is_preliminary),
  };
}

export const getPortThroughput = createServerFn({ method: "GET" }).handler(
  async (): Promise<PortThroughputData> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

    // 同じ表に韓国の港も入る。country で日本分だけに絞る。
    const { data, error } = await sb
      .from("port_throughput")
      .select(SELECT)
      .eq("country", "JP")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as PortThroughputRow[];
    if (rows.length === 0) {
      return { latest: [], total: null, totalSeries: [], period: null };
    }

    // 港別と合計で公表タイミングがずれることがある。港別の最新月を基準にする —
    // 合計だけ新しい月を見せると、表の合計と内訳が別の月になる。
    const portRows = rows.filter((r) => r.port_code !== JP_MAJOR6);
    const period = periodKey(portRows.length > 0 ? portRows[0] : rows[0]);

    const latest = portRows
      .filter((r) => periodKey(r) === period)
      .map(toLatest)
      .sort((a, b) => (b.teu ?? 0) - (a.teu ?? 0));

    const totalRow = rows.find((r) => r.port_code === JP_MAJOR6 && periodKey(r) === period);

    const totalSeries = rows
      .filter((r) => r.port_code === JP_MAJOR6)
      .map((r) => ({
        period: periodKey(r),
        teu: r.teu === null ? null : Number(r.teu),
        yoyPct: r.yoy_pct === null ? null : Number(r.yoy_pct),
        isPreliminary: Boolean(r.is_preliminary),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      latest,
      total: totalRow ? toLatest(totalRow) : null,
      totalSeries,
      period,
    };
  },
);
