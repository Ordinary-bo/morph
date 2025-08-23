import { BrowserRouter } from "react-router";
import AppRoutes from "./router";
function App() {
  return (
    <main className="container">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </main>
  );
}

export default App;
