import { useSuspenseQuery } from "@tanstack/react-query";

import { Chip, JpPage, SecTitle } from "@/components/jp/JpPage";
import { SppiChart } from "@/components/jp/SppiChart";
import {
  formatIndex,
  formatSppiPeriod,
  formatYoy,
  sppiQueryOptions,
  type SppiSeries,
} from "@/lib/api/sppi";

const SOURCE = "日本銀行 企業向けサービス価格指数(SPPI)";

const CATEGORY_LABEL: Record<string, string> = {
  ocean: "海上",
  air: "航空",
  land: "陸上",
  port: "港湾運送",
  warehouse: "倉庫",
  total: "運輸・郵便(総合)",
};

function Yoy({ value }: { value: number | null }) {
  const tone = value == null ? "text-[#8a929c]" : value < 0 ? "text-[#c0392b]" : "text-[#177245]";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatYoy(value)}</span>;
}

function Row({ s, baseYear }: { s: SppiSeries; baseYear: string }) {
  // 契約通貨ベースが基準年を下回る系列は、円ベースが高くても実質は基準年以下。
  const below = s.contract !== null && s.contract < 100;
  return (
    <tr className="border-b border-[#eef0f2]">
      <td className="py-2.5 pr-3 text-left">
        {s.name}
        {below && (
          <span
            className="ml-2 whitespace-nowrap bg-[#fdf3e3] px-1.5 py-0.5 text-[10px] font-bold text-[#95601a]"
            title={`契約通貨ベースが基準年(${baseYear}年=100)を下回る`}
          >
            基準年割れ
          </span>
        )}
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{formatIndex(s.yen)}</td>
      <td className="w-[92px] py-2.5 pr-3 text-right"><Yoy value={s.yoyYenPct} /></td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{formatIndex(s.contract)}</td>
      <td className="w-[92px] py-2.5 text-right"><Yoy value={s.yoyContractPct} /></td>
    </tr>
  );
}

export function LogisightJpRates() {
  const { data } = useSuspenseQuery(sppiQueryOptions());
  const { period, baseYear, series, belowBase, history } = data;

  const groups: { key: string; items: SppiSeries[] }[] = [];
  for (const s of series) {
    const last = groups[groups.length - 1];
    if (last && last.key === s.category) last.items.push(s);
    else groups.push({ key: s.category, items: [s] });
  }

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "運賃" }]}
      title="企業向けサービス価格指数 — 運輸関連"
      lead="円ベースと契約通貨ベースを分けて掲載しています。円ベースには為替要因が入っており、運賃そのものの動きに近いのは契約通貨ベースです。"
      meta={
        period ? (
          <>
            <Chip label="対象月" value={formatSppiPeriod(period)} />
            <Chip label="基準" value={`${baseYear}年=100`} />
            <Chip label="出典" value="日本銀行" />
          </>
        ) : null
      }
    >
      {series.length === 0 && (
        <p className="py-10 text-[13px] text-[#6b7683]">公表済みのデータがありません。</p>
      )}

      {series.length > 0 && (
        <>
          {history.length > 0 && (
            <>
              <SecTitle note={<span className="text-[11px] text-[#8a929c]">赤の破線 = 基準年(100)</span>}>
                推移
              </SecTitle>
              <div className="grid grid-cols-1 gap-3.5 min-[820px]:grid-cols-3">
                {history.map((h) => (
                  <SppiChart key={h.name} name={h.name} points={h.points} baseYear={baseYear} />
                ))}
              </div>
            </>
          )}

          {belowBase.length > 0 && (
            <div className="mt-7 border-l-[3px] border-[#c9922f] bg-[#fdf9f0] px-4 py-3">
              <p className="text-[12.5px] leading-[1.8] text-[#6b4d16]">
                <b>契約通貨ベースが基準年を下回る系列</b>:{" "}
                {belowBase.map((s) => `${s.name}(${formatIndex(s.contract)})`).join("、")}。
                円ベースが{baseYear}年を上回っていても、運賃そのものは基準年以下ということになります。差は為替要因です。
              </p>
            </div>
          )}

          <SecTitle>系列別</SecTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#b9c0c8] text-[11.5px] text-[#6b7683]">
                  <th className="py-2 pr-3 text-left font-bold">系列</th>
                  <th className="py-2 pr-3 text-right font-bold">円ベース</th>
                  <th className="py-2 pr-3 text-right font-bold">前年同月比</th>
                  <th className="py-2 pr-3 text-right font-bold">契約通貨ベース</th>
                  <th className="py-2 text-right font-bold">前年同月比</th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.key}>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-[#eef0f2] bg-[#f7f8f9] px-0 py-1.5 text-[11px] font-bold tracking-wide text-[#6b7683]"
                    >
                      {CATEGORY_LABEL[g.key] ?? g.key}
                    </td>
                  </tr>
                  {g.items.map((s) => (
                    <Row key={s.name} s={s} baseYear={baseYear} />
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <p className="mb-2 mt-4 text-[11.5px] leading-[1.8] text-[#8a929c]">
            ※ 指数は{baseYear}年=100。円ベースは契約通貨ベースに為替変動を加えたもので、両者の差は定義上すべて為替要因。
            契約通貨ベースが公表されない系列は「—」。前年同月比のマイナスは「▲」で表す。出典: {SOURCE}。
          </p>
        </>
      )}
    </JpPage>
  );
}
