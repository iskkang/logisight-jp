import type { OriginRow } from "@/lib/api/tariff";

/** 取れなかった行を 0% と区別して描く。ここを崩すと数字が嘘になる。 */
function Cell({ row }: { row: OriginRow }) {
  if (row.status === "ok") return <span className="font-bold tabular-nums">{row.totalPct}%</span>;
  if (row.status === "non_ad_valorem")
    return <span className="text-xs text-slate-500">従量税のため比較できない</span>;
  return <span className="text-xs text-slate-500">取得できず</span>;
}

export function OriginTable({ rows, asOf }: { rows: OriginRow[]; asOf: string }) {
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
                {r.breakdown.map((b) => `${b.label} ${b.pct}`).join(" + ")}
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
          <b className="tabular-nums">−{Math.round((hi.totalPct! - lo.totalPct!) * 10) / 10}pt</b>
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">※ 原資料 {asOf} 時点。見積ではない。</p>
    </div>
  );
}
