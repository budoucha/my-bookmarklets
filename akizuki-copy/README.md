# 秋月電子 商品情報TSVコピー ブックマークレット

秋月電子通商の商品ページから、商品情報をタブ区切り形式（TSV）でクリップボードにコピーするためのブックマークレット。

## 概要

秋月電子の商品ページを開いた状態でブックマークレットを実行すると、以下の情報を取得して1行のTSVとしてコピーする。

取得項目：

1. 型番
2. 商品ページURL
3. 商品名
4. マニュアルURL
5. データシートURL

出力例：

```tsv
AE-XCL103-5V0	https://akizukidenshi.com/catalog/g/g115097/	XCL103使用5V出力昇圧DCDCコンバーターキット	https://akizukidenshi.com/goodsaffix/AE-XCL103_20220802_web.pdf	https://akizukidenshi.com/goodsaffix/XCL102-103-j.pdf
```

Excel、Googleスプレッドシート、LibreOffice Calc などにそのまま貼り付けると、タブ区切りで列に分かれる。

## ブックマークレット

以下のコードをブックマークのURL欄に登録する。

```javascript
javascript:(async()=>{const abs=u=>u?new URL(u,location.href).href:"";const text=s=>(s||"").replace(/\s+/g," ").trim();const body=text(document.body.innerText);const h1=text(document.querySelector("h1")?.innerText)||text(document.title);const productName=h1.replace(/^\[\d+\]\s*/,"").replace(/:\s*.*$/,"");const model=(body.match(/型番\s+([^\s]+)/)||body.match(/型番[:：]\s*([^\s]+)/)||[])[1]||"";const links=[...document.querySelectorAll("a")].map(a=>({t:text(a.innerText||a.textContent),href:abs(a.getAttribute("href"))})).filter(x=>x.href);const manual=links.find(x=>/マニュアル|説明書|取扱説明書/i.test(x.t))?.href||"";const datasheet=links.find(x=>/データシート|参考資料/i.test(x.t))?.href||"";const row=[model,location.href,productName,manual,datasheet].join("\t");try{await navigator.clipboard.writeText(row);alert("コピーした:\n"+row)}catch(e){prompt("コピーして:",row)}})();
```

## 登録手順

### Chrome / Edge の場合

1. ブックマークバーを表示する

   * Windows / Linux: `Ctrl + Shift + B`
   * macOS: `Command + Shift + B`

2. 適当なページをブックマークする

3. 作成したブックマークを右クリックして、`編集` を選ぶ

4. 名前を変更する
   例：

   ```text
   秋月TSVコピー
   ```

5. URL欄の中身を削除し、上記のブックマークレットを貼り付ける

6. 保存する

## 使い方

1. 秋月電子の商品ページを開く
   例：

   ```text
   https://akizukidenshi.com/catalog/g/g115097/
   ```

2. ブックマークバーの `秋月TSVコピー` をクリックする

3. 成功すると、取得したTSVがクリップボードにコピーされる

4. Excel や Google スプレッドシートなどに貼り付ける

## 出力形式

TSVの列順は以下の通り。

|  列 | 内容        |
| -: | --------- |
|  1 | 型番        |
|  2 | 商品ページURL  |
|  3 | 商品名       |
|  4 | マニュアルURL  |
|  5 | データシートURL |

マニュアルまたはデータシートが見つからない場合、その列は空欄になる。

## 取得ロジック

### 型番

ページ本文から以下のような表記を探して取得する。

```text
型番 AE-XCL103-5V0
型番: AE-XCL103-5V0
型番：AE-XCL103-5V0
```

### 商品名

ページ内の `h1` 要素、またはページタイトルから取得する。

秋月電子の商品ページでは、商品名の前に商品コードが付く場合がある。

例：

```text
[115097]XCL103使用5V出力昇圧DCDCコンバーターキット
```

この場合、先頭の `[115097]` を削除して商品名として扱う。

### マニュアルURL

ページ内リンクのテキストに以下の語を含むものを探す。

```text
マニュアル
説明書
取扱説明書
```

最初に見つかったリンクをマニュアルURLとして扱う。

### データシートURL

ページ内リンクのテキストに以下の語を含むものを探す。

```text
データシート
参考資料
```

最初に見つかったリンクをデータシートURLとして扱う。

## 注意事項

このブックマークレットは、秋月電子の商品ページのHTML構造に依存している。

そのため、秋月電子側のページ構造や文言が変更された場合、以下の情報が取得できなくなる可能性がある。

* 型番
* 商品名
* マニュアルURL
* データシートURL

取得できない項目がある場合は、正規表現やリンクテキストの判定条件を修正する必要がある。

## 既知の制限

* 一度に取得できるのは、現在開いている1商品ページのみ
* 一覧ページからの一括取得には対応していない
* 複数のマニュアルやデータシートがある場合、最初に見つかったものだけを取得する
* ブラウザやページの状態によっては、クリップボードへの自動コピーが失敗する場合がある
* コピーに失敗した場合は、代わりに `prompt` が表示される

## 拡張案

今後、必要に応じて以下のような機能を追加できる。

* 複数リンクの取得
* 商品コードの取得
* 価格の取得
* 在庫数の取得
* JANコードの取得
* 一覧ページからの商品情報一括取得
* CSV / JSON 形式での出力
* Chrome拡張機能化
* ページ上へのコピー用ボタン追加

## ライセンス

個人利用・改変自由。
