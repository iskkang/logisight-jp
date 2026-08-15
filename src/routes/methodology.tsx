import { createFileRoute, Link } from "@tanstack/react-router";

import { JpPage } from "@/components/jp/JpPage";
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
      koPath: "/methodology",
    }),
  component: MethodologyPage,
});

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-[#d5d9de] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b7683]">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-[#eef0f2] px-3 py-2.5 text-[13.5px] text-[#22282f] ${className}`}>
      {children}
    </td>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 border-b border-[#d5d9de] pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#6b7683]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MethodologyPage() {
  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "データの方法論" }]}
      title="データの方法論"
      lead="掲載しているデータの出典・単位・更新頻度と、表現の原則をまとめています。実際の数値は各データページでご確認ください。"
    >
      <div className="max-w-[900px] pb-4">
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
                      <b className="text-[#1a1f26]">{r.name}</b>
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
          <p className="text-[14px] leading-[1.7] text-[#22282f]">
            企業向けサービス価格指数には、円ベースと契約通貨ベースの2系列があります。
            <b className="text-[#1a1f26]">円ベースは契約通貨ベースに為替変動を加えたもの</b>で、両者の差は定義上すべて為替換算の影響です。
            <b className="text-[#1a1f26]">為替換算の影響を除いた価格動向を確認するには、契約通貨ベースが参考になります。</b>
            両者を区別せずに「運賃が○%上昇」と書くと事実と異なります。
            契約通貨ベースを公表しない系列(陸上・港湾運送・倉庫など)は、円建て契約が中心のため為替換算の影響がそもそも生じません。
          </p>
        </Section>

        <Section title="為替の計算式 — 四つを区別します">
          <p className="mb-3 text-[14px] leading-[1.7] text-[#22282f]">
            円ベースと契約通貨ベースの差は、見方によって数値も単位も変わります。
            当媒体は次の四つを<b className="text-[#1a1f26]">別の指標として区別</b>し、まとめて「為替寄与」とは呼びません。
            例は外航貨物輸送 2026年6月分(円ベース 233.8 / 契約通貨ベース 160.8、前年同月比 +52.8% / +37.4%)です。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>指標</Th>
                  <Th>計算式</Th>
                  <Th>単位</Th>
                  <Th>例</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td><b className="text-[#1a1f26]">単純差</b></Td>
                  <Td>円ベース伸び − 契約通貨ベース伸び</Td>
                  <Td>ポイント</Td>
                  <Td className="tabular-nums">15.4 ポイント</Td>
                </tr>
                <tr>
                  <Td><b className="text-[#1a1f26]">為替換算による上乗せ率</b></Td>
                  <Td>(1+円ベース伸び) ÷ (1+契約通貨ベース伸び) − 1</Td>
                  <Td>%</Td>
                  <Td className="tabular-nums">+11.2%</Td>
                </tr>
                <tr>
                  <Td><b className="text-[#1a1f26]">指数の比</b>(基準年からの累積)</Td>
                  <Td>円ベース指数 ÷ 契約通貨ベース指数 − 1</Td>
                  <Td>%</Td>
                  <Td className="tabular-nums">+45.4%</Td>
                </tr>
                <tr>
                  <Td><b className="text-[#1a1f26]">指数差の割合</b></Td>
                  <Td>(円ベース指数 − 契約通貨ベース指数) ÷ 円ベース指数</Td>
                  <Td>%</Td>
                  <Td className="tabular-nums">31.2%</Td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] leading-[1.7] text-[#6b7683]">
            単純差(ポイント)と上乗せ率(%)は別の数値です。円ベースと契約通貨ベースは積の関係にあるため、
            <b className="text-[#22282f]">引き算では一致しません</b>(15.4 ≠ 11.2)。
            当媒体では、外部の為替レート系列は使わず、上記のとおり指数の二系列から算出しています。
          </p>
        </Section>

        <Section title="前月比・前年同月比の計算">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#22282f]">
            <li>前年同月比 = (当月値 ÷ 前年同月値) − 1。単位は %。</li>
            <li>前月比 = (当月値 ÷ 前月値) − 1。単位は %。</li>
            <li>
              比較する変化率の<b className="text-[#1a1f26]">基準期間が異なる場合は必ず明示</b>します。
              週次指数の前週比と月次指数の前月比を、そのまま並べて優劣を述べることはしません。
            </li>
            <li>
              変化率どうしの差は<b className="text-[#1a1f26]">ポイント</b>、水準どうしの比は<b className="text-[#1a1f26]">%</b>で表記します。
            </li>
          </ul>
        </Section>

        <Section title="端数処理">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#22282f]">
            <li>指数・変化率は小数第1位まで(四捨五入)。</li>
            <li>
              貿易額は原データが千円単位です。表示単位の億円へ換算する際は
              <b className="text-[#1a1f26]">四捨五入</b>し、本文と表で同じ値を用います。
            </li>
            <li>コンテナ取扱量(TEU)は原データのまま、丸めません。</li>
          </ul>
        </Section>

        <Section title="基準月の違い">
          <p className="text-[14px] leading-[1.7] text-[#22282f]">
            軸ごとに公表タイミングが異なります。とくに港湾統計は他の統計より遅れて公表されるため、
            同じ号のなかで<b className="text-[#1a1f26]">対象月が揃わないことがあります</b>。
            その場合は各ページとレポート本文の双方で対象月を明示します。異なる月の数値を同一時点の動きとして比較しないでください。
          </p>
        </Section>

        <Section title="表現の原則">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#22282f]">
            <li>
              <b className="text-[#1a1f26]">因果を断定しません。</b>
              二つの数値が並んでいても、一方が他方を「押し上げた」「牽引した」とは書きません。
              月次の断面データにあるのは水準と前年同月比だけです。
            </li>
            <li>
              <b className="text-[#1a1f26]">単月から継続性を主張しません。</b>
              前年同月比が正であることは、その月が前年同月より高いという意味にとどまります。
            </li>
            <li>
              数値どうしの関係は「上回る」「下回る」「最も大きい」までにとどめ、推測(「〜の可能性がある」)は書きません。
            </li>
          </ul>
        </Section>

        <Section title="データが無いとき">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#22282f]">
            <li>
              任意の数値で埋めず「—」と表示します。値が無いことと 0 は区別します
              (<b className="text-[#1a1f26]">欠測 ≠ 0</b>)。
            </li>
            <li>
              速報値は<b className="text-[#1a1f26]">速報である旨を明示</b>します。確報とは確定度が異なります。
            </li>
            <li>個別貨物の原データは公開せず、集計値のみを掲載します。</li>
          </ul>
        </Section>

        <Section title="データの更新と過去分の修正">
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#22282f]">
            <li>
              各データは<b className="text-[#1a1f26]">出典機関の公表後に取得</b>します。公表日は機関ごとに異なり、
              当媒体の掲載日とは一致しません。対象月は各ページに明示します。
            </li>
            <li>
              港湾統計は速報値と確報値が別に公表されます。
              <b className="text-[#1a1f26]">同じ月について確報が出た場合は確報で置き換えます</b>。
              置き換え後も対象月と確定度の表示は残ります。
            </li>
            <li>
              出典機関が過去分を改定した場合、当媒体のデータも次回取得時に改定後の値へ更新されます。
              既に公開したレポート(PDF)は<b className="text-[#1a1f26]">発行時点の数値のまま残し、遡って書き換えません</b>。
              数値の誤りが判明した場合は、修正版を新しい版として公開し、修正した旨を明記します。
            </li>
          </ul>
        </Section>

        <Section title="数値の検査">
          <p className="mb-3 text-[14px] leading-[1.7] text-[#22282f]">
            レポートの本文は自動生成しています。公開前に、次の検査を機械的に行い、
            <b className="text-[#1a1f26]">通らない場合は公開しません</b>。
          </p>
          <ul className="space-y-2.5 text-[14px] leading-[1.7] text-[#22282f]">
            <li>本文の数値が原データと一致するか(一致しない数値があれば差し戻し)</li>
            <li>表と本文で同じ金額が同じ値になっているか</li>
            <li>因果の断定、単月からの継続性の主張が含まれていないか</li>
            <li>%とポイントの取り違えがないか</li>
            <li>内部の項目名や未置換の文字列が本文に残っていないか</li>
            <li>対象月・出典が明記されているか</li>
          </ul>
        </Section>

        <Section title="誤りのご指摘">
          <p className="text-[14px] leading-[1.7] text-[#22282f]">
            掲載データや記述に誤りを見つけられた場合は{" "}
            <a
              className="font-semibold text-[#0b2d52] hover:underline"
              href="mailto:newsletter@logisight.net?subject=%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AE%E8%AA%A4%E3%82%8A%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6"
            >
              newsletter@logisight.net
            </a>{" "}
            までご連絡ください。該当ページ・対象月・該当箇所をお知らせいただけると確認が早くなります。
            確認のうえ修正した場合は、修正内容と日付を該当ページに記載します。
          </p>
        </Section>

        <div className="mt-12 flex flex-wrap gap-3 text-[13px]">
          <Link to="/faq" className="font-semibold text-[#0b2d52] hover:underline">
            よくある質問 ›
          </Link>
          <Link to="/rates" className="font-semibold text-[#0b2d52] hover:underline">
            運賃 ›
          </Link>
        </div>
      </div>
    </JpPage>
  );
}
