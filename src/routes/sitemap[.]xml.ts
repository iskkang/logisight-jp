import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { SITE_URL as BASE_URL } from "@/lib/seo";

// reports は生成された Database 型に無い(climate.functions.ts・benchmark.functions.ts と同じ状況)。
const sb = supabasePublicServer as unknown as SupabaseClient;

type ReportRow = { period_start: string | null; published_at: string | null };

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // 実在するルートだけを載せる。日本版で削除したルートを残したまま提出すると、
        // クローラーに 404 を渡すことになる。ルートを増減したらここも合わせて直す。
        //
        // 2026-08 時点で検索からの流入はゼロだった。原因の一つがここで、
        // /benchmark・/climate・/rail/* と、何より月次レポートの本体ページ
        // (/reports/monthly/{YYYY-MM}) が一行も載っていなかった。
        // クローラーは存在を知りようがない。
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/news", changefreq: "daily", priority: "0.9" },
          { path: "/reports", changefreq: "monthly", priority: "0.9" },
          // 道具・データのページ。ここが検索の入口になる。
          { path: "/benchmark", changefreq: "monthly", priority: "0.9" },
          { path: "/rates", changefreq: "monthly", priority: "0.9" },
          { path: "/ports", changefreq: "monthly", priority: "0.9" },
          { path: "/trade", changefreq: "monthly", priority: "0.9" },
          // /climate・/forecasts・/port-risk は各ルートで noindex を指定している。
          // sitemap に載せると「索引するな」と「索引せよ」を同時に出すことになる。
          // noindex を外すときは、ここへ追加するのも忘れないこと。
          { path: "/policy", changefreq: "weekly", priority: "0.7" },
          // /rail は /rail/americas へのリダイレクトなので載せない。
          { path: "/rail/americas", changefreq: "weekly", priority: "0.7" },
          { path: "/rail/eurasia", changefreq: "weekly", priority: "0.7" },
          { path: "/rail/europe", changefreq: "weekly", priority: "0.7" },
          { path: "/eurasia", changefreq: "weekly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/methodology", changefreq: "monthly", priority: "0.5" },
          { path: "/faq", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
        ];

        // 月次レポートの本体ページ。サイトで最も中身のあるページであり、
        // 共有・被リンクの受け皿でもある。ここが欠けていたのが最大の穴だった。
        try {
          const { data } = await sb
            .from("reports")
            .select("period_start,published_at")
            .eq("type", "monthly")
            .eq("lang", "ja")
            .order("period_start", { ascending: false })
            .limit(60);
          for (const row of (data ?? []) as ReportRow[]) {
            const month = String(row.period_start ?? "").slice(0, 7); // "2026-06-01" → "2026-06"
            if (!/^\d{4}-\d{2}$/.test(month)) continue;
            entries.push({
              path: `/reports/monthly/${month}`,
              lastmod: row.published_at ?? undefined,
              changefreq: "monthly",
              priority: "0.9",
            });
          }
        } catch {
          // ignore — still emit core routes
        }

        try {
          const { data } = await supabasePublicServer
            .from("maritime_news")
            .select("id,slug,published_at")
            // 본문 없는 외부 기사는 우리 페이지가 아니다 — 원문으로 리다이렉트되거나
            // 원문 URL이 깨져 있어 크롤러가 리다이렉트·빈 페이지를 받는다. sitemap에서 제외.
            // (agent_type NULL 행은 neq가 걸러내므로 is.null 절을 따로 둔다)
            .or("agent_type.is.null,agent_type.neq.external,content.not.is.null")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(500);
          for (const row of data ?? []) {
            const param = row.slug && row.slug.length > 0 ? row.slug : String(row.id);
            entries.push({
              // sitemap 규격상 <loc>는 percent-인코딩 필수 — 원시 한글이면 크롤러가 잘못 fetch한다
              path: `/article/${encodeURIComponent(param)}`,
              lastmod: row.published_at ?? undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch {
          // ignore — still emit core routes
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
