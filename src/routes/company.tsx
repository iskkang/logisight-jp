import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { JpPage } from "@/components/jp/JpPage";
import { seoHead } from "@/lib/seo";

// 日本窓口 MTL JAPAN の会社案内。媒体の会社概要(/about)とは別ページにする ——
// 媒体の編集と運営会社の営業を分けて見せるため。
//
// 読み手は日本と取引する海外のフォワーダー・荷主。社内チームが日本語・英語・中国語・韓国語で
// 対応することがこの会社の強みなので、同じ内容を 4 言語で出す。言語は URL の ?lang= だけで
// 決める(画面状態は URL クエリのみ)。既定値は置かない —— 置くとルーターが 307 を出す。
const LANGS = ["ja", "en", "zh", "ko"] as const;
type Lang = (typeof LANGS)[number];
const LANG_LABEL: Record<Lang, string> = { ja: "日本語", en: "English", zh: "中文", ko: "한국어" };

type Copy = {
  title: string;
  lead: string;
  lanesTitle: string;
  lanes: string;
  lanesNote: string;
  servicesTitle: string;
  services: string[];
  partnerTitle: string;
  partner: { h: string; p: string }[];
  langTitle: string;
  langText: string;
  infoTitle: string;
  info: { name: string; address: string; tel: string; email: string };
  ctaText: string;
  ctaLink: string;
};

const INFO_NAME = "MTL JAPAN CO., LTD.(株式会社脈日通運)";
const EMAIL = "sales_japan@mtlship.com";

