import {
  AppstoreOutlined,
  HomeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Layout as AntdLayout, Button, Menu, theme, App } from "antd";
import { FC, useState, useEffect, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event"; 
import { invoke } from "@tauri-apps/api/core"; 
import { homeStore } from "../store/homeStore"; 

import {
  TerminalSvgIcon,
  WinUIOpCloseSvgIcon,
  WinUIOpMaxSvgIcon,
  WinUIOpMinSvgIcon,
  WinUIOpRestoreSvgIcon,
} from "../assets/svg";

const { Sider, Content } = AntdLayout;

const appWindow = getCurrentWindow();

const icons = {
  min: <WinUIOpMinSvgIcon />,
  max: <WinUIOpMaxSvgIcon />,
  restore: <WinUIOpRestoreSvgIcon />,
  close: <WinUIOpCloseSvgIcon />,
};

const items = [
  {
    label: <Link to="/home">首页</Link>,
    key: "/home",
    icon: <HomeOutlined />,
  },
  {
    label: <Link to="/subscriptions">订阅源</Link>,
    key: "/subscriptions",
    icon: <AppstoreOutlined />,
  },
  {
    label: <Link to="/settings">设置</Link>,
    key: "/settings",
    icon: <SettingOutlined />,
  },
];

const handleOpenWindow = async () => {
  const label = "log-monitor";
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }
  const newWin = new WebviewWindow(label, {
    url: "/logs",
    title: "运行日志",
    width: 800,
    height: 600,
    resizable: true,
    decorations: true,
  });
  newWin.once("tauri://created", () => console.log("日志窗口已创建"));
  newWin.once("tauri://error", (e) => console.error("日志窗口创建失败", e));
};

const Layout: FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation();
  const { message } = App.useApp(); // ✅ 获取全局 Message

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // ✅ 核心修复：监听托盘点击事件 (全局有效)
  useEffect(() => {
    const unlistenPromise = listen("tray-toggle-proxy", async () => {
      // 直接从 store 获取快照，无需 state 依赖
      const { isRunning, selectedNodeId, mode } = homeStore.getSnapshot();

      if (isRunning) {
        // 停止
        homeStore.setIsRunning(false);
        homeStore.setConnectedNodeId(null);
        try {
          await invoke("stop_singbox");
          message.success("代理已停止");
        } catch (e) {
          // 失败回滚
          homeStore.setIsRunning(true);
        }
      } else {
        // 启动
        if (!selectedNodeId) {
          return message.warning("请先在首页选择一个节点");
        }
        try {
          await invoke("start_singbox", { nodeId: selectedNodeId, mode });
          homeStore.setIsRunning(true);
          homeStore.setConnectedNodeId(selectedNodeId);
          message.success("代理已启动");
        } catch (e) {
          homeStore.setIsRunning(false);
          homeStore.setConnectedNodeId(null);
          message.error(`启动失败: ${e}`);
        }
      }
    });

    return () => {
      unlistenPromise.then((u) => u());
    };
  }, [message]);

  const getSelectedKey = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/subscriptions")) return ["/subscriptions"];
    if (path.includes("/settings")) return ["/settings"];
    return ["/home"];
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white">
      <div
        data-tauri-drag-region
        className="flex justify-between app-drag items-center h-10 bg-white select-none border-b border-gray-100 px-2"
      >
        <div className="flex items-center">
          <Button type="text" onClick={handleOpenWindow} title="打开运行日志">
            <TerminalSvgIcon />
          </Button>
        </div>

        <div className="flex items-center app-no-drag">
          <Button
            onClick={() => appWindow.minimize()}
            type="text"
            className="flex items-center justify-center hover:bg-gray-100"
          >
            {icons.min}
          </Button>
          <Button
            onClick={async () => {
              await appWindow.toggleMaximize();
              setIsMaximized(await appWindow.isMaximized());
            }}
            type="text"
            className="flex items-center justify-center hover:bg-gray-100"
          >
            {isMaximized ? icons.restore : icons.max}
          </Button>
          <Button
            onClick={() => appWindow.close()}
            type="text"
            danger
            className="flex items-center justify-center hover:bg-red-500 hover:text-white"
          >
            {icons.close}
          </Button>
        </div>
      </div>

      <AntdLayout className="flex-1 overflow-hidden">
        <Sider
          width={220}
          className="border-r border-gray-200"
          style={{ background: colorBgContainer }}
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
        >
          <div className="h-14 flex items-center justify-center text-xl font-bold text-gray-700">
            {collapsed ? "代理" : "代理"}
          </div>
          <Menu
            mode="inline"
            selectedKeys={getSelectedKey}
            items={items}
            style={{ borderRight: 0 }}
          />
        </Sider>

        <AntdLayout className="bg-gray-50">
          <Content className="flex-1 overflow-hidden relative">
            <div className="h-full w-full overflow-auto">
              <Outlet />
            </div>
          </Content>
        </AntdLayout>
      </AntdLayout>
    </div>
  );
};

export default Layout;
