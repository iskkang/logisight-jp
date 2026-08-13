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
    // 案内の高さぶんは必ず確保する。以前は bottom-0 に置いただけだったので、
    // 包んだ中身が案内より低いと上へはみ出して隠れた。ベンチマークの図(300px)は
    // 出るのにレポートの PDF ボタン(約110px)は出ない、という食い違いになっていた。
    <div className="relative min-h-[240px]">
      <div aria-hidden className="pointer-events-none select-none blur-[5px]">
        {children}
      </div>

      {/* 下ほど濃く。上端は読めるので「何の表なのか」は伝わる。 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/70 to-white" />

      {/* inset-0 + justify-end。中身が低いときは枠の高さ(min-h)の中に収まり、
          高いときは従来どおり下端に寄る。 */}
      <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 px-4 pb-8 text-center">
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

      {/* 何を見ようとして止められたかを、そのまま登録画面へ渡す。 */}
      <AuthModal
        open={auth !== null}
        mode={auth ?? "login"}
        reason={title}
        onClose={() => setAuth(null)}
      />
    </div>
  );
}
