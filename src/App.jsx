import Tree from "./Tree";
import TreemapView from "./TreemapView";
import IcicleView from "./IcicleView";
import { useState } from "react";
import d3Data from "../d3_tree.json";
import d3DataLog from "../d3_tree_log.json";
import gormData from "../gorm_nodelink.json";
import gormTreemapData from "../gorm_treemap.json";

export default function App() {
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(1000);
  const [viewType, setViewType] = useState("treemap");

  const renderView = () => {
    switch (viewType) {
      case "tree":
        // const treeData = d3Data.map((item) => ({
        //   ...item,
        //   width: item.height,
        //   height: item.width,
        // }));
        return <Tree data={gormData} width={width} height={height} />;
      case "treemap":
        return (
          <TreemapView data={gormTreemapData} width={width} height={height} />
        );
      case "icicle":
        return (
          <IcicleView data={gormTreemapData} width={width} height={height} />
        );
      default:
        return <Tree data={gormData} width={width} height={height} />;
    }
  };
  return (
    <>
      <section className="section">
        <div className="container">
          <h1 className="title">
            D3 Tree Visualization ({gormTreemapData.length} nodes)
          </h1>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ marginRight: "10px" }}>View Type:</label>
            <button
              onClick={() => setViewType("treemap")}
              style={{
                backgroundColor: viewType === "treemap" ? "#00bfff" : "#ddd",
                padding: "5px 10px",
                marginRight: "5px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Treemap
            </button>
            <button
              onClick={() => setViewType("icicle")}
              style={{
                backgroundColor: viewType === "icicle" ? "#00bfff" : "#ddd",
                padding: "5px 10px",
                marginRight: "5px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Icicle Tree
            </button>
            <button
              onClick={() => setViewType("tree")}
              style={{
                backgroundColor: viewType === "tree" ? "#00bfff" : "#ddd",
                padding: "5px 10px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Node-Link Tree
            </button>
          </div>

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
              {renderView()}
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
