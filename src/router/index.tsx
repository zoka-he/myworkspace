import { lazy } from "react";
// import { RouterProvider, createHashRouter as createRouter } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate, useMatches } from 'react-router-dom';

import MainFrame from '../framework';

const WishBoard = lazy(() => import("../business/roadbook/wishBoard/favPosManage"));
const CountBoard = lazy(() => import("../business/roadbook/wishBoard/roadbookGraph"));


const Dashboard = lazy(() => import("../business/dashboard"));
const TaskManage = lazy(() => import('../business/projectManage/taskManage'));
const EmployeeManage = lazy(() => import('../business/projectManage/employeeManage'));
const BugTrace = lazy(() => import('../business/projectManage/bugTrace'));
const CatfightLog = lazy(() => import('../business/projectManage/catfightLog'));
const UplineCheck = lazy(() => import('../business/projectManage/fuckCheck'));
const WeekReport = lazy(() => import('../business/projectManage/weeklyReport'));
const RoadBookPlanBoard = lazy(() => import('../business/roadbook/planBoard'));
const RoadBookEditor = lazy(() => import('../business/roadbook/roadBookEditor'));
const AccountManage = lazy(() => import('../business/accountManage'));
const RoadBookCalendar = lazy(() => import('../business/roadbook/calendar'));
const WheelDev = lazy(() => import('../business/bike/WheelDev/editor'));
const BikeManage = lazy(() => import('../business/bike/bikeManage/index'));
const Permission = lazy(() => import('../business/user/permission/index'));
const UserAccount = lazy(() => import('../business/user/account'));
const UserRole = lazy(() => import('../business/user/role'));
const UserProfile = lazy(() => import('../business/user/profile'));
const TaskFigure = lazy(() => import('../business/projectManage/taskManage/taskFigures'));

const DevEncoding = lazy(() => import('../business/devTools/encoding'));

// ai小说
const AiNovalManager = lazy(() => import('../business/aiNoval/novalManage'));
const AiWorldViewManager = lazy(() => import('../business/aiNoval/worldViewManage'));
const AiWorldGeoManager = lazy(() => import('../business/aiNoval/geographyManage'));
const AiNovalToolsConfig = lazy(() => import('../business/aiNoval/toolsConfig'));
const AiNovalRoleManage = lazy(() => import('../business/aiNoval/roleManage'));
const AiNovalFactionManage = lazy(() => import('../business/aiNoval/factionManage'));
const AiNovalEventManage = lazy(() => import('../business/aiNoval/eventManage'));
const AiNovalChapterManage = lazy(() => import('../business/aiNoval/chapterManage'));

// b2c爬虫
const B2CScrapy = lazy(() => import('../business/b2c_scrapy'));

// ETH账户管理
const EthAccountManage = lazy(() => import('../business/eth/ethAccountManage'));
const EthNetworkManage = lazy(() => import('../business/eth/networkManage'));
const EthTransaction = lazy(() => import('../business/eth/transaction'));

async function mainFrameLoader() {
    let matches = useMatches();
    console.debug('matches', matches);
}

export default function () {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" loader={mainFrameLoader} element={<MainFrame />}>
                    <Route path="taskManage/dashboard" element={<Dashboard />} />
                    <Route path="taskManage/taskManage" element={<TaskManage />} />
                    <Route path="taskManage/figure" element={<TaskFigure />} />

                    <Route path="taskManage/bugTrace" element={<BugTrace />} />
                    <Route path="taskManage/catfightLog" element={<CatfightLog />} />
                    <Route path="taskManage/uplineCheck" element={<UplineCheck />} />
                    <Route path="taskManage/weeklyReport" element={<WeekReport />} />

                    <Route path="roadBook/planBoard" element={<RoadBookPlanBoard />} />
                    <Route path="roadBook/editor" element={<RoadBookEditor />} />
                    <Route path="roadBook/calendar" element={<RoadBookCalendar />} />
                    <Route path="roadBook/wishboard" element={<WishBoard />} />
                    <Route path="roadBook/countBoard" element={<CountBoard />} />

                    <Route path="infos/accounts" element={<AccountManage />} />
                    <Route path="infos/employeeManage" element={<EmployeeManage />} />

                    <Route path="bike/wheelDev" element={<WheelDev />} />
                    <Route path="bike/bikeManage" element={<BikeManage />} />

                    <Route path="user/permission" element={<Permission />} />
                    <Route path="user/account" element={<UserAccount />} />
                    <Route path="user/role" element={<UserRole />} />
                    <Route path="user/profile" element={<UserProfile />} />

                    <Route path="devTools/encoding" element={<DevEncoding />} />

                    <Route path="novel/NovalManage" element={<AiNovalManager/>}/>
                    <Route path="novel/worldViewManage" element={<AiWorldViewManager/>}/>
                    <Route path="novel/geographyManage" element={<AiWorldGeoManager/>}/>
                    <Route path="novel/toolConfig" element={<AiNovalToolsConfig/>}/>
                    <Route path="novel/roleManage" element={<AiNovalRoleManage/>}/>
                    <Route path="novel/factionManage" element={<AiNovalFactionManage/>}/>
                    <Route path="novel/eventManage" element={<AiNovalEventManage/>}/>
                    <Route path="novel/chapterManage" element={<AiNovalChapterManage/>}/>

                    <Route path="b2c-scrapy/*" element={<B2CScrapy />} />

                    <Route path="eth/account" element={<EthAccountManage />} />
                    <Route path="eth/network" element={<EthNetworkManage />} />
                    <Route path="eth/transaction" element={<EthTransaction />} />
                    <Route path="eth/transactionCustom" element={<EthTransaction mode="custom" />} />

                    <Route path="*" element={<div><h1>此页面尚未实现！</h1></div>} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}