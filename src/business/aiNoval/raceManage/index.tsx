import { Button, Card, Col, Row, Select, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { IRaceData } from '@/src/types/IAiNoval';
import RaceEdit, { RaceEditRef } from './edit/raceEdit';
import RaceTree from './raceTree';
import RaceInfoPanel from './panels/raceInfoPanel';
import {
  RaceManageContextProvider,
  useLoadWorldViewList,
  useLoadRaceList,
  useWorldViewId,
  useWorldViewList,
  useGetEditModal,
  useSetEditModalRef,
} from './RaceManageContext';

export default function RaceManage() {
  return (
    <RaceManageContextProvider>
      <RaceManageContent />
    </RaceManageContextProvider>
  );
}

function RaceManageContent() {
  const editRef = useRef<RaceEditRef>(null);
  const setEditModalRef = useSetEditModalRef();

  useEffect(() => {
    setEditModalRef(editRef);
  }, [setEditModalRef]);

  return (
    <InitRaceManage>
      <div className="f-fit-height" style={{ padding: '0 0 10px 0' }}>
        <Row className="f-fit-height" gutter={10}>
          <Col className="f-fit-height" span={6}>
            <LeftPanel />
          </Col>
          <Col className="f-fit-height" span={18}>
            <RightPanel />
          </Col>
        </Row>
        <RaceEdit ref={editRef} />
      </div>
    </InitRaceManage>
  );
}

function InitRaceManage({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const loadWorldViewList = useLoadWorldViewList();
  const loadRaceList = useLoadRaceList();
  const [worldViewId, setWorldViewId] = useWorldViewId();

  useEffect(() => {
    if (ready) return;
    loadWorldViewList().then((list) => {
      if (list?.length) {
        setWorldViewId(list[0].id ?? null);
        loadRaceList();
      }
      setReady(true);
    });
  }, [ready, loadWorldViewList, loadRaceList, setWorldViewId]);

  useEffect(() => {
    if (worldViewId) loadRaceList();
  }, [worldViewId]);

  return ready ? children : null;
}

function LeftPanel() {
  const [worldViewId, setWorldViewId] = useWorldViewId();
  const [worldViewList] = useWorldViewList();
  const loadWorldViewList = useLoadWorldViewList();
  const loadRaceList = useLoadRaceList();
  const getEditModal = useGetEditModal();

  const handleAddRoot = () => {
    if (!worldViewId) return;
    getEditModal()?.showAndEdit({
      worldview_id: worldViewId,
      parent_id: null,
      order_num: 0,
    } as IRaceData);
  };

  const handleRefresh = () => {
    loadWorldViewList().then((list) => {
      if (list?.length) {
        setWorldViewId(list[0].id ?? null);
        loadRaceList();
      }
    });
  };

  const title = (
    <Space>
      <span>族群树</span>
      <Select
        style={{ width: 200 }}
        value={worldViewId}
        onChange={(v) => setWorldViewId(v)}
        placeholder="选择世界观"
        options={worldViewList.map((w) => ({ label: w.title ?? '未命名', value: w.id }))}
      />
      <Button onClick={handleRefresh}>刷新</Button>
    </Space>
  );

  return (
    <Card className="f-fit-height" title={title}>
      <div className="f-fit-height f-flex-col">
        <Button
          type="primary"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={handleAddRoot}
          disabled={!worldViewId}
        >
          新增根族群
        </Button>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <RaceTree />
        </div>
      </div>
    </Card>
  );
}

function RightPanel() {
  return (
    <Card className="f-fit-height" title="族群详情">
      <RaceInfoPanel />
    </Card>
  );
}
