import { createFileRoute } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { JpPage } from "@/components/jp/JpPage";

// プライバシーポリシー — ニュースレター登録時に取得する個人情報を前提とした標準方針。
// 注意: 法務確認のうえ、保有期間・委託先・施行日を確定すること(草案の位置づけ)。
// 韓国版は個人情報保護法(韓国)を前提にしていたため、日本の個人情報保護法に合わせて書き直している。
export const Route = createFileRoute("/privacy")({
  head: () =>
    seoHead({
      title: "プライバシーポリシー — Logisight",
      description:
        "Logisight のニュースレター登録時に取得・利用する個人情報の取り扱いについて定めた方針です。",
      path: "/privacy",
      koPath: "/privacy",
    }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-bold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "プライバシーポリシー" }]}
      title="プライバシーポリシー"
      meta={<span className="text-[12px] text-[#6b7683]">施行日: 2026-06-29</span>}
    >
      <div className="max-w-[760px] pb-4">
        <p className="mt-6 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          MTL Shipping Agency(以下「当社」)は、Logisight のニュースレターを提供するにあたり、
          以下のとおり個人情報を取得・利用します。個人情報の保護に関する法律その他の関係法令を遵守します。
        </p>

        <Section title="1. 取得する個人情報">
          <ul className="list-disc space-y-1 pl-5">
            <li>必須: メールアドレス、お名前</li>
            <li>任意: 会社名、関心分野(海上・航空・貿易・物流)</li>
            <li>自動取得: 登録日時、同意日時、流入経路</li>
          </ul>
        </Section>

        <Section title="2. 利用目的">
          <ul className="list-disc space-y-1 pl-5">
            <li>マーケットレポート・ニュースレターの配信</li>
            <li>関心分野に応じた内容の調整</li>
            <li>登録内容の管理および配信停止の処理</li>
          </ul>
        </Section>

        <Section title="3. 保有期間">
          <p>
            配信停止または同意の撤回まで保有し、その後遅滞なく削除します。関係法令により保存が必要な場合は、
            その期間に限り保管します。
          </p>
        </Section>

        <Section title="4. 業務の委託および外国にある第三者への提供">
          <p>
            サービス提供のため、メール配信およびデータ保管の業務を以下の事業者に委託しています。これらのデータは
            日本国外で保存・処理される場合があります。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>メール配信: Resend(送信元 newsletter@logisight.net)</li>
            <li>データ保管(ホスティング): Supabase</li>
          </ul>
        </Section>

        <Section title="5. アカウント情報">
          <p>
            会員登録・ログインをご利用の場合、認証基盤(Supabase Auth)を通じて次の情報を取得します。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>メールアドレス</li>
            <li>
              Google アカウントでログインした場合、Google
              から提供される基本プロフィール(氏名・メールアドレス)
            </li>
            <li>登録日時・最終ログイン日時</li>
          </ul>
          <p>
            あわせて、登録後の画面でお名前・会社名・役職をお伺いしています。ご記入は任意で、
            未記入のままでもサイトはご利用いただけます。
          </p>
          <p>
            メールマガジンの配信は、この画面で受け取ることに同意された方にのみ行います。
            同意の有無・同意した日時・どの画面で同意されたかを記録として保存します
            (特定電子メール法にもとづく同意記録)。配信の停止はメール内のリンク、または
            下記の窓口からいつでも行えます。
          </p>
          <p>
            パスワードは当社では保持せず、認証基盤側でハッシュ化して管理されます。
            退会をご希望の場合は下記の窓口までご連絡ください。アカウントと関連する記録を削除します。
          </p>
        </Section>

        <Section title="6. お問い合わせでいただく情報">
          <p>「輸送のご相談」フォームからお問い合わせいただいた場合、次の情報をお預かりします。</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>お名前・会社名・メールアドレス・電話番号</li>
            <li>ご相談内容</li>
            <li>どの導線からフォームに来られたか(広告バナー経由かどうかの記録)</li>
          </ul>
          <p>
            お問い合わせへの回答と、そのための社内連絡にのみ利用します。ご本人の同意なく
            第三者へ提供することはありません。回答後も経緯の確認のため一定期間保管します。
            削除をご希望の場合は下記の窓口までご連絡ください。
          </p>
        </Section>

        <Section title="7. 閲覧記録">
          <p>
            サイトの改善と、どの内容が読まれているかの把握のため、閲覧記録を取得しています。
            取得する項目は次のとおりです。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>閲覧したページのURLパス</li>
            <li>直前の参照元(当サイト外から来られた場合のみ)</li>
            <li>ブラウザごとの識別子(ランダムな文字列。ブラウザの localStorage に保存します)</li>
            <li>ログイン中の場合はアカウントの識別子</li>
            <li>閲覧日時</li>
          </ul>
          <p>
            <strong>
              IPアドレスおよびブラウザの種類(ユーザーエージェント)は取得していません。
            </strong>
            ブラウザごとの識別子は当サイト内の閲覧をまとめるためだけに用い、個人を特定する目的では使用しません。
            ブラウザの保存データを消去すると、この識別子も削除されます。
          </p>
          <p>
            現時点で外部のアクセス解析サービス(Google Analytics など)および広告目的の Cookie
            は使用していません。 導入する場合は本ポリシーを改定し、その旨を記載します。
          </p>
        </Section>

        <Section title="8. 第三者提供">
          <p>
            当社は、法令に根拠がある場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。
          </p>
        </Section>

        <Section title="9. 同意の撤回・配信停止">
          <p>
            すべてのニュースレター下部の<strong>「配信停止」</strong>
            リンクから、いつでも配信を停止(同意を撤回)できます。撤回された場合、該当する個人情報は削除します。
          </p>
        </Section>

        <Section title="10. ご本人の権利">
          <p>
            ご本人は、自身の個人情報について開示・訂正・削除・利用停止を請求できます。下記の連絡先までお問い合わせください。
          </p>
        </Section>

        <Section title="11. お問い合わせ窓口">
          <p>
            個人情報に関するお問い合わせ:{" "}
            <a
              className="underline text-[var(--color-navy-900)]"
              href="mailto:newsletter@logisight.net"
            >
              newsletter@logisight.net
            </a>
          </p>
        </Section>
      </div>
    </JpPage>
  );
}
