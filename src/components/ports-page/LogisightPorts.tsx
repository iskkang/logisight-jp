import { useSuspenseQuery } from "@tanstack/react-query";

import { Chip, JpPage, SecTitle } from "@/components/jp/JpPage";
import { LoginGate } from "@/components/jp/LoginGate";
import { PortTotalChart, PortYoyChart } from "@/components/jp/PortChart";
import {
  formatPortPeriod,
  formatTeu,
  formatYoy,
  portThroughputQueryOptions,
  type PortLatest,
} from "@/lib/api/ports";

const SOURCE = "国土交通省 港湾統計";

function Yoy({ value }: { value: number | null }) {
  const tone = value == null ? "text-[#8a929c]" : value < 0 ? "text-[#c0392b]" : "text-[#177245]";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatYoy(value)}</span>;
}

function Row({ port, emphasis }: { port: PortLatest; emphasis?: boolean }) {
  return (
    <tr className={`border-b border-[#eef0f2] ${emphasis ? "bg-[#f7f8f9] font-bold" : ""}`}>
      <td className="py-2.5 pr-3 text-left whitespace-nowrap">{port.name}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{formatTeu(port.teu)}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums text-[#4a5462]">
        {formatTeu(port.exportTeu)}
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums text-[#4a5462]">
        {formatTeu(port.importTeu)}
      </td>
      <td className="w-[92px] py-2.5 text-right">
        <Yoy value={port.yoyPct} />
      </td>
    </tr>
  );
}

export function LogisightPorts() {
  const { data } = useSuspenseQuery(portThroughputQueryOptions());
  const { period, total, latest, totalSeries } = data;
  const preliminary = total?.isPreliminary ?? latest[0]?.isPreliminary ?? false;

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "港湾" }]}
      title="主要6港 コンテナ取扱量"
      lead="東京・横浜・名古屋・神戸・大阪・川崎の外国貿易コンテナ取扱量です。合計はこの6港の合計であり、全国計ではありません。"
      meta={
        period ? (
          <>
            <Chip label="対象月" value={formatPortPeriod(period)} />
            <Chip label="出典" value="国土交通省" />
            {preliminary && (
              <span className="border border-[#e3c98f] bg-[#fdf3e3] px-2.5 py-1 text-[11.5px] font-medium text-[#95601a]">
                速報値 — 確報とは確定度が異なる
              </span>
            )}
          </>
        ) : null
      }
    >
      {latest.length === 0 && (
        <p className="py-10 text-[13px] text-[#6b7683]">公表済みのデータがありません。</p>
      )}

      {latest.length > 0 && (
        <>
          <SecTitle>推移と港別の動き</SecTitle>
          <div className="grid grid-cols-1 gap-3.5 min-[820px]:grid-cols-2">
            {totalSeries.length > 1 && <PortTotalChart points={totalSeries} />}
            <PortYoyChart ports={latest} />
          </div>

          <SecTitle>港別</SecTitle>
          <LoginGate
            title="港別の内訳はログインするとご覧いただけます"
            note="登録は無料です。主要6港の輸出入内訳と前年同月比を港ごとに確認できます。"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-[#b9c0c8] text-[11.5px] text-[#6b7683]">
                    <th className="py-2 pr-3 text-left font-bold">港湾</th>
                    <th className="py-2 pr-3 text-right font-bold">合計 (TEU)</th>
                    <th className="py-2 pr-3 text-right font-bold">輸出</th>
                    <th className="py-2 pr-3 text-right font-bold">輸入</th>
                    <th className="py-2 text-right font-bold">前年同月比</th>
                  </tr>
                </thead>
                <tbody>
                  {total && <Row port={total} emphasis />}
                  {latest.map((p) => (
                    <Row key={p.code} port={p} />
                  ))}
                </tbody>
              </table>
            </div>
          </LoginGate>

          <p className="mb-2 mt-4 text-[11.5px] leading-[1.8] text-[#8a929c]">
            ※
            外国貿易コンテナ。合計は主要6港の合計であり全国計ではない。前年同月比のマイナスは「▲」で表す。出典:{" "}
            {SOURCE}。
          </p>
        </>
      )}
    </JpPage>
  );
}
