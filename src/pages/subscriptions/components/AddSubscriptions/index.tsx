import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { addSubscription } from "../../../../services/file/subscriptions";
import useApp from "antd/es/app/useApp";
import {eventBus} from 'tools-browser'

const Add = () => {
  const { message } = useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  // 添加订阅
  const handleAddSubscription = async (values: { domain: string }) => {
    setLoading(true);
    try {
      await addSubscription(values.domain);
      message.success("订阅已添加");
      eventBus.emit('refreshSubscriptions'); 
      form.resetFields();
    } catch (error) {
      message.error("添加订阅失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleAddSubscription} layout="inline">
      <Form.Item
        name="domain"
        rules={[{ required: true, message: "请输入订阅名称" }]}
        className="flex-1 mb-2 md:mb-0"
      >
        <Input placeholder="输入订阅域名" />
      </Form.Item>
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          icon={<PlusOutlined />}
          loading={loading}
        >
          添加订阅
        </Button>
      </Form.Item>
    </Form>
  );
};
export default Add;
