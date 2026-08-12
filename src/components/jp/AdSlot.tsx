/**
 * 記事面の広告枠。
 *
 * ■ 「広告」表示は必須
 * この媒体は MTL Shipping Agency が運営しており、出稿主も MTL である。
 * 自社媒体に自社広告を載せる形なので、景品表示法のステマ規制(2023年10月施行)の
 * 対象になる。広告であることが分かる表示を、広告のすぐ横に置かなければならない。
 * フッターの運営者表記だけでは足りない。ラベルは任意項目にしない。
 *
 * ■ 置き場所
 * ページ最上部には置かない。最初に目に入るものが広告だと、統計媒体ではなく
 * 運営会社のコーポレートサイトとして読まれる。この媒体の値は「出典を明記した
 * 公的統計」にあり、そこを自分で削ることになる。
 * 読者が見に来た数字を先に見せ、節の変わり目に置く。
 *
 * ■ 大きさ
 * 本文幅(1088px)いっぱいに広げない。今の素材は 2.28:1 で、そのまま出すと
 * 高さ 477px — ノートPCの画面の半分を占め、主要指標の表より大きくなる。
 * 上限幅を置いて 860x377 に収める。3.9:1 の素材に差し替えたら上限は外してよい。
 *
 * 高さを比率で先に確保するので、読み込み中に下の記事が飛び跳ねない。
 * 画面が狭いときは上限に届かないので、そのまま横いっぱいに出る。
 */
export function AdSlot({
  href,
  src,
  alt,
  ratio = 1600 / 410,
  maxWidth,
}: {
  href: string;
  src: string;
  alt: string;
  /** 素材の縦横比。差し替えで比率が変わったらここを直す。 */
  ratio?: number;
  /** 表示幅の上限(px)。縦長の素材が画面を占めるのを防ぐ。 */
  maxWidth?: number;
}) {
  return (
    <aside className="mt-8" aria-label="広告">
      <div className="mx-auto" style={maxWidth ? { maxWidth } : undefined}>
        <div className="mb-1.5 text-[11px] font-bold tracking-wide text-[#8a929c]">広告</div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block border border-[#e2e6ea] transition-opacity hover:opacity-90"
        >
          <img
            src={src}
            alt={alt}
            className="block w-full"
            style={{ aspectRatio: String(ratio) }}
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    </aside>
  );
}
