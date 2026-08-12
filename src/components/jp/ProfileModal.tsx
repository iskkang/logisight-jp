import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

import { useSession } from "@/lib/auth";
import { getMyProfile, saveMyProfile, type JpProfile } from "@/lib/api/profile";

/**
 * 登録直後に一度だけ出るプロフィール入力。
 *
 * ■ なぜ登録画面の中で受け取らないのか
 * Google で登録する人がいる。Google の画面に項目を足すことはできないので、
 * 登録の中で受け取るとメール登録の人だけが答えることになる。
 * 登録が済んだ後に出せば、どちらの経路でも同じ道を通る。
 *
 * ■ 「あとで」を残す
 * ここで閉じられなくすると、データを見に来た人が登録を後悔する。
 * プロフィールが無いまま使えてよく、次にログインしたときにまた出る。
 *
 * ■ 配信同意は既定で外す
 * 特定電子メール法はオプトイン方式で、あらかじめ同意を得た相手にしか
 * 広告・宣伝を含むメールを送れない。既定でチェックを入れると同意にならない。
 */
const INPUT =
  "w-full border border-[#ccd2d9] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#0b2d52]";

export function ProfileModal() {
  const { session, loading } = useSession();
  const [profile, setProfile] = useState<JpProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user;

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    getMyProfile(user.id)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        // 未入力の人にだけ出す。入れ終わった人には二度と出ない。
        if (!p) setOpen(true);
      })
      .catch(() => {
        /* 取得に失敗しても閲覧は妨げない */
      });
    return () => {
      alive = false;
    };
  }, [loading, user]);

  if (!open || !user) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await saveMyProfile(
        user.id,
        user.email ?? "",
        {
          name: String(f.get("name") ?? ""),
          company: String(f.get("company") ?? ""),
          position: String(f.get("position") ?? ""),
          newsletterOptIn: f.get("newsletter") === "on",
        },
        profile,
        "signup",
      );
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="max-h-full w-full max-w-[440px] overflow-y-auto bg-white p-7">
        <h2 className="text-[19px] font-bold text-[#0b2d52]">ご登録ありがとうございます</h2>
        <p className="mt-2 text-[12.5px] leading-[1.8] text-[#6b7683]">
          差し支えなければ、ご所属をお聞かせください。以降のご案内に使わせていただきます。
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-[#3c4652]">
              お名前<span className="ml-1.5 text-[11px] font-normal text-[#c0392b]">必須</span>
            </span>
            <input name="name" required maxLength={100} className={INPUT} autoComplete="name" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-[#3c4652]">会社名</span>
            <input name="company" maxLength={200} className={INPUT} autoComplete="organization" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-[#3c4652]">役職</span>
            <input
              name="position"
              maxLength={100}
              className={INPUT}
              autoComplete="organization-title"
            />
          </label>

          {/* 既定でチェックを入れない。入れた状態は同意にならない。 */}
          <label className="flex items-start gap-2.5 border border-[#e2e6ea] bg-[#f7f8f9] p-3.5">
            <input name="newsletter" type="checkbox" className="mt-0.5 h-4 w-4 flex-none" />
            <span className="text-[12.5px] leading-[1.75] text-[#3c4652]">
              メールマガジンを受け取る
              <span className="mt-1 block text-[11.5px] text-[#8a929c]">
                運賃・港湾・貿易の動きを週3回お届けします。配信はいつでも停止できます。
              </span>
            </span>
          </label>

          {error && (
            <p className="border-l-[3px] border-[#c0392b] bg-[#fdecea] px-3.5 py-2.5 text-[12.5px] text-[#c0392b]">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="bg-[#0b2d52] px-6 py-2.5 text-[13.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "保存中…" : "保存する"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[13px] text-[#6b7683] hover:text-[#0b2d52] hover:underline"
            >
              あとで
            </button>
          </div>

          <p className="text-[11.5px] leading-[1.8] text-[#8a929c]">
            お預かりした情報の取り扱いは{" "}
            <Link to="/privacy" className="text-[#0b2d52] underline hover:no-underline">
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </form>
      </div>
    </div>
  );
}
