import Tree from "./Tree";
import { useState } from "react";
import { generateTree } from "./randomData";

function createData() {
  return [
    { name: "Eve", parent: "", width: 1924, height: 1844 },
    { name: "SCTWC", parent: "Eve", width: 773, height: 1394 },
    { name: "ECDHA", parent: "SCTWC", width: 227, height: 530 },
    { name: "NZDNL", parent: "SCTWC", width: 888, height: 969 },
    { name: "QDGBG", parent: "NZDNL", width: 1659, height: 1696 },
    { name: "ZCQDV", parent: "Eve", width: 543, height: 668 },
    { name: "JSITB", parent: "SCTWC", width: 1409, height: 1876 },
    { name: "GFRQE", parent: "NZDNL", width: 1183, height: 2081 },
    { name: "YJNUZ", parent: "NZDNL", width: 1564, height: 2031 },
    { name: "KHAYD", parent: "NZDNL", width: 1929, height: 1997 },
    { name: "EBEQD", parent: "SCTWC", width: 1635, height: 862 },
    { name: "RZWGP", parent: "QDGBG", width: 1655, height: 204 },
    { name: "LLSTP", parent: "NZDNL", width: 1657, height: 346 },
    { name: "EYXDX", parent: "SCTWC", width: 1009, height: 509 },
    { name: "MANFJ", parent: "SCTWC", width: 153, height: 1061 },
    { name: "SZHIU", parent: "QDGBG", width: 1039, height: 282 },
    { name: "LUHRL", parent: "NZDNL", width: 233, height: 1625 },
    { name: "MBCQV", parent: "SCTWC", width: 1421, height: 1933 },
    { name: "AAOCN", parent: "RZWGP", width: 831, height: 548 },
    { name: "KLRYG", parent: "SCTWC", width: 678, height: 1009 },
    { name: "KUOCL", parent: "SCTWC", width: 121, height: 692 },
    { name: "TKURL", parent: "Eve", width: 621, height: 439 },
    { name: "DKBMG", parent: "NZDNL", width: 1950, height: 502 },
    { name: "QFHER", parent: "Eve", width: 1085, height: 581 },
    { name: "AGPHT", parent: "NZDNL", width: 1395, height: 543 },
    { name: "PKWNK", parent: "QDGBG", width: 1354, height: 265 },
    { name: "VPPLO", parent: "Eve", width: 1148, height: 236 },
    { name: "SBNBJ", parent: "SCTWC", width: 566, height: 1713 },
    { name: "BXBKJ", parent: "QDGBG", width: 264, height: 2036 },
    { name: "MOFVV", parent: "Eve", width: 301, height: 944 },
    { name: "XTZMS", parent: "NZDNL", width: 607, height: 1245 },
    { name: "WYMDP", parent: "QDGBG", width: 1119, height: 1589 },
    { name: "APBAN", parent: "SCTWC", width: 1543, height: 1327 },
    { name: "CIVLC", parent: "Eve", width: 1707, height: 487 },
    { name: "USFZW", parent: "NZDNL", width: 1612, height: 873 },
    { name: "WILMI", parent: "NZDNL", width: 1035, height: 497 },
    { name: "BJMJL", parent: "QDGBG", width: 795, height: 1549 },
    { name: "RKSFR", parent: "QDGBG", width: 1290, height: 503 },
    { name: "UUNAE", parent: "Eve", width: 1471, height: 248 },
    { name: "OGFNY", parent: "QDGBG", width: 1601, height: 1546 },
    { name: "CAUIQ", parent: "QDGBG", width: 166, height: 1727 },
    { name: "BKHKE", parent: "Eve", width: 1004, height: 2066 },
    { name: "IMJSD", parent: "QDGBG", width: 1537, height: 814 },
    { name: "XEYLC", parent: "Eve", width: 819, height: 1473 },
    { name: "LGCMO", parent: "QDGBG", width: 319, height: 1151 },
    { name: "KJRQR", parent: "PKWNK", width: 101, height: 661 },
    { name: "JTWMP", parent: "VPPLO", width: 211, height: 1838 },
    { name: "LHAJQ", parent: "Eve", width: 347, height: 1140 },
    { name: "RUDNJ", parent: "TKURL", width: 187, height: 130 },
    { name: "SORBT", parent: "RZWGP", width: 1965, height: 672 },
  ];
}

