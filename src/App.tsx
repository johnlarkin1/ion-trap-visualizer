import IonTrapVisualizer from "./IonTrapVisualizer";

function App() {
  return (
    <div className="dark min-h-screen bg-background">
      <div
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <IonTrapVisualizer />
      </div>
    </div>
  );
}

export default App;
