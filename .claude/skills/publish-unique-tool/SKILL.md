---
name: publish-unique-tool
description: 開発リポジトリ（例：my-first-app）で作った1ファイルWebアプリを、unique-tool リポジトリに検索エンジン除け（noindex）付きで更新・公開する手順。「更新して」「公開して」「いつも通り公開」「更新公開せよ」と頼まれたときに使う。
---

# unique-tool への更新・公開

## 前提
- 開発版：開発リポジトリの `index.html`（と PWA の場合は `<app>-sw.js`・`<app>.webmanifest`・アイコン）
- 公開版：unique-tool の `<app>.html`（他ツールと同じリポジトリ。ファイル名は接頭辞 `<app>` でそろえる）
- 公開版だけに noindex を入れる（「検索に引っかからないようにいつも通り」）

## 手順
1. **公開前に総チェックを済ませる**（`full-check` スキル）。失敗が残っていたら公開しない
2. **バージョンを上げる**（PWA の場合）
   - 本体の `const APP_VERSION = 'YYYY.MM.DD.n'` と、SW の `const VERSION` を**同じ値**にする
   - 日付が変わったら `YYYY.MM.DD.1` から。同じ日は n を増やす
3. **開発リポジトリにコミット・プッシュ**
   - 指定された開発ブランチにコミットする
   - README の機能説明も更新する
   - プッシュはネットワークエラーのとき、待ち時間を伸ばしながら最大4回までやり直す
4. **公開版を作る**（unique-tool 側）
   ```bash
   cd unique-tool && git fetch origin main && git checkout -B claude/<app>-<内容> origin/main
   sed 's|^<title>|<meta name="robots" content="noindex, nofollow">\n<meta name="googlebot" content="noindex, nofollow">\n<title>|' ../my-first-app/index.html > <app>.html
   cp ../my-first-app/<app>-sw.js .   # PWA の場合（manifest・アイコンも変えたらコピー）
   ```
5. **公開版を確認する**
   - `diff <(grep -v noindex <app>.html) ../my-first-app/index.html` の出力が空であること（noindex の2行以外は同じ）
   - `grep -c 'content="noindex, nofollow"' <app>.html` が `2` であること
6. **コミット → プッシュ → PR → 取り込み**
   - コミットメッセージは日本語でよい（例：「<アプリ名>: ○○を追加」）
   - PR の本文に書くこと：概要（何が変わったか）、確認（テスト結果を「何回試して何件」で）、バージョン、noindex を付けたこと
   - PR を作ったら取り込む（merge）。取り込みまでがユーザーの言う「公開」
7. **報告**（日本語・ですます調）
   - 最初の行に「何をして、どこに公開したか（PR番号・バージョン）」
   - 変わったこと（利用者目線で）／既存データが壊れないこと／確認したこと（数字で）
   - 気になる点・判断を任せたい点があれば最後に

## 注意
- 開発リポジトリは、指定された開発ブランチ以外にプッシュしない
- 公開版を直接編集しない（必ず開発版から作る）。別の場所で修正が必要になったら、まず開発版を直す
- テスト用の配信フォルダ（スクラッチパッドの `site/unique-tool/`）にも同じ公開版を置いておくと、http でのテスト（PWA・共有リンク）にそのまま使える
