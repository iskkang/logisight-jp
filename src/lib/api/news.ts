import { queryOptions } from "@tanstack/react-query";

import { getLatestNews, getNewsCount } from "./news.functions";

export type NewsItem = {
  id: number;
  slug: string | null;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string | null;
  image_url: string | null;
  image_source: string | null;
  image_credit: string | null;
  agent_type: string | null;
  published_at: string | null;
  lang: string;
  tags: string[] | null;
  is_hero: boolean | null;
  read_minutes?: number | null;
};

export function isInternalNewsItem(item: Pick<NewsItem, "slug" | "agent_type">): boolean {
  return Boolean(item.slug && item.agent_type !== "external");
}

/** Returns today's date in KST as "YYYY-MM-DD". */
export function todayKST(): string {
  // Swedish locale produces ISO date format "YYYY-MM-DD"
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/** Given "YYYY-MM-DD", returns KST start-of-day and end-of-day ISO strings. */
export function dateToKSTRange(date: string): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: `${date}T00:00:00+09:00`,
    dateTo: `${date}T23:59:59.999+09:00`,
  };
}

/**
 * /news 一覧 1ページの記事数。
 *
 * ルート(news.tsx)と sitemap が同じ値を見ること —— 食い違うと sitemap が存在しない
 * ページ番号を出す。コンポーネントを持たないこのモジュールに置いたのは、サーバ
 * ハンドラがルートモジュール全体を引き込まないようにするためだ。
 */
export const PER_PAGE = 50;

/**
 * 実在する記事カテゴリ。DB の実測値(海上 388・鉄道 96・航空 92・物流 87・貿易 65・港湾 36)。
 *
 * ルート(head の canonical・題名)と sitemap が同じ一覧を見ること。ここに無い cat は
 * 結果が 0 件なので索引の対象として扱わない。
 */
export const NEWS_CATEGORIES = ["海上", "航空", "港湾", "鉄道", "貿易", "物流"] as const;

/** カテゴリページの meta description。6ページが同じ説明だと重複として束ねられる。 */
export const NEWS_CATEGORY_DESCRIPTION: Record<string, string> = {
  海上: "コンテナ運賃(SCFI・KCCI)・船腹・港湾混雑・ブランクセーリングなど海上物流のニュースを日本語で整理します。",
  航空: "航空貨物運賃(USD/kg)・需要・ベリー能力・主要空港の取扱量など航空物流のニュースを日本語で整理します。",
  港湾: "主要港の取扱量・滞船・ターミナル運営・荷役体制など港湾のニュースを日本語で整理します。",
  鉄道: "ユーラシア鉄道(TCR・TSR)・ERAI 運賃・米州鉄道コリドーなど鉄道物流のニュースを日本語で整理します。",
  貿易: "輸出入統計・関税・規制・貿易の流れを物流への影響という観点から日本語で整理します。",
  物流: "フォワーディング・倉庫・ラストマイル・サプライチェーン再編など物流産業全般のニュースを日本語で整理します。",
};

export const latestNewsQueryOptions = (input: {
  lang?: string;
  limit?: number;
  offset?: number;
  category?: string;
  date?: string; // "YYYY-MM-DD" — undefined means no date filter
}) => {
  const range = input.date ? dateToKSTRange(input.date) : undefined;
  return queryOptions({
    queryKey: ["maritime_news", "latest", input],
    queryFn: () =>
      getLatestNews({
        data: {
          lang: input.lang ?? "ko",
          limit: input.limit ?? 20,
          offset: input.offset ?? 0,
          category: input.category,
          dateFrom: range?.dateFrom,
          dateTo: range?.dateTo,
        },
      }),
    staleTime: 5 * 60 * 1000,
  });
};

/** 一覧の総件数 —— ページ番号の計算用。絞り込みは latestNewsQueryOptions と同じ。 */
export const newsCountQueryOptions = (input: {
  lang?: string;
  category?: string;
  date?: string;
}) => {
  const range = input.date ? dateToKSTRange(input.date) : undefined;
  return queryOptions({
    queryKey: ["maritime_news", "count", input],
    queryFn: () =>
      getNewsCount({
        data: {
          lang: input.lang ?? "ja",
          category: input.category,
          dateFrom: range?.dateFrom,
          dateTo: range?.dateTo,
        },
      }),
    staleTime: 5 * 60 * 1000,
  });
};

export function formatPublishedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}
