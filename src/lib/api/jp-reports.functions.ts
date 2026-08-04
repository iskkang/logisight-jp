import { createServerFn } from "@tanstack/react-start";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import type { Report } from "./reports";

// reports は韓国版と共有のテーブルで、言語を区別する列がない。
// 日本版の発行物は id を "jp-" で始める規約にし、ここで前方一致で絞る。
// これをやめて全件読むと、韓国語のレポートが日本版の一覧に並ぶ。
const JP_PREFIX = "jp-";

export const getJpReports = createServerFn({ method: "GET" }).handler(
  async (): Promise<Report[]> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);
    const { data, error } = await supabasePublicServer
      .from("reports")
      .select("*")
      .like("id", `${JP_PREFIX}%`)
      .order("period_start", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Report[];
  },
);
