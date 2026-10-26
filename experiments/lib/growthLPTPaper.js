/** 旧importパスの互換入口。論文条件は registry の paper プリセット。 */
import { layoutMethod } from "../../src/layout/registry.js";
export { lptColumn } from "../../src/layout/solvers/lptColumn.js";

export function layout(data, width, height, options = {}) {
  return layoutMethod("growth-lpt", data, width, height, "paper", options);
}
