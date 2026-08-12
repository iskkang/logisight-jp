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
 *
 * ■ 外部の広告は別ウィンドウで開く
 * 出稿主のサイトへ読者を引き渡さない。この媒体の記事を読んでいた画面はそのまま
 * 残し、広告は別のウィンドウに出す。読んでいた場所から連れ去られない、という
 * 一点で「記事と広告は別のものだ」と伝わる。
 *
 * 出稿主が MTL であっても他社であっても同じ扱いにする。自社のときだけ滑らかに
 * 遷移させると、その差そのものが「ここは自社寄りだ」という表示になる。
 * 中立であることは方針として書くものではなく、挙動として同じであることで示す。
 */

/** 別ウィンドウの大きさ。画面より大きくしない。 */
const POPUP = { w: 1024, h: 768 };

/**
 * 別ウィンドウで開く。開けたら true。
 *
 * features に noopener を入れると、開けた場合でも戻り値が null になる。
 * それだと「ブロックされた」と区別がつかず、ブラウザ既定の遷移も走って
 * ウィンドウが二重に開く。開いてから opener を切る。
 */
function openPopup(href: string): boolean {
  const w = Math.min(POPUP.w, window.screen.availWidth);
  const h = Math.min(POPUP.h, window.screen.availHeight);
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
  const win = window.open(
    href,
    "logisight_ad", // 名前を固定して、押すたびにウィンドウが積み上がらないようにする
    `width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)},resizable=yes,scrollbars=yes`,
  );
  if (!win) return false; // ポップアップブロック
  win.opener = null;
  win.focus(); // 既に開いていて背面にいるときのため
  return true;
}
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
  // 別ウィンドウで開くかどうかは、遷移先が自社かどうかで変えない。
  // 今の出稿主は MTL 自身で、遷移先も自サイトの問い合わせページである。
  // ここだけ滑らかに遷移させると、他社の広告との差がそのまま
  // 「自社の広告は特別扱いだ」という表示になる。挙動は揃える。
  //
  // rel は別の話で、こちらは分ける。sponsored は「外部への広告リンク」を
  // 検索エンジンに伝える印なので、自分のページに付ける意味がない。
  // noreferrer も自サイト内では参照元を無駄に落とすだけである。
  const external = /^https?:\/\//.test(href);
  const rel = external ? "noopener noreferrer sponsored" : "noopener";
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
        <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-[#8a929c]">
          <span className="font-bold tracking-wide">広告</span>
          {/* 押す前に、別ウィンドウが開くと分かるようにしておく(WCAG 3.2.5)。 */}
          <span className="font-normal">別ウィンドウで開きます</span>
        </div>
        <a
          href={href}
          // href と target は残す。中クリック・Ctrl+クリック・クローラは
          // これを見るし、ポップアップが塞がれたときの逃げ道にもなる。
          target="_blank"
          rel={rel}
          className={cls}
          onClick={(e) => {
            // 修飾キー付き・左ボタン以外は利用者の指定なので横取りしない。
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            // 開けたときだけ既定の遷移を止める。塞がれたら target="_blank" に任せる。
            if (openPopup(href)) e.preventDefault();
          }}
        >
          {img}
        </a>
      </div>
    </aside>
  );
}
