# Release Notes - v0.2.0

**倍速アンケート (Sonar)** v0.2.0
リリース日: 2026-02-18
対象ブランチ: `develop` (34 commits since `main`)
差分規模: 87 files changed, +11,307 / -1,747 lines

---

## 新機能 (New Features)

### 認証基盤 - Supabase Auth マジックリンク (#18)

Supabase Auth を用いた PKCE フローのマジックリンク認証を導入しました。ユーザーはメールアドレスを入力するだけでログインできます。

- **ログインページ** (`/login`): マジックリンク送信フォーム
- **認証コールバック** (`/auth/confirm`): PKCE `code` + レガシー `token_hash` の両方に対応
- **サインアウト** (`/auth/signout`): POST リクエストでサインアウト
- **ミドルウェア** (`src/middleware.ts`): セッションリフレッシュ専用（リダイレクトなし）
- **サーバークライアント**: `@supabase/ssr` 0.8+ の `getAll`/`setAll` パターンに準拠
- ローカル開発では Mailpit (`localhost:54324`) でマジックリンクメールを確認可能

### 管理画面の大幅リデザイン (#19, #20, #22)

Google Forms 風の UI に全面刷新しました。

- **トークンベースアクセス制御**: `/admin/[token]` による管理画面へのアクセス
- **ユーザーID紐づけ**: プリセット作成者を認証ユーザーと関連付け
- **ダッシュボード**: グリッドレイアウトのフォーム一覧表示
- **タブ管理画面** (`/manage/[slug]`): 設定・質問・回答・レポートをタブで管理
- **回答タブ**: 要約/質問別/個別の3ビューに再設計、CSV エクスポート・削除・メール通知対応
- **自動保存**: 管理画面の編集内容を自動保存
- **ダークモード対応**: テーマプロバイダ + トグル切替
- **ログイン必須化**: 管理画面へのアクセスに認証を要求
- **認証ヘッダー** (`auth-header.tsx`): メアドドロップダウン表示

### ランディングページ (LP)

