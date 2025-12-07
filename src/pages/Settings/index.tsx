import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  List,
  App,
  Input,
  Tag,
} from "antd";
import {
  CloudDownloadOutlined,
  RocketOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

interface AppSettings {
  mixed_port: number;
  whitelist: string[]; // ✅ 新增
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [autostart, setAutostart] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    mixed_port: 2080,
    whitelist: [],
  });
  const [newDomain, setNewDomain] = useState(""); // 输入框状态

  const { message } = App.useApp();
  const [form] = Form.useForm();

  // 初始化加载
  useEffect(() => {
    isEnabled().then(setAutostart);
    invoke<boolean>("check_assets").then(setAssetsReady);
    invoke<AppSettings>("get_settings").then((s) => {
      setSettings(s);
      form.setFieldsValue(s);
    });
  }, [form]);

  // 处理开机自启
  const handleAutostartChange = async (checked: boolean) => {
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
      setAutostart(checked);
      message.success(checked ? "开机自启已开启" : "开机自启已关闭");
    } catch (e) {
      message.error("设置失败，需要管理员权限");
    }
  };

  // 保存所有设置
  const saveAllSettings = async (newSettings: AppSettings) => {
    try {
      await invoke("save_settings", { settings: newSettings });
      setSettings(newSettings);
      // 可以在这里提示用户“重启代理后生效”
    } catch (e) {
      message.error("保存失败");
    }
  };

  // 端口表单提交
  const handlePortSubmit = async (values: { mixed_port: number }) => {
    const newSettings = { ...settings, mixed_port: values.mixed_port };
    await saveAllSettings(newSettings);
    message.success("端口已保存，重启代理后生效");
  };

  // 资源下载
  const handleDownloadAssets = async () => {
    setLoading(true);
    message.loading({ content: "正在下载...", key: "dl" });
    try {
      await invoke("download_assets");
      message.success({ content: "下载完成", key: "dl" });
      setAssetsReady(true);
    } catch (e) {
      message.error({ content: `失败: ${e}`, key: "dl" });
    } finally {
      setLoading(false);
    }
  };

  // ✅ 白名单操作：添加
  const addWhitelist = () => {
    if (!newDomain) return;
    if (settings.whitelist.includes(newDomain)) {
      message.warning("域名已存在");
      return;
    }
    const newWhiteList = [...settings.whitelist, newDomain];
    const newSettings = { ...settings, whitelist: newWhiteList };
    saveAllSettings(newSettings);
    setNewDomain("");
    message.success("已添加白名单");
  };

  // ✅ 白名单操作：删除
  const removeWhitelist = (domain: string) => {
    const newWhiteList = settings.whitelist.filter((d) => d !== domain);
    const newSettings = { ...settings, whitelist: newWhiteList };
    saveAllSettings(newSettings);
    message.success("已删除");
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4 pb-10 flex gap-4 flex-col">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center">
        <SettingOutlined className="mr-3" /> 设置
      </h1>

      {/* 1. 通用设置 */}
      <Card title="通用" variant="borderless" className="shadow-sm rounded-xl">
        <List>
          <List.Item
            extra={
              <Switch checked={autostart} onChange={handleAutostartChange} />
            }
          >
            <List.Item.Meta
              avatar={<RocketOutlined className="text-xl text-blue-500" />}
              title="开机自启"
              description="随系统启动自动运行软件"
            />
          </List.Item>
        </List>
      </Card>

      {/* 2. 网络设置 */}
      <Card title="网络" variant="borderless" className="shadow-sm rounded-xl">
        <Form form={form} layout="vertical" onFinish={handlePortSubmit}>
          <div className="flex items-end gap-4">
            <Form.Item
              label="混合端口 (Mixed Port)"
              name="mixed_port"
              className="mb-0 flex-1"
            >
              <InputNumber min={1024} max={65535} className="w-full" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              保存端口
            </Button>
          </div>
        </Form>
      </Card>

      {/* 3. 白名单设置 (新增) */}
      <Card
        title="直连白名单 (仅 Rule 模式生效)"
        variant="borderless"
        className="shadow-sm rounded-xl"
      >
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="输入域名，例如 baidu.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onPressEnter={addWhitelist}
          />
          <Button type="dashed" icon={<PlusOutlined />} onClick={addWhitelist}>
            添加
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.whitelist.map((domain) => (
            <Tag
              key={domain}
              closable
              onClose={() => removeWhitelist(domain)}
              className="text-base py-1 px-2"
            >
              {domain}
            </Tag>
          ))}
          {settings.whitelist.length === 0 && (
            <span className="text-gray-400">
              暂无白名单，所有流量将匹配 GeoSite 规则
            </span>
          )}
        </div>
      </Card>

      {/* 4. 资源管理 */}
      <Card
        title="路由规则"
        variant="borderless"
        className="shadow-sm rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`text-2xl ${
                assetsReady ? "text-green-500" : "text-red-500"
              }`}
            >
              {assetsReady ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            </div>
            <div>
              <div className="font-medium text-gray-700">
                GeoIP & Geosite 数据库
              </div>
              <div className="text-gray-400 text-xs">
                {assetsReady ? "文件完整" : "文件缺失，请下载"}
              </div>
            </div>
          </div>
          <Button
            icon={<CloudDownloadOutlined />}
            loading={loading}
            onClick={handleDownloadAssets}
            type={assetsReady ? "default" : "primary"}
            danger={!assetsReady}
          >
            {assetsReady ? "更新资源" : "立即下载"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
