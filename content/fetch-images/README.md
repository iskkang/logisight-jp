# 画像の取り寄せ票

編集部の作業環境は Canva などのダウンロード URL に直接つながらない。ここに票を置いて
作業ブランチ(main 以外)に push すると、`fetch-images.yml` が画像を取って
`public/news-images/` に置き、同じブランチにコミットする。取れた票は消える。

```json
{ "url": "https://export-download.canva.com/…", "path": "/news-images/<slug>-photo.jpg" }
```

- ダウンロード URL は数時間で失効する。票を作ったらすぐ push する。
- `path` は `/news-images/` 直下の .png / .jpg / .webp。既にあるファイルは上書きしない。
- 中身は先頭バイトで確かめる(拡張子と中身が違えば失敗)。5MB まで。
- 取得後は `git pull --rebase` してから作業を続ける。画像が揃う前に main へ入れると掲載が止まる。
- AI で作った画像には本文で「出典: イメージ画像(AI生成)」と書く。実際の出来事を写真のように見せる用途には使わない。
