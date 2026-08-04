import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { HomeNav } from "./HomeNav";
import { HomeFooter } from "./HomeFooter";
import { formatIndex, formatSppiPeriod, formatYoy, sppiQueryOptions } from "@/lib/api/sppi";
import { formatPortPeriod, formatTeu, portThroughputQueryOptions } from "@/lib/api/ports";
import { formatJpPeriod, formatJpy, jpTradeQueryOptions } from "@/lib/api/jp-trade";

const WRAP = "mx-auto w-full max-w-[1360px] px-[18px] min-[620px]:px-7";

/** 指標カード。値・単位・出典をひと組で出す — 出典のない数字は載せない。 */
function Stat({
  label,
  value,
  sub,
  note,
  to,
}: {
  label: string;
  value: string;
  sub: string;
  note: string;
  to: "/rates" | "/ports" | "/trade";
}) {
  return (
    <Link
      to={to}
      className="group rounded-[12px] border border-[#78a0cd1c] bg-[#0d1425] p-5 transition-colors hover:border-[#2dd4bf80]"
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2dd4bf]">{label}</div>
      <div className="mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em] text-[#e9eef7]">
        {value}
      </div>
      <div className="mt-1.5 text-[13px] text-[#93a1b7]">{sub}</div>
      <div className="mt-3 border-t border-[#78a0cd1c] pt-2.5 text-[11.5px] text-[#5d6b80]">{note}</div>
    </Link>
  );
}

export function LogisightJpHome() {
  const { data: sppi } = useSuspenseQuery(sppiQueryOptions());
  const { data: ports } = useSuspenseQuery(portThroughputQueryOptions());
  const { data: trade } = useSuspenseQuery(jpTradeQueryOptions());

  // 外航貨物輸送は運賃の代表系列。契約通貨ベースを併記しないと為替分を運賃と読み違える。
  const ocean = sppi.series.find((s) => s.name === "外航貨物輸送") ?? sppi.series[0] ?? null;

  return (
    <div className="min-h-screen bg-[#070b16]">
      <HomeNav active="home" />

      <section className="border-b border-[#78a0cd1c] py-[72px]">
        <div className={WRAP}>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2dd4bf]">
            LOGISIGHT · 物流を読む、新しい視点
          </span>
          <h1 className="mt-[18px] text-[clamp(38px,5vw,60px)] font-extrabold leading-[1.06] tracking-[-0.04em] text-[#e9eef7]">
            公的統計で読む
            <br />
            <span className="text-[#2dd4bf]">日本の物流</span>
          </h1>
          <p className="mt-[22px] max-w-[600px] text-[16.5px] leading-[1.65] text-[#a7b4c7]">
            運賃・港湾・貿易を、出典と基準月を明示して毎月まとめます。
            <br className="hidden min-[620px]:block" />
            推計や見通しではなく、公表された数字だけを扱います。
          </p>
          <div className="mt-[26px] flex flex-wrap gap-3">
            <Link
              to="/reports"
              className="rounded-[9px] border border-[#2dd4bf] bg-[#2dd4bf] px-[22px] py-[13px] text-[14.5px] font-bold text-[#04231f] transition-transform hover:-translate-y-px hover:bg-[#5eead4]"
            >
              今月のマーケットレポート
            </Link>
            <Link
              to="/news"
              className="rounded-[9px] border border-[#2dd4bf] bg-transparent px-[22px] py-[13px] text-[14.5px] font-semibold text-[#e9eef7] transition-transform hover:-translate-y-px hover:bg-white/5"
            >
              物流ニュース
            </Link>
          </div>
        </div>
      </section>

      <section className="py-[54px]">
        <div className={WRAP}>
          <h2 className="mb-1.5 text-[20px] font-bold tracking-[-0.025em] text-[#e9eef7]">
            最新の公表値
          </h2>
          <p className="mb-6 text-[13px] text-[#5d6b80]">
            軸ごとに公表タイミングが異なります。各カードに対象月を明記しています。
          </p>

          <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-3">
            <Stat
              to="/rates"
              label="運賃 · SPPI"
              value={ocean ? formatIndex(ocean.yen) : "—"}
              sub={
                ocean
                  ? `円ベース(${formatYoy(ocean.yoyYenPct)}) · 契約通貨 ${formatIndex(ocean.contract)}`
                  : "公表待ち"
              }
              note={`${ocean?.name ?? "外航貨物輸送"} · ${formatSppiPeriod(sppi.period)} · ${sppi.baseYear}年=100 · 日本銀行`}
            />
            <Stat
              to="/ports"
              label="港湾 · 主要6港"
              value={ports.total ? `${formatTeu(ports.total.teu)}` : "—"}
              sub={
                ports.total
                  ? `TEU(${formatYoy(ports.total.yoyPct)})${ports.total.isPreliminary ? " · 速報値" : ""}`
                  : "公表待ち"
              }
              note={`外国貿易コンテナ · ${formatPortPeriod(ports.period)} · 国土交通省`}
            />
            <Stat
              to="/trade"
              label="貿易 · 総額"
              value={trade.total ? formatJpy(trade.total.exportJpy) : "—"}
              sub={
                trade.total
                  ? `輸出 · 収支 ${formatJpy(trade.total.balanceJpy)}`
                  : "公表待ち"
              }
              note={`${formatJpPeriod(trade.period)} · 財務省貿易統計`}
            />
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
