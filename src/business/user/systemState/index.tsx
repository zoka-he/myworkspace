import { Button, Card, Col, Descriptions, Divider, Empty, Modal, Row, Select, Space, Spin, Table, Tabs, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

type NacosStatus = {
  nacosEnabled: boolean;
  initialized: boolean;
  namingEnabled: boolean;
  namingInitialized: boolean;
  serverAddr?: string;
  namespace?: string;
  serviceName?: string;
  configTotal?: number;
  configListError?: string;
  configs?: Array<{
    id: string | number;
    dataId: string;
    group: string;
    appName: string;
    tenant: string;
    type: string;
    gmtModified: number;
  }>;
  checkedAt?: string;
  error?: string;
};

function StatusTag({ ok, okText = '已连接', failText = '未连接' }: { ok: boolean; okText?: string; failText?: string }) {
  return <Tag color={ok ? 'success' : 'error'}>{ok ? okText : failText}</Tag>;
}

export default function SystemStatePanel() {
  const [loading, setLoading] = useState(false);
  const [nacosStatus, setNacosStatus] = useState<NacosStatus | null>(null);
  const [nacosError, setNacosError] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'myworksite'>('myworksite');
  const [messageApi, contextHolder] = message.useMessage();
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState<{ dataId: string; group: string; tenant: string; content: string } | null>(null);

  const fetchNacosStatus = useCallback(async () => {
    setLoading(true);
    setNacosError('');
    try {
      const resp = await fetch(`/api/web/system/nacos-status?appFilter=${appFilter}`, { cache: 'no-store' });
      const data = (await resp.json()) as NacosStatus;
      if (!resp.ok) {
        throw new Error(data.error || `request failed: ${resp.status}`);
      }
      setNacosStatus(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '加载 Nacos 状态失败';
      setNacosError(message);
    } finally {
      setLoading(false);
    }
  }, [appFilter]);

  useEffect(() => {
    fetchNacosStatus();
    const timer = setInterval(fetchNacosStatus, 15000);
    return () => clearInterval(timer);
  }, [fetchNacosStatus]);

  const onViewConfig = useCallback(
    async (item: { dataId: string; group: string; tenant: string }) => {
      setViewLoading(true);
      try {
        const query = new URLSearchParams({
          dataId: item.dataId,
          group: item.group,
          tenant: item.tenant || nacosStatus?.namespace || 'public',
        });
        const resp = await fetch(`/api/web/system/nacos-config-content?${query.toString()}`, { cache: 'no-store' });
        const data = (await resp.json()) as { message?: string; dataId: string; group: string; tenant: string; content: string };
        if (!resp.ok) {
          throw new Error(data.message || `request failed: ${resp.status}`);
        }
        setViewData(data);
        setViewOpen(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '查看配置失败';
        messageApi.error(msg);
      } finally {
        setViewLoading(false);
      }
    },
    [messageApi, nacosStatus?.namespace]
  );

  const nacosTab = useMemo(() => {
    if (loading && !nacosStatus) {
      return <Spin />;
    }
    if (nacosError && !nacosStatus) {
      return <Empty description={`Nacos 状态加载失败: ${nacosError}`} />;
    }
    if (!nacosStatus) {
      return <Empty description="暂无 Nacos 状态数据" />;
    }

    const filteredConfigs = nacosStatus.configs || [];

    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Row gutter={12}>
            <Col span={12}>
                <Card size="small" title="连接状态">
                    <Space wrap>
                        <span>客户端开关:</span>
                        <StatusTag ok={nacosStatus.nacosEnabled} okText="已启用" failText="未启用" />
                        <span>配置中心:</span>
                        <StatusTag ok={nacosStatus.initialized} />
                        <span>Naming:</span>
                        <StatusTag ok={!nacosStatus.namingEnabled || nacosStatus.namingInitialized} okText="可用" failText="不可用" />
                    </Space>
                    <Divider />
                    <Space direction="horizontal">
                        <Button onClick={fetchNacosStatus} loading={loading}>
                        刷新 Nacos 状态
                        </Button>
                    </Space>
                </Card>
            </Col>
            <Col span={12}>
                <Card size="small" title="基础信息">
                    <Descriptions size="small" column={1}>
                        <Descriptions.Item label="Server Addr">{nacosStatus.serverAddr || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Namespace">{nacosStatus.namespace || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Service Name">{nacosStatus.serviceName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="配置总数">{nacosStatus.configTotal ?? 0}</Descriptions.Item>
                        <Descriptions.Item label="当前返回数量">{filteredConfigs.length}</Descriptions.Item>
                        <Descriptions.Item label="最后检查时间">{nacosStatus.checkedAt || '-'}</Descriptions.Item>
                    </Descriptions>
                    {nacosError ? (
                        <Typography.Text type="danger">最近一次刷新错误: {nacosError}</Typography.Text>
                    ) : null}
                    {nacosStatus.configListError ? (
                        <div>
                        <Typography.Text type="danger">配置列表拉取失败: {nacosStatus.configListError}</Typography.Text>
                        </div>
                    ) : null}
                </Card>
            </Col>
        </Row>

        <Card
          size="small"
          title="配置中心条目"
          extra={(
            <Space>
              <span>Filter:</span>
              <Select
                value={appFilter}
                style={{ width: 180 }}
                size="small"
                onChange={(value) => setAppFilter(value)}
                options={[
                  { value: 'myworksite', label: '仅 myworksite' },
                  { value: 'all', label: '全部应用' },
                ]}
              />
            </Space>
          )}
        >
          <Table
            size="small"
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            dataSource={filteredConfigs}
            columns={[
              { title: 'Data ID', dataIndex: 'dataId', key: 'dataId' },
              { title: 'Group', dataIndex: 'group', key: 'group', width: 180 },
              { title: 'App', dataIndex: 'appName', key: 'appName', width: 160 },
              { title: 'Namespace', dataIndex: 'tenant', key: 'tenant', width: 160 },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
              {
                title: 'Modified',
                dataIndex: 'gmtModified',
                key: 'gmtModified',
                width: 200,
                render: (value: number) => (value ? new Date(value).toLocaleString() : '-'),
              },
              {
                title: '操作',
                key: 'action',
                width: 100,
                render: (_, record) => (
                  <Button size="small" onClick={() => onViewConfig(record)} loading={viewLoading}>
                    查看
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    );
  }, [appFilter, fetchNacosStatus, loading, nacosError, nacosStatus, onViewConfig, viewLoading]);

  const items = [
    {
      key: 'nacos',
      label: 'Nacos 状态',
      children: nacosTab,
    },
    {
      key: 'runtime',
      label: '运行信息',
      children: (
        <Card size="small">
          <Typography.Text type="secondary">可在此扩展 JVM/Node、队列、数据库等运行状态。</Typography.Text>
        </Card>
      ),
    },
    {
      key: 'health',
      label: '健康检查',
      children: (
        <Card size="small">
          <Typography.Text type="secondary">预留页签：后续可接入应用级 healthz 与依赖探针。</Typography.Text>
        </Card>
      ),
    },
  ];

  return (
    <div className="f-fit-height f-flex-col" style={{ gap: 12 }}>
      {contextHolder}
      <Tabs defaultActiveKey="nacos" items={items} />
      <Modal
        title="配置内容"
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={900}
      >
        <Descriptions size="small" bordered column={1} style={{ marginBottom: 12 }} labelStyle={{ width: 120 }}>
          <Descriptions.Item label="Data ID">{viewData?.dataId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Group">{viewData?.group || '-'}</Descriptions.Item>
          <Descriptions.Item label="Namespace">{viewData?.tenant || '-'}</Descriptions.Item>
        </Descriptions>
        <Divider size="small"/>
        <Card
          size="small"
          title="配置内容"
        >
          <Typography.Paragraph
            style={{ whiteSpace: 'pre-wrap', overflowY: 'auto', marginBottom: 0, width: '100%' }}
          >
            {viewData?.content || ''}
          </Typography.Paragraph>
        </Card>
      </Modal>
    </div>
  );
}
