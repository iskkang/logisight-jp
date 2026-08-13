import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { C } from "./ui";
import {
  authErrorJa,
  signInWithPassword,
  signInWithSocial,
  signUpWithPassword,
  type SocialProvider,
} from "@/lib/auth";

export type AuthMode = "login" | "signup";

/* ── ソーシャルのロゴ ────────────────────────────────────────────────
   外部リクエストを増やさないため SVG を直に置く。配色はブランド指定に従い、
   Google は白地に原色ロゴとする。                                            */

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

const SOCIALS: {
  key: SocialProvider;
  label: string;
  mark: () => React.JSX.Element;
  className: string;
}[] = [
  {
    key: "google",
    label: "Google で続ける",
    mark: GoogleMark,
    className: "border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f7f8f9]",
  },
];

export function AuthModal({
  open,
  mode: initialMode,
  onClose,
  reason,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  /**
   * ぼかしから来たときの、その場の文言。「港別の内訳はログインするとご覧いただけます」など。
   * ヘッダーの登録ボタンから来たときは無い。
   */
  reason?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // 登録が済んだ状態。確認メールを挟まない設定では、ここで初めて
  // 「登録できた」と分かる — 黙って閉じると成功したのか分からない。
  const [done, setDone] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // 開くたびに初期状態へ戻す。前回の入力やエラーが残っていると混乱する。
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setNotice(null);
    setBusy(null);
    setDone(false);
    const t = setTimeout(() => emailRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // 背後のページがスクロールすると、ダイアログだけ取り残されて見える。
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // SSR には document が無い。ポータルはマウント後にだけ張る。
  if (!open || typeof document === "undefined") return null;

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("email");
    try {
      if (isSignup) {
        const { needsConfirm } = await signUpWithPassword(email, password);
        if (needsConfirm) {
          // Supabase 側でメール確認が有効なときだけここに来る。
          setNotice("確認メールを送りました。メール内のリンクを開くと登録が完了します。");
          return;
        }
        // セッションが張られている = そのまま閲覧できる。完了を伝えて終わる。
        setDone(true);
        return;
      }
      await signInWithPassword(email, password);
      onClose();
    } catch (err) {
      setError(authErrorJa((err as Error).message));
    } finally {
      setBusy(null);
    }
  }

  async function social(p: SocialProvider) {
    setError(null);
    setNotice(null);
    setBusy(p);
    try {
      // 成功すると外部サイトへ遷移するので、ここから先は戻ってこない。
      await signInWithSocial(p);
    } catch (err) {
      setError(authErrorJa((err as Error).message));
      setBusy(null);
    }
  }

  const field =
    "w-full rounded-[8px] border border-[#d5dbe3] bg-white px-3 py-2.5 text-[14px] text-[#16202c] " +
    "outline-none transition-colors placeholder:text-[#a3abb6] focus:border-[#1857b8]";

  // body に直接描く。ヘッダーは backdrop-blur を持っており、その中に置くと
  // position:fixed の基準がヘッダーになってダイアログが header の高さに切り取られる。
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={done ? "登録完了" : isSignup ? "新規登録" : "ログイン"}
        className="max-h-full w-full max-w-[400px] overflow-y-auto rounded-[14px] bg-white p-7 shadow-[0_18px_50px_rgba(13,33,55,0.28)]"
      >
        <div
          className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: C.accent }}
        >
          Logisight
        </div>

        {done ? (
          <>
            <h2 className="text-[21px] font-bold tracking-[-0.01em]" style={{ color: C.navy }}>
              会員登録が完了しました
            </h2>
            <p className="mt-2 text-[13px] leading-[1.8]" style={{ color: C.sub }}>
              このままご覧いただけます。運賃指数の全系列と、ベンチマークの全期間の推移が
              表示されます。
            </p>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="mt-6 w-full rounded-[8px] px-4 py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: C.navy }}
            >
              確認
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[21px] font-bold tracking-[-0.01em]" style={{ color: C.navy }}>
              {isSignup ? "新規登録" : "ログイン"}
            </h2>
            {/*
              押した理由と、ここで返す約束を揃える。

              以前は「月次レポートと気象リスクの更新を受け取れます」とだけ書いていた。
              つまりメールの話をしていた。ところが実際に鍵が掛かっているのは
              港別の内訳・系列別13系列・本文とPDF・全期間の推移で、利用者は
              「今それを見たい」から押している。返事が別の話をしていた。

              ぼかしから来たときは、そのぼかしの文言(reason)をそのまま出す。
              どれを見ようとして止められたかは、本人がいちばん覚えている。
            */}
            {isSignup && reason && (
              <p
                className="mt-2 border-l-2 pl-2.5 text-[12.5px] font-bold leading-[1.6]"
                style={{ color: C.navy, borderColor: C.accent }}
              >
                {reason}
              </p>
            )}
            <p className="mt-1.5 text-[12.5px] leading-[1.6]" style={{ color: C.sub }}>
              {isSignup
                ? "無料の登録で、港別の内訳・系列別の全13系列・月次レポートの本文とPDF・全期間の推移が見られます。メールでのお知らせは任意です。"
                : "登録済みのアカウントでログインしてください。"}
            </p>

            <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5">
              <label className="text-[12px] font-semibold" style={{ color: C.ink }}>
                メールアドレス
                <input
                  ref={emailRef}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.co.jp"
                  className={`mt-1 font-normal ${field}`}
                />
              </label>
              <label className="text-[12px] font-semibold" style={{ color: C.ink }}>
                パスワード
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "6文字以上" : "••••••••"}
                  className={`mt-1 font-normal ${field}`}
                />
              </label>

              {error && (
                <p
                  className="rounded-[7px] bg-[#fdecea] px-3 py-2 text-[12.5px] leading-[1.55]"
                  style={{ color: C.down }}
                >
                  {error}
                </p>
              )}
              {notice && (
                <p
                  className="rounded-[7px] bg-[#e8f5ee] px-3 py-2 text-[12.5px] leading-[1.55]"
                  style={{ color: C.up }}
                >
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={busy !== null}
                className="mt-1 w-full rounded-[8px] px-4 py-2.5 text-[14px] font-bold text-white transition-opacity disabled:opacity-55"
                style={{ background: C.navy }}
              >
                {busy === "email" ? "処理中…" : isSignup ? "登録する" : "ログイン"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1" style={{ background: C.line }} />
              <span className="text-[11.5px]" style={{ color: C.faint }}>
                または
              </span>
              <span className="h-px flex-1" style={{ background: C.line }} />
            </div>

            <div className="flex flex-col gap-2">
              {SOCIALS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => social(s.key)}
                  disabled={busy !== null}
                  className={`flex w-full items-center justify-center gap-2.5 rounded-[8px] border px-4 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-55 ${s.className}`}
                >
                  <s.mark />
                  {busy === s.key ? "接続中…" : s.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-center text-[12.5px]" style={{ color: C.sub }}>
              {isSignup ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isSignup ? "login" : "signup");
                  setError(null);
                  setNotice(null);
                }}
                className="font-bold underline underline-offset-2"
                style={{ color: C.accent }}
              >
                {isSignup ? "ログイン" : "新規登録"}
              </button>
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full text-center text-[12px]"
              style={{ color: C.faint }}
            >
              閉じる
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
