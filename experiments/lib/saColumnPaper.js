/**
 * 論文実験用の SA 手法（列成長型 + 焼きなまし法、マージン 300/200）。
 *
 * 実装は src/layout/methods/growth.js に一本化した（ソルバーが SA か LPT かの
 * 違いだけで、growthLPTPaper.js と共通）。このファイルはラッパー。
 */
import { layout as growthLayout } from "../../src/layout/methods/growth.js";
export { saColumn } from "../../src/layout/solvers/saColumn.js";

export function layout(data, width, height, options = {}) {
  return growthLayout(data, width, height, {
    ...options,
    solver: "sa",
    xMargin: 300,
    yMargin: 200,
  });
}
