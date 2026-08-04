import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHero } from "@/components/site/PageHero";
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
  const tone = value == null ? "text-slate-400" : value < 0 ? "text-rose-600" : "text-emerald-600";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatYoy(value)}</span>;
}

function Row({ s, baseYear }: { s: SppiSeries; baseYear: string }) {
  // 契約通貨ベースが基準年を下回る系列は、円ベースが高くても実質は基準年以下。
  const below = s.contract !== null && s.contract < 100;
  return (
    <tr>
      <td className="px-3 py-2.5 text-left whitespace-nowrap text-slate-900">
        {s.name}
        {below && (
          <span
            className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
            title={`契約通貨ベースが基準年(${baseYear}年=100)を下回る`}
          >
            基準年割れ
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatIndex(s.yen)}</td>
      <td className="px-3 py-2.5 text-right"><Yoy value={s.yoyYenPct} /></td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatIndex(s.contract)}</td>
      <td className="px-3 py-2.5 text-right"><Yoy value={s.yoyContractPct} /></td>
    </tr>
  );
}

export function LogisightJpRates() {
  const { data } = useSuspenseQuery(sppiQueryOptions());
  const { period, baseYear, series, belowBase } = data;

  const groups: { key: string; items: SppiSeries[] }[] = [];
  for (const s of series) {
    const last = groups[groups.length - 1];
    if (last && last.key === s.category) last.items.push(s);
    else groups.push({ key: s.category, items: [s] });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PageHero
        eyebrow="運賃"
        titleMain="企業向けサービス価格指数"
        titleAccent="運輸関連"
        subtitle="円ベースと契約通貨ベースを分けて掲載。円ベースには為替要因が入っており、契約通貨ベースが運賃そのものの動きに近い。"
        chips={
          period
            ? [
                { label: "対象月", value: formatSppiPeriod(period), color: "#38bdf8" },
                { label: "基準", value: `${baseYear}年=100`, color: "#94a3b8" },
              ]
            : []
        }
      />

      <div className="mx-auto max-w-[1100px] px-4 py-10 lg:px-12">
        {series.length === 0 && <p className="text-sm text-slate-500">公表済みのデータがありません。</p>}

        {series.length > 0 && (
          <>
            {belowBase.length > 0 && (
              <div className="mb-7 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3.5">
                <p className="text-[13px] leading-relaxed text-amber-900">
                  <b>契約通貨ベースが基準年を下回る系列</b>:{" "}
                  {belowBase.map((s) => `${s.name}(${formatIndex(s.contract)})`).join("、")}。
                  円ベースが{baseYear}年を上回っていても、運賃そのものは基準年以下ということになる。
                  差は為替要因である。
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2.5 text-left font-semibold">系列</th>
                    <th className="px-3 py-2.5 text-right font-semibold">円ベース</th>
                    <th className="px-3 py-2.5 text-right font-semibold">前年同月比</th>
                    <th className="px-3 py-2.5 text-right font-semibold">契約通貨ベース</th>
                    <th className="px-3 py-2.5 text-right font-semibold">前年同月比</th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key} className="divide-y divide-slate-100">
                    <tr>
                      <td
                        colSpan={5}
                        className="bg-slate-50/70 px-3 py-1.5 text-[11px] font-bold tracking-wide text-slate-500"
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

            <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
              ※ 指数は{baseYear}年=100。円ベースは契約通貨ベースに為替変動を加えたもので、両者の差は定義上すべて
              為替要因。契約通貨ベースが公表されない系列は「—」。前年同月比のマイナスは「▲」で表す。出典: {SOURCE}。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
