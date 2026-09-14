#!/usr/bin/env node
/**
 * AskUserQuestion に渡す前に questions ペイロードを検査する。
 *
 *   node .claude/skills/grill-me/check-questions.mjs questions.json
 *   echo '<json>' | node .claude/skills/grill-me/check-questions.mjs
 *
 * 面接の途中でツール呼び出しが弾かれると対話が途切れるので、その前に落とす。
 * ここで見ているのは実際にエラーになった制約と、UI上読みにくくなる条件。
 */
import fs from "fs";

const HARD = [];   // ツールが弾く
const SOFT = [];   // 弾かれないが対話の質が落ちる

const src = process.argv[2]
  ? fs.readFileSync(process.argv[2], "utf8")
  : fs.readFileSync(0, "utf8");

let payload;
try { payload = JSON.parse(src); } catch (e) {
  console.error(`JSONとして読めない: ${e.message}`);
  process.exit(2);
}
const questions = Array.isArray(payload) ? payload : payload.questions;
if (!Array.isArray(questions)) { console.error("questions 配列が無い"); process.exit(2); }

const at = (i, msg) => `questions[${i}]: ${msg}`;

if (questions.length < 1 || questions.length > 4)
  HARD.push(`questions は1〜4個（今は${questions.length}個）。多いなら次のラウンドに回す`);

questions.forEach((q, i) => {
  if (!q.question) HARD.push(at(i, "question が無い"));
  if (typeof q.multiSelect !== "boolean") HARD.push(at(i, "multiSelect (boolean) が要る"));
  if (!q.header) HARD.push(at(i, "header が無い"));
  else if ([...q.header].length > 12) HARD.push(at(i, `header は12文字以内（"${q.header}" は${[...q.header].length}文字）`));

  const opts = q.options ?? [];
  if (opts.length < 2 || opts.length > 4)
    HARD.push(at(i, `options は2〜4個（今は${opts.length}個）。5個以上は弾かれるので統合するか質問を分ける`));

  const labels = new Set();
  opts.forEach((o, j) => {
    if (!o.label) HARD.push(at(i, `options[${j}].label が無い`));
    if (!o.description) HARD.push(at(i, `options[${j}].description が無い（選択の結果どうなるかを書く）`));
    if (o.label && /^(other|その他)$/i.test(o.label.trim()))
      HARD.push(at(i, `options[${j}] に "Other" を自分で足さない（UIが自動で出す）`));
    if (o.label && labels.has(o.label)) HARD.push(at(i, `options[${j}].label が重複: "${o.label}"`));
    if (o.label) labels.add(o.label);
    if (o.label && [...o.label].length > 30)
      SOFT.push(at(i, `options[${j}].label が長い（${[...o.label].length}文字）。UIで折り返す`));
    if (o.description && [...o.description].length > 200)
      SOFT.push(at(i, `options[${j}].description が長い（${[...o.description].length}文字）`));
  });

  if (q.question && !/[?？]\s*$/.test(q.question)) SOFT.push(at(i, "question が疑問符で終わっていない"));
  const rec = opts.filter((o) => /\(Recommended\)/.test(o.label ?? ""));
  if (rec.length > 1) HARD.push(at(i, "(Recommended) が複数ある"));
  if (rec.length === 1 && opts[0]?.label !== rec[0].label)
    SOFT.push(at(i, "(Recommended) は先頭に置く"));
  if (q.multiSelect && rec.length)
    SOFT.push(at(i, "multiSelect で (Recommended) は意味が薄い"));
});

for (const m of HARD) console.error(`✗ ${m}`);
for (const m of SOFT) console.log(`△ ${m}`);
if (HARD.length) { console.error(`\n${HARD.length}件の致命的な問題。このままでは AskUserQuestion が弾かれる`); process.exit(1); }
console.log(`✓ ${questions.length}問 / 合計${questions.reduce((s, q) => s + (q.options?.length ?? 0), 0)}選択肢: 投げてよい${SOFT.length ? `（${SOFT.length}件の改善余地あり）` : ""}`);
