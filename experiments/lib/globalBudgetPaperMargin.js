/**
 * 論文実験用の binpacking 手法（マージン 300/200）。
 *
 * 実装は src/layout/methods/binpacking.js に一本化した。このファイルは
 * 実験スクリプトの import パスと、論文条件のマージン設定を保つためのラッパー。
 *
 * マージンを 300/200 にしているのは、existingPaper.js / saColumnPaper.js
 * (evaluationブランチ実装) と条件を揃えて公平に比較するため。
 * UI 側（src/uiLayout.js）は 100/100 を使う。
 */
import { layout as binpackingLayout } from "../../src/layout/methods/binpacking.js";

export function layout(data, width, height, options = {}) {
  return binpackingLayout(data, width, height, {
    ...options,
    xMargin: 300,
    yMargin: 200,
  });
}
