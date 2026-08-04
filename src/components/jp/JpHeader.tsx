import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";

// 日本の物流専門紙に寄せたヘッダー。ダークのグラデーションではなく白地・細い罫線。
// メニューはテキストリンクで詰めて置く — 日本の業界紙は導線を隠さず一列に並べる。
const NAV = [
  { to: "/", label: "ホーム" },
  { to: "/news", label: "ニュース" },
  { to: "/rates", label: "運賃" },
  { to: "/ports", label: "港湾" },
  { to: "/trade", label: "貿易" },
  { to: "/climate", label: "気象" },
  { to: "/reports", label: "レポート" },
] as const;

export function JpHeader({ today }: { today: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="border-b border-[#d5d9de] bg-white">
      <div className="mx-auto flex max-w-[1120px] items-end justify-between gap-4 px-4 pb-2.5 pt-4">
        <Link to="/" className="flex items-baseline gap-2.5">
          <span className="text-[25px] font-bold leading-none tracking-[-0.02em] text-[#0b2d52]">
            Logisight
          </span>
          <span className="hidden text-[11.5px] text-[#6b7683] min-[560px]:inline">
            物流インテリジェンス
          </span>
        </Link>
        <div className="text-[11.5px] tabular-nums text-[#6b7683]">{today}</div>
      </div>

      <nav className="border-t border-[#e8ebee]">
        <div className="mx-auto flex max-w-[1120px] items-stretch gap-0 overflow-x-auto px-4">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`whitespace-nowrap px-3.5 py-2.5 text-[13.5px] transition-colors first:pl-0 ${
                active(n.to)
                  ? "font-bold text-[#0b2d52] shadow-[inset_0_-2px_0_#0b2d52]"
                  : "text-[#3c4652] hover:text-[#0b2d52]"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