const COPY: Record<Lang, Copy> = {
  ja: {
    title: "MTL JAPAN 会社案内",
    lead: "東京のフォワーダーです。日本の輸出入に10年携わり、米国・韓国・中南米・中国のフォワーダーの日本側パートナーを務めています。",
    lanesTitle: "主要航路",
    lanes: "日本発 中国・ロシア・中央アジア",
    lanesNote: "日本発の中国・東南アジア・韓国・台湾・ロシア向け海上運賃にも対応します。",
    servicesTitle: "日本で行う業務",
    services: [
      "輸出入通関",
      "日本向け貨物の現地対応:輸入通関・国内配送・DDP/DAP",
      "FCL・LCL・プロジェクト貨物・バルク",
      "荷主所有コンテナ(SOC)向けの日本でのコンテナ購入",
    ],
    partnerTitle: "パートナーとしての約束",
    partner: [
      {
        h: "お客様はパートナーのもの",
        p: "日本側の業務を代行し、パートナーのお客様には直接営業しません。",
      },
      { h: "現地費用を明確に", p: "日本側の費用はすべて見積もりに明記します。" },
      {
        h: "日本側を先に確認",
        p: "出港前に貨物情報をいただければ、日本での通関・配送を先に確認します。",
      },
    ],
    langTitle: "対応言語",
    langText: "東京のチームが日本語・英語・中国語・韓国語で直接やり取りします。",
    infoTitle: "会社情報",
    info: {
      name: "商号",
      address: "所在地",
      tel: "電話",
      email: "メール",
    },
    ctaText: "日本向け・日本発の貨物のご相談はこちら",
    ctaLink: "輸送のご相談",
  },
  en: {
    title: "MTL JAPAN — Company profile",
    lead: "A Tokyo freight forwarder with 10 years in Japan import and export. We already work as the Japan-side partner for forwarders from the US, Korea, Latin America and China.",
    lanesTitle: "Main lanes",
    lanes: "From Japan to China, Russia and Central Asia",
    lanesNote:
      "We also offer ocean rates from Japan to China, Southeast Asia, Korea, Taiwan and Russia.",
    servicesTitle: "What we handle in Japan",
    services: [
      "Import and export customs clearance",
      "Destination handling for Japan-bound cargo: import clearance, inland delivery, DDP and DAP",
      "FCL, LCL, project cargo and bulk",
      "Container purchase in Japan for shipper-owned (SOC) moves",
    ],
    partnerTitle: "Working with us",
    partner: [
      {
        h: "Your customers stay yours",
        p: "We act for you on the Japan side and do not approach your customers.",
      },
      { h: "Clear local costs", p: "Japan-side charges are itemized in every quote." },
      {
        h: "Japan side checked first",
        p: "Send the cargo details before departure and we check clearance and delivery in Japan.",
      },
    ],
    langTitle: "Languages",
    langText: "Our Tokyo team works directly in Japanese, English, Chinese and Korean.",
    infoTitle: "Company information",
    info: { name: "Company", address: "Address", tel: "Phone", email: "Email" },
    ctaText: "Cargo to or from Japan? Tell us about it",
    ctaLink: "Contact form",
  },
  zh: {
    title: "MTL JAPAN 公司介绍",
    lead: "我们是东京的货运代理公司，在日本做进出口业务10年，目前已是美国、韩国、拉美和中国货代的日本端合作伙伴。",
    lanesTitle: "主要航线",
    lanes: "日本出口至中国、俄罗斯、中亚",
    lanesNote: "同时提供日本至中国、东南亚、韩国、台湾、俄罗斯的海运运价。",
    servicesTitle: "我们在日本的业务",
    services: [
      "进出口清关",
      "发往日本货物的目的港操作：进口清关、日本国内派送、DDP/DAP",
      "整箱、拼箱、项目货、散货",
      "为货主自有箱（SOC）在日本采购集装箱",
    ],
    partnerTitle: "合作原则",
    partner: [
      { h: "贵司的客户始终是贵司的", p: "我们只负责日本端操作，不主动联系贵司客户。" },
      { h: "日本当地费用透明", p: "每份报价都会列明日本端费用。" },
      { h: "先确认日本端", p: "货物出发前发来品名和收货人信息，我们先确认日本端的清关和派送。" },
    ],
    langTitle: "沟通语言",
    langText: "东京团队可直接用日语、英语、中文、韩语对接。",
    infoTitle: "公司信息",
    info: { name: "公司名称", address: "地址", tel: "电话", email: "邮箱" },
    ctaText: "有发往日本或从日本出口的货物，欢迎咨询",
    ctaLink: "咨询表单",
  },
  ko: {
    title: "MTL JAPAN 회사 소개",
    lead: "도쿄의 포워더입니다. 일본 수출입을 10년째 하고 있고, 미국·한국·중남미·중국 포워더의 일본 측 파트너를 맡고 있습니다.",
    lanesTitle: "주력 노선",
    lanes: "일본발 중국·러시아·중앙아시아",
    lanesNote: "일본발 중국·동남아·한국·대만·러시아향 해상운임도 제공합니다.",
    servicesTitle: "일본에서 하는 일",
    services: [
      "수출입 통관",
      "일본행 화물의 현지 처리: 수입 통관, 일본 내 배송, DDP·DAP",
      "FCL·LCL·프로젝트 화물·벌크",
      "화주 소유 컨테이너(SOC)용 일본 내 컨테이너 구매",
    ],
    partnerTitle: "함께 일하는 방식",
    partner: [
      {
        h: "귀사 고객은 귀사의 고객입니다",
        p: "일본 측 업무만 맡고, 귀사 고객에게 직접 영업하지 않습니다.",
      },
      { h: "현지 비용은 투명하게", p: "일본 측 비용은 견적서에 항목별로 적어 드립니다." },
      {
        h: "일본 측을 먼저 확인",
        p: "출항 전에 화물 정보를 보내 주시면 일본 통관과 배송을 먼저 확인해 드립니다.",
      },
    ],
    langTitle: "대응 언어",
    langText: "도쿄 팀이 일본어·영어·중국어·한국어로 직접 소통합니다.",
    infoTitle: "회사 정보",
    info: { name: "상호", address: "주소", tel: "전화", email: "이메일" },
    ctaText: "일본행·일본발 화물이 있으시면 문의해 주세요",
    ctaLink: "문의하기",
  },
};

const ADDRESS: Record<Lang, string> = {
  ja: "〒102-0073 東京都千代田区九段北1-4-4 九段下ASNビル7F",
  en: "7F Kudanshita ASN Bldg., 1-4-4 Kudankita, Chiyoda-ku, Tokyo 102-0073, Japan",
  zh: "〒102-0073 东京都千代田区九段北1-4-4 九段下ASN大厦7楼",
  ko: "〒102-0073 도쿄도 지요다구 구단키타 1-4-4 구단시타 ASN빌딩 7층",
};
const TEL: Record<Lang, string> = {
  ja: "03-6284-4506",
  en: "+81-3-6284-4506",
  zh: "+81-3-6284-4506",
  ko: "+81-3-6284-4506",
};

