/** UI の手法選択。IDと実装は layout/registry.js、マージンは ui プリセット。 */
import { layoutMethod } from "./layout/registry.js";

// existing / growth-sa / growth-lpt / growth-lpt-incremental / budget-lpt / budget-ffd / budget-bfd
export const SELECTED = "growth-lpt-incremental";

export function layout(data, width, height, options = {}) {
  return layoutMethod(SELECTED, data, width, height, "ui", options);
}
