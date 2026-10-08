import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { SITE_URL as BASE_URL } from "@/lib/seo";
import { NEWS_CATEGORIES, PER_PAGE } from "@/lib/api/news";

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
          { path: "/hs", changefreq: "monthly", priority: "0.9" },
          { path: "/climate", changefreq: "daily", priority: "0.8" },
          // /forecasts・/port-risk はまだ各ルートで noindex を指定している。
          // sitemap に載せると「索引するな」と「索引せよ」を同時に出すことになる。
          // noindex を外すときは、ここへ追加するのも忘れないこと。
          // (/climate は 2026-08-13 に日本語化を確認して外した。)
          // ■ リダイレクトする URL は載せない ★
          // /rail は元から外してあったが、同じものが 3 つ残っていた(実測):
          //   /policy      → 307 → /port-risk(しかも /port-risk は noindex)
          //   /rail/europe → 307 → /news?cat=鉄道
          //   /eurasia     → 307 → /rail/eurasia(こちらは下に載っている)
          // sitemap は「正規 URL の一覧」なのでリダイレクト URL を載せるのは規格違反で、
          // クローラーに毎回 1 ホップ余計に踏ませる。ルートはそのまま残す —— 外から
          // 来る古いリンクを受ける必要がある。
          { path: "/rail/americas", changefreq: "weekly", priority: "0.7" },
          { path: "/rail/eurasia", changefreq: "weekly", priority: "0.7" },
          { path: "/contact", changefreq: "yearly", priority: "0.6" },
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

        // 条件は /news 一覧(news.functions.ts)と同じに揃える ★
        // sitemap は「うちがリンクしているページの一覧」であるべきだ。一覧から外す
        // daily_card や、本文も要旨も無い外部記事を sitemap にだけ載せると、どこからも
        // リンクされない孤立 URL と、原文へ転送される URL(article.$slug.tsx の redirect)
        // をクローラーに申告することになる。
        //
        // 件数の上限も外した —— 日本語記事は 764 件あるのに 500 件で切っていて、
        // 古い 264 件が sitemap に一度も載らなかった。sitemap の規格上限は 50,000 件。
        let jaArticleCount = 0;
        const jaByCategory = new Map<string, number>();
        try {
          const { data } = await supabasePublicServer
            .from("maritime_news")
            .select("id,slug,published_at,category")
            // 日本語の記事だけ。この一行が抜けていて、韓国語スラッグの記事 500 件が
            // 日本版の sitemap に載っていた。日本側にその記事は無いので全て 404 になり、
            // クローラは「無いページ」を 500 件教えられていたことになる。
            // reports 側には最初から入っている条件で、ここだけ落ちていた。
            .eq("lang", "ja")
            .or("agent_type.is.null,agent_type.neq.daily_card")
            // 外部記事は本文か要旨のどちらかがあれば載せる。日本媒体の収集は転載許可が
            // 無く本文を保存しないので、本文だけを見ると記事が丸ごと消える。
            .or(
              "agent_type.is.null,agent_type.neq.external,and(content.not.is.null,content.neq.),and(summary.not.is.null,summary.neq.)",
            )
            .like("url", "http%")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(2000);
          jaArticleCount = (data ?? []).length;
          for (const row of data ?? []) {
            if (row.category)
              jaByCategory.set(row.category, (jaByCategory.get(row.category) ?? 0) + 1);
            const param = row.slug && row.slug.length > 0 ? row.slug : String(row.id);
            entries.push({
              // sitemap 規格上 <loc> は percent-エンコード必須 —— 生の日本語だと誤って fetch される
              path: `/article/${encodeURIComponent(param)}`,
              lastmod: row.published_at ?? undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch {
          // ignore — still emit core routes
        }

        // /news のページ送り。記事詳細へ向かう内部リンクの経路をクローラーに開く ——
        // これが無いと 2 ページ目以降の記事は sitemap にだけ在ってサイト内から到達
        // できず、「検出 — インデックス未登録」のまま残る。1 ページ目は上の /news と
        // 同じ URL なので除く。
        const newsPages = Math.ceil(jaArticleCount / PER_PAGE);
        for (let p = 2; p <= newsPages; p++) {
          entries.push({ path: `/news?page=${p}`, changefreq: "daily", priority: "0.5" });
        }

        // カテゴリ一覧ページ。タブが <Link> になって(JpNews)サイト内からも到達できる
        // ようになったので sitemap にも載せる。件数は上で取った行から数えるため追加の
        // 問い合わせは無い。0 件のカテゴリは空ページなので載せない。
        for (const cat of NEWS_CATEGORIES) {
          const n = jaByCategory.get(cat) ?? 0;
          if (n === 0) continue;
          const q = `cat=${encodeURIComponent(cat)}`;
          for (let p = 1; p <= Math.ceil(n / PER_PAGE); p++) {
            entries.push({
              path: `/news?${q}${p > 1 ? `&page=${p}` : ""}`,
              changefreq: "daily",
              priority: p === 1 ? "0.7" : "0.5",
            });
          }
        }

        // <loc> は XML なので & を escape する ★
        // ?cat=…&page=2 のようにパラメータが 2 つの URL が入ったことで必要になった。
        // 生の & を出すと sitemap 全体が XML のパース失敗で拒否される。
        const xmlEscape = (v: string) =>
          v
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${xmlEscape(`${BASE_URL}${e.path}`)}</loc>`,
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
