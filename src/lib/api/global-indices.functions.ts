import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  GLOBAL_INDEX_CODES,
  GLOBAL_INDEX_META,
  type GlobalIndex,
  type GlobalIndicesData,
} from "./global-indices";

const sb = supabasePublicServer as unknown as SupabaseClient;

type Row = {
  index_code: string;
  value: number | null;
  change_pct: number | null;
  week_date: string;
  source: string | null;
};

export const getGlobalIndices = createServerFn({ method: "GET" }).handler(
  async (): Promise<GlobalIndicesData> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

    // 系列ごとに公表日が違うので、まとめて新しい順に取ってから系列ごとの最新を拾う。
    const { data, error } = await sb
      .from("freight_indices")
      .select("index_code,value,change_pct,week_date,source")
      .in("index_code", GLOBAL_INDEX_CODES)
      .order("week_date", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    const latest = new Map<string, Row>();
    for (const r of rows) if (!latest.has(r.index_code)) latest.set(r.index_code, r);

    // 値が無い系列も残す。落とすと「その指標が存在しない」ように見える。
    const indices: GlobalIndex[] = GLOBAL_INDEX_META.map((m) => {
      const r = latest.get(m.code);
      return {
        code: m.code,
        label: m.label,
        unit: m.unit,
        group: m.group,
        value: r && r.value !== null ? Number(r.value) : null,
        changePct: r && r.change_pct !== null ? Number(r.change_pct) : null,
        weekDate: r?.week_date ?? null,
        source: r?.source ?? null,
      };
    });

    const asOf = indices
      .map((i) => i.weekDate)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop() ?? null;

    return { indices, asOf };
  },
);
