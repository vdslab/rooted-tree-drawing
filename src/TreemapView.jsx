import { useMemo, useRef } from "react";
import * as d3 from "d3";

export default function TreemapView({ data, width, height }) {
  const svgRef = useRef(null);

  const { nodes, root } = useMemo(() => {
    // 階層構造を作成（valueはそのまま使用）
    const stratify = d3
      .stratify()
      .id((d) => d.name)
      .parentId((d) => d.parent);

    const root = stratify(data);

    // valueを集計（sum()を使って階層構造の値を計算）
    root.sum((d) => d.value || 0);

    // treemapレイアウトを適用
    const treemap = d3.treemap().size([width, height]).padding(0);

    treemap(root);

    // ノードデータを抽出（親のパスも保存）
    const nodes = root.descendants().map((node) => ({
      id: node.data.name,
      x: node.x0,
      y: node.y0,
      width: node.x1 - node.x0,
      height: node.y1 - node.y0,
      value: node.value,
      depth: node.depth,
      parent: node.parent ? node.parent.data.name : null,
      node: node,
    }));

    return { nodes, root };
  }, [data, width, height]);

  // D3のデフォルト色スケール
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  const downloadPNG = (scale = 3) => {
    if (!svgRef.current) return;

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const canvas = document.createElement("canvas");
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext("2d");

    // Fill background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, scaledWidth, scaledHeight);

    // Draw nodes
    ctx.fillStyle = "#e3f2fd";
    ctx.strokeStyle = "#1976d2";
    ctx.lineWidth = 1 * scale;
    nodes.forEach((node) => {
      const x = node.x * scale;
      const y = node.y * scale;
      const w = node.width * scale;
      const h = node.height * scale;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `treemap-${scaledWidth}x${scaledHeight}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadSVG = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current.cloneNode(true);
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgElement.setAttribute("width", width);
    svgElement.setAttribute("height", height);

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treemap-${width}x${height}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
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
      </div>
      <svg
        ref={svgRef}
        className="has-ratio"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <g>
          {nodes.map((node) => (
            <rect
              key={node.id}
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              // fill={colorScale(node.depth)}
              // stroke="#fff"
              fill={"#e3f2fd"}
              stroke={"#1976d2"}
              strokeWidth={1}
              style={{ cursor: "pointer" }}
            >
              <title>{node.id}</title>
            </rect>
          ))}
        </g>
      </svg>
    </div>
  );
}
