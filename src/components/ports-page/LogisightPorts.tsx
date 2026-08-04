import { useQuery } from "@tanstack/react-query";

import { PageHero } from "@/components/site/PageHero";
import {
  formatPortPeriod,
  formatTeu,
  formatYoy,
  portThroughputQueryOptions,
  type PortLatest,
} from "@/lib/api/ports";

const SOURCE = "国土交通省 港湾統計";

function YoyCell({ value }: { value: number | null }) {
  const tone = value == null ? "text-slate-400" : value < 0 ? "text-rose-600" : "text-emerald-600";
  return <span className={`tabular-nums font-medium ${tone}`}>{formatYoy(value)}</span>;
}

function Row({ port, emphasis }: { port: PortLatest; emphasis?: boolean }) {
  return (
    <tr className={emphasis ? "bg-slate-50 font-semibold" : ""}>
      <td className="px-3 py-2.5 text-left whitespace-nowrap">{port.name}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{formatTeu(port.teu)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
        {formatTeu(port.exportTeu)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
        {formatTeu(port.importTeu)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <YoyCell value={port.yoyPct} />
      </td>
    </tr>
  );
}

export function LogisightPorts() {
  const { data, isLoading, isError } = useQuery(portThroughputQueryOptions());

  const period = data?.period ?? null;
  const preliminary = data?.total?.isPreliminary ?? data?.latest[0]?.isPreliminary ?? false;

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        eyebrow="港湾"
        titleMain="主要6港"
        titleAccent="コンテナ取扱量"
        subtitle="東京・横浜・名古屋・神戸・大阪・川崎の外国貿易コンテナ取扱量。国土交通省 港湾統計にもとづく月次の実数と前年同月比。"
        chips={
          period
            ? [{ label: "対象月", value: formatPortPeriod(period), color: "#38bdf8" }]
            : []
        }
      />

      <div className="mx-auto max-w-[1100px] px-4 py-10 lg:px-12">
        {isLoading && <p className="text-sm text-slate-500">読み込み中…</p>}
        {isError && (
          <p className="text-sm text-rose-600">データを取得できませんでした。時間をおいて再度お試しください。</p>
        )}

        {data && data.latest.length === 0 && (
          <p className="text-sm text-slate-500">公表済みのデータがありません。</p>
        )}

        {data && data.latest.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-bold text-slate-900">{formatPortPeriod(period)}</h2>
              {preliminary && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  速報値 — 確報とは確定度が異なる
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2.5 text-left font-semibold">港湾</th>
                    <th className="px-3 py-2.5 text-right font-semibold">合計 (TEU)</th>
                    <th className="px-3 py-2.5 text-right font-semibold">輸出</th>
                    <th className="px-3 py-2.5 text-right font-semibold">輸入</th>
                    <th className="px-3 py-2.5 text-right font-semibold">前年同月比</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.total && <Row port={data.total} emphasis />}
                  {data.latest.map((p) => (
                    <Row key={p.code} port={p} />
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
              ※ 外国貿易コンテナ。合計は主要6港の合計であり全国計ではない。前年同月比のマイナスは
              「▲」で表す。出典: {SOURCE}。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
