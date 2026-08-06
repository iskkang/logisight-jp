import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import { isInternalNewsItem, type NewsItem } from "./news";
import { estimateReadMinutes } from "./article";
import { normalizeNewsImage } from "./news-image";

const SELECT =
  "id,slug,title,summary,url,source,category,image_url,image_source,image_credit,published_at,lang,tags,is_hero,agent_type,content";

export const getLatestNews = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      lang: z.string().min(2).max(5).default("ko"),
      limit: z.number().int().min(1).max(50).default(20),
      category: z.string().min(1).max(40).optional(),
      dateFrom: z.string().optional(), // e.g. "2026-05-31T00:00:00+09:00"
      dateTo: z.string().optional(), // e.g. "2026-05-31T23:59:59+09:00"
    }),
  )
  .handler(async ({ data }): Promise<NewsItem[]> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);
    let q = supabasePublicServer
      .from("maritime_news")
      .select(SELECT)
      .eq("lang", data.lang)
      .or("agent_type.is.null,agent_type.neq.daily_card")
      .like("url", "http%")
      .order("published_at", { ascending: false, nullsFirst: false })
      // 同着を必ず同じ順に並べる。日本海事新聞は一覧に時刻が無く、同じ日の記事が
      // すべて同一の published_at になる。第二キーが無いと DB が呼び出しごとに
      // 違う順で返し、トップページ(limit 14)とニュース一覧(limit 50)で並びがずれた。
      .order("id", { ascending: false })
      .limit(data.limit);

    if (data.category) q = q.eq("category", data.category);
    if (data.dateFrom) q = q.gte("published_at", data.dateFrom);
    if (data.dateTo) q = q.lte("published_at", data.dateTo);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // 보여줄 것이 없는 외부 항목을 숨긴다.
    //
    // 원래 규칙은 "외부인데 content가 비면 숨긴다"였다 — 봇에 막혀 본문을 못 긁은
    // 껍데기를 거르려던 것이다. 그런데 일본 매체 수집(collectors/news_jp.ts)은
    // 본문을 일부러 저장하지 않는다(전재 허락이 없어 요약과 원문 링크만 남긴다).
    // content만 보면 그 기사들이 통째로 사라진다 — 실제로 29건이 화면에 안 나왔다.
    //
    // 기준을 "본문이 있는가"에서 "독자에게 보여줄 것이 있는가"로 바꾼다.
    // 요약이 있으면 목록에서 읽을 값어치를 판단할 수 있다. 둘 다 비면 껍데기다.
    return ((rows ?? []) as (NewsItem & { content?: string | null })[])
      .filter((r) => {
        if (r.agent_type !== "external") return true;
        const has = (v: string | null | undefined) => v != null && String(v).trim().length > 0;
        return has(r.content) || has(r.summary);
      })
      .map((r) => {
        // 읽는 시간: 내부 기사(우리 본문을 독자가 실제로 읽음)에만 표기. 외부 링크 기사는
        // 원문 분량과 달라 오해를 주므로 null. content 삭제 전에 계산한다.
        const readMin = isInternalNewsItem(r) ? estimateReadMinutes(r.content ?? null) : null;
        delete (r as { content?: unknown }).content;
        (r as NewsItem).read_minutes = readMin;
        return normalizeNewsImage(r as NewsItem);
      });
  });
