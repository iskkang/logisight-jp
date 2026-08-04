import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * ソーシャルログインの提供元。
 *
 * 当面は Google のみ。Apple は Developer Program(年額)が要り、LINE は
 * Supabase の組み込みに無く Custom OIDC の登録が要る — どちらも準備ができるまで
 * ボタンを出さない。押しても "provider is not enabled" が返るだけだからである。
 *
 * Google も Supabase ダッシュボードでクライアント ID/シークレットを設定しない限り
 * 動かない。
 */
export const SOCIAL = {
  google: "google",
} as const;

export type SocialProvider = keyof typeof SOCIAL;

/** ログイン後に戻る先。今いるページに戻す。 */
function redirectTo(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}

export async function signInWithSocial(provider: SocialProvider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: SOCIAL[provider],
    options: { redirectTo: redirectTo() },
  });
  if (error) throw error;
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * メール確認が有効な場合、この時点ではセッションは張られない。
 * 呼び出し側が「確認メールを送った」と伝えられるよう、session の有無を返す。
 */
export async function signUpWithPassword(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo() },
  });
  if (error) throw error;
  return { needsConfirm: !data.session };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** 現在のセッション。未ログインなら null。SSR では null から始まる。 */
/**
 * OAuth から戻ってきたときのエラーを拾う。
 *
 * 失敗すると Supabase は本文ではなく URL に理由を載せて返す
 * (implicit flow なので `#error=...&error_description=...`)。誰も読まないと
 * 「押したのに何も起きない」ようにしか見えない — 実際にそれで原因が分からず、
 * 同意画面は出るのにアカウントが作られない状態を追うのに時間を使った。
 *
 * 読んだら URL からは消す。再読み込みのたびに古いエラーが出ると混乱する。
 */
export function takeOAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const from = (s: string) => new URLSearchParams(s.replace(/^[#?]/, ""));
  for (const params of [from(window.location.hash), from(window.location.search)]) {
    const code = params.get("error") || params.get("error_code");
    if (!code) continue;
    const desc = params.get("error_description");
    window.history.replaceState(null, "", window.location.pathname);
    return desc ? decodeURIComponent(desc).replace(/\+/g, " ") : code;
  }
  return null;
}

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/**
 * Supabase が返すエラーは英語である。よく出るものだけ日本語にする。
 * 未知のものは原文のまま出す — 消すと何が起きたのか分からなくなる。
 */
export function authErrorJa(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "メールアドレスまたはパスワードが違います。";
  if (m.includes("email not confirmed")) return "メールアドレスの確認が済んでいません。受信箱をご確認ください。";
  if (m.includes("user already registered")) return "このメールアドレスはすでに登録されています。";
  if (m.includes("password should be at least")) return "パスワードは6文字以上で設定してください。";
  if (m.includes("unable to validate email address")) return "メールアドレスの形式が正しくありません。";
  if (m.includes("provider is not enabled")) return "このソーシャルログインはまだ利用できません。";
  if (m.includes("rate limit") || m.includes("too many")) return "試行回数が上限に達しました。しばらく待って再度お試しください。";
  return message;
}
