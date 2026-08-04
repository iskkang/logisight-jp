// src/components/home/HomeNav.tsx
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Wordmark } from "./Wordmark";

const WRAP = "mx-auto w-full max-w-[1360px] px-[18px] min-[620px]:px-7";

// 日本のデータで成立するページのみ。site/Navigation.tsx の SUB_GNB と揃える。
const SUB_GNB = [
  { to: "/rates", label: "運賃" },
  { to: "/ports", label: "港湾" },
  { to: "/trade", label: "貿易" },
  { to: "/climate", label: "気象" },
  { to: "/port-risk", label: "リスク" },
] as const;

/** インサイトの入口。/dashboard は日本版で持たないため運賃を先頭に置く。 */
const INSIGHT_HOME = "/rates";

export function HomeNav({ active = "home" }: { active?: "home" | "news" | "insight" | "reports" }) {
  const [open, setOpen] = useState(false);
  const underline = <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded bg-[#2dd4bf]" />;
  const topCls = (key: "home" | "news" | "insight" | "reports") =>
    key === active ? "relative py-1 text-white" : "py-1 text-[#93a1b7] transition-colors hover:text-white";
  return (
    <header className="sticky top-0 z-50 border-b border-[#78a0cd1c] bg-[#070b16cc] backdrop-blur-[14px] backdrop-saturate-150">
      <div className={`${WRAP} flex h-[82px] items-center gap-14`}>
        <Link to="/"><Wordmark /></Link>
        <nav className="hidden gap-[26px] text-[14px] font-medium text-[#93a1b7] min-[620px]:flex">
          <Link to="/" className={topCls("home")}>
            ホーム{active === "home" && underline}
          </Link>
          <Link to="/news" className={topCls("news")}>ニュース{active === "news" && underline}</Link>
          {active === "insight" ? (
            // 인사이트 내부 페이지 — 하위 SubNav가 이미 있으므로 드롭다운/▼ 없이 활성 표시만.
            <Link to={INSIGHT_HOME} className="relative py-1 text-white">インサイト{underline}</Link>
          ) : (
            // 홈/뉴스 — 인사이트 호버 드롭다운(기존 SUB_GNB)으로 하위 메뉴 노출.
            <div className="group relative py-1">
              <Link to={INSIGHT_HOME} className="inline-flex items-center gap-1 text-[#93a1b7] transition-colors hover:text-white">
                インサイト
                <span className="text-[9px] text-[#2dd4bf] transition-transform group-hover:rotate-180" aria-hidden>▼</span>
              </Link>
              <div className="invisible absolute left-0 top-full z-50 min-w-[160px] rounded-[10px] border border-[#78a0cd1c] bg-[#0a0f1d] p-1.5 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100">
                {SUB_GNB.map((s) => (
                  <Link key={s.to} to={s.to} className="block rounded-[7px] px-3 py-2 text-[13px] text-[#93a1b7] hover:bg-white/5 hover:text-white">
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Link to="/reports" className={topCls("reports")}>
            レポート{active === "reports" && underline}
          </Link>
        </nav>
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#78a0cd33] text-white min-[620px]:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-[#78a0cd1c] px-[18px] py-2 min-[620px]:hidden">
          <Link to="/" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[15px] text-white">ホーム</Link>
          <Link to="/news" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[15px] text-[#93a1b7]">ニュース</Link>
          {active === "insight" ? (
            // 인사이트 내부 — 하위는 SubNav가 노출하므로 모바일에서도 상위 링크만.
            <Link to={INSIGHT_HOME} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[15px] text-white">インサイト</Link>
          ) : (
            <>
              <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5d6b80]">Insight</p>
              {SUB_GNB.map((s) => (
                <Link key={s.to} to={s.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-[14px] text-[#93a1b7]">
                  {s.label}
                </Link>
              ))}
            </>
          )}
          <Link to="/reports" onClick={() => setOpen(false)} className={`block rounded-md px-3 py-2 text-[15px] ${active === "reports" ? "text-white" : "text-[#93a1b7]"}`}>レポート</Link>
        </nav>
      )}
    </header>
  );
}
