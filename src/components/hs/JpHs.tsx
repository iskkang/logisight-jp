import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Chip, JpPage } from "@/components/jp/JpPage";
import { HS_TERMS } from "@/lib/api/hs-dictionary";
import { classifyInput, dotted, hsLinesQueryOptions } from "@/lib/api/hs-lines";

/**
 * 日本の輸出統計品目番号 → 米国 HTS ラインの橋渡し。
 *
 * 税率は出さない。原簿は MFN と追加関税しか持たず、特恵税率も Section 232 も
 * 入っていないうえ、協定を使えるかは部品構成で決まって品目番号からは判定できない。
 * 出せるのは「米国側でどのラインに分かれるか」までで、そこまでは原簿が完全である。
 * 中途半端な数字を出すより、線を引く場所を正直に決める。
 */
export function JpHs() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");

  const kind = classifyInput(submitted);
  const { data, isPending, isFetching, isError } = useQuery(hsLinesQueryOptions(kind.hs6));
  const loading = kind.hs6 !== "" && isPending && isFetching;
  const settled = kind.hs6 !== "" && !isFetching && data !== undefined;

  const run = (v: string) => {
    setInput(v);
    setSubmitted(v);
  };

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "HSコード" }]}
      title="HSコード対照 — 日本の品目番号から米国のHTSラインへ"
      lead="輸出統計品目番号(9桁)を入れると、米国側で該当する HTS ライン(10桁)を並べます。頭6桁は国際共通なので、そこで両者がつながります。税率は扱いません。"
      meta={data?.asOf ? <Chip label="原簿" value={`${data.asOf} 時点`} /> : undefined}
    >
      <div className="py-6">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="8708.29-090 · 870829 · 自動車部品"
            className="min-w-[240px] flex-1 border border-[#d5d9de] px-3 py-2 text-[13.5px]"
            aria-label="輸出統計品目番号または品目名"
          />
          <button
            type="submit"
            className="bg-[#0d2137] px-5 py-2 text-[13.5px] font-bold text-white"
          >
            対照する
          </button>
        </form>

        {/* 原簿の説明文は英語なので、日本語で打っても当たらない。だからチップが主な入口である。 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {HS_TERMS.map((t) => (
            <button
              key={t.ja}
              type="button"
              onClick={() => run(t.ja)}
              className="border border-[#d5d9de] px-2.5 py-1 text-[11.5px] text-[#3c4652] hover:bg-[#f7f8f9]"
            >
              {t.ja}
            </button>
          ))}
        </div>

        {loading && <p className="mt-8 text-[13px] text-[#4a5462]">対照しています…</p>}

        {isError && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            {"通信に失敗しました。しばらくしてからもう一度お試しください。"}
          </p>
        )}

        {kind.kind === "unknown" && submitted !== "" && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            {"品目番号(4桁以上)を入れるか、上の品目名から選んでください。"}
          </p>
        )}

        {settled && data.upstreamFailed && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            {"データを取得できませんでした。しばらくしてからもう一度お試しください。"}
          </p>
        )}

        {settled && data.notFound && (
          <p className="mt-8 text-[13px] text-[#4a5462]">
            {`HS ${dotted(data.hs6)} に該当する米国側のラインが見つかりません。桁を減らして(項・号の単位で)お試しください。`}
          </p>
        )}

        {settled && data.lines.length > 0 && <Result data={data} />}

        <p className="mt-10 border-t border-[#eef0f2] pt-4 text-[11.5px] leading-[1.85] text-[#6b7683]">
          {
            "本表は米国 HTS の品目カタログ(USITC 公表)を、頭6桁が国際共通であることを利用して日本の品目番号から引けるようにしたものです。関税率は扱いません —— 実際の負担は特恵税率(USMCA・KORUS など)、Section 232、アンチダンピング税などで変わり、協定を使えるかは部品構成で決まるため、品目番号だけでは決まらないからです。最終的な品目分類と納税義務は輸入者(Importer of Record)に帰属します。"
          }
        </p>
      </div>
    </JpPage>
  );
}

function Result({
  data,
}: {
  data: {
    hs6: string;
    lines: { code: string; leaf: string; parent: string }[];
    truncated: boolean;
    stale: boolean;
  };
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 border-b border-[#d5d9de] pb-2">
        <span className="font-mono text-[15px] font-bold text-[#0b2d52]">
          HS {dotted(data.hs6)}
        </span>
        <span className="text-[12.5px] text-[#4a5462]">
          米国側では <b className="text-[#0b2d52]">{data.lines.length} 行</b> に分かれます
          {data.truncated && "(上限20行まで表示)"}
        </span>
      </div>

      {/*
        どの行になるかで米国の税率が変わる。だが、どれに当たるかを決めるのは商品の実物で
        あって、この画面ではない。選ばせる作りにすると「サイトがそう言った」になるので、
        並べるだけにする。
      */}
      <ul className="divide-y divide-[#eef0f2]">
        {data.lines.map((l) => (
          <li key={l.code} className="py-3">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-mono text-[12.5px] text-[#8a929c]">{dotted(l.code)}</span>
              <span className="text-[13px] font-bold text-[#1a1f26]">{l.leaf}</span>
            </div>
            {l.parent && (
              <div className="mt-0.5 text-[11.5px] leading-[1.6] text-[#6b7683]">{l.parent}</div>
            )}
          </li>
        ))}
      </ul>

      {data.stale && (
        <p className="mt-2 text-[11.5px] text-[#8a5a00]">
          {"⚠ 最新の取得に失敗したため、以前取得した内容を表示しています。"}
        </p>
      )}
      <p className="mt-3 border border-[#d5d9de] bg-[#f7f8f9] px-3 py-2.5 text-[11.5px] leading-[1.85] text-[#4a5462]">
        どの行に当たるかは商品の実物(材質・構造・用途)で決まります。ここでは候補を並べるだけで、
        判定はしません。確定は通関業者・輸入者と行ってください。
      </p>
    </section>
  );
}