export default function App() {
  // const data = createData();
  const data = [
    { name: "Eve", parent: "", width: 822, height: 498 },
    { name: "HAVET", parent: "Eve", width: 996, height: 688 },
    { name: "YCACA", parent: "Eve", width: 516, height: 2001 },
    { name: "MHPHE", parent: "HAVET", width: 544, height: 1622 },
    { name: "FQFKA", parent: "HAVET", width: 1425, height: 845 },
    { name: "KFBWY", parent: "HAVET", width: 838, height: 1192 },
    { name: "HACGG", parent: "Eve", width: 1233, height: 1064 },
    { name: "LLZGV", parent: "Eve", width: 1716, height: 2019 },
    { name: "OKLEC", parent: "LLZGV", width: 803, height: 211 },
    { name: "WSBWT", parent: "Eve", width: 1177, height: 769 },
    { name: "OMTDC", parent: "HAVET", width: 1695, height: 1693 },
    { name: "BFDYJ", parent: "Eve", width: 663, height: 1026 },
    { name: "GHBDS", parent: "OMTDC", width: 1208, height: 1064 },
    { name: "HTXKC", parent: "HAVET", width: 698, height: 788 },
    { name: "JALMK", parent: "Eve", width: 1171, height: 728 },
    { name: "GDZVC", parent: "Eve", width: 1207, height: 163 },
    { name: "FVQJB", parent: "HAVET", width: 147, height: 437 },
    { name: "ETYML", parent: "HAVET", width: 408, height: 1063 },
    { name: "DPMWG", parent: "ETYML", width: 924, height: 1615 },
    { name: "EFBGF", parent: "OMTDC", width: 406, height: 950 },
    { name: "FHZRR", parent: "HAVET", width: 1859, height: 728 },
    { name: "WREGU", parent: "OMTDC", width: 437, height: 1148 },
    { name: "FCUCY", parent: "ETYML", width: 1910, height: 1401 },
    { name: "KNBIX", parent: "HAVET", width: 1896, height: 1954 },
    { name: "NPAIF", parent: "OMTDC", width: 1779, height: 1504 },
    { name: "RHWJM", parent: "HAVET", width: 2015, height: 1643 },
    { name: "GIXGO", parent: "LLZGV", width: 415, height: 160 },
    { name: "VKLXQ", parent: "ETYML", width: 182, height: 117 },
    { name: "GBFYM", parent: "ETYML", width: 849, height: 938 },
    { name: "RLVNJ", parent: "Eve", width: 1249, height: 1220 },
    { name: "WIMHU", parent: "Eve", width: 1510, height: 315 },
    { name: "DXHXS", parent: "OMTDC", width: 1162, height: 1694 },
    { name: "XFYLI", parent: "ETYML", width: 371, height: 966 },
    { name: "DMSRZ", parent: "MHPHE", width: 197, height: 1110 },
    { name: "OIPZC", parent: "RHWJM", width: 685, height: 1125 },
    { name: "QZWAN", parent: "ETYML", width: 2001, height: 526 },
    { name: "NAYSZ", parent: "ETYML", width: 463, height: 838 },
    { name: "KJVAB", parent: "RHWJM", width: 623, height: 698 },
    { name: "KJDYK", parent: "ETYML", width: 1210, height: 1420 },
    { name: "RLTWK", parent: "ETYML", width: 2004, height: 304 },
    { name: "JDELO", parent: "MHPHE", width: 1318, height: 501 },
    { name: "JALDK", parent: "OMTDC", width: 620, height: 987 },
    { name: "UNJVE", parent: "OIPZC", width: 1076, height: 1868 },
    { name: "ETKIS", parent: "LLZGV", width: 1848, height: 2024 },
    { name: "DPTFB", parent: "DPMWG", width: 614, height: 926 },
    { name: "TLRBZ", parent: "ETYML", width: 513, height: 1154 },
    { name: "SLFNU", parent: "MHPHE", width: 730, height: 522 },
    { name: "GSVDM", parent: "OIPZC", width: 319, height: 1899 },
    { name: "PKVMP", parent: "OIPZC", width: 1202, height: 962 },
    { name: "ZIGLP", parent: "OMTDC", width: 659, height: 854 },
  ];
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
