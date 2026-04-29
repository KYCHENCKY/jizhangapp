import { useState, useRef } from "react";
import { Tabs, Table, Button, message, Tag, Space, Popconfirm, Empty, Alert, Progress } from "antd";
import { InboxOutlined, CheckCircleOutlined, DeleteOutlined } from "@ant-design/icons";

import { useUploadAlipay, useUploadWechat, useConfirmAllImport, useBatches, useDeleteBatch, useDeleteAllBatches } from "../hooks/useUpload";
import { formatDateTime } from "../utils/formatters";
import type { ImportBatch } from "../types";

interface PendingFile {
  file: File;
  platform: "alipay" | "wechat";
  status: "pending" | "uploading" | "done" | "error";
  batchId?: number;
  previewTotal?: number;
  error?: string;
}

const DRAG_STYLE: React.CSSProperties = {
  width: "100%",
  height: 180,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: "2px dashed #f0d8c0",
  borderRadius: 20,
  background: "linear-gradient(135deg, #fffbf6 0%, #fef8f0 100%)",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

export default function ImportPage() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAlipay = useUploadAlipay();
  const uploadWechat = useUploadWechat();
  const confirmAll = useConfirmAllImport();
  const { data: batches, refetch: refetchBatches } = useBatches();
  const deleteBatch = useDeleteBatch();
  const deleteAllBatches = useDeleteAllBatches();

  const classifyFile = (f: File): "alipay" | "wechat" | null => {
    const name = f.name.toLowerCase();
    if (name.endsWith(".csv")) return "alipay";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "wechat";
    return null;
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const valid: PendingFile[] = [];
    const invalid: string[] = [];

    fileArray.forEach((f) => {
      const platform = classifyFile(f);
      if (platform) {
        valid.push({ file: f, platform, status: "pending" });
      } else {
        invalid.push(f.name);
      }
    });

    if (invalid.length > 0) {
      message.warning(`不支持的文件类型: ${invalid.join(", ")}（仅支持 .csv 和 .xlsx）`);
    }

    if (valid.length === 0) return;

    // Add all pending files at once, then start uploading
    setPendingFiles((prev) => [...prev, ...valid]);
    setIsUploading(true);

    // Upload files sequentially
    (async () => {
      let hasError = false;

      for (let i = 0; i < valid.length; i++) {
        const pf = valid[i];

        // Mark as uploading
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.file === pf.file ? { ...p, status: "uploading" as const } : p
          )
        );

        const mutation = pf.platform === "alipay" ? uploadAlipay : uploadWechat;

        try {
          const res = await mutation.mutateAsync(pf.file);
          setPendingFiles((prev) =>
            prev.map((p) =>
              p.file === pf.file
                ? { ...p, status: "done" as const, batchId: res.data.batch.id, previewTotal: res.data.preview_total }
                : p
            )
          );
        } catch (err) {
          hasError = true;
          setPendingFiles((prev) =>
            prev.map((p) =>
              p.file === pf.file
                ? { ...p, status: "error" as const, error: err instanceof Error ? err.message : "解析失败" }
                : p
            )
          );
        }
      }

      setIsUploading(false);
      refetchBatches();

      const successCount = valid.filter((_, i) => {
        // Check state at the end
        return true; // We'll check in the next state read
      }).length;

      if (!hasError) {
        message.success(`成功解析 ${valid.length} 个文件`);
      } else {
        message.warning("部分文件解析失败，请检查文件格式");
      }
    })();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const doneFiles = pendingFiles.filter((f) => f.status === "done");
  const allDone = pendingFiles.length > 0 && pendingFiles.every((f) => f.status !== "uploading" && f.status !== "pending");

  const handleConfirmAll = () => {
    const batchIds = doneFiles.map((f) => f.batchId!).filter(Boolean);
    if (batchIds.length === 0) {
      message.warning("没有可导入的批次");
      return;
    }
    confirmAll.mutate(batchIds, {
      onSuccess: (res) => {
        message.success(res.message);
        setPendingFiles([]);
        refetchBatches();
      },
      onError: (err) => message.error(err.message),
    });
  };

  const handleCancel = () => {
    setPendingFiles([]);
    setIsUploading(false);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => {
      // If this file was "done" and removed, we need to handle batch cleanup on backend
      // For now just remove from local state
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadProgress = pendingFiles.length > 0
    ? Math.round((pendingFiles.filter((f) => f.status === "done" || f.status === "error").length / pendingFiles.length) * 100)
    : 0;

  const previewColumns = [
    { title: "文件名", dataIndex: "name", width: 200, ellipsis: true },
    { title: "平台", dataIndex: "platform", render: (v: string) => v === "alipay" ? <Tag color="blue">支付宝</Tag> : <Tag color="green">微信</Tag>, width: 80 },
    {
      title: "状态",
      render: (_: unknown, r: PendingFile, i: number) => {
        if (r.status === "uploading") return <Tag color="processing">解析中...</Tag>;
        if (r.status === "error") return <Tag color="red">{r.error}</Tag>;
        if (r.status === "done") return <Tag color="green">已解析（{r.previewTotal} 条）</Tag>;
        return <Tag>等待中</Tag>;
      },
      width: 180,
    },
    {
      title: "", width: 40,
      render: (_: unknown, r: PendingFile, i: number) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          disabled={r.status === "uploading"}
          onClick={() => handleRemoveFile(i)} />
      ),
    },
  ];

  const batchColumns = [
    { title: "文件名", dataIndex: "filename", ellipsis: true },
    { title: "平台", dataIndex: "source_platform", render: (v: string) => v === "alipay" ? <Tag color="blue">支付宝</Tag> : <Tag color="green">微信</Tag>, width: 80 },
    { title: "日期范围", render: (_: unknown, r: ImportBatch) => `${r.date_start} ~ ${r.date_end}`, width: 210 },
    { title: "记录数", dataIndex: "record_count", width: 70 },
    { title: "新增", dataIndex: "new_count", width: 60 },
    { title: "重复", dataIndex: "dup_count", render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : "0", width: 60 },
    { title: "导入时间", dataIndex: "imported_at", render: (v: string) => formatDateTime(v), width: 160 },
    {
      title: "操作", width: 60,
      render: (_: unknown, r: ImportBatch) => (
        <Popconfirm title="确定删除？" onConfirm={() => deleteBatch.mutate(r.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>账单导入</h2>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: "upload",
          label: "上传账单",
          children: (
            <div>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.xlsx,.xls"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {/* Custom drag-and-drop area */}
              <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                  ...DRAG_STYLE,
                  borderColor: isDragOver ? "#f0835b" : isUploading ? "#f0d8c0" : "#f0d8c0",
                  background: isDragOver
                    ? "linear-gradient(135deg, #fef3ed 0%, #fff5ee 100%)"
                    : isUploading ? "#fafafa" : "linear-gradient(135deg, #fffbf6 0%, #fef8f0 100%)",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  opacity: isUploading ? 0.7 : 1,
                  transform: isDragOver ? "scale(1.01)" : "scale(1)",
                }}
              >
                <InboxOutlined style={{ fontSize: 40, color: isDragOver ? "#1677ff" : "#bfbfbf", marginBottom: 8 }} />
                <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>
                  {isDragOver ? "释放文件以上传" : "点击选择文件或拖拽文件到此处"}
                </p>
                <p style={{ color: "#999", margin: "4px 0 0" }}>
                  支持支付宝 CSV 和微信 XLSX，可一次选择多个文件
                </p>
              </div>

              {isUploading && (
                <div style={{ marginTop: 16 }}>
                  <Progress
                    percent={uploadProgress}
                    strokeColor={{ from: "#f5a623", to: "#f0835b" }}
                    strokeWidth={10}
                  />
                </div>
              )}

              {pendingFiles.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontWeight: 500 }}>
                      已添加 {pendingFiles.length} 个文件
                      {doneFiles.length > 0 && `（${doneFiles.length} 个可导入，合计 ${doneFiles.reduce((s, f) => s + (f.previewTotal || 0), 0)} 条记录）`}
                    </span>
                    <Space>
                      {allDone && !isUploading && doneFiles.length > 0 && (
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={handleConfirmAll}
                          loading={confirmAll.isPending}
                        >
                          一键导入全部
                        </Button>
                      )}
                      <Button onClick={handleCancel} disabled={isUploading}>
                        清空列表
                      </Button>
                    </Space>
                  </div>

                  {doneFiles.length > 0 && !isUploading && (
                    <Alert
                      type="success"
                      message={`${doneFiles.length} 个文件已解析完成，点击"一键导入全部"将数据导入系统`}
                      style={{ marginBottom: 8 }}
                    />
                  )}

                  {pendingFiles.some((f) => f.status === "error") && (
                    <Alert
                      type="error"
                      message="部分文件解析失败，请检查文件是否为支付宝/微信官方导出的账单文件"
                      style={{ marginBottom: 8 }}
                    />
                  )}

                  <Table
                    columns={previewColumns}
                    dataSource={pendingFiles.map((f, i) => ({
                      ...f,
                      key: i,
                      name: f.file.name,
                      size: `${(f.file.size / 1024).toFixed(0)} KB`,
                    }))}
                    size="small"
                    pagination={false}
                    scroll={{ y: 360 }}
                  />
                </div>
              )}
            </div>
          ),
        },
        {
          key: "history",
          label: "导入历史",
          children: (
            <div>
              {(batches?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 12, textAlign: "right" }}>
                  <Popconfirm
                    title="确定删除全部账单？"
                    description="将删除所有导入的账单及关联交易记录，此操作不可撤销。"
                    onConfirm={() => deleteAllBatches.mutate(undefined, {
                      onSuccess: (res) => message.success(res.message),
                      onError: (err) => message.error(err.message),
                    })}
                    okText="确定删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger loading={deleteAllBatches.isPending}>
                      一键删除全部账单
                    </Button>
                  </Popconfirm>
                </div>
              )}
              <Table
                columns={batchColumns}
                dataSource={batches ?? []}
                rowKey="id"
                size="small"
                locale={{ emptyText: <Empty description="暂无导入记录" /> }}
              />
            </div>
          ),
        },
      ]} />
    </div>
  );
}
