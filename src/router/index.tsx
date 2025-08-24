import { NavLink, useRoutes } from "react-router";
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
      element: <NavLink to="/home"/>
    }
  ]);
};

export default AppRoutes;
