import { connect } from "react-redux"
import { IRootState } from "../store"
import { Input } from "antd"
import { SearchOutlined } from '@ant-design/icons';
import store from '@/src/store';
import useDebounce from "../utils/hooks/useDebounce";
import { setMenuSearchKey } from "@/src/store/navigatorSlice";

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        searchKey: state.navigatorSlice.menuSearchKey,
        loginUser: state.loginSlice.user
    }
}

interface IAppHeaderProps {
    searchKey: string
}

function AppHeader(props: IAppHeaderProps) {
    function onSearch(value: string) {
        store.dispatch(setMenuSearchKey(value));
    }

    let isShifterActive = !!props.searchKey;

    return (
        <div className='f-fit-width f-align-center m-app-header'>
            <div className={`m-app-header_shifter${isShifterActive ? ' active' : ''}`}>
                <h2 className="m-app-header_logo" style={{ color: 'white', lineHeight: '46px' }}>工作台</h2>
                <div className={`m-app-header_research`}>
                    <Input 
                        value={props.searchKey}
                        onChange={ e => onSearch((e.target as HTMLInputElement).value) }
                        placeholder="在菜单中搜索..." 
                        prefix={<SearchOutlined/>}
                        allowClear
                    />
                </div>
            </div>
        </div>
    )
}

export default connect(mapStateToProps)(AppHeader);