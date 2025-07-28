import fs from "fs";
// generateTree関数を randomData.js からインポートします。
// ファイル名が異なる場合は、パスを修正してください。
import { generateTree } from "./randomData.js";

// =======================================================
// ヘルパー関数
// =======================================================

/**
 * 指定された範囲内のランダムな整数を生成します。
 * @param {number} min - 最小値 (この値を含む)
 * @param {number} max - 最大値 (この値を含む)
 * @returns {number} ランダムな整数
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 指定された範囲内のランダムな浮動小数点数を生成します。
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @returns {number} ランダムな浮動小数点数
 */
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}


// =======================================================
// メイン処理
// =======================================================

/**
 * 複数のランダムなツリーデータを生成し、ファイルに保存します。
 */
function createRandomTreeDataset() {
  const numberOfTrees = 3; // 生成するツリーの数
  const allTrees = [];

  console.log(`${numberOfTrees}個のランダムなツリーデータを生成します...`);

  for (let i = 0; i < numberOfTrees; i++) {
    // --- ツリー生成のパラメータをランダムに設定 ---
    const numNodes = getRandomInt(5000, 10000);   // ノード数を50から300の間でランダムに
    const alpha = getRandomFloat(0, 1);       // α値を0から1.5の間でランダムに

    // // 50%の確率で、1つの親が持てる子の数に上限を設ける
    // const maxChildrenPerParent = Math.random() < 0.5
    //   ? getRandomInt(3, 10) // 3から10の間で上限を設定
    //   : null;               // または上限なし

    // ツリーデータを生成
    const treeData = generateTree(numNodes, alpha);

    // 生成したデータと、その時のパラメータを一緒に保存
    allTrees.push({
      id: i + 1,
      parameters: {
        numNodes: treeData.length, // 実際に生成されたノード数
        targetNumNodes: numNodes,
        alpha: alpha,
        // maxChildrenPerParent: maxChildrenPerParent
      },
      tree: treeData
    });

    // 進捗を表示
    console.log(`  - ツリー ${i + 1}/${numberOfTrees} を生成しました (ノード数: ${treeData.length}, α: ${alpha.toFixed(2)})`);
  }

  // --- 結果をJSONファイルに保存 ---
  const outputFileName = "random_trees_dataset5000-10000.json";
  try {
    // JSON.stringifyの第3引数に2を指定すると、人間が読みやすいようにインデントされたJSONになります
    fs.writeFileSync(outputFileName, JSON.stringify(allTrees, null, 2), "utf-8");
    console.log(`\n成功！ ${numberOfTrees}個のツリーデータを ${outputFileName} に保存しました。`);
  } catch (error) {
    console.error(`ファイルへの保存中にエラーが発生しました: ${error}`);
  }
}

// スクリプトを実行
createRandomTreeDataset();