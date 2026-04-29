import { Table, Tag, Button, Popconfirm, message, Switch } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/auth";
import { formatDateTime } from "../utils/formatters";
import type { User } from "../types";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.fetchUsers().then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.updateUser(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); message.success("已更新"); },
    onError: (err) => message.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); message.success("已删除"); },
    onError: (err) => message.error(err.message),
  });

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "用户名", dataIndex: "username" },
    {
      title: "角色", dataIndex: "is_admin",
      render: (v: boolean) => v ? <Tag color="orange">管理员</Tag> : <Tag>普通用户</Tag>,
    },
    {
      title: "状态", dataIndex: "is_active",
      render: (v: boolean, r: User) => (
        <Switch checked={v} onChange={(checked) => toggleMutation.mutate({ id: r.id, is_active: checked })} />
      ),
    },
    { title: "注册时间", dataIndex: "created_at", render: (v: string) => formatDateTime(v) },
    {
      title: "操作",
      render: (_: unknown, r: User) => (
        <Popconfirm title="确定删除该用户？所有数据将被清除" onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>用户管理</h2>
      <Table columns={columns} dataSource={users ?? []} rowKey="id" loading={isLoading} size="small" />
    </div>
  );
}
