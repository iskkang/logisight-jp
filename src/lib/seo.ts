// 전 라우트 메타 일원화 헬퍼. 입력 {title, description, path, image?, type?} →
// title·description·canonical·og·twitter 전체 세트를 반환한다. ABS(path)는 항상
// production 도메인 기준 — vercel.app 절대 금지.
// 사용: head: () => seoHead({ title, description, path: "/rates" })
//
// SITE_URL은 사이트 전역 도메인 단일 소스 — sitemap·__root·article·indexnow가 여기서 가져간다.
// 일본판은 jpn 서브도메인이 정본. 한국판(logisight.net)과 canonical이 섞이면
// 두 사이트가 같은 URL을 주장해 색인이 한쪽으로 몰린다.
export const SITE_URL = "https://jpn.logisight.net";
/** 스킴 없는 호스트 — IndexNow처럼 호스트만 받는 곳에서 사용. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const SITE_NAME = "Logisight";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

/** 경로(또는 절대 URL)를 production 절대 URL로 변환. */
export function abs(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

/** 한국판 정본 도메인. hreflang 상호 선언에만 쓴다. */
const KO_SITE_URL = "https://logisight.net";

export interface SeoInput {
  title: string;
  description: string;
  /** 페이지 자기 경로. 예: "/", "/rates", `/article/${slug}` */
  path: string;
  /** og:image. 경로/절대 URL 모두 허용. 생략 시 /og-default.jpg */
  image?: string | null;
  type?: "website" | "article";
  /**
   * 한국판에 같은 내용의 페이지가 있으면 그 경로. 있을 때만 hreflang을 낸다.
   *
   * 두 사이트는 같은 주제를 다른 언어로 낸다. 대응 페이지가 실제로 있는데
   * 서로를 가리키지 않으면, 구글이 한쪽만 골라 색인하거나 일본 이용자에게
   * 한국어 페이지를 보여줄 수 있다. 반대로 대응이 없는데 선언하면 404를
   * 가리키게 되므로 짝이 확실한 경로에만 붙인다.
   */
  koPath?: string;
}

/** TanStack Router head()가 반환할 { meta, links } 세트. 라우트별 head에서 펼쳐 사용. */
export function seoHead({ title, description, path, image, type = "website", koPath }: SeoInput) {
  const url = abs(path);
  const img = image ? abs(image) : DEFAULT_IMAGE;
  const links: Array<Record<string, string>> = [{ rel: "canonical", href: url }];
  if (koPath) {
    const ko = `${KO_SITE_URL}${koPath.startsWith("/") ? koPath : `/${koPath}`}`;
    // 키를 그대로 속성으로 내보내므로 소문자 hreflang 으로 쓴다.
    // hrefLang 이면 HTML에 그대로 나가는데, HTML 파서가 소문자로 접어주긴 해도
    // 규격대로 내는 편이 검사 도구에서 오해를 사지 않는다.
    links.push(
      { rel: "alternate", hreflang: "ja", href: url },
      { rel: "alternate", hreflang: "ko", href: ko },
      // ★ x-default 는 한국판이다.
      // 예전에는 이 도메인(일본판)을 가리켰는데, 한국판이 hreflang 을 한 줄도 내지 않아
      // 상호 선언이 성립하지 않았고 이 선언 전체가 무시되고 있었다. 한국판에 짝을 붙이면서
      // 양쪽 x-default 를 한국판으로 통일한다 —— 서로 다른 x-default 를 내면 그 모순 때문에
      // 다시 무시된다.
      { rel: "alternate", hreflang: "x-default", href: ko },
    );
  }
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: img },
      // 일본어권 이용자에게 배분되도록 지역까지 밝힌다.
      { property: "og:locale", content: "ja_JP" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
    ] as Array<Record<string, string>>,
    links,
  };
}

/* ===================== JSON-LD 스키마 빌더 (GEO) ===================== */
// SSR HTML에 출력되는 페이지 스키마. 모든 수치는 호출부에서 실데이터로 바인딩한다.

// 발행자는 Logisight — 운영 법인(MTL Shipping Agency)은 parentOrganization으로 __root에서 공시한다.
const PUBLISHER = {
  "@type": "Organization",
  name: SITE_NAME,
  logo: { "@type": "ImageObject", url: `${SITE_URL}/logisight_logo.svg` },
};

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  /** 자기 경로. mainEntityOfPage = ABS(path) */
  path: string;
  datePublished?: string | null;
  dateModified?: string | null;
  image?: string | null;
}

/** 데이터/분석 페이지용 Article 스키마. */
export function articleSchema(i: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: i.headline,
    description: i.description,
    image: [i.image ? abs(i.image) : DEFAULT_IMAGE],
    datePublished: i.datePublished ?? undefined,
    dateModified: i.dateModified ?? i.datePublished ?? undefined,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: PUBLISHER,
    mainEntityOfPage: abs(i.path),
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQPage 스키마. items는 실데이터로 답할 수 있는 질문만 포함(빈 배열이면 호출부에서 생략). */
export function faqPageSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
