import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { JpPage } from "@/components/jp/JpPage";
import {
  PER_PAGE,
  isInternalNewsItem,
  latestNewsQueryOptions,
  newsCountQueryOptions,
  type NewsItem,
} from "@/lib/api/news";

/** 記事のカテゴリ。DB の値と一致していないと絞り込みが何も返さない。 */
const CATEGORIES = ["海上", "航空", "港湾", "鉄道", "貿易", "物流"] as const;

/** "2026-08-04T…" → "2026年8月4日(火)" */
function dateHeading(iso: string | null): string {
  if (!iso) return "日付不明";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "日付不明";
  const p = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}年${g("month")}月${g("day")}日(${g("weekday")})`;
}

/** 日付グループのキー。JST 基準で切る。 */
function dayKey(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function CatTag({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <span className="w-[38px] flex-none pt-[3px] text-[11px] text-[#0b2d52]">{category}</span>
  );
}

export function JpNews({ category, page = 1 }: { category?: string; page?: number }) {
  const { data: items } = useSuspenseQuery(
    latestNewsQueryOptions({
      lang: "ja",
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
      category,
    }),
  );
  const { data: total } = useSuspenseQuery(newsCountQueryOptions({ lang: "ja", category }));
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PER_PAGE));

  // 日付ごとにまとめる。業界紙の一覧は日付が見出しになる。
  const groups: { day: string; items: NewsItem[] }[] = [];
  for (const it of items) {
    const k = dayKey(it.published_at);
    const last = groups[groups.length - 1];
    if (last && last.day === k) last.items.push(it);
    else groups.push({ day: k, items: [it] });
  }

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "ニュース" }]}
      title="物流ニュース"
      lead="世界の物流・海運・航空・貿易のニュースを選んでお届けします。出典と発行日は各記事に表示しています。"
    >
      {/* カテゴリ —— リンクで描かないとクローラーがカテゴリページを見つけられない ★
          button+onClick は JS だけの遷移で HTML に <a href> が残らない。カテゴリ
          ページへのクロール経路がサイト全体に一つも無く、読者も中クリック・別タブで
          開けなかった。下のページ送りも同じ理由でリンクにしている。
          カテゴリを変えたら 1 ページ目に戻す —— page は付けない。 */}
      <div className="mt-4 flex flex-wrap gap-0 border-b border-[#d5d9de]">
        <Link
          to="/news"
          search={{}}
          className={`px-3.5 py-2 text-[13px] transition-colors ${
            !category
              ? "font-bold text-[#0b2d52] shadow-[inset_0_-2px_0_#0b2d52]"
              : "text-[#4a5462] hover:text-[#0b2d52]"
          }`}
        >
          すべて
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            to="/news"
            search={{ cat: c }}
            className={`px-3.5 py-2 text-[13px] transition-colors ${
              category === c
                ? "font-bold text-[#0b2d52] shadow-[inset_0_-2px_0_#0b2d52]"
                : "text-[#4a5462] hover:text-[#0b2d52]"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-12 text-[13px] text-[#6b7683]">
          {category
            ? `「${category}」の記事はまだありません。`
            : "記事が集まり次第、掲載します。"}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.day} className="mt-7">
          <h2 className="border-b-2 border-[#0b2d52] pb-1.5 text-[13px] font-bold tabular-nums text-[#0b2d52]">
            {dateHeading(g.items[0].published_at)}
          </h2>
          <ul>
            {g.items.map((n) => (
              <li key={n.id} className="border-b border-[#eef0f2]">
                {/* 外部媒体の記事は本文を持たない。要旨だけを載せ、原文へ送る。 */}
                {isInternalNewsItem(n) ? (
                  <Link
                    to="/article/$slug"
                    params={{ slug: n.slug || String(n.id) }}
                    className="flex gap-3 py-2.5 transition-colors hover:bg-[#f7f8f9]"
                  >
                    <CatTag category={n.category} />
                    <span className="flex-1 text-[13.5px] leading-[1.65] hover:text-[#0b2d52]">
                      {n.title}
                      {n.source && n.source !== "Logisight" && (
                        <span className="ml-2 text-[11px] text-[#8a929c]">{n.source}</span>
                      )}
                    </span>
                  </Link>
                ) : (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 py-2.5 transition-colors hover:bg-[#f7f8f9]"
                  >
                    <CatTag category={n.category} />
                    <span className="flex-1">
                      <span className="text-[13.5px] leading-[1.65] hover:text-[#0b2d52]">
                        {n.title}
                        <span className="ml-1.5 text-[11px] text-[#8a929c]">↗</span>
                        {n.source && (
                          <span className="ml-2 text-[11px] text-[#8a929c]">{n.source}</span>
                        )}
                      </span>
                      {/* 1行で切る。一覧は「原文を開くか」を決める場所であって、読む場所ではない。 */}
                      {n.summary && (
                        <span className="mt-1 line-clamp-1 text-[12.5px] leading-[1.75] text-[#5b6672]">
                          {n.summary}
                        </span>
                      )}
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Pagination page={page} totalPages={totalPages} category={category} />

      <p className="mb-2 mt-7 text-[11.5px] leading-[1.8] text-[#8a929c]">
        ※ 出典と発行日は各記事に表示しています。Logisight の記事は原文にもとづく要約・解釈であり、
        外部記事は原文へリンクします。
      </p>
    </JpPage>
  );
}

/**
 * ページ送り。必ず <Link>(実際の <a href>)で描く ★
 * button+navigate だと HTML に <a href> が残らず、クローラーが 2 ページ目以降の
 * 記事へ辿れない。sitemap にだけ在って site 内から到達できないページは
 * 「検出 — インデックス未登録」のまま残る。
 */
function Pagination({
  page,
  totalPages,
  category,
}: {
  page: number;
  totalPages: number;
  category?: string;
}) {
  if (totalPages <= 1) return null;
  // 現在ページの前後 2 つ + 先頭・末尾。全部出すと 16 ページ分が並ぶ。
  const nums = [
    1,
    totalPages,
    ...[page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= totalPages),
  ];
  const pages = [...new Set(nums)].sort((a, b) => a - b);
  // 1 ページ目のアドレスに ?page=1 を付けない —— /news と別 URL になってしまう。
  const search = (p: number) => ({
    ...(category ? { cat: category } : {}),
    ...(p > 1 ? { page: p } : {}),
  });
  const base = "min-w-[32px] px-2 py-1.5 text-center text-[13px] tabular-nums transition-colors";
  return (
    <nav className="mt-8 flex items-center justify-center gap-1 border-t border-[#eef0f2] pt-5">
      {page > 1 && (
        <Link to="/news" search={search(page - 1)} className={`${base} text-[#4a5462] hover:text-[#0b2d52]`}>
          前へ
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-[12px] text-[#8a929c]">…</span>}
          {p === page ? (
            <span className={`${base} font-bold text-[#0b2d52] shadow-[inset_0_-2px_0_#0b2d52]`}>{p}</span>
          ) : (
            <Link to="/news" search={search(p)} className={`${base} text-[#4a5462] hover:text-[#0b2d52]`}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link to="/news" search={search(page + 1)} className={`${base} text-[#4a5462] hover:text-[#0b2d52]`}>
          次へ
        </Link>
      )}
    </nav>
  );
}
