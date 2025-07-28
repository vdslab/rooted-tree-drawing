import { layout } from "./saLayout.js";
import * as d3 from "d3";
import fs from "fs";
// コマンドライン引数からパラメータを取得
const params = JSON.parse(process.argv[2]);

// データセットを読み込む
const datasetPath = "../random_trees_dataset500-1000.json";
const fullDataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
// 最適化のために小さなサブセットを使用する (最初の3つのツリーのみ)
const dataset = fullDataset.slice(0, 3);


// // テスト用のダミーリーフデータを作成
// function prepareTestData(data) {
//   // 葉ノードを抽出（子を持たないノード）
//   const nodeMap = new Map();
//   const childrenMap = new Map();

//   // 各ノードの親子関係をマップに記録
//   data.forEach(node => {
//     nodeMap.set(node.name, node);
//     if (!childrenMap.has(node.name)) {
//       childrenMap.set(node.name, []);
//     }

//     if (node.parent) {
//       if (!childrenMap.has(node.parent)) {
//         childrenMap.set(node.parent, []);
//       }
//       childrenMap.get(node.parent).push(node.name);
//     }
//   });

//   // 葉ノードを特定（子を持たないノード）
//   const leaves = data.filter(node =>
//     childrenMap.get(node.name).length === 0
//   );

//   // 葉ノードをグループ化（テスト用に単純に1つのグループにする）
//   return [leaves];
// }

// SAアルゴリズムの実行
function runSA(options) {
  console.log("--- SA function received options ---");
  console.log(options);
  console.log("------------------------------------");
  // オリジナルのSA関数を呼び出す前にオプションを設定
  // const originalSA = sa;

  // SAアルゴリズムを実行
  // 注: 実際のsa関数の実装に合わせて、オプションの渡し方を調整する必要があるかもしれません
  // const flatLeaves = leaves.flat();

  // オプションをグローバルに設定（モンキーパッチ）
  // 注: sa.js内のoptionsを直接上書きできない場合は、sa.jsを修正する必要があります
  global.saOptions = options;

  // SAアルゴリズムを実行
  const result = constFunc(options);

  return result;
}

// テストデータの準備
// const leaves = prepareTestData(data);
// const rowNum = params.rowNum || 3;

// SAの実行と評価
try {
  // SAオプションの設定
  const saOptions = {
    initialTemp: params.initialTemp || 1000,
    finalTemp: params.finalTemp || 0.1,
    coolingRate: params.coolingRate || 0.95,
    iterationsPerTemp: params.iterationsPerTemp || 100
  };

  // runSA関数を使用してSAアルゴリズムを実行
  // ★ `result` には評価関数の計算結果（数値）が直接入る
  const result = runSA(saOptions);

  // ★★★★★ 修正点 ★★★★★
  // `result.maxWidth` ではなく、`result` をそのまま cost として使う
  console.log(JSON.stringify({
    cost: result,
    groupWidths: [] // この行は必須ではないが、Python側と合わせるために残す
  }));

} catch (error) {
  // (ここは変更なし)
  console.error(JSON.stringify({
    error: error.message,
    stack: error.stack
  }));
  process.exit(1);
}

// 以下のコメントはJSON出力後に表示されるため、Pythonでのパース時にエラーになる可能性があります
// console.log("data.json に保存しました");

//評価関数
function constFunc(saOptions) {
  // 描画範囲の設定 - これらの値は optimize_aspect_ratios.py によって置換される
  const width = 1000;//描画範囲横幅
  const height = 500;//描画範囲縦幅

  // タイムアウトを防ぐために処理時間を制限
  const startTime = Date.now();
  const timeLimit = 50000; // 50秒

  // データセットの各ツリーに対して評価を行い、平均値を返す
  let totalScore = 0;
  let validTreeCount = 0;

  for (const tree of dataset) {
    // 時間制限をチェック
    if (Date.now() - startTime > timeLimit) {
      console.log("時間制限に達したため、評価を早期終了します");
      break;
    }

    try {
      const data = tree.tree;
      const saData = JSON.parse(JSON.stringify(data));
      const satree = layout(saData, width, height, saOptions);
      const saarea = calcarea(satree.nodes);
      const sanodesArea = calcSumNodesArea(satree.nodes);
      totalScore += sanodesArea / saarea;
      validTreeCount++;
    } catch (error) {
      console.error("レイアウト処理中にエラーが発生しました:", error);
    }
  }

  // 平均スコアを返す
  return validTreeCount > 0 ? totalScore / validTreeCount : 0;
}
// // JSONファイルに保存
// fs.writeFileSync("resultData/sa-randomParm.json", JSON.stringify(saresult), "utf-8");

// console.log("data.json に保存しました");
//ツリーのアスペクト比を返す関数
function calcarea(nodes) {
  const left = d3.min(
    nodes,
    (node) => node.x - node.width / 2,
  );
  const right = d3.max(
    nodes,
    (node) => node.x + node.width / 2,
  );
  const top = d3.min(
    nodes,
    (node) => node.y - node.height / 2,
  );
  const bottom = d3.max(
    nodes,
    (node) => node.y + node.height / 2,
  );
  const layoutWidth = right - left;
  const layoutHeight = bottom - top;
  return layoutWidth * layoutHeight;
}

function calcSumNodesArea(nodes) {
  return nodes.reduce((acc, cur) => {
    let width = typeof cur.width === "number" ? cur.width : 0;
    let height = typeof cur.height === "number" ? cur.height : 0;
    return acc + width * height;
  }, 0);
}
