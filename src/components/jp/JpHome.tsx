import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { JpHeader } from "./JpHeader";
import { AdSlot } from "./AdSlot";
import { JpFooter } from "./JpFooter";
import { formatIndex, formatSppiPeriod, formatYoy, sppiQueryOptions } from "@/lib/api/sppi";
import { formatPortPeriod, formatTeu, portThroughputQueryOptions } from "@/lib/api/ports";
import { formatJpPeriod, formatJpy, jpTradeSummaryQueryOptions } from "@/lib/api/jp-trade";
import { jpReportsQueryOptions, monthLabel, monthParam } from "@/lib/api/jp-reports";
import { isInternalNewsItem, latestNewsQueryOptions } from "@/lib/api/news";

const WRAP = "mx-auto max-w-[1120px] px-4";

/** "2026-08-04T…" → "08/04"。業界紙の一覧は日付が先頭に来る。 */
function md(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[2]}/${m[3]}` : "—";
}

function todayJa(): string {
  const d = new Date();
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${w})`;
}

/** 見出し。左に細い罫、日本の業界紙の節見出しに寄せる。 */
function SecTitle({ children, more }: { children: React.ReactNode; more?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3 border-b-2 border-[#0b2d52] pb-1.5">
      <h2 className="text-[15px] font-bold tracking-[-0.01em] text-[#0b2d52]">{children}</h2>
      {more}
    </div>
  );
}

function Delta({ v }: { v: number | null }) {
  const tone = v == null ? "text-[#8a929c]" : v < 0 ? "text-[#c0392b]" : "text-[#1a1f26]";
  return <span className={`tabular-nums ${tone}`}>{formatYoy(v)}</span>;
}

export function JpHome() {
  const { data: sppi } = useSuspenseQuery(sppiQueryOptions());
  const { data: ports } = useSuspenseQuery(portThroughputQueryOptions());
  const { data: trade } = useSuspenseQuery(jpTradeSummaryQueryOptions());
  const { data: reports } = useSuspenseQuery(jpReportsQueryOptions());
  const { data: news } = useSuspenseQuery(latestNewsQueryOptions({ lang: "ja", limit: 14 }));

  const ocean = sppi.series.find((s) => s.name === "外航貨物輸送") ?? sppi.series[0] ?? null;
  const latestReport = reports[0] ?? null;

  // 指標は3軸を1つの表にまとめる。カードで散らすより、対象月の違いが一目で分かる。
  const rows = [
    {
      cat: "運賃",
      name: ocean?.name ?? "外航貨物輸送",
      value: ocean ? formatIndex(ocean.yen) : "—",
      unit: `指数(${sppi.baseYear}年=100)`,
      yoy: ocean?.yoyYenPct ?? null,
      period: formatSppiPeriod(sppi.period),
      source: "日本銀行",
      to: "/rates" as const,
      note: ocean?.contract != null ? `契約通貨ベース ${formatIndex(ocean.contract)}` : "",
    },
    {
      cat: "港湾",
      name: "主要6港 合計",
      value: ports.total ? formatTeu(ports.total.teu) : "—",
      unit: "TEU",
      yoy: ports.total?.yoyPct ?? null,
      period: formatPortPeriod(ports.period),
      source: "国土交通省",
      to: "/ports" as const,
      note: ports.total?.isPreliminary ? "速報値" : "",
    },
    {
      cat: "貿易",
      name: "輸出額",
      value: trade.total ? formatJpy(trade.total.exportJpy) : "—",
      unit: "",
      yoy: trade.total?.yoyExportPct ?? null,
      period: formatJpPeriod(trade.period),
      source: "財務省",
      to: "/trade" as const,
      note: trade.total ? `収支 ${formatJpy(trade.total.balanceJpy)}` : "",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1a1f26]">
      <JpHeader today={todayJa()} />

      <main className={`${WRAP} pt-6`}>
        {/* 指標 */}
        <section>
          <SecTitle>主要指標</SecTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cat} className="border-b border-[#e8ebee]">
                    <td className="w-[62px] py-2.5 pr-2 align-top">
                      <span className="inline-block rounded-[2px] bg-[#0b2d52] px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                        {r.cat}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 align-top">
                      <Link to={r.to} className="font-medium hover:text-[#0b2d52] hover:underline">
                        {r.name}
                      </Link>
                      {r.note && (
                        <div className="mt-0.5 text-[11.5px] text-[#6b7683]">{r.note}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right align-top">
                      <span className="text-[16px] font-bold tabular-nums">{r.value}</span>
                      {r.unit && <span className="ml-1 text-[11px] text-[#6b7683]">{r.unit}</span>}
                    </td>
                    <td className="w-[86px] py-2.5 pr-3 text-right align-top">
                      <Delta v={r.yoy} />
                      <div className="text-[10.5px] text-[#8a929c]">前年同月比</div>
                    </td>
                    <td className="w-[150px] py-2.5 text-right align-top text-[11.5px] text-[#6b7683]">
                      {r.period}
                      <div className="text-[10.5px] text-[#8a929c]">{r.source}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[#8a929c]">
            ※
            軸ごとに公表タイミングが異なります。異なる月の数値を同一時点として比較しないでください。
          </p>
        </section>

        <div className="mt-9 grid grid-cols-1 gap-9 min-[860px]:grid-cols-[1fr_300px]">
          {/* ニュース */}
          <section>
            <SecTitle
              more={
                <Link to="/news" className="text-[12px] text-[#0b2d52] hover:underline">
                  一覧 ›
                </Link>
              }
            >
              最新ニュース
            </SecTitle>
            <ul>
              {news.length === 0 && (
                <li className="py-3 text-[13px] text-[#6b7683]">記事が集まり次第、掲載します。</li>
              )}
              {news.map((n) => {
                // 外部媒体の記事には自前の記事ページが無い。/article/… に飛ばすと 404 になる。
                // ニュース一覧と同じ判定で、内部は Link、外部は原文へのリンクにする。
                const inner = (
                  <>
                    <span className="w-[42px] flex-none pt-[1px] text-[11.5px] tabular-nums text-[#8a929c]">
                      {md(n.published_at)}
                    </span>
                    {n.category && (
                      <span className="w-[46px] flex-none pt-[1px] text-[11px] text-[#0b2d52]">
                        {n.category}
                      </span>
                    )}
                    <span className="text-[13.5px] leading-[1.6] hover:text-[#0b2d52]">
                      {n.title}
                      {!isInternalNewsItem(n) && (
                        <>
                          <span className="ml-1.5 text-[11px] text-[#8a929c]">↗</span>
                          {n.source && (
                            <span className="ml-2 text-[11px] text-[#8a929c]">{n.source}</span>
                          )}
                        </>
                      )}
                    </span>
                  </>
                );
                const cls = "flex gap-3 py-2.5 hover:bg-[#f7f8f9]";
                return (
                  <li key={n.id} className="border-b border-[#eef0f2]">
                    {isInternalNewsItem(n) ? (
                      <Link
                        to="/article/$slug"
                        params={{ slug: n.slug || String(n.id) }}
                        className={cls}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className={cls}>
                        {inner}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* サイド: レポート + 出典 */}
          <aside>
            <SecTitle>月次レポート</SecTitle>
            {latestReport ? (
              <Link
                to="/reports/monthly/$month"
                params={{ month: monthParam(latestReport.period_start) }}
                className="block border border-[#d5d9de] p-3.5 transition-colors hover:border-[#0b2d52]"
              >
                <div className="text-[11.5px] text-[#6b7683]">
                  {latestReport.period_label || monthLabel(latestReport.period_start)}
                </div>
                <div className="mt-1 text-[14px] font-bold leading-[1.5]">{latestReport.title}</div>
                {latestReport.summary && (
                  <p className="mt-1.5 line-clamp-3 text-[12px] leading-[1.65] text-[#5a636e]">
                    {latestReport.summary}
                  </p>
                )}
              </Link>
            ) : (
              <div className="border border-dashed border-[#d5d9de] p-3.5 text-[12.5px] leading-[1.7] text-[#6b7683]">
                最初の号を準備中です。運賃・港湾・貿易の各ページで最新の公表値をご覧いただけます。
              </div>
            )}

            <div className="mt-7">
              <SecTitle>データの出典</SecTitle>
              <dl className="space-y-2 text-[12px] leading-[1.6]">
                {[
                  ["運賃", "日本銀行 企業向けサービス価格指数"],
                  ["港湾", "国土交通省 港湾統計"],
                  ["貿易", "財務省貿易統計"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-[34px] flex-none text-[#8a929c]">{k}</dt>
                    <dd className="text-[#3c4652]">{v}</dd>
                  </div>
                ))}
              </dl>
              <Link
                to="/methodology"
                className="mt-2.5 inline-block text-[12px] text-[#0b2d52] hover:underline"
              >
                データの方法論 ›
              </Link>
            </div>

            <AdSlot
              href="/contact?from=ad-mtl-ca"
              src="/ad-mtl-central-asia.jpg"
              alt="MTL — 日本から中央アジアへ。カザフスタン・ウズベキスタン・ロシア向け輸送"
              ratio={1400 / 615}
            />
          </aside>
        </div>
      </main>

      <JpFooter />
    </div>
  );
}
