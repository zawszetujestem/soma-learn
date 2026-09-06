import { Outlet } from "react-router-dom";

import Shell from "./components/Shell";

export default function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
