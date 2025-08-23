import { BrowserRouter } from "react-router";
import { App as AntdApp, ConfigProvider } from "antd";
import ZH from "antd/es/locale/zh_CN";
import Layout from "./Layout";
import AppRoutes from "./router";

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider locale={ZH} theme={{}}>
        <AntdApp className="h-screen">
          <Layout>
            <AppRoutes />
          </Layout>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
