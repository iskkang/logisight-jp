import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Chip, JpPage } from "@/components/jp/JpPage";
import { OriginTable } from "./OriginTable";
import { TariffSearch } from "./TariffSearch";
import { originComparisonQueryOptions } from "@/lib/api/tariff";

/**
 * 枠は JpPage に預ける。自前でヘッダーを持つと、このページだけメニューが消えて
 * 別サイトのように見える(実際そうなっていた)。JpPage 側にも同じ理由が書いてある。
 */
export function JpTariff({ code }: { code: string }) {
  const navigate = useNavigate();
  const { data, isPending, isFetching, isError } = useQuery(originComparisonQueryOptions(code));
  const table = data && !data.notFound && data.rows.length > 0 ? data : null;

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "関税" }]}
      title="原産地別 対米関税比較"
      lead="同じ品目を、どこから出すか。日本・中国・ベトナム・タイ・メキシコ・韓国から米国に入れたときの関税を、内訳つきで並べます。"
      meta={table ? <Chip label="原簿" value={`${table.asOf} 時点`} /> : undefined}
    >
      <div className="py-6">
        <TariffSearch onPick={(picked) => navigate({ to: "/tariff", search: { code: picked } })} />

        {isPending && isFetching && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            関税情報を取得しています…(初回は数秒かかることがあります)
          </p>
        )}

        {isError && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            {"通信に失敗しました。しばらくしてからもう一度お試しください。"}
          </p>
        )}

        {data?.notFound && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            {"このコードに該当する品目が見つかりません。"}
          </p>
        )}

        {table && (
          <section className="mt-8">
            {/*
              原簿の説明文は入れ子の英語で長い。途中で切ると語の真ん中から始まって
              読めなくなるので切らない。数行になっても、どの行を見ているかが
              分かることのほうが大事である。
            */}
            <div className="mb-4 border-l-2 border-[#d5d9de] pl-3">
              <div className="font-mono text-[12px] text-[#8a929c]">{table.code}</div>
              <p className="mt-0.5 max-w-[720px] text-[12.5px] leading-[1.7] text-[#4a5462]">
                {table.description}
              </p>
            </div>
            <OriginTable rows={table.rows} asOf={table.asOf} stale={table.stale} />
          </section>
        )}

        {/*
          運賃は原産地別に持っていない。SPPI は「日本が支払う」運賃なので、
          ベトナム発の運賃は分からない。埋められない列を作ると、そこを
          推測で埋めることになる。だから表には入れず、文脈として 1 行だけ置く。
        */}
        <p className="mt-10 border-t border-[#eef0f2] pt-4 text-[11.5px] leading-[1.85] text-[#6b7683]">
          {
            "参考 — 日本発の海上運賃は円ベースで前年比 +52.8%(契約通貨ベース +37.4%)。原産地を変えれば運賃も変わるが、本表は関税のみを比べている。"
          }
        </p>

        <p className="mt-3 text-[11.5px] leading-[1.85] text-[#8a929c]">
          {
            "本表は推計であり、通関・法務・税務の助言ではない。従量税・複合税、アンチダンピング税、数量割当、および未確認の除外は含まない。最終的な品目分類と納税義務は輸入者(Importer of Record)に帰属する。関税率は LandedIQ が維持する原簿にもとづく。"
          }
        </p>
      </div>
    </JpPage>
  );
}
