import { AppstoreOutlined, HomeOutlined } from "@ant-design/icons";
import { Layout as AntdLayout, Button, Menu } from "antd";
import { FC, ReactNode, useState } from "react";
import { Link, useLocation } from "react-router";
import { Window } from "@tauri-apps/api/window";
import {
  TerminalSvgIcon,
  WinUIOpCloseSvgIcon,
  WinUIOpMaxSvgIcon,
  WinUIOpMinSvgIcon,
  WinUIOpRestoreSvgIcon,
} from "../assets/svg";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const appWindow = new Window("main");
const { Sider, Content } = AntdLayout;

const icons = {
  min: <WinUIOpMinSvgIcon />,
  max: <WinUIOpMaxSvgIcon />,
  restore: <WinUIOpRestoreSvgIcon />,
  close: <WinUIOpCloseSvgIcon />,
};

const items = [
  {
    label: <Link to="/home">Home</Link>,
    key: "/home",
    icon: <HomeOutlined />,
  },
  {
    label: <Link to="/subscriptions">Subscriptions</Link>,
    key: "/subscriptions",
    icon: <AppstoreOutlined />,
  },
];

const handleOpenWindow = () => {
  const newWin = new WebviewWindow("console", {
    url: "console.html",
    title: "日志",
    width: 800,
    height: 600,
    resizable: true,
  });
  newWin.once("tauri://created", () => {
    console.log("新窗口已创建");
  });

  newWin.once("tauri://error", (e) => {
    console.error("新窗口创建失败", e);
  });
};

const Layout: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between h-9 bg-white select-none app-drag">
        <div>
          <Button color="default" variant="link" onClick={handleOpenWindow}>
            <TerminalSvgIcon />
          </Button>
        </div>
        <div className=" text-white app-no-drag">
          <Button onClick={appWindow.minimize} color="default" variant="link">
            {icons.min}
          </Button>
          <Button
            onClick={() => {
              appWindow.toggleMaximize();
              setIsMaximized((prev) => !prev);
            }}
            color="default"
            variant="link"
          >
            {isMaximized ? icons.restore : icons.max}
          </Button>
          <Button onClick={appWindow.close} color="default" variant="link">
            {icons.close}
          </Button>
        </div>
      </div>
      <AntdLayout className="flex-1">
        <Sider
          width={200}
          className="!bg-white"
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <div className="h-12 flex items-center justify-center text-xl font-bold">
            MyApp
          </div>
          <SidebarMenu />
        </Sider>

        <AntdLayout className="bg-gray-50">
          <Content className="p-4 overflow-auto">{children}</Content>
        </AntdLayout>
      </AntdLayout>
    </div>
  );
};

// 菜单组件，自动根据路由高亮
const SidebarMenu = () => {
  const location = useLocation();

  return (
    <Menu mode="inline" selectedKeys={[location.pathname]} items={items} />
  );
};

export default Layout;
