import { useRoutes } from "react-router-dom";
import { Toaster } from "sonner";
import routes from "./routes";

function App() {
  const content = useRoutes(routes);
  return (
    <>
      {content}
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
