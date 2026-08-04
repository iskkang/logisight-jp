import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { monthlyReportQueryOptions } from "@/lib/api/reports";
import { formatPublishedAt } from "@/lib/api/news";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/reports/monthly/$month")({
  loader: async ({ context, params }) => {
    const report = await context.queryClient.ensureQueryData(
      monthlyReportQueryOptions(params.month),
    );
    if (!report) throw notFound();
    return { title: report.period_label || report.title };
  },
  head: ({ loaderData, params }) =>
    seoHead({
      title: `${loaderData?.title ?? "月次レポート"} — Logisight`,
      description: "Logisight が毎月発行するマーケットレポート。",
      path: `/reports/monthly/${params.month}`,
    }),
  component: MonthlyReportPage,
});

function MonthlyReportPage() {
  const { month } = Route.useParams();
  const { data: report } = useSuspenseQuery(monthlyReportQueryOptions(month));
  if (!report) return null; // loader가 notFound 처리하므로 도달하지 않음
  const r = report;

  return (
    <div className="min-h-screen bg-[#070b16] text-white">
      <HomeNav active="reports" />
      <div className="mx-auto max-w-[820px] px-4 py-16 lg:px-6">
        <div className="text-[12px] text-white/50">
          <Link to="/" className="hover:text-white">
            홈
          </Link>{" "}
          ›{" "}
          <Link to="/reports" className="hover:text-white">
            리포트
          </Link>{" "}
          › 월간
        </div>

        <span className="mt-6 inline-block rounded-md bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5eead4]">
          월간 리포트
        </span>
        <h1 className="mt-4 text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.15] tracking-[-0.03em]">
          {r.period_label || r.title}
        </h1>
        {r.published_at && (
          <div className="mt-2 font-mono text-[13px] text-white/50">
            {formatPublishedAt(r.published_at)} 발행
          </div>
        )}
        {r.summary && (
          <p className="mt-5 text-[16px] leading-[1.7] text-white/75">{r.summary}</p>
        )}

        {r.cover_url && (
          <img
            src={r.cover_url}
            alt={r.title}
            className="mt-8 w-full rounded-[14px] border border-white/10"
            loading="lazy"
          />
        )}

        <a
          href={r.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-[10px] bg-[#2dd4bf] px-6 py-3.5 text-[15px] font-bold text-[#04231f] transition-transform hover:-translate-y-px hover:bg-[#5eead4]"
        >
          PDF 다운로드 →
        </a>

        <p className="mt-4 text-[12px] text-white/40">
          レポートは PDF でご覧いただけます。一覧は{" "}
          <Link to="/reports" className="text-[#5eead4] hover:underline">
            レポート一覧
          </Link>
          からご確認いただけます。
        </p>
      </div>
      <HomeFooter />
    </div>
  );
}
