import { useMemo } from "react";
import * as d3 from "d3";
// 行管理版
// import { layout } from "./SALayout";
// 列管理版
import { layout } from "./saColumnLayout";
// import { layout } from "./layout";
export default function Tree({ data, width, height }) {
  // debugger;
  const { nodes, links } = useMemo(() => {
    return layout(data, width, height);
  }, [data, width, height]);
  const line = d3.line();
  return (
    <svg
      className="has-ratio"
      // width={width}
      // height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <g>
        <g>
          {links.map((link) => {
            return (
              <g key={link.id} id={link.id}>
                <path d={line(link.segments)} fill="none" stroke="#888" />
              </g>
            );
          })}
        </g>
        <g>
          {nodes.map((node) => {
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                <rect
                  x={-node.width / 2}
                  y={-node.height / 2}
                  width={node.width}
                  height={node.height}
                  // fill={node.isLeaf ? "#e3f2fd" : "#fff3e0"}
                  // stroke={node.isLeaf ? "#1976d2" : "#f57c00"}
                  fill={"#e3f2fd"}
                  stroke={"#1976d2"}
                  style={{ cursor: "pointer" }}
                >
                  <title>{node.id}</title>
                </rect>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
