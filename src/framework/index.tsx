import { Breadcrumb, Layout, Menu, FloatButton } from 'antd';
import { connect } from 'react-redux';
import React, {useEffect, useRef, useState} from 'react';
import g_config from '../config';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import _ from 'lodash';

import type { IRootState } from '../store';
import type { INavMenu } from '../config/navigator';
import getPermissionTree from '../business/user/permission/getPermissionTree';
import { IPermission } from '../business/user/permission/IPermission';
import { ItemType } from 'antd/es/menu/hooks/useItems';


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
  let [navMenu, setNavMenu] = useState<IPermission[]>([]);
  let [breadcrumbText, setBreadcrumbText] = useState<string[]>(['任务管理', '贴纸板']);
  let permMap = useRef<Map<number, IPermission>>(new Map());
  let urlMap = useRef<Map<string, IPermission>>(new Map());

  useEffect(() => {
    loadNavMenu();
  }, []);

  async function loadNavMenu() {
    let { tree, map, data } = await getPermissionTree.getNavMenu();

    if (data instanceof Array) {
        let map = new Map<string, IPermission>();

        data.forEach(item => {
            map.set(item.url, item);
        })

        urlMap.current = map;
    }

    if (map instanceof Map) {
        permMap.current = map;
    }

    setNavMenu(tree || []);
  }


  function onMenuClick(e: any) {
    let url = e.keyPath[0];
    navigate(url);
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
    if (!urlMap.current || !permMap.current) {
        return null;
    }

    let pathname = location.pathname;
    let menuItem = urlMap.current.get(pathname);
    console.debug('menuItem', menuItem);

    let breadcrumbItems = [];
    while(menuItem) {
        breadcrumbItems.unshift(<Breadcrumb.Item key={menuItem.ID}>{menuItem.label}</Breadcrumb.Item>);
        
        if (typeof menuItem.PID === 'number') {
            menuItem = permMap.current.get(menuItem.PID);
        } else {
            menuItem = undefined;
        }
    }

    return <Breadcrumb style={{ padding: '12px 0 0' }}>{breadcrumbItems}</Breadcrumb>;
  }

  // 主页默认
  if (location.pathname === '/') {
    return <Navigate to='/taskManage/dashboard'/>;
  }

  return (
    <Layout className="f-fit-height">
      <Sider width={160}>
        <div className='f-fit-width f-align-center' style={{ backgroundColor: 'rgb(40 83 155)' }}>
          <h2 style={{ color: 'white', lineHeight: '46px' }}>工作台</h2>
        </div>
        <Menu 
          className="f-flex-1"
          theme="dark"
          mode="inline"
          inlineIndent={16}
          items={(navMenu as ItemType[])} 
          onClick={e => onMenuClick(e)}
        />
      </Sider>
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