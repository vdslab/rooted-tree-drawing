/**
 * 論文実験用の既存手法（Misue、マージン 300/200）。
 *
 * 実装は src/layout/methods/existing.js に移した。このファイルは実験スクリプトの
 * import パスと論文条件のマージンを保つためのラッパー。
 *
 * マージンを 300/200 にしているのは、提案手法側（saColumnPaper.js /
 * globalBudgetPaperMargin.js）と条件を揃えて公平に比較するため。
 */
import { layout as existingLayout } from "../../src/layout/methods/existing.js";

export function layout(data, width, height, options = {}) {
  return existingLayout(data, width, height, {
    ...options,
    xMargin: 300,
    yMargin: 200,
  });
}
