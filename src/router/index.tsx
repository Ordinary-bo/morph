import { useRoutes } from "react-router";
import Subscriptions from "../pages/subscriptions";
import Home from "../pages/Home";

const AppRoutes = () => {
  return useRoutes([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/subscriptions",
      element: <Subscriptions />,
    },
  ]);
};

export default AppRoutes;
