import IonTrapVisualizer from "./IonTrapVisualizer";

function App({ width = "100%", height = "100%" }) {
  return (
    <div
      style={{
        width,
        height,
        maxWidth: "100%",
        margin: "0 auto",
      }}
    >
      <IonTrapVisualizer />
    </div>
  );
}

export default App;
