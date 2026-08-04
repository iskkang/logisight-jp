import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { jpReportsQueryOptions, monthLabel, monthParam } from "@/lib/api/jp-reports";

const WRAP = "mx-auto w-full max-w-[1000px] px-[18px] min-[620px]:px-7";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : "";
}

export function LogisightJpReports() {
  const { data: reports } = useSuspenseQuery(jpReportsQueryOptions());
  const [latest, ...rest] = reports;

  return (
    <div className="min-h-screen bg-[#070b16]">
      <HomeNav active="reports" />

      <section className="border-b border-[#78a0cd1c] py-[56px]">
        <div className={WRAP}>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2dd4bf]">
            REPORTS
          </span>
          <h1 className="mt-3 text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#e9eef7]">
            マーケットレポート
          </h1>
          <p className="mt-3.5 max-w-[620px] text-[15px] leading-[1.65] text-[#93a1b7]">
            運賃・港湾・貿易の動きを毎月ひとつにまとめています。各セクションに出典と基準月を明記し、
            公表された数字のみを扱います。
          </p>
        </div>
      </section>

      <section className="py-[48px]">
        <div className={WRAP}>
          {reports.length === 0 && (
            <div className="rounded-[12px] border border-dashed border-[#22304a] bg-[#0d1425] px-6 py-12 text-center">
              <p className="text-[15px] font-semibold text-[#c7d2e0]">
                まだ発行されたレポートはありません。
              </p>
              <p className="mt-2 text-[13px] text-[#5d6b80]">
                最初の号の発行準備を進めています。公開までは{" "}
                <Link to="/rates" className="font-semibold text-[#2dd4bf] hover:underline">
                  運賃
                </Link>
                ・
                <Link to="/ports" className="font-semibold text-[#2dd4bf] hover:underline">
                  港湾
                </Link>
                ・
                <Link to="/trade" className="font-semibold text-[#2dd4bf] hover:underline">
                  貿易
                </Link>{" "}
                の各ページで最新の公表値をご覧いただけます。
              </p>
            </div>
          )}

          {latest && (
            <article className="rounded-[14px] border border-[#22304a] bg-[#0d1425] p-6 min-[720px]:p-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[#2dd4bf]/15 px-2.5 py-1 text-[11px] font-bold text-[#2dd4bf]">
                  最新号
                </span>
                <span className="text-[12.5px] text-[#5d6b80]">
                  {latest.period_label || monthLabel(latest.period_start)}
                  {latest.published_at ? ` · ${fmtDate(latest.published_at)} 発行` : ""}
                </span>
              </div>
              <h2 className="mt-3 text-[22px] font-bold leading-snug tracking-[-0.02em] text-[#e9eef7]">
                {latest.title}
              </h2>
              {latest.summary && (
                <p className="mt-2.5 text-[14px] leading-[1.7] text-[#93a1b7]">{latest.summary}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  to="/reports/monthly/$month"
                  params={{ month: monthParam(latest.period_start) }}
                  className="rounded-[8px] bg-[#2dd4bf] px-4 py-2.5 text-[13.5px] font-bold text-[#04231f] hover:bg-[#5eead4]"
                >
                  本文を読む
                </Link>
                {latest.pdf_url && (
                  <a
                    href={latest.pdf_url}
                    className="rounded-[8px] border border-[#2dd4bf] px-4 py-2.5 text-[13.5px] font-semibold text-[#e9eef7] hover:bg-white/5"
                  >
                    PDF をダウンロード
                  </a>
                )}
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <>
              <h2 className="mb-4 mt-12 text-[16px] font-bold tracking-[-0.02em] text-[#e9eef7]">
                バックナンバー
              </h2>
              <ul className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
                {rest.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/reports/monthly/$month"
                      params={{ month: monthParam(r.period_start) }}
                      className="group flex flex-col gap-1 rounded-[12px] border border-[#22304a] bg-[#0d1425] p-4 transition-colors hover:border-[#2dd4bf80]"
                    >
                      <span className="text-[12px] font-semibold tracking-wider text-[#2dd4bf]">
                        {r.period_label || monthLabel(r.period_start)}
                      </span>
                      <span className="text-[15px] font-bold leading-snug text-[#e9eef7]">
                        {r.title}
                      </span>
                      {r.summary && (
                        <span className="line-clamp-2 text-[13px] leading-relaxed text-[#93a1b7]">
                          {r.summary}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
