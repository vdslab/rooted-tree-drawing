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
    { name: "RCAEV", parent: "SSSKG", width: 380, height: 166 },
    { name: "HEQHX", parent: "SSSKG", width: 2058, height: 1986 },
    { name: "WRSKY", parent: "RCAEV", width: 872, height: 1913 },
    { name: "SYDPK", parent: "GLLOP", width: 919, height: 557 },
    { name: "MPMSF", parent: "SSSKG", width: 1064, height: 1770 },
    { name: "SHACS", parent: "RCAEV", width: 1102, height: 1347 },
    { name: "GUVZD", parent: "XBGRW", width: 109, height: 157 },
    { name: "DBSBE", parent: "SSSKG", width: 1370, height: 137 },
    { name: "UDIUF", parent: "SSSKG", width: 845, height: 2076 },
    { name: "KPLLR", parent: "Eve", width: 2031, height: 1810 },
    { name: "AWOJU", parent: "SSSKG", width: 320, height: 1423 },
    { name: "CJPXH", parent: "GLLOP", width: 353, height: 1301 },
    { name: "SGFJP", parent: "SSSKG", width: 800, height: 848 },
    { name: "WBMKE", parent: "SSSKG", width: 1093, height: 1533 },
    { name: "YZGLV", parent: "XBGRW", width: 1413, height: 1546 },
    { name: "BJQDS", parent: "Eve", width: 804, height: 469 },
    { name: "CUZKS", parent: "SSSKG", width: 1768, height: 1794 },
    { name: "SHJQT", parent: "XBGRW", width: 1948, height: 1439 },
    { name: "YBCIU", parent: "XBGRW", width: 1142, height: 1916 },
    { name: "EWPWM", parent: "Eve", width: 855, height: 413 },
    { name: "IBYZJ", parent: "SSSKG", width: 676, height: 1360 },
    { name: "MFBDP", parent: "SSSKG", width: 520, height: 1832 },
    { name: "TCWPW", parent: "SSSKG", width: 990, height: 1650 },
    { name: "YXSXG", parent: "SSSKG", width: 557, height: 2062 },
    { name: "DGNFU", parent: "SSSKG", width: 902, height: 398 },
    { name: "UYSUO", parent: "SSSKG", width: 412, height: 423 },
    { name: "KMMMS", parent: "Eve", width: 288, height: 1342 },
    { name: "CECRR", parent: "SSSKG", width: 1672, height: 1150 },
    { name: "SGPBZ", parent: "Eve", width: 1162, height: 1296 },
    { name: "MBQJY", parent: "SSSKG", width: 1305, height: 489 },
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
