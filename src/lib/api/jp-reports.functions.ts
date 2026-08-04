import { createServerFn } from "@tanstack/react-start";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import type { Report } from "./reports";

// reports は韓国版と共有のテーブル。lang 列(migration 20260804000002)で言語を分ける。
// 絞らずに読むと韓国語のレポートが日本版の一覧に並ぶ。
const LANG = "ja";

export const getJpReports = createServerFn({ method: "GET" }).handler(
  async (): Promise<Report[]> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);
    const { data, error } = await supabasePublicServer
      .from("reports")
      .select("*")
      .eq("lang", LANG)
      .order("period_start", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Report[];
  },
);
