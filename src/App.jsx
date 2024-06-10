import Tree from "./Tree";
import { useState } from "react";

function createData() {
  return [
    // { name: "Eve", parent: "" },
    // { name: "Cain", parent: "Eve" },
    // { name: "Seth", parent: "Eve" },
    // { name: "Enos", parent: "Seth" },
    // { name: "Noam", parent: "Seth" },
    // { name: "Abel", parent: "Eve" },
    // { name: "Awan", parent: "Eve" },
    // { name: "Enoch", parent: "Awan" },
    // { name: "Azura", parent: "Eve" },
    // { name: "Cainan", parent: "Seth" },
    // { name: "Jaalam", parent: "Seth" },
    // { name: "Mahalalel", parent: "Cainan" },
    // { name: "Methuselah", parent: "Mahalalel" },
    // { name: "Lamech", parent: "Methuselah" },
    // { name: "Jared", parent: "Lamech" },
    // { name: "Tubal-cain", parent: "Jared" }, 
    // { name: "Naamah", parent: "Jared" }, 
    { name: "Eve", parent: "" },
    { name: "Cain", parent: "Eve" },
    { name: "Seth", parent: "Eve" },
    { name: "Enos", parent: "Seth" },
    { name: "Noam", parent: "Seth" },
    { name: "Abel", parent: "Eve" },
    { name: "Awan", parent: "Eve" },
    { name: "Enoch", parent: "Awan" },
    { name: "Azura", parent: "Eve" },
    { name: "Cainan", parent: "Seth" },
    { name: "Jaalam", parent: "Seth" },
    { name: "Mahalalel", parent: "Cainan" },
    { name: "Methuselah", parent: "Mahalalel" },
    { name: "Lamech", parent: "Methuselah" },
    { name: "Jared", parent: "Lamech" },
    { name: "Tubal-cain", parent: "Jared" },
    { name: "Naamah", parent: "Jared" },
    { name: "Isaac", parent: "Seth" },
    { name: "Ishmael", parent: "Seth" },
    { name: "Zillah", parent: "Awan" },
    { name: "Adah", parent: "Awan" },
    { name: "Barak", parent: "Enos" },
    { name: "Deborah", parent: "Enos" },
    { name: "Ephraim", parent: "Cainan" },
    { name: "Manasseh", parent: "Cainan" },
    { name: "Jesse", parent: "Noam" },
    { name: "David", parent: "Noam" },
    { name: "Solomon", parent: "Noam" },
    { name: "Absalom", parent: "Noam" },
    { name: "Jonadab", parent: "Lamech" },
    { name: "Elijah", parent: "Lamech" },
    { name: "Elisha", parent: "Lamech" },
    { name: "Uriah", parent: "Jaalam" },
    { name: "Bathsheba", parent: "Jaalam" },
    { name: "Rehoboam", parent: "Jaalam" },
    { name: "Abijah", parent: "Jaalam" },
    { name: "Asa", parent: "Jaalam" },
    { name: "Jehoshaphat", parent: "Jaalam" },
    { name: "Joram", parent: "Methuselah" },
    { name: "Ahaziah", parent: "Methuselah" },
    { name: "Joash", parent: "Methuselah" },
    { name: "Amaziah", parent: "Methuselah" },
    { name: "Uzziah", parent: "Methuselah" },
    { name: "Jotham", parent: "Methuselah" },
    { name: "Ahaz", parent: "Methuselah" },
    { name: "Hezekiah", parent: "Methuselah" },
    { name: "Amon", parent: "Methuselah" },
    { name: "Josiah", parent: "Methuselah" },
    { name: "Jehoahaz", parent: "Methuselah" },
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
          <form className="input"
            onSubmit={(e) => {
              e.preventDefault();
              setWidth(e.target.width.value);
              setHeight(e.target.height.value);
            }}
          >
            <label htmlFor="width">width:</label>
            <input id="width" name="width" type="number" defaultValue={width} style={{ marginRight: "10px" }} />
            <label htmlFor="height" >height:</label>
            <input id="height" type="number" defaultValue={height} style={{ marginRight: "10px" }} />
            <button type="submit" style={{ backgroundColor: "#00bfff" , padding:"5px"}}>set</button>
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
