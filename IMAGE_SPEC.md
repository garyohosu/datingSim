# 放課後シグナル 画像制作仕様書

Version: 1.0
Last Updated: 2026-03-10

> **使い方:** このファイルの内容をそのまま Genspark に貼り付けて使用してください。

---

## 1. 目的

静的Web恋愛シミュレーションゲーム「放課後シグナル」で使用する画像素材一式を制作してください。

必要素材は以下です。

- タイトル用キービジュアル
- ヒロイン3名の基本立ち絵
- 各ヒロインの表情差分
- 背景画像
- 重要イベントCG

可能であれば、**すべての画像を指定フォルダ構成でまとめ、ZIP形式で納品**してください。

---

## 2. 全体の絵柄・方向性

- 日本の高校を舞台にしたオリジナル恋愛シミュレーションゲーム
- 90年代〜2000年代初期の学園恋愛シミュレーションゲーム風
- 清潔感のあるアニメ調
- 明るくノスタルジック
- オリジナルキャラクターデザイン
- 過度な露出なし
- 過度な装飾なし
- 既存アニメ・既存ゲームのキャラに似せない
- 広告掲載サイトでも使いやすい安全な内容
- 制服は現代日本の高校制服ベース
- 全体として統一感を重視

---

## 3. 出力条件

- ファイル形式: `.webp` を優先
- 背景透過が必要な立ち絵・表情差分は可能なら透過PNGまたは透過対応画像
- 背景画像・イベントCGは通常画像でよい
- ファイル名は指定どおりにする
- 画像サイズの目安:
  - 立ち絵: 高さ 1600〜2200px 程度
  - 背景: 1600x900 以上
  - イベントCG: 1600x900 以上
  - タイトル画像: 1600x900 以上

---

## 4. 納品フォルダ構成

以下のフォルダ構成で出力してください。

```text
hokago_signal_images/
├─ title/
│  └─ title_key_visual.webp
├─ characters/
│  ├─ minori/
│  │  ├─ minori_base_default.webp
│  │  ├─ minori_face_normal.webp
│  │  ├─ minori_face_smile.webp
│  │  ├─ minori_face_shy.webp
│  │  ├─ minori_face_surprised.webp
│  │  ├─ minori_face_troubled.webp
│  │  └─ minori_face_angry_soft.webp
│  ├─ toko/
│  │  ├─ toko_base_default.webp
│  │  ├─ toko_face_normal.webp
│  │  ├─ toko_face_soft_smile.webp
│  │  ├─ toko_face_shy.webp
│  │  ├─ toko_face_surprised.webp
│  │  ├─ toko_face_confused.webp
│  │  └─ toko_face_serious.webp
│  └─ hinata/
│     ├─ hinata_base_default.webp
│     ├─ hinata_face_normal.webp
│     ├─ hinata_face_big_smile.webp
│     ├─ hinata_face_shy.webp
│     ├─ hinata_face_surprised.webp
│     ├─ hinata_face_sad.webp
│     └─ hinata_face_excited.webp
├─ backgrounds/
│  ├─ bg_title_spring.webp
│  ├─ bg_classroom_day.webp
│  ├─ bg_school_gate_morning.webp
│  ├─ bg_library_evening.webp
│  ├─ bg_road_after_school.webp
│  ├─ bg_schoolyard_day.webp
│  ├─ bg_park_evening.webp
│  ├─ bg_rainy_street.webp
│  └─ bg_classroom_sunset.webp
└─ events/
   ├─ event_day001_school_gate_minori.webp
   ├─ event_day003_library_toko.webp
   └─ event_day005_schoolyard_hinata.webp
```

可能なら最終納品物を以下のZIP名でまとめてください。

```
hokago_signal_images.zip
```

---

## 5. キャラクター仕様

### 5.1 朝倉みのり / minori

