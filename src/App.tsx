import { BrowserRouter } from "react-router";
import { App as AntdApp, ConfigProvider } from "antd";
import ZH from "antd/es/locale/zh_CN";
import AppRoutes from "./router";

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider locale={ZH} theme={{}}>
        <AntdApp className="h-screen">
            <AppRoutes />
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
