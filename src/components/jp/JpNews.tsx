import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { JpPage } from "@/components/jp/JpPage";
import { isInternalNewsItem, latestNewsQueryOptions, type NewsItem } from "@/lib/api/news";

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

export function JpNews({ category }: { category?: string }) {
  const navigate = useNavigate();
  const { data: items } = useSuspenseQuery(
    latestNewsQueryOptions({ lang: "ja", limit: 50, category }),
  );

  // 日付ごとにまとめる。業界紙の一覧は日付が見出しになる。
  const groups: { day: string; items: NewsItem[] }[] = [];
  for (const it of items) {
    const k = dayKey(it.published_at);
    const last = groups[groups.length - 1];
    if (last && last.day === k) last.items.push(it);
    else groups.push({ day: k, items: [it] });
  }

  const go = (c?: string) =>
    navigate({ to: "/news", search: c ? { cat: c } : {} });

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "ニュース" }]}
      title="物流ニュース"
      lead="世界の物流・海運・航空・貿易のニュースを選んでお届けします。出典と発行日は各記事に表示しています。"
    >
      {/* カテゴリ */}
      <div className="mt-4 flex flex-wrap gap-0 border-b border-[#d5d9de]">
        <button
          type="button"
          onClick={() => go()}
          className={`px-3.5 py-2 text-[13px] transition-colors ${
            !category
              ? "font-bold text-[#0b2d52] shadow-[inset_0_-2px_0_#0b2d52]"
              : "text-[#4a5462] hover:text-[#0b2d52]"
          }`}
        >
          すべて
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => go(c)}
            className={`px-3.5 py-2 text-[13px] transition-colors ${
              category === c
                ? "font-bold text-[#0b2d52] shadow-[inset_0_-2px_0_#0b2d52]"
                : "text-[#4a5462] hover:text-[#0b2d52]"
            }`}
          >
            {c}
          </button>
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
                      {n.summary && (
                        <span className="mt-1 block text-[12.5px] leading-[1.75] text-[#5b6672]">
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

      <p className="mb-2 mt-7 text-[11.5px] leading-[1.8] text-[#8a929c]">
        ※ 出典と発行日は各記事に表示しています。Logisight の記事は原文にもとづく要約・解釈であり、
        外部記事は原文へリンクします。
      </p>
    </JpPage>
  );
}
