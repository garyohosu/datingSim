# 放課後シグナル

学園恋愛シミュレーションゲーム。GitHub Pages で公開できる静的 Web ゲームです。

## 概要

私立風見ヶ丘高校を舞台に、3人のヒロインとの関係を積み重ねていく連載型恋愛シミュレーションゲームです。
90年代〜2000年代初期の学園恋愛ゲームの空気感を持ちながら、現代の高校生活を描いています。

## ヒロイン

| キャラクター | 属性 | 得意パラメータ |
|---|---|---|
| 朝倉みのり | 幼なじみ系 | 気配り (care) |
| 白瀬透子 | 才女系 | 学力 (study) |
| 夏川ひなた | 元気系 | 運動 (sports) |

## 技術構成

- **フロントエンド:** HTML5 / CSS3 / JavaScript (ES Modules)
- **データ:** JSON ファイル駆動
- **セーブ:** localStorage
- **BGM:** Tone.js (FMSynth)
- **SE:** jsfxr
- **公開基盤:** GitHub Pages（サーバーサイド不要）

## ディレクトリ構成

```
/
├─ index.html          # エントリポイント
├─ assets/
│  ├─ js/              # ゲームロジック
│  │  ├─ main.js       # アプリ起動・初期化
│  │  ├─ state.js      # 状態管理・パラメータ制御
│  │  ├─ renderer.js   # テキスト・画像・選択肢描画
│  │  ├─ router.js     # 画面遷移
│  │  ├─ storage.js    # localStorage 保存/読込
│  │  ├─ dataLoader.js # JSON 読込・キャッシュ
│  │  └─ audio.js      # BGM/SE 再生
│  ├─ data/
│  │  ├─ episodes/     # エピソード JSON (day-001.json 等)
│  │  ├─ diaries/      # ヒロイン日記
│  │  └─ manifests/    # エピソード一覧・ギャラリー・更新履歴
│  └─ images/          # 背景・立ち絵・イベントCG
└─ SPEC.md             # 仕様書
```

## ゲーム進行

- **1日 = 1ターン**で進行します
- 選択肢によって好感度・パラメータ・フラグが変動します
- 好感度の積み重ねでルートが分岐し、エンディングへ向かいます
- セーブはオートセーブ1枠 + 手動セーブ3枠に対応しています

### 主人公パラメータ

| パラメータ | 説明 |
|---|---|
| study（学力）| 知的なヒロインとの相性に影響 |
| sports（運動）| 活発なヒロインとの相性に影響 |
| charm（魅力）| 全体的な好感度上昇に影響 |
| care（気配り）| 幼なじみヒロインとの相性に影響 |
| stress（ストレス）| 高いと好感度上昇やイベントにマイナス補正 |

## コンテンツ追加

エピソードは JSON ファイルを追加するだけで拡張できます。
毎日少しずつ追加していく「育つ恋愛ゲームサイト」として設計されています。

```jsonc
// assets/data/episodes/day-XXX.json
{
  "id": "day-001",
  "day": 1,
  "title": "春の朝",
  "location": "school_gate",
  "characters": ["minori"],
  "text": ["朝、校門の前でみのりに呼び止められた。"],
  "choices": [
    {
      "id": "c1",
      "label": "笑ってうなずく",
      "nextEpisodeId": "day-002a",
      "effects": { "affection": { "minori": 3 } }
    }
  ]
}
```

新しいエピソードを追加したら `assets/data/manifests/episodes.json` も更新してください。

## セーブデータ

localStorage に以下のキーで保存されます。

| キー | 内容 |
|---|---|
| `hokago_signal_autosave` | オートセーブ |
| `hokago_signal_save_1〜3` | 手動セーブ |
| `hokago_signal_settings` | 音量設定など |

## ブラウザ対応

- Chrome / Edge（推奨）
- Firefox
- Safari（基本動作確認対象）

## 仕様書

詳細な仕様は [SPEC.md](./SPEC.md) を参照してください。

---

*本作は AI 支援 + 人手確認による連載型運用を前提としています。*
