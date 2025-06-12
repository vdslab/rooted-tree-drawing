import Tree from "./Tree";
import { useState } from "react";
// import { generateTree } from "./randomData";
function createData() {
  return [
    { name: "Eve", parent: "", width: 1825, height: 828 },
    { name: "SSSKG", parent: "Eve", width: 20000, height: 828 },
    { name: "JPIKV", parent: "SSSKG", width: 1173, height: 624 },
    { name: "OXWES", parent: "Eve", width: 1537, height: 1039 },
    { name: "XBGRW", parent: "Eve", width: 1356, height: 905 },
    { name: "ROCNT", parent: "SSSKG", width: 425, height: 313 },
    { name: "CKGTQ", parent: "SSSKG", width: 1353, height: 527 },
    { name: "EPOBB", parent: "Eve", width: 367, height: 278 },
    { name: "FJASQ", parent: "SSSKG", width: 524, height: 1991 },
    { name: "EJHZA", parent: "SSSKG", width: 1604, height: 1919 },
    { name: "KOKID", parent: "SSSKG", width: 1697, height: 991 },
    { name: "LAZHN", parent: "XBGRW", width: 397, height: 507 },
    { name: "GLLOP", parent: "Eve", width: 1074, height: 383 },
    { name: "VKTFI", parent: "SSSKG", width: 1866, height: 1662 },
    { name: "HRUUC", parent: "SSSKG", width: 667, height: 371 },
    { name: "PZAOX", parent: "SSSKG", width: 539, height: 1516 },
    { name: "YMERP", parent: "SSSKG", width: 1722, height: 1103 },
    { name: "LXKYT", parent: "Eve", width: 661, height: 1669 },
    // { name: "RCAEV", parent: "SSSKG", width: 380, height: 166 },
    // { name: "HEQHX", parent: "SSSKG", width: 2058, height: 1986 },
    // { name: "WRSKY", parent: "RCAEV", width: 872, height: 1913 },
    // { name: "SYDPK", parent: "GLLOP", width: 919, height: 557 },
    // { name: "MPMSF", parent: "SSSKG", width: 1064, height: 1770 },
    // { name: "SHACS", parent: "RCAEV", width: 1102, height: 1347 },
    // { name: "GUVZD", parent: "XBGRW", width: 109, height: 157 },
    // { name: "DBSBE", parent: "SSSKG", width: 1370, height: 137 },
    // { name: "UDIUF", parent: "SSSKG", width: 845, height: 2076 },
    // { name: "KPLLR", parent: "Eve", width: 2031, height: 1810 },
  ];
}

export default function App() {
  const data = createData();
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
              setWidth(e.target.width.value);
              setHeight(e.target.height.value);
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

          <div className="box">
            <figure className="figure">
              <Tree data={data} width={width} height={height} />
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
