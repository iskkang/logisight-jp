import { JpHeader } from "@/components/jp/JpHeader";

/**
 * 旧レイアウト(韓国版から引き継いだページ)向けのアダプタ。
 *
 * 復元したページは HomeNav / HomeFooter を直接参照している。ページごとに
 * 書き換える代わりにここで日本版ヘッダーへ委譲する。こうすると全ページで
 * ヘッダーが自動的に揃い、「ページによってメニューが違う」状態に戻らない。
 * ページ本体を JpPage へ移し終えたら、このファイルは消す。
 */
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

export function HomeNav(_props: { active?: string }) {
  return <JpHeader today={todayJa()} />;
}

export default HomeNav;
