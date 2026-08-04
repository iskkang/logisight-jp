import { createFileRoute } from "@tanstack/react-router";

import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { seoHead, faqPageSchema, type FaqItem } from "@/lib/seo";

// よくある質問 — 主題別セクションで一元管理。定義・方法論中心の Q&A のみ置く
// (実際の数値は各データページで確認)。FAQPage JSON-LD はこのページのみ出力。
const SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: "運賃",
    items: [
      {
        q: "企業向けサービス価格指数(SPPI)とは何ですか。",
        a: "日本銀行が公表する、企業間で取引されるサービスの価格指数です。Logisight では外航貨物輸送・国際航空貨物輸送・陸上貨物輸送・港湾運送・倉庫など、運輸関連の系列を掲載しています。基準は2020年=100です。",
      },
      {
        q: "円ベースと契約通貨ベースの違いは何ですか。",
        a: "円ベースは契約通貨ベースに為替変動を加えたもので、両者の差は定義上すべて為替要因です。運賃そのものの動きに近いのは契約通貨ベースです。区別せずに「運賃が○%上昇」と読むと解釈が逆になることがあります。",
      },
      {
        q: "契約通貨ベースが100を下回るとはどういう意味ですか。",
        a: "基準年(2020年)の水準を下回っているという意味です。円ベースが100を上回っていても、運賃そのものは基準年以下ということになります。該当する系列には「基準年割れ」と表示しています。",
      },
      {
        q: "為替レートは掲載していますか。",
        a: "掲載していません。為替の時系列データを保有していないため、「円安が何円進んだ」といった記述は行わず、「為替要因」までにとどめます。",
      },
    ],
  },
  {
    title: "港湾",
    items: [
      {
        q: "対象の港はどこですか。",
        a: "東京・横浜・名古屋・神戸・大阪・川崎の主要6港です。国土交通省 港湾統計の外国貿易コンテナ取扱量を掲載しています。",
      },
      {
        q: "「主要6港 合計」は全国計ですか。",
        a: "違います。あくまで主要6港の合計であり、全国のコンテナ取扱量ではありません。",
      },
      {
        q: "速報値と確報値はどう違いますか。",
        a: "速報値は確報とは確定度が異なります。速報の場合はその旨をページ上に明示しています。",
      },
    ],
  },
  {
    title: "貿易",
    items: [
      {
        q: "貿易データの出典は何ですか。",
        a: "財務省貿易統計です。相手国別は月次、品目別は概況品別国別表にもとづく概況品目の大分類です。",
      },
      {
        q: "相手国の一覧に地域名が出ないのはなぜですか。",
        a: "ASIA・EU などの地域集計は、国と同じ一覧に混ぜると順位が実態と食い違うため、国別一覧からは除いています。",
      },
      {
        q: "金額の単位は何ですか。",
        a: "原データは千円ですが、画面では兆・億円に換算して表示しています。マイナス(赤字)は日本の財務表記に合わせ「▲」で表します。",
      },
    ],
  },
  {
    title: "レポート",
    items: [
      {
        q: "レポートはどのくらいの頻度で発行されますか。",
        a: "月次です。運賃・港湾・貿易を一本にまとめ、各セクションに出典と基準月を明記しています。",
      },
      {
        q: "レポート内の対象月が揃っていないのはなぜですか。",
        a: "軸ごとに公表タイミングが異なるためです。とくに港湾統計は他の統計より遅れて公表されます。対象月が異なる場合は本文で必ず断っています。",
      },
    ],
  },
  {
    title: "データ・信頼性",
    items: [
      {
        q: "因果を断定しないのはなぜですか。",
        a: "月次の断面データにあるのは水準と前年同月比だけで、一方が他方を押し上げたことを示すデータではないためです。数値どうしの関係は「上回る」「下回る」「最も大きい」までにとどめています。",
      },
      {
        q: "データが無いときはどう表示しますか。",
        a: "任意の数値では埋めず「—」と表示します。値が無いことと 0 は区別します。",
      },
    ],
  },
];

const ALL_ITEMS: FaqItem[] = SECTIONS.flatMap((s) => s.items);

export const Route = createFileRoute("/faq")({
  head: () =>
    seoHead({
      title: "よくある質問 — Logisight",
      description:
        "企業向けサービス価格指数(運賃)、主要6港のコンテナ取扱量、財務省貿易統計、月次レポートの読み方についてのよくある質問。",
      path: "/faq",
    }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="min-h-screen bg-[#070b16] text-[#c7d2e0]">
      <HomeNav />
      <main className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-10 min-[640px]:px-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2dd4bf]">FAQ</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-[#e9eef7] min-[640px]:text-[34px]">
          よくある質問
        </h1>
        <p className="mt-3 max-w-[640px] text-[14px] leading-[1.7] text-[#93a1b7]">
          運賃・港湾・貿易・レポートの読み方と、データの方法論についてのご質問をまとめました。
          実際の数値は各データページでご確認ください。
        </p>

        <div className="mt-9 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 border-b border-[#22304a] pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#8595ab]">
                {section.title}
              </h2>
              <dl className="divide-y divide-[#161f31]">
                {section.items.map((item) => (
                  <div key={item.q} className="py-4">
                    <dt className="text-[15px] font-semibold text-[#e9eef7]">{item.q}</dt>
                    <dd className="mt-2 text-[14px] leading-[1.7] text-[#a9b6c9]">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </main>
      <HomeFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema(ALL_ITEMS)) }}
      />
    </div>
  );
}
