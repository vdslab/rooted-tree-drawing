import { useMemo } from "react";
// import * as d3 from "d3";
import { permutation } from "./permutation";
import { bin } from "./bin";

export default function Tree({ data, width, height, func }) {
  const nodes = useMemo(() => {
    return func(data, width, height, 2);
  }, [data, width, height]);
  // const line = d3.line();
  return (
    <svg className="has-ratio" viewBox={`0 0 ${width} ${height}`}>
      <g>
        {/* <g>
          {links.map((link) => {
            return (
              <g key={link.id} id={link.id}>
                <path d={line(link.segments)} fill="none" stroke="#888" />
              </g>
            );
          })}
        </g> */}
        <g>
          {console.log(nodes)}
          {nodes.map((node) => {
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                <rect
                  x={-node.width / 2}
                  y={-node.height / 2}
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
