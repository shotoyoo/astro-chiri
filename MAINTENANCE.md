# やまなみコーラスクラブ HP 更新ガイド

この文書は、Web サイトの表示内容を更新する人向けの手順書です。コマンドは、特に記載がない限りリポジトリのルート（`astro-chiri` ディレクトリ）で実行します。

## 最初に

初回だけ、Node.js と pnpm を用意して依存パッケージをインストールします。

```bash
pnpm install
```

編集結果は次のコマンドで確認できます。

```bash
pnpm dev
```

表示された URL（通常は `http://localhost:4321`）をブラウザで開いてください。編集後、公開前には次も実行します。

```bash
pnpm build
```

`dist/` はビルド時に生成されるため、直接編集しません。

## 表示内容と編集ファイルの対応表

| 訪問者に見える情報                                   | 編集するファイル                                    | 補足                                                                                                |
| ---------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| サイト名、ヘッダー名、サイト説明、フッターの団体名   | `src/config.ts`                                     | `site.title`、`site.description`、`site.author` を編集します。                                      |
| トップページ冒頭の短い紹介文                         | `src/content/about/about.md`                        | Markdown で記述します。本文を空にすると表示されません。                                             |
| トップページの「お知らせ」                           | `src/content/notices/home.md`                       | Markdown で記述します。                                                                             |
| 音源のタイトル、YouTube ID、日付                     | `src/content/audio/audio.csv`                       | すべての音源を一元管理する台帳です。通常は後述のアップロードスクリプトが自動追記します。            |
| 「最近の音」の候補                                   | `src/content/audio/recently.csv`                    | `audio.csv` の ID と表示用の説明を指定します。行頭が `#` の行は非表示です。                         |
| 「ピックアップ過去音源」の候補                       | `src/content/audio/pickup.csv`                      | `audio.csv` の ID と表示用の説明を指定します。トップには候補からランダムに 1 件表示されます。       |
| 「読むもの」にある「当団について」                   | `src/content/posts/当団について.md`                 | Markdown で記述します。このページは一覧の先頭に固定されます。                                       |
| 「読むもの」にある「リンク集」                       | `src/content/posts/リンク集.md`                     | Markdown で記述します。                                                                             |
| 演奏予定・過去の演奏会                               | `src/content/history/concert.csv`                   | 表示ページの枠組みは `src/content/posts/演奏予定・演奏記録.mdx` です。通常は CSV だけを編集します。 |
| レパートリー（曲名、作曲者、作詞者）                 | `src/content/history/repertoire.csv`                | 演奏会の曲目も、この CSV の `ID` を参照します。                                                     |
| 「読むもの」の新しいページ                           | `src/content/posts/<ページ名>.md`                   | 既存ページと同じ frontmatter を付けます。ファイル名が `_` で始まるものは公開されません。            |
| 440 Hz / 442 Hz のクイズ                             | `src/pages/quiz.astro`                              | トップの `???` リンク先です。コードを扱う人向けです。                                               |
| トップページの見出し、各ブロックの順序、`???` リンク | `src/pages/index.astro`                             | コードを扱う人向けです。                                                                            |
| 共通の見た目（色、文字、余白）                       | `src/styles/global.css`、`src/styles/post.css`      | サイト全体へ影響するため、変更後は複数ページを確認します。                                          |
| ファビコン                                           | `public/favicon.svg`、`public/apple-touch-icon.png` | 同じパス・ファイル名で差し替えます。                                                                |
| SNS シェア時の標準画像                               | `public/og/yamanami-logo.jpg`                       | 参照設定は `src/components/layout/BaseHead.astro` にあります。                                      |
| 音源動画の背景画像                                   | `youtube_related/image/yamanami_icon_round.png`     | アップロード時に 1920×1080 の動画へ配置されます。                                                   |

### CSV 編集時の注意

CSV の先頭行（列名）は削除しないでください。値にカンマを含める場合は、その値全体を半角の二重引用符 `"` で囲みます。Excel や LibreOffice で保存する場合は、UTF-8 の CSV を選びます。

#### 音源定義 CSV

`src/content/audio/audio.csv` が全音源の台帳です。列は次の順です。

```text
id,title,youtubeId,date
```

- `id`: 行ごとに重複しない名前
- `title`: 画面に表示する曲名など
- `youtubeId`: YouTube URL 末尾の 11 文字の動画 ID
- `date`: `YYYY-MM-DD` 形式の日付

#### トップページへの掲載指定 CSV

`src/content/audio/recently.csv` と `src/content/audio/pickup.csv` は、トップページの各欄に表示する候補を指定します。

```text
id,description
```

- `id`: `audio.csv` に存在する音源 ID
- `description`: 「練習の様子」など、その欄で表示する説明

一時的に候補から外したい行は、行頭に `#` を付けます。音源定義は `audio.csv` に残るため、レパートリーページからの再生には影響しません。

#### レパートリー CSV

```text
ID,title,composer,lyricist,audioId
```