- **役割:** 幼なじみ系ヒロイン
- **学年:** 高校2年
- **印象:** 明るい、世話焼き、親しみやすい
- **髪型:** 肩くらいの長さのダークブラウン、やや内巻き
- **前髪:** 目にかからない自然な前髪
- **目:** 大きめでやさしい茶色の目
- **体格:** 健康的でやや小柄
- **制服:** 紺ブレザー、白シャツ、上品なリボン、落ち着いたスカート
- **雰囲気:** 春の朝が似合う、笑顔と照れ顔が魅力
- **注意:** 親しみやすく、柔らかい雰囲気を重視

**必須ファイル:**

| ファイル名 | 表情 |
|-----------|------|
| `minori_base_default.webp` | 基本立ち絵（通常表情） |
| `minori_face_normal.webp` | 普通 |
| `minori_face_smile.webp` | 笑顔 |
| `minori_face_shy.webp` | 照れ |
| `minori_face_surprised.webp` | 驚き |
| `minori_face_troubled.webp` | 困り顔 |
| `minori_face_angry_soft.webp` | ふくれっ面（強くない） |

---

### 5.2 白瀬透子 / toko

- **役割:** 才女系ヒロイン
- **学年:** 高校2年
- **印象:** 落ち着いている、知的、少し距離がある
- **髪型:** セミロングの黒髪ストレート
- **前髪:** 整った前髪
- **目:** 切れ長寄りの落ち着いた黒〜ダークブラウン
- **体格:** 細身で上品、やや高め
- **制服:** 紺ブレザー、白シャツ、着崩しなし
- **雰囲気:** 図書室、夕方、静かな時間が似合う
- **注意:** 冷たすぎず、知的で繊細な印象にする

**必須ファイル:**

| ファイル名 | 表情 |
|-----------|------|
| `toko_base_default.webp` | 基本立ち絵（通常表情） |
| `toko_face_normal.webp` | 普通 |
| `toko_face_soft_smile.webp` | 柔らかい微笑み |
| `toko_face_shy.webp` | 照れ（小さな変化） |
| `toko_face_surprised.webp` | 驚き（控えめ） |
| `toko_face_confused.webp` | 困惑 |
| `toko_face_serious.webp` | 真剣 |

---

### 5.3 夏川ひなた / hinata

- **役割:** 元気系ヒロイン
- **学年:** 高校2年
- **印象:** 活発、素直、感情表現が豊か
- **髪型:** 明るめの茶髪、ポニーテール
- **前髪:** ラフな前髪
- **目:** 明るく大きい目
- **体格:** 健康的で運動系
- **制服:** 紺ブレザー、白シャツ、少し活動的な着こなし
- **雰囲気:** 校庭、放課後、夏空が似合う
- **注意:** 元気で爽やか、表情差がわかりやすいこと

**必須ファイル:**

| ファイル名 | 表情 |
|-----------|------|
| `hinata_base_default.webp` | 基本立ち絵（通常表情） |
| `hinata_face_normal.webp` | 普通 |
| `hinata_face_big_smile.webp` | 満面の笑み |
| `hinata_face_shy.webp` | 照れ（わかりやすく） |
| `hinata_face_surprised.webp` | 驚き（大きめ） |
| `hinata_face_sad.webp` | 落ち込み |
| `hinata_face_excited.webp` | 興奮・テンション高め |

---

## 6. キャラ画像の共通ルール

- 3キャラとも**同じ学校の制服デザイン**に統一する
- 同一キャラの髪型、髪色、目の形、制服は表情差分でも変えない
- **表情だけを変え、別人に見えないようにする**
- 背景はなし、または白背景
- 立ち絵はできれば全身、難しければ膝上
- 恋愛ゲーム向けに、顔が見やすく、UIに載せやすい構図にする

---

## 7. 背景画像仕様

以下の背景を作成してください。

