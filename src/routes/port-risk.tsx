import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { policiesQueryOptions } from "@/lib/api/policies";
import { riskSnapshotQueryOptions } from "@/lib/api/risk";
import { LogisightPort } from "@/components/port/LogisightPort";

export const Route = createFileRoute("/port-risk")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(policiesQueryOptions());
    context.queryClient.ensureQueryData(riskSnapshotQueryOptions());
  },
  head: () =>
    seoHead({
      title: "港湾リスク — Logisight",
      description: "港湾の混雑、海上のボトルネック、チョークポイントと規制イベントのリスク監視。",
      path: "/port-risk",
    }),
  component: LogisightPort,
});
