import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// ヘッダー。白地・細い罫線に、現在地を藍の下線で示す。
// メニューは隠さず一列に並べる — 日本の業界メディアの導線に合わせる。
const NAV = [
  { to: "/", label: "ホーム" },
  { to: "/news", label: "ニュース" },
  { to: "/dashboard", label: "総合" },
  { to: "/rates", label: "運賃" },
  { to: "/ports", label: "港湾" },
  { to: "/trade", label: "貿易" },
  { to: "/climate", label: "気象" },
  { to: "/port-risk", label: "リスク" },
  { to: "/rail", label: "鉄道" },
  { to: "/forecasts", label: "見通し" },
  { to: "/reports", label: "レポート" },
] as const;

export function JpHeader({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
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

        <span className="ml-auto hidden text-[11.5px] tabular-nums text-[#8b94a0] min-[820px]:inline">
          {today}
        </span>

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
          </div>
        </nav>
      )}
    </header>
  );
}
