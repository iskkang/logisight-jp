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
 * ページ最上部にも本文の流れの中にも置かない。サイドバーの「データの出典」の下、
 * つまり記事とデータを読み終えた先に置く。
 *
 * 最初に目に入るものが広告だと、統計媒体ではなく運営会社のコーポレートサイトとして
 * 読まれる。この媒体の値は「出典を明記した公的統計」にあり、そこを自分で削ることに
 * なる。本文幅に置いたときは 858x377 になり、主要指標の表(179px)の倍以上を占めた。
 *
 * ■ 大きさ
 * サイドバー幅(300px)に収まる。今の素材は 2.28:1 なので 300x132 で出る。
 * 高さを比率で先に確保するので、読み込み中に下が飛び跳ねない。
 * 画面が狭いとサイドバーは本文の下へ回り、そのときは横いっぱいに出る。
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
  // 遷移先が自サイト内かどうかで扱いを変える。内部の問い合わせページに
  // target="_blank" を付けると別タブが増えるだけだし、rel="sponsored" は
  // 「外部の広告リンク」を検索エンジンに伝える印なので自分のページには付けない。
  const external = /^https?:\/\//.test(href);
  const cls = "block border border-[#e2e6ea] transition-opacity hover:opacity-90";
  const img = (
    <img
      src={src}
      alt={alt}
      className="block w-full"
      style={{ aspectRatio: String(ratio) }}
      loading="lazy"
      decoding="async"
    />
  );

  return (
    <aside className="mt-8" aria-label="広告">
      <div className="mx-auto" style={maxWidth ? { maxWidth } : undefined}>
        <div className="mb-1.5 text-[11px] font-bold tracking-wide text-[#8a929c]">広告</div>
        {external ? (
          <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={cls}>
            {img}
          </a>
        ) : (
          <a href={href} className={cls}>
            {img}
          </a>
        )}
      </div>
    </aside>
  );
}
