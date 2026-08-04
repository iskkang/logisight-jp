import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Chip, JpPage, SecTitle } from "@/components/jp/JpPage";
import { Card } from "@/components/jp/ui";
import {
  formatAsOf,
  formatChange,
  formatIndexValue,
  globalIndicesQueryOptions,
  GROUP_LABEL,
  type GlobalIndex,
} from "@/lib/api/global-indices";
import { formatIndex, formatSppiPeriod, formatYoy, sppiQueryOptions } from "@/lib/api/sppi";
import { formatPortPeriod, formatTeu, portThroughputQueryOptions } from "@/lib/api/ports";
import { formatJpPeriod, formatJpy, jpTradeQueryOptions } from "@/lib/api/jp-trade";

function Delta({ v }: { v: number | null }) {
  const tone = v == null ? "text-[#8b94a0]" : v < 0 ? "text-[#c0392b]" : "text-[#157347]";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatChange(v)}</span>;
}

function IndexRow({ i }: { i: GlobalIndex }) {
  return (
    <tr className="border-b border-[#eef0f2]">
      <td className="py-2 pr-3 text-left">{i.label}</td>
      <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatIndexValue(i.value)}</td>
      <td className="w-[64px] py-2 pr-3 text-right text-[11px] text-[#8b94a0]">{i.unit}</td>
      <td className="w-[84px] py-2 text-right"><Delta v={i.changePct} /></td>
    </tr>
  );
}

/**
 * 総合ダッシュボード。
 *
 * 韓国版は KCCI・KITA・ユーラシア鉄道が軸で、日本の読者には合わない。
 * 日本版は「世界のスポット運賃」と「日本国内の価格・物量」を並べる構成にする。
 * 世界が上がっている局面で日本がどこにいるのか — それが一目で分かることが狙いである。
 */
