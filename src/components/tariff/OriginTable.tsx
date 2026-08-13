import type { OriginRow } from "@/lib/api/tariff";

/** 表示はすべて小数点1桁に揃える。pct1 自体は数値のまま返す — 整形は表示側の責務。 */
const fmt1 = (n: number) => n.toFixed(1);

/** 差は符号を必ず付ける。±が無いと、どちら向きか読み手に考えさせることになる。 */
const signed = (n: number) => (n > 0 ? `+${fmt1(n)}` : n < 0 ? `−${fmt1(-n)}` : "±0.0");

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
  /*
    日本を基準として先頭に固定し、他はそこからの差で見せる。
    読者は日本から出す側なので、知りたいのは順位ではなく「自分と比べてどうか」である。
    (日本産だけを出す案もあったが、日本原産は品目に関わらず一律 12.5% になる ——
     上限補正がそう効く —— ので、単独では常に同じ数字しか出ない。比較にしてはじめて
     動きが見える。)
  */
  const jp = rows.find((r) => r.origin === "JP");
  const base = jp && jp.status === "ok" ? jp.totalPct! : null;
  const others = rows.filter((r) => r.origin !== "JP");
  const ordered = jp ? [jp, ...others] : others;

  const ok = rows.filter((r) => r.status === "ok" && r.totalPct !== null);
  const max = ok.length ? Math.max(...ok.map((r) => r.totalPct!)) : 0;
  const cheaper = others.filter((r) => r.status === "ok" && base !== null && r.totalPct! < base);
  const dearer = others.filter((r) => r.status === "ok" && base !== null && r.totalPct! > base);

  return (
    <div className="overflow-x-auto">
      {/*
        どの国が課す税なのかを表の中に書く。国名の隣に税率が並ぶので、書かないと
        「タイの関税は 2.5%」と読める —— 実際そう読まれた。課すのは全て米国で、
        国名は積み出した側である。上のリード文だけでは、表を見た人には届かない。
      */}
      <p className="mb-2 text-[12px] text-[#4a5462]">
        この品目を <b className="text-[#0b2d52]">米国へ輸入するとき</b> の関税。課すのはすべて
        米国で、国名は積み出した側(原産地)である。
      </p>
      <table className="w-full min-w-[600px] border-collapse text-[13px]">
        <caption className="sr-only">{"日本を基準にした、米国輸入時の関税率と内訳"}</caption>
        <thead>
          <tr className="border-b border-[#d5d9de] text-left text-[11px] tracking-wide text-[#8a929c]">
            <th className="py-2 pr-4 font-semibold">原産地</th>
            <th className="py-2 pr-3 text-right font-semibold">米国での関税</th>
            <th className="py-2 pr-4 text-right font-semibold">日本との差</th>
            <th className="w-[110px] py-2 pr-4 font-semibold"> </th>
            <th className="py-2 font-semibold">内訳</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => {
            const isJp = r.origin === "JP";
            const diff = !isJp && base !== null && r.status === "ok" ? r.totalPct! - base : null;
            return (
              <tr
                key={r.origin}
                className={`border-b border-[#eef0f2] align-middle ${isJp ? "bg-[#f7f8f9]" : ""}`}
              >
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span
                    className={isJp ? "font-bold text-[#0b2d52]" : "font-medium text-[#1a1f26]"}
                  >
                    {r.labelJa}
                  </span>
                  {isJp && (
                    <span className="ml-1.5 border border-[#d5d9de] px-1 py-0.5 text-[10px] text-[#6b7683]">
                      基準
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3 text-right whitespace-nowrap">
                  <Cell row={r} />
                </td>
                <td className="py-3 pr-4 text-right whitespace-nowrap tabular-nums">
                  {isJp ? (
                    <span className="text-[11.5px] text-[#8a929c]">—</span>
                  ) : diff === null ? (
                    <span className="text-[11.5px] text-[#8a929c]">—</span>
                  ) : (
                    <span
                      className={`text-[13px] font-bold ${
                        diff === 0 ? "text-[#8a929c]" : "text-[#1a1f26]"
                      }`}
                    >
                      {signed(diff)}pt
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {r.status === "ok" && max > 0 && (
                    <div className="h-1.5 w-full bg-[#eef0f2]" aria-hidden="true">
                      <div
                        className={`h-1.5 ${isJp ? "bg-[#1857b8]" : "bg-[#0b2d52]"}`}
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
            );
          })}
        </tbody>
      </table>

      {/*
        この表を見る理由がこの一行にある。日本から出す読者が知りたいのは順位ではなく
        「日本より安いのはどこか、高いのはどこか」なので、そのまま書く。
      */}
      {base !== null && (cheaper.length > 0 || dearer.length > 0) && (
        <p className="mt-4 text-[13px] leading-[1.9] text-[#1a1f26]">
          日本は <b className="tabular-nums text-[#0b2d52]">{fmt1(base)}%</b>。
          {cheaper.length > 0 && (
            <>
              {" "}
              これより安いのは{" "}
              <b>{cheaper.map((r) => `${r.labelJa} ${fmt1(r.totalPct!)}%`).join("・")}</b>。
            </>
          )}
          {dearer.length > 0 && (
            <>
              {" "}
              高いのは <b>{dearer.map((r) => `${r.labelJa} ${fmt1(r.totalPct!)}%`).join("・")}</b>。
            </>
          )}
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
