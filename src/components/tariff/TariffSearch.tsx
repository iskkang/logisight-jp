import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { HS_TERMS } from "@/lib/api/hs-dictionary";
import { tariffCandidatesQueryOptions } from "@/lib/api/tariff";

/**
 * 候補行を見分けるための、すぐ上の階層だけを取り出す。
 *
 * 原簿の説明文は「大分類 > 中分類 > 小分類 > 末端」と入れ子になっていて長い。
 * 以前は末尾 90 文字で切っていたが、語の途中から始まって読めなかった
 * (「ines: > Of a cylinder…」「aving engines with…」)。
 *
 * かといって末端だけでは足りない。8703.23 では「Other」が 3 行あり、
 * 何が違うのかは一つ上の階層(「Station wagons and passenger vans」なのか
 * 「Having engines with not more than 4 cylinders」なのか)で決まる。
 * だから末端の直前を返す。切らないので語の途中から始まることはない。
 */
function parentOf(description: string, leaf: string): string {
  const parts = description
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] === leaf ? parts.length - 1 : parts.length;
  return parts[last - 1] ?? "";
}

/**
 * チップは予備ではなく主な入り口である。原簿の説明文は英語なので
 * 「乗用車」と打っても当たらない。多くの利用者は打たずに押す。
 */
export function TariffSearch({ onPick }: { onPick: (code: string) => void }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isFetching, isError } = useQuery(tariffCandidatesQueryOptions(submitted));

  const lines = data?.lines ?? [];
  const upstreamFailed = data?.upstreamFailed ?? false;
  const searched = submitted.length > 0 && !isFetching;

  return (
    <div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="8703.23 または 乗用車"
          className="min-w-[220px] flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          調べる
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {HS_TERMS.map((t) => (
          <button
            key={t.ja}
            type="button"
            onClick={() => {
              setInput(t.ja);
              setSubmitted(t.ja);
            }}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            {t.ja}
          </button>
        ))}
      </div>

      {submitted.length > 0 && isFetching && (
        <p className="mt-4 text-sm text-slate-600">検索しています…</p>
      )}

      {searched && isError && (
        <p className="mt-4 text-sm text-slate-600">
          {"通信に失敗しました。しばらくしてからもう一度お試しください。"}
        </p>
      )}

      {searched && !isError && lines.length === 0 && upstreamFailed && (
        <p className="mt-4 text-sm text-slate-600">
          データを取得できませんでした。しばらくしてからもう一度お試しください。
        </p>
      )}

      {searched && !isError && lines.length === 0 && !upstreamFailed && (
        <p className="mt-4 text-sm text-slate-600">
          該当する品目が見つかりません。上の品目名から選ぶか、HTS コードを入力してください。
        </p>
      )}

      {lines.length > 0 && (
        <ul className="mt-4 divide-y divide-[#eef0f2] border-y border-[#d5d9de]">
          {lines.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => onPick(l.code)}
                className="w-full px-1 py-3 text-left hover:bg-[#f7f8f9]"
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-[11.5px] text-[#8a929c]">{l.code}</span>
                  <span className="text-[13px] font-bold text-[#1a1f26]">{l.leaf}</span>
                </div>
                <div className="mt-0.5 text-[11.5px] leading-[1.6] text-[#6b7683]">
                  {parentOf(l.description, l.leaf)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
