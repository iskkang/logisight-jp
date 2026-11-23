# 編集記事(MTL Japan 編集部)

このフォルダの `<slug>.json` が main に入ると、GitHub Actions(`publish-jp-posts.yml`)が
`maritime_news`(lang=ja)に書き込み、/news と /article/<slug> に載る。
**main へのマージが編集者の検収**。PR の段階では検証だけが走る。

```json
{
  "slug": "nagoya-record-rain-2026-09",
  "title": "名古屋で観測史上最大の1時間雨量、物流に影響",
  "summary": "一覧と記事冒頭に出る2〜3文の要旨。",
  "category": "物流",
  "tags": ["気象リスク", "名古屋"],
  "published_at": "2026-09-10T09:00:00+09:00",
  "image_url": "/news-images/nagoya-rain-hero.png",
  "image_source": "MTL Japan 作成(気象庁データ)",
  "image_credit": null,
  "content": "## 見出し\n\n段落。\n\n![1時間雨量 104.5mm(名古屋、9月8日)](/news-images/nagoya-rain.png)\n出典: 気象庁"
}
```

- `category`: 海上・航空・港湾・鉄道・貿易・物流 のどれか。
- `content`: 見出し(`## `)・段落・箇条書き(`- `)・図版。空行で区切る。
- 図版: 1行目 `![代替テキスト](URL)`、2行目(任意)`出典: …`。URL は `/news-images/…`(`public/news-images/` に置いた画像)か https。
- 画像は自前で作った図か、利用規約で再利用が認められた公的機関の図だけ。報道写真は使わない。
- 数字・事実は出典どおり。因果の断定は避ける(「〜と整合」「〜とみられる」)。
- 同じ slug のファイルを直して再マージすると記事が更新される。ファイルを消しても記事は消えない。
