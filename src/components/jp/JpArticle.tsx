import { Link } from "@tanstack/react-router";

import { JpPage } from "@/components/jp/JpPage";
import type { Article } from "@/lib/api/article";

/** "2026-08-04T…" → "2026年8月4日" */
function fmtDate(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : "";
}

/**
 * マークダウンの最小レンダリング。見出し・段落・箇条書きだけを扱う。
 * 記事本文は翻訳パイプラインが生成したマークダウンで、表や画像は含まない。
 */
function Body({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="mt-6 space-y-4">
      {blocks.map((b, i) => {
        const h = /^(#{2,4})\s+(.*)$/.exec(b);
        if (h) {
          return (
            <h2
              key={i}
              className="mt-8 border-l-[3px] border-[#0b2d52] pl-2.5 text-[16px] font-bold leading-snug text-[#0b2d52]"
            >
              {h[2]}
            </h2>
          );
        }
        if (/^[-*・]\s+/m.test(b)) {
          const lis = b.split("\n").map((l) => l.replace(/^[-*・]\s+/, "").trim()).filter(Boolean);
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 text-[14.5px] leading-[1.9] text-[#22282f]">
              {lis.map((l, j) => (
                <li key={j}>{l}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[14.5px] leading-[1.95] text-[#22282f]">
            {b}
          </p>
        );
      })}
    </div>
  );
}

export function JpArticle({
  article,
  related,
}: {
  article: Article;
  related: { id: number; slug: string | null; title: string; category: string | null }[];
}) {
  const a = article;
  const external = a.source && a.source !== "Logisight";

  return (
    <JpPage
      crumbs={[
        { label: "ホーム", to: "/" },
        { label: "ニュース", to: "/news" },
        { label: a.category ?? "記事" },
      ]}
      title={a.title}
      meta={
        <span className="text-[12px] text-[#6b7683]">
          {a.category && <span className="mr-2 font-medium text-[#0b2d52]">{a.category}</span>}
          {fmtDate(a.published_at)}
          {external && <span className="ml-2">出典: {a.source}</span>}
        </span>
      }
    >
      <article className="max-w-[760px]">
        {a.summary && (
          <p className="mt-5 border-l-[3px] border-[#c3d3e2] bg-[#f7f9fb] px-4 py-3 text-[14px] leading-[1.85] text-[#2c333b]">
            {a.summary}
          </p>
        )}

        {a.image_url && (
          <figure className="mt-6">
            <img src={a.image_url} alt="" className="w-full border border-[#e2e6ea]" loading="lazy" />
            {(a.image_credit || a.image_source) && (
              <figcaption className="mt-1.5 text-[11px] text-[#8a929c]">
                写真: {[a.image_credit, a.image_source].filter(Boolean).join(" / ")}
              </figcaption>
            )}
          </figure>
        )}

        {a.content ? (
          <Body markdown={a.content} />
        ) : (
          <p className="mt-6 text-[14px] text-[#6b7683]">この記事の全文は準備中です。</p>
        )}

        {Array.isArray(a.tags) && a.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {a.tags.map((t) => (
              <span key={t} className="border border-[#e2e6ea] bg-[#f7f8f9] px-2 py-0.5 text-[11.5px] text-[#4a5462]">
                {t}
              </span>
            ))}
          </div>
        )}

        {external && a.url && (
          <p className="mt-6 text-[12.5px] text-[#6b7683]">
            原文:{" "}
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[#0b2d52] underline">
              {a.source} ↗
            </a>
          </p>
        )}
      </article>

      {related.length > 0 && (
        <section className="mt-12 max-w-[760px]">
          <h2 className="border-b-2 border-[#0b2d52] pb-1.5 text-[13px] font-bold text-[#0b2d52]">
            関連記事
          </h2>
          <ul>
            {related.map((r) => (
              <li key={r.id} className="border-b border-[#eef0f2]">
                <Link
                  to="/article/$slug"
                  params={{ slug: r.slug || String(r.id) }}
                  className="flex gap-3 py-2.5 text-[13.5px] leading-[1.65] transition-colors hover:bg-[#f7f8f9] hover:text-[#0b2d52]"
                >
                  {r.category && (
                    <span className="w-[38px] flex-none pt-[2px] text-[11px] text-[#0b2d52]">
                      {r.category}
                    </span>
                  )}
                  <span>{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </JpPage>
  );
}
