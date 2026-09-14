import { useMemo, useRef } from "react";
import * as d3 from "d3";
// 手法の切り替えは src/uiLayout.js の METHOD で行う
import { layout } from "./uiLayout";
export default function Tree({ data, width, height }) {
  const svgRef = useRef(null);

  const { nodes, links } = useMemo(() => {
    return layout(data, width, height);
  }, [data, width, height]);

  const line = d3.line();

  // const downloadPNG = (scale = 3) => {
  //   if (!svgRef.current) return;

  //   const svgElement = svgRef.current;
  //   const scaledWidth = width * scale;
  //   const scaledHeight = height * scale;

  //   // Create canvas
  //   const canvas = document.createElement("canvas");
  //   canvas.width = scaledWidth;
  //   canvas.height = scaledHeight;
  //   const ctx = canvas.getContext("2d");

  //   // Fill background
  //   ctx.fillStyle = "white";
  //   ctx.fillRect(0, 0, scaledWidth, scaledHeight);

  //   // Draw links
  //   ctx.strokeStyle = "#888";
  //   ctx.lineWidth = 1 * scale;
  //   links.forEach((link) => {
  //     ctx.beginPath();
  //     ctx.moveTo(link.segments[0][0] * scale, link.segments[0][1] * scale);
  //     ctx.lineTo(link.segments[1][0] * scale, link.segments[1][1] * scale);
  //     ctx.stroke();
  //   });

  //   // Draw nodes
  //   ctx.fillStyle = "#e3f2fd";
  //   ctx.strokeStyle = "#1976d2";
  //   ctx.lineWidth = 1 * scale;
  //   nodes.forEach((node) => {
  //     const x = (node.x - node.width / 2) * scale;
  //     const y = (node.y - node.height / 2) * scale;
  //     const w = node.width * scale;
  //     const h = node.height * scale;
  //     ctx.fillRect(x, y, w, h);
  //     ctx.strokeRect(x, y, w, h);
  //   });

  //   // Download
  //   canvas.toBlob((blob) => {
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = `tree-${scaledWidth}x${scaledHeight}.png`;
  //     a.click();
  //     URL.revokeObjectURL(url);
  //   });
  // };

  // const downloadSVG = () => {
  //   if (!svgRef.current) return;

  //   const svgElement = svgRef.current.cloneNode(true);
  //   svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  //   svgElement.setAttribute("width", width);
  //   svgElement.setAttribute("height", height);

  //   const svgString = new XMLSerializer().serializeToString(svgElement);
  //   const blob = new Blob([svgString], { type: "image/svg+xml" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `tree-${width}x${height}.svg`;
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          display: "flex",
          gap: "5px",
        }}
      >
        <button
          onClick={() => downloadPNG(2)}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "12px",
            borderRadius: "4px",
          }}
        >
          PNG 2x
        </button>
        <button
          onClick={() => downloadPNG(3)}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "12px",
            borderRadius: "4px",
          }}
        >
          PNG 3x
        </button>
        <button
          onClick={() => downloadPNG(4)}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "12px",
            borderRadius: "4px",
          }}
        >
          PNG 4x
        </button>
        <button
          onClick={downloadSVG}
          style={{
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "12px",
            borderRadius: "4px",
          }}
        >
          SVG
        </button>
      </div> */}
      <svg
        ref={svgRef}
        className="has-ratio"
        style={{ backgroundColor: d3.gray }}
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
