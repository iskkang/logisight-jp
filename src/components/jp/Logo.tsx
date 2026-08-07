/**
 * ロゴ。カタカナ「ロジサイト」の下に英字 LOGISIGHT を組んだ日本版のマーク。
 *
 * 以前は CSS で二段に積んでいたが、字形そのものが作り込まれた画像に置き換えた。
 * 組み文字は字体・傾き・字間が意匠なので、フォントの合成では再現できない。
 *
 * 元画像は 1663x412 で 642KB あった。ヘッダーでは高さ 26px までしか使わないので、
 * 420px 幅に落として 48KB にしてある。等倍で 105x26 なので 2 倍密度の画面でも足りる。
 *
 * 白ヌキ版(public/jplogisight_logo_dark.png)は原寸のまま置いてある。
 * 今のヘッダー・フッターは白地なので使い道が無く、縮小版は作っていない。
 */
const RATIO = 420 / 105; // 画像の縦横比。高さから幅を出して CLS を防ぐ。

export function Logo({ height = 26, className = "" }: { height?: number; className?: string }) {
  return (
    <img
      src="/logo-jp.png"
      alt="ロジサイト LOGISIGHT"
      width={Math.round(height * RATIO)}
      height={height}
      style={{ height, width: "auto" }}
      className={`block ${className}`}
      // ヘッダーの最上部に出るので後回しにしない。
      loading="eager"
      decoding="async"
    />
  );
}
