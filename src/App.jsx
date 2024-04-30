import Tree from "./Tree";

function createData() {
  return [
    { name: "Eve", parent: "" },
    { name: "Cain", parent: "Eve" },
    { name: "Seth", parent: "Eve" },
    { name: "Enos", parent: "Seth" },
    { name: "Noam", parent: "Seth" },
    { name: "Abel", parent: "Eve" },
    { name: "Awan", parent: "Eve" },
    { name: "Enoch", parent: "Awan" },
    { name: "Azura", parent: "Eve" },
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
