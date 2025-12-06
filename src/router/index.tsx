import { Navigate, useRoutes } from "react-router";
import Home from "../pages/Home";
import Subscriptions from "../pages/Subscriptions";

const AppRoutes = () => {
  return useRoutes([
    {
      path: "/home",
      element: <Home />,
    },
    {
      path: "/subscriptions",
      element: <Subscriptions />,
    },
    {
      path: "/",
      element: <Navigate to="/home" />
    }
  ]);
};

export default AppRoutes;
