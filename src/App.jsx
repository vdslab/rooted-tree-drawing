import Tree from "./Tree";

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
  return (
    <>
      <section className="section">
        <div className="container">
          <h1 className="title">Rooted Tree Drawing</h1>
          <div className="box">
            <figure className="figure">
              <Tree data={data} width={1000} height={1000} />
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
