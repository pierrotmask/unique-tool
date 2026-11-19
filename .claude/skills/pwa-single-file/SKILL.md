---
name: pwa-single-file
description: 1ファイルのWebアプリ（HTML/CSS/JS・localStorage保存）を、同じリポジトリの他ツールに影響を与えずにPWA化し、既存ユーザーのデータを守りながら公開する手順。「PWA化して」「ホーム画面に追加できるようにして」「オフラインで使えるようにして」と頼まれたときに使う。
---

# 1ファイルWebアプリのPWA化

## 0. 最初に説明して合意をとる
- メリット：ホーム画面から全画面で起動、オフライン動作、自動更新、保存データが消されにくい
- デメリット（必ず伝える）：
  - iPhone は Safari 版とホーム画面版の保存領域が別。そのままではデータが引き継がれないため、移行の仕組みを作る
  - ブラウザ版も引き続き使える。URL は変えない（変えるとデータが失われる）

## 1. ファイル構成（他ツールと同じリポジトリでも衝突しない名前にする）
アプリ名を `<app>` として、すべて同じ接頭辞にそろえる：
- `<app>.html`（本体。URL は変えない）
- `<app>.webmanifest`
- `<app>-sw.js`
- `<app>-icon-192.png`、`<app>-icon-512.png`（maskable 兼用）、`<app>-apple-touch-icon.png`（180px）

## 2. manifest
- `id` と `start_url` は `./<app>.html`、`scope` は `./<app>`（他ツールを含めない）
- `display: standalone`、`lang`、`short_name`（ホーム画面用の短い名前）
- `background_color` と `theme_color` はダーク系の色にする（Android のスプラッシュとナビゲーションバーが白くならない）
- `icons` は 192／512／512 maskable
- `shortcuts`：よく使うタブを `?tab=xxx` で開けるようにする

## 3. HTML の head
- `<link rel="manifest">`、`apple-touch-icon`、`apple-mobile-web-app-capable` / `-title` / `-status-bar-style`
- `theme-color` はライト用とダーク用を `media="(prefers-color-scheme: …)"` で2つ置く（上下のシステムバーまで色を合わせる）
- `viewport-fit=cover` を指定し、`env(safe-area-inset-*)` で余白をとる

## 4. サービスワーカー（担当範囲を自アプリだけに限る）
- 登録は `register('<app>-sw.js', {scope:'./<app>'})`。http/https で開いたときだけ（file:// では登録しない）
- `fetch` では自アプリのファイル（パス名が `/<app>…`）以外は素通りさせる
- HTML はネット優先：`cache:'no-store'` で取得し、4秒以内に返らなければ保存版を表示
- アイコンなどは保存版を先に表示し、裏で更新する
- キャッシュ名は `<app>-<VERSION>` にし、activate のとき自アプリの古いキャッシュだけ消す。`skipWaiting` と `clients.claim` を使う

## 5. 自動更新（リロード不要で最新版に）
- 本体に `const APP_VERSION = 'YYYY.MM.DD.n'` を置く。SW の VERSION も毎回同じ値に上げる
- 起動3秒後と、アプリに戻ってきたとき（visibilitychange。10分に1回まで）に、`<app>.html?check=…` を取得して APP_VERSION を比べる
- 違っていれば、操作中でないとき（モーダル・シート・入力中でない）は保存してから再読み込みする。操作中なら「更新があります」バーを出す
- 再読み込み後は sessionStorage の合図を使って「✨ 最新版に更新しました」と表示する

## 6. データを守る
- `navigator.storage.persist()` を頼んで、保存データを消されにくくする
- iPhone の引き継ぎ：
  - Safari 版で、全ユーザー分のデータを `KKZ1:` + base64 の「引き継ぎコード」にしてコピーさせる（ファイルでの受け渡しも用意する）
  - ホーム画面版の初回起動時に、引き継ぎコードを貼り付ける画面を先に出す（使い方の案内より先）
  - 移行が済んだら、Safari 版は「ホーム画面のアプリで開いてください」の案内に切り替える。「今回だけSafariで使う」も残す
- 既存のバックアップ・復元機能は PWA でもそのまま動くことを確認する

## 7. インストールの案内（うるさくしない）
- Android/PC：`beforeinstallprompt` を保存しておき、「ホーム画面に追加」ボタンから出す
- iPhone：共有ボタン →「ホーム画面に追加」の手順をオーバーレイで表示する
- 案内カードは「あとで」「表示しない」で消せるようにする。歯車メニューにも残す。ホーム画面版では出さない
- 判定は `matchMedia('(display-mode: standalone)')` または `navigator.standalone`

## 8. 共有リンク（使っている場合）
- LINE などで送るリンクには `?openExternalBrowser=1` を付ける（アプリ内ブラウザで開かれないように）
- iPhone ではリンクがホーム画面版ではなく Safari で開くため、「リンクをコピー → アプリの『受け取る』に貼り付け」で取り込める受け口を作る

## 9. 公開（検索に出さない）
- 公開版の `<title>` の直前に、次の2行を入れてから unique-tool にコピーする：
  `<meta name="robots" content="noindex, nofollow">` と `<meta name="googlebot" content="noindex, nofollow">`
- 確認：noindex の2行以外は開発版と完全に同じであること（`diff`）
- unique-tool にブランチを作り、PR を出して取り込む

## 10. 総チェック（Playwright、http で配信して確認）
- `python3 -m http.server` で配信し、次を確認する：
  - SW の scope が自アプリだけで、他ツールのページを制御していない
  - manifest が取得できる
  - オフラインで再読み込みしても開ける
  - サーバー側の APP_VERSION を変えると自動更新され、データ（ストックなど）が残る。操作中は更新バーが出る
  - iPhone（`devices['iPhone 13']`）で案内カードが出る → 引き継ぎコードを作る → `navigator.standalone=true` の新しい環境に貼り付けて、データが一致する
  - Android 相当の環境で、インストールボタンから prompt が呼ばれる
  - ホーム画面版では案内が出ない。ショートカット `?tab=` が開ける
- ライト・ダーク・幅320px で表示崩れがなく、コンソールエラーが0であること
