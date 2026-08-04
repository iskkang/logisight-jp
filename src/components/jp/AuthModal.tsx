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
   外部リクエストを増やさないため SVG を直に置く。配色は各社のブランド指定に従う
   (Google は白地に原色ロゴ、Apple は黒地に白ロゴ、LINE は緑地に白ロゴ)。      */

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" fill="#fff" aria-hidden="true">
      <path d="M14.05 10.6c-.02-2.1 1.72-3.11 1.8-3.16-.98-1.44-2.5-1.64-3.05-1.66-1.3-.13-2.54.76-3.2.76-.66 0-1.68-.74-2.76-.72-1.42.02-2.73.82-3.46 2.09-1.47 2.56-.38 6.35 1.06 8.43.7 1.02 1.54 2.16 2.64 2.12 1.06-.04 1.46-.69 2.74-.69 1.28 0 1.64.69 2.76.67 1.14-.02 1.86-1.04 2.56-2.06.8-1.18 1.13-2.32 1.15-2.38-.03-.01-2.21-.85-2.24-3.37ZM11.96 4.2c.58-.71.97-1.69.86-2.67-.84.04-1.85.56-2.45 1.26-.54.63-1.01 1.63-.88 2.59.93.07 1.89-.47 2.47-1.18Z" />
    </svg>
  );
}

function LineMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12 2C6.48 2 2 5.64 2 10.13c0 4.02 3.55 7.39 8.35 8.03.33.07.77.22.88.5.1.26.07.66.03.92l-.14.85c-.04.25-.2.98.86.53 1.06-.44 5.72-3.37 7.8-5.77C21.2 13.6 22 11.96 22 10.13 22 5.64 17.52 2 12 2ZM8.08 12.85H6.1a.53.53 0 0 1-.53-.52V8.4c0-.29.24-.53.53-.53.29 0 .53.24.53.53v3.4h1.45c.29 0 .52.24.52.53 0 .29-.23.52-.52.52Zm2.07-.52c0 .29-.24.52-.53.52a.53.53 0 0 1-.53-.52V8.4c0-.29.24-.53.53-.53.29 0 .53.24.53.53v3.93Zm4.73 0c0 .23-.15.43-.36.5a.55.55 0 0 1-.17.02.52.52 0 0 1-.43-.21l-2.03-2.76v2.45c0 .29-.23.52-.52.52a.53.53 0 0 1-.53-.52V8.4c0-.22.15-.42.36-.5a.5.5 0 0 1 .17-.02c.16 0 .32.08.42.21l2.04 2.77V8.4c0-.29.23-.53.52-.53.29 0 .53.24.53.53v3.93Zm3.18-2.49c.29 0 .53.24.53.53 0 .29-.24.53-.53.53h-1.45v.93h1.45c.29 0 .53.23.53.52 0 .29-.24.52-.53.52h-1.97a.53.53 0 0 1-.53-.52V8.4c0-.29.24-.53.53-.53h1.97c.29 0 .53.24.53.53 0 .29-.24.53-.53.53h-1.45v.93h1.45Z" />
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
  {
    key: "apple",
    label: "Apple で続ける",
    mark: AppleMark,
    className: "border-black bg-black text-white hover:bg-[#1a1a1a]",
  },
  {
    key: "line",
    label: "LINE で続ける",
    mark: LineMark,
    className: "border-[#06C755] bg-[#06C755] text-white hover:bg-[#05b34c]",
  },
];

export function AuthModal({
  open,
  mode: initialMode,
  onClose,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // 開くたびに初期状態へ戻す。前回の入力やエラーが残っていると混乱する。
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setNotice(null);
    setBusy(null);
    const t = setTimeout(() => emailRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
          setNotice("確認メールを送りました。メール内のリンクを開くと登録が完了します。");
          return;
        }
      } else {
        await signInWithPassword(email, password);
      }
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
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isSignup ? "新規登録" : "ログイン"}
        className="max-h-full w-full max-w-[400px] overflow-y-auto rounded-[14px] bg-white p-7 shadow-[0_18px_50px_rgba(13,33,55,0.28)]"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: C.accent }}>
          Logisight
        </div>
        <h2 className="text-[21px] font-bold tracking-[-0.01em]" style={{ color: C.navy }}>
          {isSignup ? "新規登録" : "ログイン"}
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.6]" style={{ color: C.sub }}>
          {isSignup
            ? "アカウントを作成すると、月次レポートと気象リスクの更新を受け取れます。"
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
            <p className="rounded-[7px] bg-[#fdecea] px-3 py-2 text-[12.5px] leading-[1.55]" style={{ color: C.down }}>
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-[7px] bg-[#e8f5ee] px-3 py-2 text-[12.5px] leading-[1.55]" style={{ color: C.up }}>
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
          <span className="text-[11.5px]" style={{ color: C.faint }}>または</span>
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
            onClick={() => { setMode(isSignup ? "login" : "signup"); setError(null); setNotice(null); }}
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
      </div>
    </div>,
    document.body,
  );
}
