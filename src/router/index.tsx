import { Navigate, useRoutes } from "react-router";
import Subscriptions from "../pages/Subscriptions";
import Home from "../pages/Home";

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
