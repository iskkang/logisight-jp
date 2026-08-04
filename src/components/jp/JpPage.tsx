import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { JpHeader } from "./JpHeader";
import { JpFooter } from "./JpFooter";

export type Crumb = { label: string; to?: "/" | "/rates" | "/ports" | "/trade" | "/reports" | "/news" };

/** 日付はサーバ・クライアントで同じ値が出るよう JST 固定。 */
function todayJa(): string {
  const p = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}年${Number(g("month"))}月${Number(g("day"))}日(${g("weekday")})`;
}

function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="パンくずリスト" className="border-b border-[#eef0f2] bg-[#fafbfc]">
      <ol className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-1.5 px-4 py-2 text-[11.5px] text-[#6b7683]">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[#b9c0c8]">›</span>}
            {c.to ? (
              <Link to={c.to} className="hover:text-[#0b2d52] hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className="text-[#3c4652]">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * データページ共通の枠。ヘッダー・パンくず・タイトル帯・フッターを1か所にまとめる。
 * ページごとに別々のヘッダーを持っていたため、ホームとメニューが違って見えていた。
 */
export function JpPage({
  crumbs,
  title,
  lead,
  meta,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  lead?: string;
  /** 対象月・出典など。見出しの直下に小さく置く。 */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-[#1a1f26]">
      <JpHeader today={todayJa()} />
      <Breadcrumb items={crumbs} />

      <main className="mx-auto max-w-[1120px] px-4">
        <div className="border-b border-[#d5d9de] pb-4 pt-6">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#0b2d52]">{title}</h1>
          {lead && <p className="mt-2 max-w-[720px] text-[13.5px] leading-[1.75] text-[#4a5462]">{lead}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {children}
      </main>

      <JpFooter />
    </div>
  );
}

/** 対象月などの小さなラベル。 */
export function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-[#d5d9de] bg-[#f7f8f9] px-2.5 py-1 text-[11.5px]">
      <span className="text-[#8a929c]">{label}</span>
      <span className="font-bold tabular-nums text-[#1a1f26]">{value}</span>
    </span>
  );
}

/** 節見出し。ホームと同じ罫線スタイルに揃える。 */
export function SecTitle({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-3 mt-9 flex items-baseline justify-between gap-3 border-b-2 border-[#0b2d52] pb-1.5">
      <h2 className="text-[15px] font-bold tracking-[-0.01em] text-[#0b2d52]">{children}</h2>
      {note}
    </div>
  );
}
