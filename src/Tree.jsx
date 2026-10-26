import { useMemo } from "react";
import * as d3 from "d3";
// 手法の切り替えは src/uiLayout.js の SELECTED で行う
import { layout } from "./uiLayout";
export default function Tree({ data, width, height }) {

  const { nodes, links } = useMemo(() => {
    return layout(data, width, height);
  }, [data, width, height]);

  const line = d3.line();

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        className="has-ratio"
        style={{ backgroundColor: "#ffffff" }}
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
    </div>
  );
}
