// ダークネイビーのフッター — ブランド+チップ / サービス・ニュース・Logisight リンク /
// ニュースレター帯 / © 行。運営主体の開示は隠さず、リンク列ではなく最下部の1行と /about で扱う。
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { NewsletterForm } from "./NewsletterForm";

/** 日本版は lang="ja" の記事だけを扱うため、カテゴリ値も日本語。 */
const NEWS_CATEGORIES = ["海上", "航空", "港湾", "貿易"] as const;

export function Footer() {
  return (
    <footer className="text-white" style={{ background: "var(--color-navy-900)" }}>
      <div className="mx-auto grid max-w-[1540px] gap-6 px-4 pt-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-12">
        <div>
          <Link to="/" className="inline-block" aria-label="Logisight ホーム">
            <img src="/logisight_logo.svg" alt="Logisight" className="h-8 w-auto" />
          </Link>
          <p className="mt-2.5 max-w-[280px] text-[12.5px] leading-relaxed text-white/65">
            日本の荷主・フォワーダーのための物流インテリジェンス。
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {["公的統計にもとづく", "出典と基準月を明示"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/20 px-[11px] py-1 text-[11px] font-semibold text-white/75"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <FooterCol title="サービス">
          <li><Link to="/rates" className={linkCls}>運賃</Link></li>
          <li><Link to="/ports" className={linkCls}>港湾</Link></li>
          <li><Link to="/trade" className={linkCls}>貿易</Link></li>
          <li><Link to="/methodology" className={linkCls}>データの方法論</Link></li>
          <li><Link to="/faq" className={linkCls}>よくある質問</Link></li>
        </FooterCol>

        <FooterCol title="ニュース">
          {NEWS_CATEGORIES.map((c) => (
            <li key={c}>
              <Link to="/news" search={{ cat: c }} className={linkCls}>
                {c}
              </Link>
            </li>
          ))}
        </FooterCol>

        <FooterCol title="Logisight">
          <li><Link to="/about" className={linkCls}>会社概要</Link></li>
          <li><a href="#newsletter" className={linkCls}>ニュースレター登録</a></li>
          <li><Link to="/privacy" className={linkCls}>プライバシーポリシー</Link></li>
        </FooterCol>
      </div>

      {/* ニュースレター帯 */}
      <div className="mx-auto max-w-[1540px] px-4 pt-7 lg:px-12">
        <div
          id="newsletter"
          className="flex flex-wrap items-center justify-between gap-5 rounded-lg border border-white/[0.14] bg-white/[0.04] px-6 py-5"
        >
          <div>
            <div className="text-[14.5px] font-bold">月次マーケットレポート</div>
            <p className="mt-1 text-[12.5px] text-white/65">
              運賃(SPPI)・港湾・貿易の動きを毎月お届けします。出典と基準月は必ず明記します。
            </p>
          </div>
          <div className="min-w-[260px] max-w-[420px] flex-1">
            <NewsletterForm compact />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-[1540px] flex-col gap-1 px-4 pb-6 pt-5 lg:px-12">
        <span className="text-[11.5px] text-white/60">
          Logisight is operated by{" "}
          <Link to="/about" className="underline transition-colors hover:text-white/80">
            MTL Shipping Agency
          </Link>
          .
        </span>
        <span className="text-[11.5px] text-white/50">
          主なデータの出典は{" "}
          <Link to="/methodology" className="underline transition-colors hover:text-white/80">
            データの方法論
          </Link>{" "}
          ページをご覧ください。
        </span>
        <span className="text-[11.5px] text-white/50">
          © 2026 Logisight. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-[12.5px] font-bold text-white">{title}</h4>
      <ul className="space-y-2.5 text-[12.5px] text-white/65">{children}</ul>
    </div>
  );
}

const linkCls = "transition-colors hover:text-white";
