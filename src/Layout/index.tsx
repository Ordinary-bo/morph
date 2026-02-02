import {
  AppstoreOutlined,
  HomeOutlined,
  SettingOutlined,
  RocketOutlined,
  DesktopOutlined,
} from "@ant-design/icons";
import { Layout as AntdLayout, Button, Menu, theme, App } from "antd";
import { FC, useState, useEffect, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { homeStore } from "../store/homeStore";
import { useUpdateCheck } from "../hooks/useUpdateCheck";

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

const handleOpenConsole = async () => {
  await invoke("open_devtools");
};

const Layout: FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation();
  const { message } = App.useApp();

  // ✅ 使用 Hook
  const { checkUpdate } = useUpdateCheck();

  const {
    token: { colorBgContainer, colorPrimary },
  } = theme.useToken();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });

    // ✅ 启动时静默检查更新 (true 代表 silent mode)
    checkUpdate(true);

    return () => {
      unlisten.then((f) => f());
    };
  }, []); // 空依赖数组，只在启动时执行一次

  // 监听托盘点击事件
  useEffect(() => {
    const unlistenPromise = listen("tray-toggle-proxy", async () => {
      const { isRunning, selectedNodeId, mode } = homeStore.getSnapshot();

      if (isRunning) {
        // 停止
        homeStore.setIsRunning(false);
        homeStore.setConnectedNodeId(null);
        try {
          await invoke("stop_singbox");
          message.success("代理已停止");
        } catch (e) {
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
          <Button type="text" onClick={handleOpenConsole} title="打开控制台">
            <DesktopOutlined size={22} />
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
          <div className="h-16 flex items-center justify-center border-b border-gray-100 mb-2 overflow-hidden">
            {collapsed ? (
              <RocketOutlined style={{ fontSize: 24, color: colorPrimary }} />
            ) : (
              <span className="text-2xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                Morph
              </span>
            )}
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
