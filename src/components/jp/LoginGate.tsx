import { useState, type ReactNode } from "react";

import { AuthModal, type AuthMode } from "./AuthModal";
import { useSession } from "@/lib/auth";

/**
 * 未ログインの利用者に中身をぼかして見せる。
 *
 * ■ これは鍵ではない
 * ぼかしは CSS である。中身はすでにブラウザに届いており、開発者ツールを開けば読める。
 * 目的は秘匿ではなく「何があるかは見せて、登録する理由をつくる」ことである。
 * 有料の中身(最新号の本文・PDF)は決してこれで守らない — サーバー側で送らない。
 *
 * ■ なぜ DOM に残すのか
 * クローラーが読むテキストが無ければ索引されない。2026-08 時点で検索からの流入は
 * ゼロで、まだ索引が育っていない。中身ごと差し替えると、育つ前に道を閉ざすことになる。
 *
 * ■ 読み込み中はぼかさない
 * セッション取得は非同期である。loading の間にぼかすと、ログイン済みの利用者にも
 * 一瞬ぼけた画面が出る。判定がつくまでは素通しにする。
 */
export function LoginGate({
  children,
  title = "続きはログインするとご覧いただけます",
  note,
}: {
  children: ReactNode;
  title?: string;
  note?: ReactNode;
}) {
  const { session, loading } = useSession();
  const [auth, setAuth] = useState<AuthMode | null>(null);

  if (loading || session) return <>{children}</>;

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-[5px]">
        {children}
      </div>

      {/* 下ほど濃く。上端は読めるので「何の表なのか」は伝わる。 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/70 to-white" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-8 text-center">
        <p className="text-[15px] font-bold text-[#0b2d52]">{title}</p>
        {note && <p className="max-w-[30rem] text-[12.5px] leading-[1.8] text-[#6b7683]">{note}</p>}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setAuth("signup")}
            className="bg-[#0b2d52] px-5 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-85"
          >
            無料で登録する
          </button>
          <button
            type="button"
            onClick={() => setAuth("login")}
            className="border border-[#0b2d52] px-5 py-2 text-[13px] font-bold text-[#0b2d52] transition-colors hover:bg-[#0b2d52] hover:text-white"
          >
            ログイン
          </button>
        </div>
      </div>

      <AuthModal open={auth !== null} mode={auth ?? "login"} onClose={() => setAuth(null)} />
    </div>
  );
}
