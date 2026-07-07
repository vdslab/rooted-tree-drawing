import Tree from "./Tree";
import { useState, useMemo } from "react";
import toaruRaw from "../toaruos_tree.json";

export default function App() {
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(750);

  // toaruos_tree.json をノードリンク用に変換
  // フォルダ: 固定サイズ (width=1000, height=500)
  // ファイル: value をそのまま height に使用（変換なし）
  const data = useMemo(() => {
    return toaruRaw.map((item) => {
      if (item.type === "folder") {
        return {
          name: item.name,
          parent: item.parent,
          width: 1000,
          height: 500,
        };
      } else {
        return {
          name: item.name,
          parent: item.parent,
          width: 1000,
          height: Math.max(item.value || 0, 1),
        };
      }
    });
  }, []);

  return (
    <>
      <section className="section">
        <div className="container">
          <h1 className="title">
            Node-Link Tree ({data.length} nodes)
          </h1>

          <form
            className="input"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setWidth(Number(form.width.value));
              setHeight(Number(form.height.value));
            }}
          >
            <label htmlFor="width">width:</label>
            <input
              id="width"
              name="width"
              type="number"
              defaultValue={width}
              style={{ marginRight: "10px" }}
            />
            <label htmlFor="height">height:</label>
            <input
              id="height"
              name="height"
              type="number"
              defaultValue={height}
              style={{ marginRight: "10px" }}
            />
            <button
              type="submit"
              style={{ backgroundColor: "#00bfff", padding: "5px" }}
            >
              set
            </button>
          </form>

          <div
            className="box"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              border: "1px solid #ddd",
              boxSizing: "content-box",
              overflow: "hidden",
            }}
          >
            <figure
              className="figure"
              style={{ margin: 0, width: "100%", height: "100%" }}
            >
              <Tree data={data} width={width} height={height} />
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