export function JpDashboard() {
  const { data: g } = useSuspenseQuery(globalIndicesQueryOptions());
  const { data: sppi } = useSuspenseQuery(sppiQueryOptions());
  const { data: ports } = useSuspenseQuery(portThroughputQueryOptions());
  const { data: trade } = useSuspenseQuery(jpTradeQueryOptions());

  const ocean = sppi.series.find((s) => s.name === "外航貨物輸送") ?? sppi.series[0] ?? null;
  const groups = ["container", "bulk", "bunker"] as const;

  // 世界のコンテナ指数のうち、上昇している系列の数。局面を一言で言うために使う。
  const container = g.indices.filter((i) => i.group === "container" && i.changePct !== null);
  const up = container.filter((i) => (i.changePct ?? 0) > 0).length;

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "総合" }]}
      title="総合ダッシュボード"
      lead="世界のスポット運賃と、日本国内の価格・物量を並べて見ます。軸ごとに公表タイミングが異なるため、各表に基準日を明記しています。"
      meta={
        <>
          <Chip label="世界指数" value={formatAsOf(g.asOf)} />
          <Chip label="日本 SPPI" value={formatSppiPeriod(sppi.period)} />
        </>
      }
    >
      {/* 局面の一行 */}
      {container.length > 0 && (
        <div className="mt-5 border-l-[3px] border-[#1857b8] bg-[#f4f8fd] px-4 py-3">
          <p className="text-[13px] leading-[1.85] text-[#16202c]">
            世界のコンテナ運賃指数は{" "}
            <b>
              {container.length}系列中 {up}系列が上昇
            </b>
            。同じ時点の日本の外航貨物輸送は円ベース{" "}
            <b>{formatIndex(ocean?.yen ?? null)}</b>(前年同月比 {formatYoy(ocean?.yoyYenPct ?? null)})、
            契約通貨ベース <b>{formatIndex(ocean?.contract ?? null)}</b>。
            <span className="text-[#5b6672]">
              {" "}
              円ベースには為替が含まれるため、運賃そのものの動きは契約通貨ベースに近い。
            </span>
          </p>
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-5 min-[900px]:grid-cols-[1.15fr_1fr]">
        {/* 世界のスポット */}
        <section>
          <SecTitle note={<span className="text-[11px] text-[#8b94a0]">{formatAsOf(g.asOf)} 時点</span>}>
            世界の運賃指数
          </SecTitle>
          <Card className="px-4 py-1">
            <table className="w-full border-collapse text-[13px]">
              {groups.map((grp) => {
                const items = g.indices.filter((i) => i.group === grp);
                if (items.length === 0) return null;
                return (
                  <tbody key={grp}>
                    <tr>
                      <td colSpan={4} className="pt-3 pb-1 text-[11px] font-bold tracking-wide text-[#8b94a0]">
                        {GROUP_LABEL[grp]}
                      </td>
                    </tr>
                    {items.map((i) => (
                      <IndexRow key={i.code} i={i} />
                    ))}
                  </tbody>
                );
              })}
            </table>
          </Card>
          <p className="mt-2 text-[11px] leading-[1.75] text-[#8b94a0]">
            ※ 発表元の公表値。系列ごとに基準日が異なる。韓国発を基準とする指数(KCCI 等)は扱わない。
          </p>
        </section>

        {/* 日本国内 */}
        <section>
          <SecTitle>日本国内</SecTitle>
          <div className="grid grid-cols-1 gap-3">
            <Card className="p-4" hover>
              <Link to="/rates" className="block">
                <div className="text-[11px] font-bold tracking-wide text-[#1857b8]">運賃 · SPPI</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[24px] font-bold tabular-nums text-[#0d2137]">
                    {formatIndex(ocean?.yen ?? null)}
                  </span>
                  <span className="text-[12px] text-[#5b6672]">円ベース</span>
                  <span className="ml-auto text-[13px]">
                    <Delta v={ocean?.yoyYenPct ?? null} />
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-[#5b6672]">
                  契約通貨ベース {formatIndex(ocean?.contract ?? null)}(
                  {formatYoy(ocean?.yoyContractPct ?? null)})
                </div>
                <div className="mt-2.5 border-t border-[#eef0f2] pt-2 text-[11px] text-[#8b94a0]">
                  {ocean?.name ?? "外航貨物輸送"} · {formatSppiPeriod(sppi.period)} · 日本銀行
                </div>
              </Link>
            </Card>

            <Card className="p-4" hover>
              <Link to="/ports" className="block">
                <div className="text-[11px] font-bold tracking-wide text-[#1857b8]">港湾 · 主要6港</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[24px] font-bold tabular-nums text-[#0d2137]">
                    {formatTeu(ports.total?.teu ?? null)}
                  </span>
                  <span className="text-[12px] text-[#5b6672]">TEU</span>
                  <span className="ml-auto text-[13px]">
                    <Delta v={ports.total?.yoyPct ?? null} />
                  </span>
                </div>
                <div className="mt-2.5 border-t border-[#eef0f2] pt-2 text-[11px] text-[#8b94a0]">
                  外国貿易コンテナ{ports.total?.isPreliminary ? "(速報値)" : ""} ·{" "}
                  {formatPortPeriod(ports.period)} · 国土交通省
                </div>
              </Link>
            </Card>

            <Card className="p-4" hover>
              <Link to="/trade" className="block">
                <div className="text-[11px] font-bold tracking-wide text-[#1857b8]">貿易 · 輸出額</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[24px] font-bold tabular-nums text-[#0d2137]">
                    {formatJpy(trade.total?.exportJpy ?? null)}
                  </span>
                  <span className="ml-auto text-[13px]">
                    <Delta v={trade.total?.yoyExportPct ?? null} />
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-[#5b6672]">
                  収支 {formatJpy(trade.total?.balanceJpy ?? null)}
                </div>
                <div className="mt-2.5 border-t border-[#eef0f2] pt-2 text-[11px] text-[#8b94a0]">
                  {formatJpPeriod(trade.period)} · 財務省貿易統計
                </div>
              </Link>
            </Card>
          </div>
        </section>
      </div>

      <p className="mb-2 mt-8 text-[11.5px] leading-[1.85] text-[#8b94a0]">
        ※ 世界の指数は週次、日本の統計は月次で、基準日が揃いません。異なる時点の数値を同一の動きとして
        比較しないでください。両者の関係についても、同時に観測されたという以上のことは述べません。
      </p>
    </JpPage>
  );
}
