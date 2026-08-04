import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { AuthModal, type AuthMode } from "./AuthModal";
import { signOut, takeOAuthError, useSession } from "@/lib/auth";

// ヘッダー。白地・細い罫線に、現在地を藍の下線で示す。
// メニューは隠さず一列に並べる — 日本の業界メディアの導線に合わせる。
const NAV = [
  { to: "/", label: "ホーム" },
  { to: "/news", label: "ニュース" },
  { to: "/dashboard", label: "総合" },
  { to: "/rates", label: "運賃" },
  { to: "/ports", label: "港湾" },
  { to: "/trade", label: "貿易" },
  { to: "/rail", label: "鉄道" },
  { to: "/reports", label: "レポート" },
] as const;

export function JpHeader({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthMode | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const { session, loading } = useSession();

  // OAuth の失敗理由は URL にしか載らない。読まないと「押しても何も起きない」に見える。
  useEffect(() => setOauthError(takeOAuthError()), []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e3e7ec] bg-white/95 backdrop-blur-[6px]">
      <div className="mx-auto flex max-w-[1120px] items-center gap-6 px-4 py-3">
        <Link to="/" className="flex items-baseline gap-2.5">
          <span className="text-[22px] font-bold leading-none tracking-[-0.025em] text-[#0d2137]">
            Logi<span className="text-[#1857b8]">sight</span>
          </span>
          <span className="hidden text-[11px] text-[#8b94a0] min-[600px]:inline">
            物流インテリジェンス
          </span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 min-[820px]:flex">
          {NAV.slice(1).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`relative px-3 py-2 text-[13.5px] transition-colors ${
                active(n.to)
                  ? "font-bold text-[#0d2137] after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[2px] after:bg-[#1857b8]"
                  : "text-[#5b6672] hover:text-[#0d2137]"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <span className="ml-auto hidden text-[11.5px] tabular-nums text-[#8b94a0] min-[1000px]:inline">
          {today}
        </span>

        {/* SSR では session を知りようがないので、確定するまでは何も出さない。
            先に「ログイン」を描くと、ログイン済みの利用者に一瞬それが見える。 */}
        <div className="ml-auto hidden items-center gap-2 min-[820px]:flex min-[1000px]:ml-4">
          {loading ? null : session ? (
            <>
              <span className="max-w-[150px] truncate text-[12px] text-[#5b6672]" title={session.user.email ?? ""}>
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-[6px] border border-[#e3e7ec] px-3 py-1.5 text-[12.5px] font-semibold text-[#16202c] transition-colors hover:bg-[#f6f8fb]"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAuth("login")}
                className="rounded-[6px] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#16202c] transition-colors hover:bg-[#f6f8fb]"
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setAuth("signup")}
                className="rounded-[6px] bg-[#0d2137] px-3 py-1.5 text-[12.5px] font-bold text-white transition-opacity hover:opacity-90"
              >
                新規登録
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="メニューを開く"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#e3e7ec] text-[#0d2137] min-[820px]:hidden"
        >
          {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-[#e3e7ec] min-[820px]:hidden">
          <div className="mx-auto max-w-[1120px] px-4 py-1.5">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`block rounded-[6px] px-3 py-2.5 text-[14px] ${
                  active(n.to) ? "font-bold text-[#1857b8]" : "text-[#16202c]"
                }`}
              >
                {n.label}
              </Link>
            ))}

            <div className="mt-1.5 flex gap-2 border-t border-[#e3e7ec] px-3 py-3">
              {loading ? null : session ? (
                <button
                  type="button"
                  onClick={() => { setOpen(false); void signOut(); }}
                  className="flex-1 rounded-[6px] border border-[#e3e7ec] px-3 py-2 text-[13.5px] font-semibold text-[#16202c]"
                >
                  ログアウト
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setAuth("login"); }}
                    className="flex-1 rounded-[6px] border border-[#e3e7ec] px-3 py-2 text-[13.5px] font-semibold text-[#16202c]"
                  >
                    ログイン
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setAuth("signup"); }}
                    className="flex-1 rounded-[6px] bg-[#0d2137] px-3 py-2 text-[13.5px] font-bold text-white"
                  >
                    新規登録
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      {oauthError && (
        <div className="border-t border-[#f3c9c4] bg-[#fdecea] px-4 py-2.5 text-[12.5px] leading-[1.55] text-[#c0392b]">
          <div className="mx-auto flex max-w-[1120px] items-start gap-3">
            <span className="flex-1">ソーシャルログインに失敗しました: {oauthError}</span>
            <button type="button" onClick={() => setOauthError(null)} className="flex-none font-bold">閉じる</button>
          </div>
        </div>
      )}

      <AuthModal open={auth !== null} mode={auth ?? "login"} onClose={() => setAuth(null)} />
    </header>
  );
}
