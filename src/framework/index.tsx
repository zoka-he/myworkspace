import { Breadcrumb, Layout, Menu } from 'antd';
import { connect } from 'react-redux';
import React from 'react';
import g_config from '../config';
import { setLv1Key, setLv2Key } from '../store/navigatorSlice';
import { clearLoginUser } from '../store/loginSlice';
import store from '../store';
import { Outlet, Navigate, useLocation } from 'react-router-dom';

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

  // 主页默认
  if (location.pathname === '/') {
    return <Navigate to='/taskManage/dashboard'/>;
  }

  /**
   * 选择一级菜单
   * @param param0 
   */
  function onLv1Select({ key }: any) {
    store.dispatch(setLv1Key(key));
  }

  /**
   * 选择二级菜单
   * @param param0 
   */
  function onLv2Select({ key }: any) {
    store.dispatch(setLv2Key(key));
  }

  function getLv1Menus() {
    if (!g_config?.navigator?.menu) {
      return [];
    }

    return g_config.navigator.menu.map((item: INavMenu, index: number) => {
      return {
        key: index,
        label: item.label
      }
    });
  }

  function getLv2Menus() {
    if (!g_config?.navigator?.menu) {
      return [];
    }

    let subMenu = g_config.navigator.menu[props.lv1Key]?.menu;
    if (!subMenu) {
      return [];
    }

    return subMenu.map((item: INavMenu, index: number) => {
      return {
        key: index,
        label: item.label
      }
    });
  }

  /**
   * 登出，未实现
   */
  function onLogout() {
    store.dispatch(clearLoginUser());
  }

  /**
   * 获取面包屑
   * @returns 
   */
  function getBreadCrumbText() {
    if (!g_config?.navigator?.menu) {
      return [];
    }

    let lv1Menu = g_config.navigator.menu[props.lv1Key];
    if (!lv1Menu) {
      return [];
    }

    if (!lv1Menu.menu) {
      return [lv1Menu.label];
    }

    let lv2Menu = lv1Menu.menu[props.lv2Key]
    if (!lv2Menu) {
      return [lv1Menu.label];
    }

    return [
      lv1Menu.label,
      lv2Menu.label,
    ]
  }

  /**
   * 渲染面包屑
   * @returns 
   */
  function renderBreadcrumb() {
    let items = getBreadCrumbText().map((item, index) => {
      return <Breadcrumb.Item key={index}>{item}</Breadcrumb.Item>
    });
    return <Breadcrumb style={{ padding: '12px 0 0' }}>{items}</Breadcrumb>;
  }

  return (
    <Layout className="f-fit-height" >
      <Header className="f-flex-row">
        <div style={{ display: 'inline-block' }}>
          <h2 style={{ color: 'white', marginRight: '50px' }}>移动安全监测</h2>
        </div>
        <Menu 
          className="f-flex-1"
          theme="dark" 
          mode="horizontal" 
          defaultSelectedKeys={[ props.lv1Key ]} 
          items={getLv1Menus()} 
          onSelect={e => onLv1Select(e)}
        />
        <div>
          <a className="f-cursor-hand f-red" onClick={e => onLogout(e)}>退出登录</a>
        </div>
      </Header>
      <Layout>
        <Sider width={200}>
          <Menu 
            mode="inline" 
            style={{ height: '100%' }} 
            selectedKeys={[ props.lv2Key ]} 
            items={getLv2Menus()} 
            onSelect={e => onLv2Select(e)}
          />
        </Sider>
        <Content style={{ backgroundColor: 'white' }}>
          <div style={{ padding: '0 24px' }} className="f-fit-height f-flex-col f-bg-white f-vertical-scroll">
            <div>
              {renderBreadcrumb()}
            </div>
            <div className="f-flex-1" style={{ margin: '12px 0' }}>
              {/* 主界面 */}
              <Outlet/>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default connect(mapStateToProps)(MainFrame);