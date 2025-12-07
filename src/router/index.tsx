import { Navigate, useRoutes } from "react-router";
import Home from "../pages/Home";
import Subscriptions from "../pages/Subscriptions";
import Logs from "../pages/Logs";
import Layout from "../Layout";
import SettingsPage from "../pages/Settings";

const AppRoutes = () => {
  return useRoutes([
    {
      element: <Layout />,
      children: [
        {
          path: "/home",
          element: <Home />,
        },
        {
          path: "/subscriptions",
          element: <Subscriptions />,
        },
        { path: "/settings", element: <SettingsPage /> },
        {
          path: "/",
          element: <Navigate to="/home" />,
        },
      ],
    },

    {
      path: "/logs",
      element: <Logs />,
    },
  ]);
};

export default AppRoutes;