- `ID`: 曲を識別する短いコード。既存行と重複させません。
- 編曲作品は、検索・並び替えしやすいように作曲者名ではなく曲名へ `(arr.)` を付けます。
- `audioId`: その曲の横に再生ボタンを出す場合、`audio.csv` の代表音源 ID を指定します。音源がなければ空欄にします。

#### 演奏会 CSV

```text
ID,year,month,date,name,venue,songs,url
```

- `ID`: 演奏会を識別するコード
- `year`、`month`、`date`: 開催日
- `name`、`venue`: 演奏会名と会場
- `songs`: `repertoire.csv` の `ID` をカンマ区切りで並べます。複数曲の場合は値全体を `"` で囲みます。
- `url`: 詳細ページや動画の URL。なければ空欄で構いません。

## 音源を YouTube へアップロードする

### この処理で行われること

`youtube_related/upload_pending_audio_to_youtube.sh` が、未処理の全音源に対して次を順番に行います。

1. 背景画像と音源から 1920×1080 の MP4 を一時作成
2. YouTube へ「限定公開」でアップロード
3. 動画情報を `src/content/audio/audio.csv` に追記
4. 音源 ID と説明を `src/content/audio/recently.csv` に追記
5. 元音源を `youtube_related/for_youtube_upload/done/` へ移動
6. 一時動画とログを削除

途中で失敗した音源は `done/` へ移動されません。スクリプトはアップロード実行時に YouTube の認証トークンを削除するため、実行ごとにブラウザでの OAuth 認証が必要です。

### 事前準備

- `ffmpeg` が実行できること
- `youtube_related/youtubeuploader.exe` と `youtube_related/credential/client_secrets.json` が用意されていること
- YouTube へアップロードできる Google アカウントで認証できること

アップロードしたい音源を、サブフォルダではなく次のディレクトリ直下へ置きます。

```text
youtube_related/for_youtube_upload/
```

対応形式は `.m4a`、`.mp3`、`.wav`、`.aac`、`.flac`、`.ogg` です。

ファイル名がそのまま YouTube とサイト上のタイトルになります。録音日も正しく登録するため、次の形式を推奨します。

```text
YYYYMMDD_曲名.m4a
```

例: `20261018_O nata lux.m4a`

ファイル名が `YYYYMMDD_`、`YYYYMMDD-` または `YYYYMMDD ` で始まる場合、その日付が CSV に登録されます。それ以外は実行日になります。同じ名前のファイルがすでに `done/` にある場合は実行できません。先に名前を変えるか、重複でないことを確認してください。

### 実行前に対象を確認する

```bash
cd youtube_related
./upload_pending_audio_to_youtube.sh --list
```

ここに表示される全ファイルが 1 回の実行対象です。特定の音源だけを処理したい場合は、他の未処理音源を一時的に別の場所へ移してください。

### アップロードする

引き続き `youtube_related` ディレクトリで実行します。

```bash
./upload_pending_audio_to_youtube.sh "2026年10月18日の練習"
```

説明を省略した場合は `練習の様子` になります。

```bash
./upload_pending_audio_to_youtube.sh
```

実行中に認証用 URL やブラウザが表示されたら、対象の Google アカウントで許可します。アップロード中はターミナルを閉じないでください。

### 完了確認

実行後、次を確認します。

- ターミナルに各音源の `Video ID` と `https://youtu.be/...` が表示された
- 元音源が `youtube_related/for_youtube_upload/done/` に移動した
- `src/content/audio/audio.csv` の末尾に同じ動画 ID の音源定義が追加された
- `src/content/audio/recently.csv` の末尾に同じ音源 ID の掲載指定が追加された
- `pnpm dev` でトップページの「最近の音」に再読み込みを繰り返すと新音源が現れる
- `pnpm build` が成功する

「最近の音」は登録された候補からランダムに 1 件だけ表示されるため、1 回の表示で新音源が出ないことがあります。

### 失敗したとき

- 認証エラー（`invalid_grant` など）: もう一度実行し、新しく表示される認証手順を完了します。
- `Required command not found: ffmpeg`: ffmpeg をインストールし、ターミナルから `ffmpeg -version` が通るようにします。
- `A file with the same name already exists in done`: `done/` と未処理側のファイルを確認し、二重アップロードでないことを確かめてから名前の衝突を解消します。
- YouTube へのアップロード成功後に処理が止まった可能性がある: 再実行する前に、表示された動画 ID、YouTube Studio、`audio.csv`、`recently.csv`、`done/` を確認します。確認せず再実行すると、同じ音源を二重アップロードするおそれがあります。

`convert_to_mp4.sh` と `upload_audio_to_youtube.sh` は過去の個別処理用コードです。通常運用では使わず、`upload_pending_audio_to_youtube.sh` を使用してください。

## 公開前の確認

```bash
pnpm build
```

ビルド成功後、変更したファイルだけが意図どおりか `git diff` で確認し、GitHub へ反映します。このリポジトリは Netlify 用のビルド設定を持ち、公開時には `pnpm run build` が実行されます。認証情報である `client_secrets.json` や `request.token` の内容は、文書、Issue、チャットなどへ貼り付けないでください。
