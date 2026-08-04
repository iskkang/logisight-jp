import { queryOptions } from "@tanstack/react-query";

import { getJpReports } from "./jp-reports.functions";

export const jpReportsQueryOptions = () =>
  queryOptions({
    queryKey: ["reports", "jp"],
    queryFn: () => getJpReports(),
    staleTime: 30 * 60 * 1000,
  });

/** "2026-06-01" → "2026年6月号" */
export function monthLabel(periodStart: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodStart ?? "");
  return m ? `${m[1]}年${Number(m[2])}月号` : "—";
}

/** ルートパラメータ用。"2026-06-01" → "2026-06" */
export function monthParam(periodStart: string | null | undefined): string {
  return (periodStart ?? "").slice(0, 7);
}
