import { createFileRoute, redirect } from "@tanstack/react-router";

// /rail/europe 폐지 — 유럽 철도 뉴스는 철도 뉴스 목록으로 일원화됐다.
// 기존 링크·색인 404 방지를 위해 리다이렉트한다.
//
// cat은 maritime_news.category의 값과 그대로 대조된다(news.functions.ts의 eq).
// 일본판 기사는 '鉄道'로 들어가 있어, 한국어 '철도'로 보내면 0건이 나온다.
export const Route = createFileRoute("/rail/europe")({
  beforeLoad: () => {
    throw redirect({ to: "/news", search: { cat: "鉄道" } });
  },
});
