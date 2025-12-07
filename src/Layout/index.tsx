import {
  AppstoreOutlined,
  HomeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Layout as AntdLayout, Button, Menu, theme } from "antd";
import { FC, useState, useEffect, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

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

  // A. 先检查窗口是否已经存在
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    // 如果已存在，就让它聚焦（跳到最前面），不要重复创建
    await existing.setFocus();
    return;
  }

  // B. 创建新窗口
  const newWin = new WebviewWindow(label, {
    url: "/logs",
    title: "运行日志",
    width: 800,
    height: 600,
    resizable: true,
    decorations: true,
  });

  newWin.once("tauri://created", () => {
    console.log("日志窗口已创建");
  });

  newWin.once("tauri://error", (e) => {
    console.error("日志窗口创建失败", e);
  });
};

const Layout: FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 初始化时检查窗口是否最大化，以显示正确的图标
  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    // 监听窗口大小变化事件 (可选优化)
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const getSelectedKey = useMemo(() => {
    const path = location.pathname;

    // 只要路径里包含关键词，就高亮对应的菜单
    if (path.includes("/subscriptions")) return ["/subscriptions"];
    if (path.includes("/settings")) return ["/settings"]; // ✅ 新增支持

    // 默认回退到 home
    return ["/home"];
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white">
      {/* --- 自定义标题栏 --- */}
      {/* data-tauri-drag-region: 让这块区域可以按住拖拽窗口 */}
      <div
        data-tauri-drag-region
        className="flex justify-between app-drag items-center h-10 bg-white select-none border-b border-gray-100 px-2"
      >
        {/* 左侧功能区 */}
        <div className="flex items-center">
          {/* 🌟 核心按钮：点击打开日志新窗口 */}
          <Button type="text" onClick={handleOpenWindow} title="打开运行日志">
            <TerminalSvgIcon />
          </Button>
        </div>

        {/* 右侧窗口控制区 (app-no-drag: 这里的按钮不能用来拖拽，否则无法点击) */}
        <div className="flex items-center app-no-drag">
          {/* 最小化 */}
          <Button
            onClick={() => appWindow.minimize()}
            type="text"
            className="flex items-center justify-center hover:bg-gray-100"
          >
            {icons.min}
          </Button>

          {/* 最大化 / 还原 */}
          <Button
            onClick={async () => {
              await appWindow.toggleMaximize();
              setIsMaximized(await appWindow.isMaximized());
            }}
            type="text"
            className="flex items-center justify-center hover:bg-gray-100"
          >
            {/* 根据状态切换图标 */}
            {isMaximized ? icons.restore : icons.max}
          </Button>

          {/* 关闭 */}
          <Button
            onClick={() => appWindow.close()}
            type="text"
            danger // Antd 的 danger 属性会让 hover 变红
            className="flex items-center justify-center hover:bg-red-500 hover:text-white"
          >
            {icons.close}
          </Button>
        </div>
      </div>

      {/* --- 主体布局 --- */}
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
            // 简单的路由匹配高亮
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
