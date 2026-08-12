import { supabase } from "@/integrations/supabase/client";

/**
 * 会員プロフィール。
 *
 * 登録は「データを見るため」に行われ、メールマガジンへの同意とは別物である。
 * 同意は明示的に受け取り、いつ・どこで同意したかまで残す(特定電子メール法)。
 *
 * 読み書きは本人の行に限られる(RLS)。ここでは anon クライアントをそのまま使う —
 * サーバー関数を通す必要が無く、通すとかえって本人確認をやり直すことになる。
 */
export type JpProfile = {
  user_id: string;
  name: string;
  company: string | null;
  position: string | null;
  email: string;
  newsletter_opt_in: boolean;
};

export type ProfileInput = {
  name: string;
  company?: string;
  position?: string;
  newsletterOptIn: boolean;
};

// jp_profiles は生成された Database 型に無い。
// キャストしないと列名が never に狭まる(forecasts と同じ状況)。
type AnyTable = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        k: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
    };
    upsert: (
      row: Record<string, unknown>,
      o?: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
  };
};
const sb = supabase as unknown as AnyTable;

/** 自分のプロフィール。未作成なら null。 */
export async function getMyProfile(userId: string): Promise<JpProfile | null> {
  const { data } = await sb
    .from("jp_profiles")
    .select("user_id,name,company,position,email,newsletter_opt_in")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as JpProfile | null) ?? null;
}

/**
 * 保存。同意の時刻は「同意した瞬間」だけ入れる。
 * 毎回上書きすると、いつ同意したのかが分からなくなる。
 * 解除も時刻を残す — 再同意と区別がつかなくなるため。
 */
export async function saveMyProfile(
  userId: string,
  email: string,
  input: ProfileInput,
  previous: JpProfile | null,
  source = "signup",
): Promise<void> {
  const now = new Date().toISOString();
  const was = previous?.newsletter_opt_in ?? false;
  const row: Record<string, unknown> = {
    user_id: userId,
    email,
    name: input.name.trim(),
    company: input.company?.trim() || null,
    position: input.position?.trim() || null,
    newsletter_opt_in: input.newsletterOptIn,
    updated_at: now,
  };
  if (input.newsletterOptIn && !was) {
    row.opt_in_at = now;
    row.opt_in_source = source;
    row.opt_out_at = null;
  }
  if (!input.newsletterOptIn && was) row.opt_out_at = now;

  const { error } = await sb.from("jp_profiles").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
