import { packLongestProcessingTime } from "./lpt.js";
import { packFirstFitDecreasing } from "./firstFitDecreasing.js";
import { packBestFitDecreasing } from "./bestFitDecreasing.js";

/**
 * 配置戦略(packing strategy)の共通インターフェース:
 *
 *   (items: {height, width, ...}[], capacity: number)
 *     => { columns: Item[][], columnHeights: number[] }
 *
 * - items は1次元配列。全item.heightがcapacity以下であることを呼び出し側が保証する
 * - 列数(columns.length)をできるだけ少なくすることが目的(ベストエフォート)
 */
export const packingStrategies = {
  lpt: packLongestProcessingTime,
  ffd: packFirstFitDecreasing,
  bfd: packBestFitDecreasing,
};

/**
 * 文字列(登録済み戦略名)または関数(カスタム戦略)を実際の関数に解決する。
 *
 * @param {string|Function} nameOrFn
 * @returns {Function}
 */
export function resolvePackingStrategy(nameOrFn) {
  if (typeof nameOrFn === "function") return nameOrFn;
  const strategy = packingStrategies[nameOrFn];
  if (!strategy) {
    throw new Error(
      `Unknown packing strategy: "${nameOrFn}". Available: ${Object.keys(packingStrategies).join(", ")}`
    );
  }
  return strategy;
}