- **LP ページ** (`/lp`): 製品紹介用のランディングページを新規作成
- **ルートリダイレクト**: `/` から `/lp` への自動リダイレクト設定
- **プロダクト共通フッター**: pills スタイルの統一フッターデザイン (#33)
- LP はライトモード固定（ダークモード無効化）

### 質問タイプの拡張 (#25)

- **6種の質問タイプ**: 従来の選択式に加え、複数の質問形式をサポート
- **forms + form_questions テーブル**: 新しいフォーム管理のためのDB構造を追加
- **固定質問と深掘りテーマの分離**: 管理者が設定する固定質問と AI が生成する深掘りテーマを明確に分離

### アナリティクス - Umami 統合

- **Umami トラッキング** (`src/lib/analytics.ts`): ページビュー・イベントトラッキングを導入
- プライバシーに配慮したアナリティクス基盤

### UnifiedAppHeader - プロダクト共通ヘッダー

- **共通ヘッダーコンポーネント** (`src/components/shared/UnifiedAppHeader.tsx`): plural-reality プロダクト横断で使える統一ヘッダー
- **Sonar ロゴ** (`src/components/ui/sonar-logo.tsx`): SVG/テキスト化されたロゴコンポーネント

### テストインフラストラクチャ

- **Vitest 導入**: テストフレームワークとして Vitest を採用
- **95テストケース**: 4テストファイル49ケース + 24ケース (OpenRouter) + API バリデーションテスト
  - `src/lib/utils/phase.test.ts` - フェーズ管理ロジック (99ケース)
  - `src/lib/openrouter/client.test.ts` - OpenRouter クライアント
  - `src/lib/openrouter/prompts.test.ts` - プロンプト生成・formatAnswerText
  - `src/app/api/questions/json-parser.test.ts` - JSON パーサー
  - `src/app/api/analysis/analysis.test.ts` - 分析 API バリデーション
  - `src/app/api/answers/answers.test.ts` - 回答 API バリデーション
  - `src/app/api/report/report.test.ts` - レポート API バリデーション
  - `src/app/api/sessions/sessions.test.ts` - セッション API バリデーション

### CI パイプライン - GitHub Actions

- **`.github/workflows/ci.yml`**: プッシュ/PR時にテスト・リント・ビルドを自動実行

---

## 改善 (Improvements)

### UI/UX 改善

- **Google Forms 風 UI**: プリセット作成画面・管理画面を Google Forms 風のモダンなデザインに刷新
- **レポートページ**: 折りたたみ式の回答ログを追加、最新レポートの自動展開
- **分析生成の非ブロッキング化**: 分析生成中も次の質問に進めるように改善
- **目標到達時の完了体験**: 完了時のフィードバックを改善
- **デフォルト目標数**: 25問から10問に変更し、目標超過後は毎バッチ続行確認を表示
- **回答ヒント**: 案内文に変更し、音声 UI ではチップ形式で表示
- **開始画面**: タイトル表示を追加
- **レポート関連設定**: 詳細設定として折りたたみ表示に変更
- **フォーム作成履歴**: トップページにフォーム作成履歴を追加

### プロンプト改善

- **中立選択肢の品質向上**: 選択肢が元の問いの軸から外れないよう制約を強化
  - 前提を疑う立場は許容しつつ、論点をすり替える選択肢を禁止
  - 「別の角度・視点からの見方」を例示から削除
- **レポート生成**: キークエスチョンのコンテキストを追加、全体レポートに reasoning を有効化
- **背景自動生成**: `/api/presets/generate-background` エンドポイントを追加

### 音声モード改善

- **Deepgram Nova-3 への移行**: ElevenLabs から Deepgram に音声認識エンジンを切り替え
- **カーソルアニメーション**: 音声モードでのカーソルアニメーションを追加
- **音声モード保持**: preset URL の `?mode=voice` をセッションリダイレクト時に保持
- **partialTranscript のフラッシュ**: 5問ごとの AI 分析表示を追加

### ブランディング

- **SEO/ブランディング統一**: プロダクト名を「Sonar」から「倍速アンケート」に統一
- **メール通知**: Resend 経由のメール通知機能 (`src/lib/email/resend.ts`)

---

## バグ修正 (Bug Fixes)

- **回答者画面の表示**: purpose ではなく title を表示するように修正 (#12)
- **バッチ処理失敗時**: リトライパスを正しく保持するように修正
- **ホーム画面の回答数**: 完了セッションのみをカウントするように修正
- **ポーリングの競合防止**: エラー回復を改善
- **LP のダークモード**: 完全無効化 + アニメーション復元
- **migration バージョン番号**: 重複を解消 (010, 011)
- **create_preset_with_token**: `p_user_id` 未対応 DB へのフォールバック追加
- **uuid_generate_v4()**: `gen_random_uuid()` に変更（新規 Supabase 互換性）
- **Supabase Auth 設定**: 本番/Preview 環境への対応を修正
- **非同期データ取得**: 取得後に最新レポートを自動展開する問題を修正
- **surveyReports useState**: early return の前に hoist
- **全体レポート生成**: 回答ゼロ件での生成を拒否

---

## インフラストラクチャ (Infrastructure)

### データベースマイグレーション

v0.2.0 で追加されたマイグレーション:

| ファイル | 内容 |
|---------|------|
| `012_add_user_id_to_presets.sql` | プリセットにユーザーID紐づけ |
| `013_add_admin_token_for_owner_function.sql` | オーナー用トークン取得関数 |
| `014_split_key_questions.sql` | キークエスチョンの分離 |
| `015_add_question_types.sql` | 質問タイプの追加 |
| `016_create_forms_tables.sql` | forms + form_questions テーブル |
| `017_add_notification_email.sql` | 通知メール設定 |

### 依存関係の整理

- 未使用の shadcn/radix-ui 依存を削除
- Supabase のゴミファイルを整理
- `supabase/config.toml` をリポジトリに追加

### Supabase ローカル開発

- `supabase/config.toml` を追加し、ローカル開発環境を標準化
- `supabase/.gitignore` を追加

### 環境変数

- `.env.example` を更新（Umami、Resend 等の新しい変数を追加）

---

## 破壊的変更 (Breaking Changes)

### 開発サーバーポートの変更: 3000 -> 3939

ローカル開発サーバーのポートが **3000** から **3939** に変更されました。

**影響範囲:**
- `next.config.ts`: dev サーバーのポート設定
- `supabase/config.toml`: `site_url` および認証コールバック URL
- `.env.example`: Supabase の URL 設定例

**必要な対応:**
- ローカル開発環境で `http://localhost:3939` を使用してください
- ブックマークや外部ツールの URL 設定を更新してください
- Supabase Auth のリダイレクト URL に `localhost:3939` が含まれていることを確認してください

### 認証の導入

管理画面 (`/admin/[token]`, `/manage/[slug]`) へのアクセスにはログインが必要になりました。既存のアンケート回答機能は未ログインでも引き続き利用可能です。

### デフォルト質問数の変更

デフォルトの目標質問数が **25問** から **10問** に変更されました。既存のプリセットで `report_target` を明示的に設定していない場合、新しいデフォルト値が適用されます。

---

## アップグレードガイド

```bash
# 1. 依存関係の更新
npm install

# 2. 環境変数の確認
# .env.local のポートを 3939 に更新
# 新しい環境変数（UMAMI, RESEND 等）を追加

# 3. ローカル Supabase の再起動
supabase stop
supabase start

# 4. マイグレーション適用
supabase db reset  # ローカル環境の場合

# 5. 開発サーバー起動
npm run dev  # http://localhost:3939 で起動
```

---

## 統計

- **コミット数**: 34 (develop only)
- **変更ファイル数**: 87
- **追加行数**: +11,307
- **削除行数**: -1,747
- **新規テストケース**: 95+
- **新規マイグレーション**: 6
- **マージされた PR**: #18, #19, #20, #22, #25, #33 他
