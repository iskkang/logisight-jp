import { createFileRoute, Link } from "@tanstack/react-router";

import { seoHead } from "@/lib/seo";
import { JpPage } from "@/components/jp/JpPage";

// 会社概要 — 何を発行し、誰が運営し、どう作っているか。
// 所有の開示はフッターのリンク列ではなくここに集める(メディアの慣行)。
export const Route = createFileRoute("/about")({
  head: () =>
    seoHead({
      title: "会社概要 — Logisight",
      description:
        "Logisight は、運賃・港湾・貿易の公的統計を毎月ひとつのレポートにまとめる物流インテリジェンス媒体です。",
      path: "/about",
    }),
  component: AboutPage,
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

const linkCls = "underline transition-colors hover:text-[var(--color-navy-600)]";

function AboutPage() {
  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "会社概要" }]}
      title="会社概要"
    >
      <div className="max-w-[760px] pb-4">
      <p className="mt-6 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Logisight は、日本の荷主・フォワーダー・物流部門の実務者に向けて、運賃・港湾・貿易の動きを
        公的統計にもとづいて毎月まとめる物流インテリジェンス媒体です。推計や見通しではなく、
        公表された数字と、その出典・基準月を示すことを編集方針としています。
      </p>

      <Section title="何を発行するか">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link to="/reports" className={linkCls}>
              月次マーケットレポート
            </Link>{" "}
            — 運賃・港湾・貿易を一本にまとめた分析
          </li>
          <li>
            <Link to="/rates" className={linkCls}>
              運賃
            </Link>{" "}
            — 企業向けサービス価格指数(日本銀行)の運輸関連系列
          </li>
          <li>
            <Link to="/ports" className={linkCls}>
              港湾
            </Link>{" "}
            — 主要6港の外国貿易コンテナ取扱量(国土交通省)
          </li>
          <li>
            <Link to="/trade" className={linkCls}>
              貿易
            </Link>{" "}
            — 相手国別・品目別の輸出入(財務省貿易統計)
          </li>
        </ul>
      </Section>

      <Section title="どう作っているか">
        <p>
          公表された統計を自社のパイプラインで収集・正規化し、編集を経て発行します。指標ごとの
          算出根拠と出典は{" "}
          <Link to="/methodology" className={linkCls}>
            データの方法論
          </Link>{" "}
          にまとめています。
        </p>
        <p>
          数値には必ず基準月を併記します。軸ごとに公表タイミングが異なるため、異なる月の数値を
          同一時点として比較しないよう、レポート本文でも対象月を明示しています。
        </p>
        <p>外部媒体を引用する場合は、出典を示し原文へリンクします。</p>
      </Section>

      <Section title="運営主体">
        <p>
          Logisight は{" "}
          <strong className="font-semibold text-[var(--color-ink)]">MTL Shipping Agency</strong>{" "}
          が運営しています。
        </p>
        <p>編集方針は運営会社の営業と分離して運用します。広告・スポンサードを含む場合はその位置に明示します。</p>
      </Section>

      <Section title="お問い合わせ">
        <p>
          情報提供・訂正のご依頼・提携のご相談:{" "}
          <a className={linkCls} href="mailto:newsletter@logisight.net">
            newsletter@logisight.net
          </a>
        </p>
        <p>
          個人情報の取り扱いについては{" "}
          <Link to="/privacy" className={linkCls}>
            プライバシーポリシー
          </Link>{" "}
          をご覧ください。
        </p>
      </Section>
      </div>
    </JpPage>
  );
}
