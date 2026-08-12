import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { OriginTable } from "./OriginTable";
import { TariffSearch } from "./TariffSearch";
import { originComparisonQueryOptions } from "@/lib/api/tariff";

export function JpTariff({ code }: { code: string }) {
  const navigate = useNavigate();
  const { data, isPending, isFetching } = useQuery(originComparisonQueryOptions(code));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">原産地別 対米関税比較</h1>
      <p className="mt-1 text-sm text-slate-600">同じ品目を、どこから出すか。</p>

      <div className="mt-6">
        <TariffSearch onPick={(picked) => navigate({ to: "/tariff", search: { code: picked } })} />
      </div>

      {isPending && isFetching && (
        <p className="mt-8 text-sm text-slate-600">
          関税情報を取得しています…(初回は数秒かかることがあります)
        </p>
      )}

      {data && data.rows.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-sm text-slate-500">{data.code}</h2>
          <p className="mb-3 text-sm text-slate-700">{data.description.slice(-140)}</p>
          <OriginTable rows={data.rows} asOf={data.asOf} />
        </section>
      )}

      {/*
        運賃は原産地別に持っていない。SPPI は「日本が支払う」運賃なので、
        ベトナム発の運賃は分からない。埋められない列を作ると、そこを
        推測で埋めることになる。だから表には入れず、文脈として 1 行だけ置く。
      */}
      <p className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
        参考 — 日本発の海上運賃は円ベースで前年比 +52.8%(契約通貨ベース +37.4%)。
        原産地を変えれば運賃も変わるが、本表は関税のみを比べている。
      </p>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        本表は推計であり、通関・法務・税務の助言ではない。
        従量税・複合税、アンチダンピング税、数量割当、および未確認の除外は含まない。
        最終的な品目分類と納税義務は輸入者(Importer of Record)に帰属する。 関税率は LandedIQ
        が維持する原簿にもとづく。
      </p>
    </div>
  );
}
