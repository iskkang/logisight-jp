import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHero } from "@/components/site/PageHero";
import {
  formatJpPeriod,
  formatJpy,
  formatYoy,
  jpTradeQueryOptions,
  type JpTradeCommodity,
  type JpTradeCountry,
} from "@/lib/api/jp-trade";

const SOURCE = "財務省貿易統計";

function Yoy({ value }: { value: number | null }) {
  const tone = value == null ? "text-slate-400" : value < 0 ? "text-rose-600" : "text-emerald-600";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatYoy(value)}</span>;
}

function CountryRow({ c, emphasis }: { c: JpTradeCountry; emphasis?: boolean }) {
  return (
    <tr className={emphasis ? "bg-slate-50 font-semibold" : ""}>
      <td className="px-3 py-2.5 text-left whitespace-nowrap text-slate-900">{c.name}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatJpy(c.exportJpy)}</td>
      <td className="px-3 py-2.5 text-right"><Yoy value={c.yoyExportPct} /></td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatJpy(c.importJpy)}</td>
      <td className="px-3 py-2.5 text-right"><Yoy value={c.yoyImportPct} /></td>
      <td
        className={`px-3 py-2.5 text-right tabular-nums ${
          (c.balanceJpy ?? 0) < 0 ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {formatJpy(c.balanceJpy)}
      </td>
    </tr>
  );
}

function ItemTable({ title, items }: { title: string; items: JpTradeCommodity[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2.5 text-[14px] font-bold text-slate-900">{title}</h3>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600">
            <th className="px-3 py-2.5 text-left font-semibold">品目</th>
            <th className="px-3 py-2.5 text-right font-semibold">金額</th>
            <th className="px-3 py-2.5 text-right font-semibold">構成比</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((it) => (
            <tr key={it.name}>
              <td className="px-3 py-2 text-left text-slate-900">{it.name}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-900">{formatJpy(it.valueJpy)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                {it.sharePct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LogisightJpTrade() {
  const { data } = useSuspenseQuery(jpTradeQueryOptions());
  const { period, total, countries, exportItems, importItems } = data;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PageHero
        eyebrow="貿易"
        titleMain="輸出入"
        titleAccent="相手国・品目別"
        subtitle="財務省貿易統計にもとづく月次の輸出入額。相手国別の上位10か国と、概況品目の大分類による輸出入構成。"
        chips={period ? [{ label: "対象月", value: formatJpPeriod(period), color: "#38bdf8" }] : []}
      />

      <div className="mx-auto max-w-[1100px] px-4 py-10 lg:px-12">
        {countries.length === 0 && (
          <p className="text-sm text-slate-500">公表済みのデータがありません。</p>
        )}

        {countries.length > 0 && (
          <>
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              {formatJpPeriod(period)} 相手国別
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2.5 text-left font-semibold">相手国</th>
                    <th className="px-3 py-2.5 text-right font-semibold">輸出</th>
                    <th className="px-3 py-2.5 text-right font-semibold">前年同月比</th>
                    <th className="px-3 py-2.5 text-right font-semibold">輸入</th>
                    <th className="px-3 py-2.5 text-right font-semibold">前年同月比</th>
                    <th className="px-3 py-2.5 text-right font-semibold">収支</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {total && <CountryRow c={{ ...total, name: "総額" }} emphasis />}
                  {countries.map((c) => (
                    <CountryRow key={c.name} c={c} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
              ※ 輸出額の上位10か国。地域集計(ASIA・EU など)は除く。マイナスは「▲」で表す。出典:{" "}
              {SOURCE}。
            </p>

            <div className="mt-12 grid gap-8 min-[900px]:grid-cols-2">
              <ItemTable title="輸出 — 品目別構成" items={exportItems} />
              <ItemTable title="輸入 — 品目別構成" items={importItems} />
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
              ※ 概況品目の大分類。構成比はその月・その方向の合計に対する比率。出典: {SOURCE} 概況品別国別表。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
