import { Breadcrumb, Layout, Menu, FloatButton } from 'antd';
import { connect } from 'react-redux';
import React, {useEffect, useState} from 'react';
import g_config from '../config';
import { setLv1Key, setLv2Key } from '../store/navigatorSlice';
import store from '../store';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import _ from 'lodash';

import type { IRootState } from '../store';
import type { INavMenu } from '../config/navigator';


const { Sider, Header, Content } = Layout;

const mapStateToProps = (state: IRootState) => {
  return { 
    lv1Key: state.navigatorSlice.lv1Key,
    lv2Key: state.navigatorSlice.lv2Key,
  }
}


function MainFrame (props: any) {

  let location = useLocation();
  let navigate = useNavigate();
  let [breadcrumbText, setBreadcrumbText] = useState<string[]>(['任务管理', '贴纸板']);


  function onMenuClick(e: any) {
    let keyPath = [...e.keyPath];
    if (keyPath.length < 2) {
      return;
    }

    _.reverse(keyPath);
    console.debug('onMenuClick', keyPath);

    let url = keyPath.join('');
    navigate(url);

    getBreadCrumbText(keyPath);
  }

  function getMenus() {
    if (!g_config?.navigator) {
      return [];
    }

    return g_config.navigator.map((item: INavMenu, index: number) => {
      return {
        key: index,
        ...item
      }
    });
  }


  /**
   * 获取面包屑
   * @returns 
   */
  function getBreadCrumbText(keyPath: string[]) {
    if (!g_config?.navigator || !keyPath?.length) {
      console.debug('no navigator or keypath');
      return [];
    }

    let lv1Menu: INavMenu | null = null;
    let lv2Menu: INavMenu | null = null;

    for(let item of g_config.navigator) {
      if (item.key === keyPath[0]) {
        lv1Menu = item;
        break;
      }
    }

    if (!lv1Menu?.children?.length) {
      console.debug('lv1Menu is invalid', keyPath[0], lv1Menu);
      return [];
    }

    for(let item of lv1Menu.children) {
      if (item.key === keyPath[1]) {
        lv2Menu = item;
        break;
      }
    }

    if (!lv2Menu) {
      console.debug('lv2Menu is invalid', keyPath[1], lv2Menu);
      return [];
    }

    setBreadcrumbText([ lv1Menu.label || '', lv2Menu.label || '' ]);
  }

  /**
   * 渲染面包屑
   * @returns 
   */
  function renderBreadcrumb() {
    let items = breadcrumbText.map((item, index) => {
      return <Breadcrumb.Item key={index}>{item}</Breadcrumb.Item>
    });
    return <Breadcrumb style={{ padding: '12px 0 0' }}>{items}</Breadcrumb>;
  }

  // 主页默认
  if (location.pathname === '/') {
    return <Navigate to='/taskManage/dashboard'/>;
  }

  return (
    <Layout className="f-fit-height">
      <Header className="f-flex-row" >
        <div style={{ display: 'inline-block' }}>
          <h2 style={{ color: 'white', marginRight: '50px' }}>工作台</h2>
        </div>
        <Menu 
          className="f-flex-1"
          theme="dark"
          mode="horizontal"
          items={getMenus()} 
          onClick={e => onMenuClick(e)}
        />
      </Header>
      <Layout>
        <Content style={{ backgroundColor: 'white' }}>
          <div className="m-mainframe_context f-fit-height f-flex-col f-bg-white f-vertical-scroll">
            <div className="m-mainframe_context-breadcomb">
              {renderBreadcrumb()}
            </div>
            <div className="m-mainframe_context-outlet f-flex-1" style={{ margin: '12px 0 0' }}>
              {/* 主界面 */}
              <Outlet/>
            </div>
          </div>
        </Content>
      </Layout>
      <FloatButton.BackTop/>
    </Layout>
  );
};

export default connect(mapStateToProps)(MainFrame);