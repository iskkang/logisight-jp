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
    }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-bold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">{children}</div>
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

      <Section title="5. 第三者提供">
        <p>
          当社は、法令に根拠がある場合を除き、ご本人の同意なく個人情報を第三者に提供することはありません。
        </p>
      </Section>

      <Section title="6. 同意の撤回・配信停止">
        <p>
          すべてのニュースレター下部の<strong>「配信停止」</strong>
          リンクから、いつでも配信を停止(同意を撤回)できます。撤回された場合、該当する個人情報は削除します。
        </p>
      </Section>

      <Section title="7. ご本人の権利">
        <p>
          ご本人は、自身の個人情報について開示・訂正・削除・利用停止を請求できます。下記の連絡先までお問い合わせください。
        </p>
      </Section>

      <Section title="8. お問い合わせ窓口">
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
