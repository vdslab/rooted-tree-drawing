import Tree from "./Tree";
import { useEffect, useState } from "react";

function createData(num) {
  const data = [];
  for(let i = 0; i < num; i++) {
    const width = 50 + Math.floor(Math.random() * 1000);
    const height  = 50 + Math.floor(Math.random() * 1000);
    data.push({"name":`${i}`, "key":`${i}`, "width":width, "height":height});
  }
  return data;
}

export default function App() {
  const [nodeNum, setNodeNum] = useState(4);
  const data = createData(nodeNum);
  return (
    <>
      <section className="section">
        <div className="container">
          <h1 className="title">Rooted Tree Drawing</h1>
          <form className="input"
            onSubmit={(e) => {
              e.preventDefault();
              setNodeNum(e.target.nodeNum.value);
            }}
          >
            <label htmlFor="nodeNum">ノード数:</label>
            <input id="nodeNum" name="nodeNum" type="number" defaultValue={nodeNum} style={{ marginRight: "10px" }} />
            <button type="submit" style={{ backgroundColor: "#00bfff" , padding:"5px"}}>set</button>
          </form>

          <div className="box">
            <figure className="figure">
              <Tree data={data} width={1000} height={1000} nodeNum={nodeNum} />
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