| ファイル名 | 説明 |
|-----------|------|
| `bg_title_spring.webp` | 春の学校風景、明るく印象的、タイトル向け |
| `bg_classroom_day.webp` | 昼間の教室、誰もいない通常時 |
| `bg_school_gate_morning.webp` | 朝の校門前、登校時間帯 |
| `bg_library_evening.webp` | 夕方の図書室、静かな雰囲気 |
| `bg_road_after_school.webp` | 放課後の帰り道、住宅街や通学路 |
| `bg_schoolyard_day.webp` | 昼または放課後の校庭 |
| `bg_park_evening.webp` | 夕方の公園、少ししんみりした雰囲気 |
| `bg_rainy_street.webp` | 雨の街路、傘が似合う空気感 |
| `bg_classroom_sunset.webp` | 夕焼けの教室、感傷的な場面向け |

**背景の共通ルール:**

- 人物を入れない
- オリジナル背景
- 恋愛ゲームの背景として使いやすい
- UIの文字が重なっても見やすい
- 過度に派手にしない

---

## 8. 重要イベントCG仕様

### 8.1 `event_day001_school_gate_minori.webp`

- 朝の校門前
- 春の朝
- 朝倉みのりが主人公に笑顔で声をかける
- やさしく親しみやすい空気
- 明るい導入イベントらしい印象

### 8.2 `event_day003_library_toko.webp`

- 夕方の図書室
- 白瀬透子が本を手にして静かにこちらを見る
- 落ち着いた空気
- 知的で繊細な雰囲気

### 8.3 `event_day005_schoolyard_hinata.webp`

- 放課後の校庭
- 夏川ひなたが元気な笑顔で振り返る
- 爽やかで活動的
- 明るい青春感

**イベントCG共通ルール:**

- オリジナルキャラクターデザイン
- 背景込み
- 横長構図（1600x900以上）
- 感情がわかりやすい
- 既存作品に似せない
- 広告掲載でも問題ない安全な内容

---

## 9. タイトル用キービジュアル仕様

**ファイル名:** `title/title_key_visual.webp`

**要件:**

- ヒロイン3人が並ぶ
- 春の学校風景
- 爽やかでノスタルジック
- 学園恋愛ゲームの顔になる絵
- ロゴ・文字なし
- オリジナルキャラクターデザイン
- 広告にも使いやすい安全な構図

---

## 10. 禁止事項

以下は避けてください。

- 既存アニメや既存ゲームのキャラクターに似せる
- 過度な露出
- 年齢が幼く見えすぎる表現
- 派手すぎる装飾
- 過度に現代アイドル風・VTuber風にする
- 手指や顔の大きな崩れ
- 不必要な小物の追加
- ロゴ、署名、透かし、文字入れ
- 余計な人物の追加

---

## 11. 納品方法

可能であれば、最終的に以下の形で納品してください。

- 指定フォルダ構成を維持した状態でファイルを格納
- まとめて `hokago_signal_images.zip` として出力
- もし ZIP が難しい場合は、フォルダごとに分けて出力
- ファイル名は必ず仕様どおりにする

---

## 12. 追加希望

可能であれば、納品時に以下も付けてください。

- 画像一覧リスト
- 生成漏れがある場合の不足ファイル一覧
- 同一キャラクターとして維持するための短い再生成用メモ

---

## 付録: ゲーム内での使用先対応表

| ファイル | ゲーム内用途 | JSON参照キー |
|---------|------------|-------------|
| `minori_base_default.webp` | 立ち絵デフォルト | `defaultSprite` |
| `minori_face_smile.webp` | 笑顔表情 | `expressions.smile` |
| `minori_face_shy.webp` | 照れ表情 | `expressions.shy` |
| `minori_face_surprised.webp` | 驚き表情 | `expressions.surprised` |
| `bg_school_gate_morning.webp` | Day 1 背景 | `background` |
| `event_day001_school_gate_minori.webp` | Day 1 イベントCG | `sceneImage` |
| `title_key_visual.webp` | タイトル画面背景 | - |
