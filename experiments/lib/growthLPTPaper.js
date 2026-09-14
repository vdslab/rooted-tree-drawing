/**
 * 論文実験用の LPT 手法（列成長型 + LPT、マージン 300/200）。
 *
 * 実装は src/layout/methods/growth.js に一本化した。saColumnPaper.js との
 * 違いはソルバーだけ（SA → LPT）。このファイルはラッパー。
 */
import { layout as growthLayout } from "../../src/layout/methods/growth.js";
export { lptColumn } from "../../src/layout/solvers/lptColumn.js";

export function layout(data, width, height, options = {}) {
  return growthLayout(data, width, height, {
    ...options,
    solver: "lpt",
    xMargin: 300,
    yMargin: 200,
  });
}
