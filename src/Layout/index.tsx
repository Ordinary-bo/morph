import { AppstoreOutlined, HomeOutlined } from "@ant-design/icons";
import { Layout as AntdLayout, Menu } from "antd";
import { FC, ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";

const { Header, Sider, Content } = AntdLayout;

const items = [
  {
    label: <Link to="/home">Home</Link>,
    key: "/home",
    icon: <HomeOutlined />,
    meta: {
      title: "Home",
    },
  },
  {
    label: <Link to="/subscriptions">Subscriptions</Link>,
    key: "/subscriptions",
    icon: <AppstoreOutlined />,
    meta: {
      title: "订阅管理",
    },
  },
];

const Layout: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  // 设置文档标题
  const title = useMemo(() => {
    const currentItem = items.find((item) => item.key === location.pathname);
    return currentItem ? currentItem.meta.title : "MyApp";
  }, [location]);

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
        <Header className="!bg-white px-4 shadow-sm">{title}</Header>
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
