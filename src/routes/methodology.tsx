import { createFileRoute, Link } from "@tanstack/react-router";

import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { seoHead } from "@/lib/seo";

// データの方法論 — 出典・単位・更新頻度・表現原則を一か所にまとめた参照ページ。
// 各データページから「データの方法論」でリンクする。実際の数値は各ページで確認。

const DATASET_META: {
  name: string;
  source: string;
  unit: string;
  cadence: string;
  note: string;
}[] = [
  {
    name: "運賃(企業向けサービス価格指数)",
    source: "日本銀行",
    unit: "指数(2020年=100)",
    cadence: "月次",
    note: "円ベースと契約通貨ベースを分けて掲載",
  },
  {
    name: "港湾コンテナ取扱量",
    source: "国土交通省 港湾統計",
    unit: "TEU",
    cadence: "月次",
    note: "主要6港の外国貿易コンテナ。速報値を含む",
  },
  {
    name: "貿易(相手国別)",
    source: "財務省貿易統計",
    unit: "千円",
    cadence: "月次",
    note: "地域集計(ASIA・EU など)は国別一覧から除く",
  },
  {
    name: "貿易(品目別)",
    source: "財務省貿易統計 概況品別国別表",
    unit: "千円",
    cadence: "月次",
    note: "概況品目の大分類",
  },
];

export const Route = createFileRoute("/methodology")({
  head: () =>
    seoHead({
      title: "データの方法論 — Logisight",
      description:
        "Logisight が用いる企業向けサービス価格指数・港湾統計・財務省貿易統計の出典・単位・更新頻度と、因果を断定しない表現原則、欠測データの扱いをまとめています。",
      path: "/methodology",
    }),
  component: MethodologyPage,
});

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-[#22304a] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#8595ab]">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-[#161f31] px-3 py-2.5 text-[13.5px] text-[#c7d2e0]">{children}</td>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 border-b border-[#22304a] pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#8595ab]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#070b16] text-[#c7d2e0]">
      <HomeNav />
      <main className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-10 min-[640px]:px-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2dd4bf]">Methodology</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-[#e9eef7] min-[640px]:text-[34px]">
          データの方法論
        </h1>
        <p className="mt-3 max-w-[640px] text-[14px] leading-[1.7] text-[#93a1b7]">
          掲載しているデータの出典・単位・更新頻度と、表現の原則をまとめています。実際の数値は各データページでご確認ください。
        </p>

        <Section title="データの出典">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>データ</Th>
                  <Th>出典</Th>
                  <Th>単位</Th>
                  <Th>更新頻度</Th>
                  <Th>備考</Th>
                </tr>
              </thead>
              <tbody>
                {DATASET_META.map((r) => (
                  <tr key={r.name}>
                    <Td>
                      <b className="text-[#e9eef7]">{r.name}</b>
                    </Td>
                    <Td>{r.source}</Td>
                    <Td>{r.unit}</Td>
                    <Td>{r.cadence}</Td>
                    <Td>{r.note}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="円ベースと契約通貨ベース">
          <p className="text-[14px] leading-[1.7] text-[#a9b6c9]">
            企業向けサービス価格指数には、円ベースと契約通貨ベースの2系列があります。
            <b className="text-[#e9eef7]">円ベースは契約通貨ベースに為替変動を加えたもの</b>で、両者の差は定義上すべて為替要因です。
            運賃そのものの動きに近いのは契約通貨ベースであり、両者を区別せずに「運賃が○%上昇」と書くと事実と異なります。
            なお当媒体は為替レートの時系列データを保有していないため、円安が何円進んだといった記述は行いません。
          </p>
        </Section>

        <Section title="基準月の違い">
          <p className="text-[14px] leading-[1.7] text-[#a9b6c9]">
            軸ごとに公表タイミングが異なります。とくに港湾統計は他の統計より遅れて公表されるため、
            同じ号のなかで<b className="text-[#e9eef7]">対象月が揃わないことがあります</b>。
            その場合は各ページとレポート本文の双方で対象月を明示します。異なる月の数値を同一時点の動きとして比較しないでください。
          </p>
        </Section>

        <Section title="表現の原則">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#a9b6c9]">
            <li>
              <b className="text-[#e9eef7]">因果を断定しません。</b>
              二つの数値が並んでいても、一方が他方を「押し上げた」「牽引した」とは書きません。
              月次の断面データにあるのは水準と前年同月比だけです。
            </li>
            <li>
              <b className="text-[#e9eef7]">単月から継続性を主張しません。</b>
              前年同月比が正であることは、その月が前年同月より高いという意味にとどまります。
            </li>
            <li>
              数値どうしの関係は「上回る」「下回る」「最も大きい」までにとどめ、推測(「〜の可能性がある」)は書きません。
            </li>
          </ul>
        </Section>

        <Section title="データが無いとき">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#a9b6c9]">
            <li>
              任意の数値で埋めず「—」と表示します。値が無いことと 0 は区別します
              (<b className="text-[#e9eef7]">欠測 ≠ 0</b>)。
            </li>
            <li>
              速報値は<b className="text-[#e9eef7]">速報である旨を明示</b>します。確報とは確定度が異なります。
            </li>
            <li>個別貨物の原データは公開せず、集計値のみを掲載します。</li>
          </ul>
        </Section>

        <div className="mt-12 flex flex-wrap gap-3 text-[13px]">
          <Link to="/faq" className="font-semibold text-[#2dd4bf] hover:underline">
            よくある質問 →
          </Link>
          <Link to="/rates" className="font-semibold text-[#2dd4bf] hover:underline">
            運賃 →
          </Link>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
