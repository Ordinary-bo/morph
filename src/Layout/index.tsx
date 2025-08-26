import { AppstoreOutlined, HomeOutlined } from "@ant-design/icons";
import { Layout as AntdLayout, Menu } from "antd";
import { FC, ReactNode, useState } from "react";
import { Link, useLocation } from "react-router";

const { Sider, Content } = AntdLayout;

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

const Layout: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <AntdLayout className="h-full">
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
