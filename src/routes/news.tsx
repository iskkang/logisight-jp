import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_DESCRIPTION,
  PER_PAGE,
  latestNewsQueryOptions,
  newsCountQueryOptions,
} from "@/lib/api/news";
import { JpNews } from "@/components/jp/JpNews";
import { seoHead } from "@/lib/seo";

const DEFAULT_DESCRIPTION =
  "海上・航空・港湾・貿易。世界の運賃とサプライチェーンを動かすニュースを選んでお届けします。";

const newsSearchSchema = z.object({
  cat: z.string().min(1).max(40).optional(),
  // page は optional で既定値を置かない ★
  // validateSearch が URL に無い値を返すとルーターがアドレスを正規化して 307 を出す。
  // この構成では /forecasts が同じ理由で今も 307 を出している。
  // 1ページ目は /news、2ページ目から /news?page=2 —— 1ページ目に ?page=1 を付けない。
  page: z.coerce.number().int().min(1).max(200).optional().catch(undefined),
});

export const Route = createFileRoute("/news")({
  validateSearch: newsSearchSchema,
  loaderDeps: ({ search }) => ({ cat: search.cat, page: search.page }),
  loader: async ({ context, deps }) => {
    const page = deps.page ?? 1;
    await Promise.all([
      context.queryClient.ensureQueryData(
        latestNewsQueryOptions({
          lang: "ja",
          limit: PER_PAGE,
          offset: (page - 1) * PER_PAGE,
          category: deps.cat,
        }),
      ),
      context.queryClient.ensureQueryData(
        newsCountQueryOptions({ lang: "ja", category: deps.cat }),
      ),
    ]);
    // head が使う値はローダーが渡す —— head で search を直に読む前例が無く、
    // ルーターのバージョンによって壊れうる。
    return { page, cat: deps.cat };
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page ?? 1;
    // 2ページ目からは canonical をそのページ自身にする。1ページ目に寄せると
    // 2ページ目以降の記事リンクが索引から消え、ページ送りを作った目的が失われる。
    //
    // カテゴリも自分自身を canonical にする ★
    // /news に寄せるとカテゴリページ 6 つが「代替正規 URL」として索引から落ちる。
    // 同じ記事の部分集合ではあるが、1ページ目に出る記事が重ならず(海上 388・鉄道 96・
    // 航空 92・物流 87・貿易 65・港湾 36 件)、検索の意図も異なる。ただし実在する
    // カテゴリだけを認める —— それ以外の cat は 0 件の空ページだ。
    const cat =
      loaderData?.cat && (NEWS_CATEGORIES as readonly string[]).includes(loaderData.cat)
        ? loaderData.cat
        : undefined;
    const qs = [
      cat ? `cat=${encodeURIComponent(cat)}` : null,
      page > 1 ? `page=${page}` : null,
    ]
      .filter(Boolean)
      .join("&");
    // 実在しない cat は索引の対象ではないので canonical を /news に寄せる
    const path = loaderData?.cat && !cat ? "/news" : `/news${qs ? `?${qs}` : ""}`;
    return seoHead({
      title: `${cat ? `${cat}の物流ニュース` : "物流ニュース"}${page > 1 ? `(${page}ページ)` : ""} — Logisight`,
      description: (cat ? NEWS_CATEGORY_DESCRIPTION[cat] : undefined) ?? DEFAULT_DESCRIPTION,
      path,
      koPath: "/news",
    });
  },
  component: NewsPage,
});

function NewsPage() {
  const { cat, page } = Route.useSearch();
  return <JpNews category={cat} page={page ?? 1} />;
}
