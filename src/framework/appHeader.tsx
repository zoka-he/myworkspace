import { connect } from "react-redux"
import { IRootState } from "../store"

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user
    }
}

function AppHeader() {
    return (
        <div className='f-fit-width f-align-center' style={{ backgroundColor: 'rgb(40 83 155)' }}>
            <h2 style={{ color: 'white', lineHeight: '46px' }}>工作台</h2>
        </div>
    )
}

export default connect(mapStateToProps)(AppHeader);