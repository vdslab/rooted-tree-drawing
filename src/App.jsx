import Tree from "./Tree";
import { useState } from "react";
import flareData from "../flareData.json";
// // import linux from "../linux_kernel_tree_size.json";
// import re from "../react_tree.json";
// // import toaruos from "../toaruos_tree.json";
// import lua from "../lua_tree.json";
// import xv6 from "../xv6-riscv_tree.json";
export default function App() {
  // シンプルなテストデータ
  const testData = [
    { name: "Root", parent: "", width: 500, height: 100 },
    { name: "A", parent: "Root", width: 500, height: 100 },
    // Aの子（6つの葉 - 複数列になる可能性が高い）
    { name: "A1", parent: "A", width: 300, height: 200 },
    { name: "A2", parent: "A", width: 300, height: 250 },
    { name: "A3", parent: "A", width: 300, height: 180 },
    { name: "A4", parent: "A", width: 300, height: 220 },
    { name: "A5", parent: "A", width: 300, height: 190 },
    { name: "A6", parent: "A", width: 300, height: 210 },
  ];

  // const linuxData = xv6.map((item) => ({
  //   ...item,
  //   width: item.value === 1 ? 100 : item.value,
  //   height: 100,
  // }));

  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(1000);

  return (
    <>
      <section className="section">
        <div className="container">
          <h1 className="title">Rooted Tree Drawing</h1>
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
              <Tree data={flareData} width={width} height={height} />
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
