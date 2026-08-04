import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { monthlyReportQueryOptions } from "@/lib/api/reports";
import { formatPublishedAt } from "@/lib/api/news";
import { Chip, JpPage } from "@/components/jp/JpPage";
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
    <JpPage
      crumbs={[
        { label: "ホーム", to: "/" },
        { label: "レポート", to: "/reports" },
        { label: "月次" },
      ]}
      title={r.period_label || r.title}
      lead={r.summary ?? undefined}
      meta={
        <>
          {r.published_at && <Chip label="発行" value={formatPublishedAt(r.published_at)} />}
          <Chip label="形式" value="PDF" />
        </>
      }
    >
      <div className="max-w-[820px] pb-6">
        {r.cover_url && (
          <img
            src={r.cover_url}
            alt={r.title}
            className="mt-6 w-full border border-[#e2e6ea]"
            loading="lazy"
          />
        )}

        <a
          href={r.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex items-center gap-2 bg-[#0b2d52] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#123f70]"
        >
          PDF をダウンロード →
        </a>

        <p className="mt-3 text-[12px] text-[#8a929c]">
          レポートは PDF でご覧いただけます。一覧は{" "}
          <Link to="/reports" className="text-[#0b2d52] underline hover:no-underline">
            レポート一覧
          </Link>
          からご確認いただけます。
        </p>
      </div>
    </JpPage>
  );
}
