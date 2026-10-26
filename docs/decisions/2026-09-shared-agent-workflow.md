> **ステータス**: Implemented（2026-09。layoutブランチの開発構成をサービス共通化）

# 共通指示と手元資料を分離する

Claude専用の入口に共通ルールと実験実装が集中しており、別のAIやクローン環境では同じ手順を再現しづらかった。
PDFと生成物をGitから除外していても、文書検査がその存在を要求していた。

共通規則はルートと領域別の AGENTS.md に置き、CLAUDE.md は相対importで同じ本文を読む。
他サービスの設定は採用時に入口だけ追加する。CLIを experiments に移し、スキルは使い方への短い案内にする。
旧CLIパスは互換入口として残す。設計・実験・データの知識は通常の docs に置く。

第三者原資料は local-references に置いて追跡しない。文書検査は任意資料・生成物を明示的に区別し、
歴史的リンクの許容はファイルと参照先の組に限定する。CIと回帰テストは資料のない環境で検査する。

実装: [共通指示](../../AGENTS.md)、[文書検査](../../scripts/check-docs.mjs)、[CLI](../../experiments/cli.mjs)。
仕様参照: [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Claude Codeのimport](https://code.claude.com/docs/en/memory#import-additional-files)。
