import { Link } from "@tanstack/react-router";

// 日本の業界紙のフッター。会社情報と出典を隠さず並べる — 信頼の手掛かりを前に出す。
const COLS: { title: string; items: { label: string; to: "/rates" | "/ports" | "/trade" | "/reports" | "/news" | "/about" | "/methodology" | "/faq" | "/privacy" }[] }[] = [
  {
    title: "データ",
    items: [
      { label: "運賃(SPPI)", to: "/rates" },
      { label: "港湾", to: "/ports" },
      { label: "貿易", to: "/trade" },
    ],
  },
  {
    title: "記事",
    items: [
      { label: "ニュース", to: "/news" },
      { label: "月次レポート", to: "/reports" },
    ],
  },
  {
    title: "媒体について",
    items: [
      { label: "会社概要", to: "/about" },
      { label: "データの方法論", to: "/methodology" },
      { label: "よくある質問", to: "/faq" },
      { label: "プライバシーポリシー", to: "/privacy" },
    ],
  },
];

export function JpFooter() {
  return (
    <footer className="mt-16 border-t border-[#d5d9de] bg-[#f7f8f9]">
      <div className="mx-auto max-w-[1120px] px-4 py-9">
        <div className="grid grid-cols-2 gap-7 min-[760px]:grid-cols-4">
          <div className="col-span-2 min-[760px]:col-span-1">
            <div className="text-[19px] font-bold tracking-[-0.02em] text-[#0b2d52]">Logisight</div>
            <p className="mt-2 max-w-[260px] text-[12px] leading-[1.7] text-[#5a636e]">
              日本の荷主・フォワーダーに向けて、運賃・港湾・貿易の公的統計を毎月まとめています。
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h3 className="text-[12px] font-bold text-[#1a1f26]">{c.title}</h3>
              <ul className="mt-2.5 space-y-1.5">
                {c.items.map((i) => (
                  <li key={i.to + i.label}>
                    <Link
                      to={i.to}
                      className="text-[12.5px] text-[#3c4652] transition-colors hover:text-[#0b2d52] hover:underline"
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-1 border-t border-[#dde1e5] pt-5 text-[11.5px] leading-[1.7] text-[#6b7683]">
          <p>
            主なデータの出典: 日本銀行 企業向けサービス価格指数、国土交通省 港湾統計、財務省貿易統計。
          </p>
          <p>
            Logisight は{" "}
            <Link to="/about" className="underline hover:text-[#0b2d52]">
              MTL Shipping Agency
            </Link>{" "}
            が運営しています。日本窓口: MTL JAPAN CO.,LTD.(株式会社脈日通運)
          </p>
          <p>
            〒102-0073 東京都千代田区九段北1-4-4 九段下ASNビル7F ／ TEL 03-6284-4506 ／ FAX 03-6284-4507
          </p>
          <p>
            お問い合わせ:{" "}
            <a href="mailto:newsletter@logisight.net" className="underline hover:text-[#0b2d52]">
              newsletter@logisight.net
            </a>
          </p>
          <p>© 2026 Logisight. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
