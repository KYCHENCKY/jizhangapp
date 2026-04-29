import { Card, Form, Input, Button, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import * as api from "../api/auth";

export default function SettingsPage() {
  const [form] = Form.useForm();

  const changePasswordMutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      message.success("密码修改成功，请重新登录");
      localStorage.removeItem("token");
      window.location.href = "/login";
    },
    onError: (err) => message.error(err.message),
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      changePasswordMutation.mutate(values);
    } catch {
      // validation failed
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24 }}>个人设置</h2>

      <Card title="修改密码" size="small" style={{ borderRadius: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="old_password"
            label="原密码"
            rules={[{ required: true, message: "请输入原密码" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="输入原密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 4, message: "密码至少 4 位" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="输入新密码（至少4位）" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="再次输入新密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={changePasswordMutation.isPending}
              block
            >
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
