import type { OriginRow } from "@/lib/api/tariff";

/** 表示はすべて小数点1桁に揃える。pct1 自体は数値のまま返す — 整形は表示側の責務。 */
const fmt1 = (n: number) => n.toFixed(1);

/** 取れなかった行を 0% と区別して描く。ここを崩すと数字が嘘になる。 */
function Cell({ row }: { row: OriginRow }) {
  if (row.status === "ok")
    return (
      <span className="text-[17px] font-bold tabular-nums text-[#0b2d52]">
        {fmt1(row.totalPct!)}%
      </span>
    );
  if (row.status === "non_ad_valorem")
    return <span className="text-[11.5px] text-[#8a929c]">従量税のため比較不可</span>;
  return <span className="text-[11.5px] text-[#8a929c]">取得できず</span>;
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

  // 一番高い原産地を 100% とした横幅。数字だけだと 2.5 と 40.0 の開きが目に入らない。
  const max = hi?.totalPct ?? 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#d5d9de] text-left text-[11px] tracking-wide text-[#8a929c]">
            <th className="py-2 pr-4 font-semibold">原産地</th>
            <th className="py-2 pr-3 text-right font-semibold">関税</th>
            <th className="w-[120px] py-2 pr-4 font-semibold"> </th>
            <th className="py-2 font-semibold">内訳</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.origin} className="border-b border-[#eef0f2] align-middle">
              <td className="py-3 pr-4 whitespace-nowrap font-medium text-[#1a1f26]">
                {r.labelJa}
              </td>
              <td className="py-3 pr-3 text-right whitespace-nowrap">
                <Cell row={r} />
              </td>
              <td className="py-3 pr-4">
                {r.status === "ok" && max > 0 && (
                  <div className="h-1.5 w-full bg-[#eef0f2]" aria-hidden="true">
                    <div
                      className="h-1.5 bg-[#0b2d52]"
                      style={{ width: `${Math.max(2, (r.totalPct! / max) * 100)}%` }}
                    />
                  </div>
                )}
              </td>
              <td className="py-3 text-[11.5px] leading-[1.7] text-[#6b7683]">
                {r.breakdown.map((b) => `${b.label} ${fmt1(b.pct)}%`).join(" + ")}
                {r.warnings.map((w) => (
                  <div key={w} className="mt-1 text-[#8a5a00]">
                    ⚠ {w}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*
        この表を見る理由がこの一行にある。「どこが安く、どこが高く、その差はいくつか」を
        読み手に足し算させない。矢印で書くと向きの解釈が要るので、素直に並べる。
      */}
      {lo && hi && lo.origin !== hi.origin && (
        <p className="mt-4 text-[13px] text-[#1a1f26]">
          最も低い <b>{lo.labelJa}</b> {fmt1(lo.totalPct!)}% と 最も高い <b>{hi.labelJa}</b>{" "}
          {fmt1(hi.totalPct!)}% の差{" "}
          <b className="tabular-nums text-[#0b2d52]">{fmt1(hi.totalPct! - lo.totalPct!)}pt</b>
        </p>
      )}

      <p className="mt-2 text-[11.5px] text-[#8a929c]">※ 原簿 {asOf} 時点。見積ではない。</p>
      {stale && (
        <p className="mt-1 text-[11.5px] text-[#8a5a00]">
          {"⚠ 最新の取得に失敗したため、一部の原産地は以前取得した値を表示している。"}
        </p>
      )}
    </div>
  );
}
