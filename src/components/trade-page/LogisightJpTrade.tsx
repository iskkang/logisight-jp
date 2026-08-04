import { useSuspenseQuery } from "@tanstack/react-query";

import { Chip, JpPage, SecTitle } from "@/components/jp/JpPage";
import { TradeCountryChart, TradeItemChart } from "@/components/jp/TradeChart";
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
  const tone = value == null ? "text-[#8a929c]" : value < 0 ? "text-[#c0392b]" : "text-[#177245]";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatYoy(value)}</span>;
}

function CountryRow({ c, emphasis }: { c: JpTradeCountry; emphasis?: boolean }) {
  return (
    <tr className={emphasis ? "bg-[#f7f8f9] font-semibold" : ""}>
      <td className="px-3 py-2.5 text-left whitespace-nowrap ">{c.name}</td>
      <td className="px-3 py-2.5 text-right tabular-nums ">{formatJpy(c.exportJpy)}</td>
      <td className="px-3 py-2.5 text-right"><Yoy value={c.yoyExportPct} /></td>
      <td className="px-3 py-2.5 text-right tabular-nums ">{formatJpy(c.importJpy)}</td>
      <td className="px-3 py-2.5 text-right"><Yoy value={c.yoyImportPct} /></td>
      <td
        className={`px-3 py-2.5 text-right tabular-nums ${
          (c.balanceJpy ?? 0) < 0 ? "text-[#c0392b]" : ""
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
      <h3 className="mb-2.5 text-[14px] font-bold ">{title}</h3>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-[#b9c0c8] text-[11.5px] text-[#6b7683]">
            <th className="px-3 py-2.5 text-left font-semibold">品目</th>
            <th className="px-3 py-2.5 text-right font-semibold">金額</th>
            <th className="px-3 py-2.5 text-right font-semibold">構成比</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef0f2]">
          {items.map((it) => (
            <tr key={it.name}>
              <td className="px-3 py-2 text-left ">{it.name}</td>
              <td className="px-3 py-2 text-right tabular-nums ">{formatJpy(it.valueJpy)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[#4a5462]">
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
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "貿易" }]}
      title="輸出入 — 相手国・品目別"
      lead="財務省貿易統計にもとづく月次の輸出入額です。相手国は輸出額の上位10か国、品目は概況品目の大分類によります。"
      meta={
        period ? (
          <>
            <Chip label="対象月" value={formatJpPeriod(period)} />
            <Chip label="出典" value="財務省" />
          </>
        ) : null
      }
    >
      {countries.length === 0 && (
        <p className="py-10 text-[13px] text-[#6b7683]">公表済みのデータがありません。</p>
      )}

      {countries.length > 0 && (
        <>
          <SecTitle>相手国と品目の構成</SecTitle>
          <div className="grid grid-cols-1 gap-3.5 min-[900px]:grid-cols-2">
            <TradeCountryChart countries={countries} />
            <div className="grid grid-cols-1 gap-3.5">
              <TradeItemChart title="輸出 — 品目別構成比" items={exportItems} />
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 min-[900px]:grid-cols-2">
            <TradeItemChart title="輸入 — 品目別構成比" items={importItems} />
          </div>

          <SecTitle>相手国別</SecTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#b9c0c8] text-[11.5px] text-[#6b7683]">
                  <th className="px-3 py-2 text-left font-bold">相手国</th>
                  <th className="px-3 py-2 text-right font-bold">輸出</th>
                  <th className="px-3 py-2 text-right font-bold">前年同月比</th>
                  <th className="px-3 py-2 text-right font-bold">輸入</th>
                  <th className="px-3 py-2 text-right font-bold">前年同月比</th>
                  <th className="px-3 py-2 text-right font-bold">収支</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0f2]">
                {total && <CountryRow c={{ ...total, name: "総額" }} emphasis />}
                {countries.map((c) => (
                  <CountryRow key={c.name} c={c} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11.5px] leading-[1.8] text-[#8a929c]">
            ※ 輸出額の上位10か国。地域集計(ASIA・EU など)は除く。マイナスは「▲」で表す。出典: {SOURCE}。
          </p>

          <SecTitle>品目別</SecTitle>
          <div className="grid gap-7 min-[900px]:grid-cols-2">
            <ItemTable title="輸出" items={exportItems} />
            <ItemTable title="輸入" items={importItems} />
          </div>
          <p className="mb-2 mt-3 text-[11.5px] leading-[1.8] text-[#8a929c]">
            ※ 概況品目の大分類。構成比はその月・その方向の合計に対する比率。出典: {SOURCE} 概況品別国別表。
          </p>
        </>
      )}
    </JpPage>
  );
}
