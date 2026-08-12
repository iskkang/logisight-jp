import type { OriginRow } from "@/lib/api/tariff";

/** 表示はすべて小数点1桁に揃える。pct1 自体は数値のまま返す — 整形は表示側の責務。 */
const fmt1 = (n: number) => n.toFixed(1);

/** 取れなかった行を 0% と区別して描く。ここを崩すと数字が嘘になる。 */
function Cell({ row }: { row: OriginRow }) {
  if (row.status === "ok")
    return <span className="font-bold tabular-nums">{fmt1(row.totalPct!)}%</span>;
  if (row.status === "non_ad_valorem")
    return <span className="text-xs text-slate-500">従量税のため比較不可</span>;
  return <span className="text-xs text-slate-500">取得できず</span>;
}

export function OriginTable({
  rows,
  asOf,
  stale,
}: {
  rows: OriginRow[];
  asOf: string;
  /** true なら、表示中の値の少なくとも1つが「相手が落ちたので古い値で代替した」経路を通った。 */
  stale: boolean;
}) {
  const ok = rows.filter((r) => r.status === "ok" && r.totalPct !== null);
  const lo = ok[0];
  const hi = ok[ok.length - 1];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4 font-semibold">原産地</th>
            <th className="py-2 pr-4 text-right font-semibold">関税</th>
            <th className="py-2 font-semibold">内訳</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.origin} className="border-b border-slate-100 align-top">
              <td className="py-2.5 pr-4 whitespace-nowrap">{r.labelJa}</td>
              <td className="py-2.5 pr-4 text-right">
                <Cell row={r} />
              </td>
              <td className="py-2.5 text-xs text-slate-600">
                {r.breakdown.map((b) => `${b.label} ${fmt1(b.pct)}%`).join(" + ")}
                {r.warnings.map((w) => (
                  <div key={w} className="mt-1 text-amber-700">
                    ⚠ {w}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {lo && hi && lo.origin !== hi.origin && (
        <p className="mt-3 text-sm text-slate-700">
          {hi.labelJa} → {lo.labelJa} との差{" "}
          <b className="tabular-nums">−{fmt1(hi.totalPct! - lo.totalPct!)}pt</b>
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">※ 原簿 {asOf} 時点。見積ではない。</p>
      {stale && (
        <p className="mt-1 text-xs text-amber-700">
          {"⚠ 最新の取得に失敗したため、一部の原産地は以前取得した値を表示している。"}
        </p>
      )}
    </div>
  );
}
