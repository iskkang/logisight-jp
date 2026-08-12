import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// 뉴스레터 원클릭 수신거부. 이메일 푸터 링크(/unsubscribe?id=<uuid>)로 진입.
// anon 키로 SECURITY DEFINER 함수 newsletter_unsubscribe(p_id)만 호출 — 테이블 직접 접근 없음.
export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : "",
    // u は会員(jp_profiles)の配信停止。id は旧・購読者テーブル用。
    u: typeof s.u === "string" ? s.u : "",
  }),
  head: () => ({
    meta: [
      { title: "ニュースレター配信停止 — Logisight" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

type State = "loading" | "done" | "already" | "invalid" | "error";

const MESSAGES: Record<State, { title: string; body: string }> = {
  loading: { title: "処理中…", body: "配信停止の手続きを行っています。" },
  done: { title: "配信を停止しました", body: "これまでご購読いただきありがとうございました。" },
  already: { title: "すでに停止済みです", body: "このメールアドレスは配信が停止されています。" },
  invalid: {
    title: "リンクが正しくありません",
    body: "登録情報を確認できませんでした。メール内の配信停止リンクをもう一度お試しください。",
  },
  error: {
    title: "処理中にエラーが発生しました",
    body: "しばらくしてから再度お試しください。解決しない場合はご返信ください。",
  },
};

function UnsubscribePage() {
  const { id, u } = Route.useSearch();
  const [state, setState] = useState<State>(id || u ? "loading" : "invalid");

  useEffect(() => {
    if (!id && !u) return;
    let active = true;
    (async () => {
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      // 会員は jp_profiles、旧・購読者は newsletter_subscribers。
      // 呼ぶ関数が違うだけで、利用者から見た結果は同じにする。
      const { data, error } = u
        ? await rpc("jp_newsletter_unsubscribe", { p_user_id: u })
        : await rpc("newsletter_unsubscribe", { p_id: id });
      if (!active) return;
      if (error) setState("error");
      else setState(data ? "done" : "already");
    })();
    return () => {
      active = false;
    };
  }, [id, u]);

  const m = MESSAGES[state];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        Logisight ニュースレター
      </p>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-ink)]">{m.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">{m.body}</p>
      {state !== "loading" && (
        <Link
          to="/"
          className="mt-8 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-navy-900)" }}
        >
          Logisight ホームへ
        </Link>
      )}
    </div>
  );
}
