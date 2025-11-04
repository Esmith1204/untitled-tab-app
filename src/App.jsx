import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import Footer from "./components/footer";
import Navbar from "./components/navbar"

function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
      <Footer />

    </div>
  );
}

export default App;
