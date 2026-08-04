import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { driverJa } from "./climate-ja";
import type {
  AssetRow,
  RiskRow,
  RouteRow,
  EventRow,
  ClimateForecastRow,
  ClimateRiskData,
} from "./climate";

// globe 테이블(assets/asset_risk/routes/events)은 생성된 Database 타입에 아직 없음
// → 레포 관례대로 클라이언트를 캐스팅해 사용 (industries/operational-delay.functions.ts와 동일).
const sb = supabasePublicServer as unknown as SupabaseClient;

/**
 * name は韓国語の単一カラムである。日本版で使うため、ここで name_ja に差し替える。
 * 表示側(RiskGlobe・LogisightClimate)は name を15か所以上で参照しており、
 * 呼び出し側を1つずつ直すより境界で入れ替えるほうが漏れがない。
 * name_ja が未設定の資産は name のまま出す — 空欄より原名のほうが読める。
 */
const ja = <T extends { name: string; name_ja?: string | null }>(rows: T[]) =>
  rows.map(({ name_ja, ...r }) => ({ ...r, name: name_ja ?? r.name }));

/** driver も韓国語である(Edge Function が組み立てる)。同じ境界で訳す。 */
const jaDriver = <T extends { driver: string | null }>(rows: T[]) =>
  rows.map((r) => ({ ...r, driver: driverJa(r.driver) }));

// assets 61 · asset_risk 4/asset · routes 6 · events ~30 — anon read(RLS).
export const getClimateRisk = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClimateRiskData> => {
    const [assetsRes, riskRes, routesRes, eventsRes, fcRes] = await Promise.all([
      sb.from("assets").select("id,name,name_ja,type,lon,lat,freeze_prone").limit(500),
      sb
        .from("asset_risk")
        .select(
          "asset_id,horizon_days,score,level,driver,wind_gust,wave_height,precip,snowfall,temp_min,is_freeze,updated_at",
        )
        .limit(2000),
      sb.from("routes").select("id,name,name_ja,waypoints,chokes").limit(100),
      sb
        .from("events")
        .select("id,source,kind,title,severity,lon,lat,area,url,starts_at,ends_at,updated_at,track")
        .limit(500),
      // 発行済みの気象影響 AI 分析(パイプラインが自動発行) — read のみ。anon RLS は published/resolved だけ許す。
      // lang='ja' に絞る。絞らないと韓国語の本文がそのまま画面に出る。
      // 日本語行がまだ無い時期は 0件になる — 韓国語を出すよりは空のほうがよい。
      sb
        .from("forecasts")
        .select(
          "id,metric_ref,statement,impact_note,basis,confidence,confidence_reason,data_quality_flags,published_at",
        )
        .eq("module", "climate")
        .eq("lang", "ja")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100),
    ]);

    for (const r of [assetsRes, riskRes, routesRes, eventsRes, fcRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    return {
      assets: ja((assetsRes.data ?? []) as unknown as AssetRow[]),
      risk: jaDriver((riskRes.data ?? []) as unknown as RiskRow[]),
      routes: ja((routesRes.data ?? []) as unknown as RouteRow[]),
      events: (eventsRes.data ?? []) as unknown as EventRow[],
      forecasts: (fcRes.data ?? []) as unknown as ClimateForecastRow[],
    };
  },
);
