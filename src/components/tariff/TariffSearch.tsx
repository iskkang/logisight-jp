import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { HS_TERMS } from "@/lib/api/hs-dictionary";
import { tariffCandidatesQueryOptions } from "@/lib/api/tariff";

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
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-200">
          {lines.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => onPick(l.code)}
                className="w-full py-2.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-mono text-xs text-slate-500">{l.code}</span>{" "}
                <span className="font-semibold">{l.leaf}</span>
                <span className="ml-1 text-xs text-slate-500">{l.description.slice(-90)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
