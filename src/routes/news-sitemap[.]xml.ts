import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { supabasePublicServer } from "@/integrations/supabase/public.server";
import { SITE_URL as BASE_URL } from "@/lib/seo";

/**
 * ニュース専用の sitemap。
 *
 * 通常の sitemap は 500 件を月次の更新頻度で載せる。ニュースはそれでは遅い ——
 * 検索側は「新しいものだけを、早く」知りたい。だから直近 48 時間の記事だけを、
 * Google News sitemap の書式で別に出す。件数が少ないほど巡回は速い。
 *
 * 48 時間より古い記事は落とす。ここに残し続けると、毎回同じものを見せることになり、
 * 「新しい」という信号そのものが薄まる。過去記事は通常の sitemap が受け持つ。
 *
 * 日本語の記事だけを載せる。lang の条件が抜けると韓国語スラッグの記事が混ざり、
 * 日本側には存在しないので全て 404 になる(通常の sitemap で実際に起きた)。
 */

const WINDOW_HOURS = 48;
const MAX_ITEMS = 1000; // Google News sitemap の上限
const PUBLICATION_NAME = "Logisight";
const PUBLICATION_LANG = "ja";

type Row = {
  id: number;
  slug: string | null;
  title: string | null;
  published_at: string | null;
};

/** XML に入れてはいけない文字を落とす。見出しに & や < が入ることは実際にある。 */
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
  );

export const Route = createFileRoute("/news-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();

        let rows: Row[] = [];
        try {
          const { data } = await supabasePublicServer
            .from("maritime_news")
            .select("id,slug,title,published_at")
            .eq("lang", "ja")
            // 本文の無い外部記事はうちのページではない。転送されるか空ページになる。
            .or("agent_type.is.null,agent_type.neq.external,content.not.is.null")
            .gte("published_at", since)
            .order("published_at", { ascending: false })
            .limit(MAX_ITEMS);
          rows = (data ?? []) as Row[];
        } catch {
          // 取れなくても空の sitemap を返す。500 を返すと、次回まで丸ごと読まれない。
        }

        const urls = rows
          .filter((r) => r.published_at)
          .map((r) => {
            const param = r.slug && r.slug.length > 0 ? r.slug : String(r.id);
            const loc = `${BASE_URL}/article/${encodeURIComponent(param)}`;
            return [
              "  <url>",
              `    <loc>${loc}</loc>`,
              "    <news:news>",
              "      <news:publication>",
              `        <news:name>${PUBLICATION_NAME}</news:name>`,
              `        <news:language>${PUBLICATION_LANG}</news:language>`,
              "      </news:publication>",
              `      <news:publication_date>${r.published_at}</news:publication_date>`,
              `      <news:title>${esc(r.title ?? "")}</news:title>`,
              "    </news:news>",
              "  </url>",
            ].join("\n");
          });

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
          '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
          ...urls,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            // ニュースなので短く。長く貼ると「新しいものを早く」の目的に反する。
            "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=600",
          },
        });
      },
    },
  },
});
