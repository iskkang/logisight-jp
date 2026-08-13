import { createFileRoute } from "@tanstack/react-router";

import { JpTariff } from "@/components/tariff/JpTariff";
import { seoHead } from "@/lib/seo";

/**
 * 10 桁の HTS コード。リンクで共有できるように search に置く。
 *
 * ■ 数字で届く
 * ルータは検索文字列を JSON として読むので、`?code=8703230110` は文字列ではなく
 * **数値** で渡ってくる。ここを取り違えると次の二つが同時に起きる。
 *   - `z.string()` が弾く → `.catch(undefined)` が値を捨てる → 入力と結果が
 *     食い違うのでルータが URL を正規化し、?code= ごと 307 で消える
 *   - すり抜けた場合はサーバ関数が「string を期待したが number が来た」で落ちる
 * 実際に両方出た。表が一度も描けなかった原因はこれ一つである。
 *
 * ■ 受け取った形のまま返す
 * ここで数値を文字列に直して返すと、今度はルータが「入力と出力が違う」と見て
 * URL を書き直しにかかり、やはり 307 になる。実際にそうなった。
 * だから検証は「その値が 10 桁かどうか」だけを見て、**受け取った形のまま**返す。
 * 入力と出力が同じなら、ルータは URL に手を出さない。
 *
 * 文字列に直すのは使う側(下の TariffPage)でやる。10 桁は 2^53 に収まるので
 * 数値を経由しても桁は落ちない。先頭が 0 のコードはそもそも JSON として読めず、
 * 文字列のまま届く。
 *
 * ■ 検証は自分で書く
 * 中身は単純なので、他人の実装の癖に預けない。正しい 10 桁だけ残し、それ以外は
 * 落とす。落ちても画面は品目チップの状態に戻るだけで、例外にはしない。
 */
function validateTariffSearch(search: Record<string, unknown>): { code?: string | number } {
  const raw = search.code;
  if (typeof raw !== "string" && typeof raw !== "number") return {};
  return /^\d{10}$/.test(String(raw)) ? { code: raw } : {};
}

export const Route = createFileRoute("/tariff")({
  validateSearch: validateTariffSearch,
  head: () =>
    seoHead({
      title: "米国輸入関税 原産地別比較 — Logisight",
      description:
        "日本から米国へ出したときの輸入関税を基準に、中国・ベトナム・タイ・メキシコ・韓国と並べて比べます。MFN・Section 301・上限補正の内訳つき。米国の輸入関税のみを扱います。",
      path: "/tariff",
    }),
  component: TariffPage,
});

function TariffPage() {
  const { code } = Route.useSearch();
  // search には受け取った形(数値のことがある)がそのまま入っている。文字列にするのはここ。
  return <JpTariff code={code === undefined ? "" : String(code)} />;
}
