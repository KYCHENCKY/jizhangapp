import { useState } from "react";
import { Card, Form, Input, Button, message, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.username, values.password);
      message.success("注册成功");
      window.location.href = "/";
    } catch (err) {
      message.error(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fdf5e6 0%, #fffdf9 100%)" }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>注册账号</Typography.Title>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 4, message: "密码至少4位" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item name="confirm" dependencies={["password"]} rules={[
            { required: true, message: "请确认密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) return Promise.resolve();
                return Promise.reject(new Error("两次密码不一致"));
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>注册</Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: "center" }}>
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </Card>
    </div>
  );
}
