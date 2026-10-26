/** 手法IDと実装の一次情報。表示・実験条件はプリセットで分離する。 */
import { layout as existing } from "./methods/existing.js";
import { layout as growth } from "./methods/growth.js";
import { layout as growthIncremental } from "./methods/growthIncremental.js";
import { layout as binpacking } from "./methods/binpacking.js";

export const METHODS = {
  existing: { layout: existing, options: {} },
  "growth-sa": { layout: growth, options: { solver: "sa" } },
  "growth-lpt": { layout: growth, options: { solver: "lpt" } },
  "growth-lpt-incremental": {
    layout: growthIncremental,
    options: { solver: "lpt" },
    experimental: true,
  },
  "budget-lpt": { layout: binpacking, options: { packing: "lpt" } },
  "budget-ffd": { layout: binpacking, options: { packing: "ffd" } },
  "budget-bfd": { layout: binpacking, options: { packing: "bfd" } },
};

export const MARGINS = {
  ui: { xMargin: 100, yMargin: 100 },
  paper: { xMargin: 300, yMargin: 200 },
};

export function layoutMethod(id, data, width, height, preset = "paper", options = {}) {
  const method = Object.hasOwn(METHODS, id) ? METHODS[id] : null;
  if (!method) throw new Error(`Unknown method: ${id}`);
  if (!Object.hasOwn(MARGINS, preset)) throw new Error(`Unknown margin preset: ${preset}`);
  // UIの既存APIは任意の余白・packingの上書きを許す。論文条件は固定する。
  const resolved = preset === "ui"
    ? { ...method.options, ...MARGINS[preset], ...options }
    : { ...options, ...method.options, ...MARGINS[preset] };
  return method.layout(data, width, height, resolved);
}
