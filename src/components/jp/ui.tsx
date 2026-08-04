import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * 日本版のデザインプリミティブ。
 *
 * 配色は韓国版(ティール)とも参考にした LP(オレンジ)とも変える。
 * 基調は紺 #0d2137、アクセントは藍 #1857b8。数値の増減だけは
 * 日本の財務表記に合わせ、マイナスを朱 #c0392b で示す。
 */
export const C = {
  navy: "#0d2137",
  accent: "#1857b8",
  accentSoft: "#eaf0fa",
  ink: "#16202c",
  sub: "#5b6672",
  faint: "#8b94a0",
  line: "#e3e7ec",
  bg: "#f6f8fb",
  up: "#157347",
  down: "#c0392b",
} as const;

/** 節の入り口。小さいラベル → 見出し → 補足の3段で、ページに拍をつける。 */
export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  const a = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`flex flex-col ${a} gap-2`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1857b8]">
        {eyebrow}
      </span>
      <h2 className="text-[clamp(21px,2.4vw,27px)] font-bold leading-[1.35] tracking-[-0.02em] text-[#0d2137]">
        {title}
      </h2>
      {sub && (
        <p className={`max-w-[620px] text-[13.5px] leading-[1.85] text-[#5b6672] ${align === "center" ? "" : ""}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-[10px] border border-[#e3e7ec] bg-white shadow-[0_1px_2px_rgba(13,33,55,0.04)] ${
        hover ? "transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(13,33,55,0.22)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

type Href = "/" | "/rates" | "/ports" | "/trade" | "/reports" | "/news" | "/about" | "/methodology";

export function CtaLink({
  to,
  children,
  variant = "solid",
}: {
  to: Href;
  children: ReactNode;
  variant?: "solid" | "ghost";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[7px] px-[18px] py-[11px] text-[13.5px] font-bold transition-colors";
  const style =
    variant === "solid"
      ? "bg-[#1857b8] text-white hover:bg-[#124593]"
      : "border border-[#c9d4e4] text-[#0d2137] hover:border-[#1857b8] hover:text-[#1857b8]";
  return (
    <Link to={to} className={`${base} ${style}`}>
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}

/** 節と節のあいだの余白。ページ全体の拍をここで揃える。 */
export function Section({
  children,
  tone = "white",
  id,
}: {
  children: ReactNode;
  tone?: "white" | "tint";
  id?: string;
}) {
  return (
    <section id={id} className={tone === "tint" ? "bg-[#f6f8fb]" : "bg-white"}>
      <div className="mx-auto max-w-[1120px] px-4 py-[60px] min-[720px]:py-[76px]">{children}</div>
    </section>
  );
}
