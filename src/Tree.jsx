import { useMemo } from "react";
import * as d3 from "d3";
import { layout } from "./layout";

export default function Tree({ data, width, height }) {
  const { nodes, links } = useMemo(() => {
    return layout(data, width, height);
  }, [data, width, height]);
  const line = d3.line();
  return (
    <svg className="has-ratio" viewBox={`0 0 ${width} ${height}`}>
      <g>
        <g>
          {links.map((link) => {
            return (
              <g key={link.id}>
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
                  x={0}
                  y={0}
                  width={node.width}
                  height={node.height}
                  fill="#fff"
                  stroke="#888"
                />
                <text textAnchor="middle" dominantBaseline="central">
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