export const Route = createFileRoute("/company")({
  validateSearch: z.object({ lang: z.enum(LANGS).optional().catch(undefined) }),
  head: () =>
    seoHead({
      title: "MTL JAPAN 会社案内 — Logisight",
      description:
        "東京のフォワーダー MTL JAPAN の会社案内。日本発 中国・ロシア・中央アジア向けを主要航路に、輸出入通関・日本側の現地対応を日本語・英語・中国語・韓国語で行います。",
      path: "/company",
    }),
  component: CompanyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="border-l-[3px] border-[#0b2d52] pl-2.5 text-[16px] font-bold text-[#0b2d52]">
        {title}
      </h2>
      <div className="mt-3 text-[14px] leading-[1.85] text-[#2c333b]">{children}</div>
    </section>
  );
}

function CompanyPage() {
  const { lang: q } = Route.useSearch();
  const lang: Lang = q ?? "ja";
  const c = COPY[lang];

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "MTL JAPAN 会社案内" }]}
      title={c.title}
    >
      <div lang={lang} className="max-w-[760px] pb-4">
        <nav aria-label="Language" className="mt-5 flex flex-wrap gap-1.5">
          {LANGS.map((l) => (
            <Link
              key={l}
              to="/company"
              search={l === "ja" ? {} : { lang: l }}
              aria-current={l === lang ? "page" : undefined}
              className={
                l === lang
                  ? "border border-[#0b2d52] bg-[#0b2d52] px-3 py-1 text-[12.5px] font-medium text-white"
                  : "border border-[#ccd2d9] bg-white px-3 py-1 text-[12.5px] text-[#2c333b] hover:border-[#0b2d52]"
              }
            >
              {LANG_LABEL[l]}
            </Link>
          ))}
        </nav>

        <p className="mt-5 text-[15px] leading-[1.9] text-[#22282f]">{c.lead}</p>

        <Section title={c.lanesTitle}>
          <p className="text-[17px] font-bold text-[#0b2d52]">{c.lanes}</p>
          <p className="mt-1 text-[13.5px] text-[#4a5462]">{c.lanesNote}</p>
        </Section>

        <Section title={c.servicesTitle}>
          <ul className="list-disc space-y-1.5 pl-5">
            {c.services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Section>

        <Section title={c.partnerTitle}>
          <dl className="space-y-3">
            {c.partner.map((p) => (
              <div key={p.h}>
                <dt className="font-semibold text-[#1a1f26]">{p.h}</dt>
                <dd>{p.p}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title={c.langTitle}>
          <p>{c.langText}</p>
        </Section>

        <Section title={c.infoTitle}>
          <dl className="grid grid-cols-[92px_1fr] gap-x-4 gap-y-2 text-[13.5px]">
            <dt className="text-[#6b7683]">{c.info.name}</dt>
            <dd>{INFO_NAME}</dd>
            <dt className="text-[#6b7683]">{c.info.address}</dt>
            <dd>{ADDRESS[lang]}</dd>
            <dt className="text-[#6b7683]">{c.info.tel}</dt>
            <dd>
              <a className="underline hover:text-[#0b2d52]" href="tel:+81362844506">
                {TEL[lang]}
              </a>
            </dd>
            <dt className="text-[#6b7683]">{c.info.email}</dt>
            <dd>
              <a className="underline hover:text-[#0b2d52]" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            </dd>
          </dl>
        </Section>

        <div className="mt-9 border border-[#d5d9de] bg-[#f7f9fb] px-5 py-4">
          <p className="text-[14px] text-[#22282f]">{c.ctaText}</p>
          <Link
            to="/contact"
            search={{ from: "company" }}
            className="mt-2 inline-block bg-[#0b2d52] px-4 py-2 text-[13.5px] font-medium text-white hover:bg-[#0f3a6a]"
          >
            {c.ctaLink} →
          </Link>
        </div>
      </div>
    </JpPage>
  );
}
