'use client';

import { lazy, Suspense } from "react";
// import { RouterProvider, createHashRouter as createRouter } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
const AiNovalTimelineManage = lazy(() => import('../business/aiNoval/timelineManage'));
const AiNovalSummary = lazy(() => import('../business/aiNoval/summary'));
const AiNovalRunningState = lazy(() => import('../business/aiNoval/runningState'));
const AiNovalMagicSystemManage = lazy(() => import('../business/aiNoval/magicSystemManage'));
const AiWorldStateManage = lazy(() => import('../business/aiNoval/worldStateManage'));
const AiBrainstormManage = lazy(() => import('../business/aiNoval/brainstormManage'));

// b2c爬虫
const B2CScrapy = lazy(() => import('../business/b2c_scrapy'));

// ETH账户管理
const EthAccountManage = lazy(() => import('../business/eth/ethAccountManage'));
const EthNetworkManage = lazy(() => import('../business/eth/networkManage'));
const EthTransaction = lazy(() => import('../business/eth/transaction'));
const EthContractDeploy = lazy(() => import('../business/eth/contractDeploy'));
const EthNFTManage = lazy(() => import('../business/eth/nftManage'));

const LoadingFallback = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>加载中...</div>
    </div>
);

export default function () {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/" element={<MainFrame />}>
                        {/* 敏捷管理工具 */}
                        <Route path="taskManage/dashboard" element={<Dashboard />} />
                        <Route path="taskManage/taskManage" element={<TaskManage />} />
                        <Route path="taskManage/figure" element={<TaskFigure />} />
                        <Route path="taskManage/bugTrace" element={<BugTrace />} />
                        <Route path="taskManage/catfightLog" element={<CatfightLog />} />
                        <Route path="taskManage/uplineCheck" element={<UplineCheck />} />
                        <Route path="taskManage/weeklyReport" element={<WeekReport />} />

                        {/* 路书 */}
                        <Route path="roadBook/planBoard" element={<RoadBookPlanBoard />} />
                        <Route path="roadBook/editor" element={<RoadBookEditor />} />
                        <Route path="roadBook/calendar" element={<RoadBookCalendar />} />
                        <Route path="roadBook/wishboard" element={<WishBoard />} />
                        <Route path="roadBook/countBoard" element={<CountBoard />} />

                        {/* 信息管理 */}
                        <Route path="infos/accounts" element={<AccountManage />} />
                        <Route path="infos/employeeManage" element={<EmployeeManage />} />

                        {/* 自行车 */}
                        <Route path="bike/wheelDev" element={<WheelDev />} />
                        <Route path="bike/bikeManage" element={<BikeManage />} />

                        {/* 模块管理 */}
                        <Route path="user/permission" element={<Permission />} />
                        <Route path="user/account" element={<UserAccount />} />
                        <Route path="user/role" element={<UserRole />} />
                        <Route path="user/profile" element={<UserProfile />} />

                        {/* 开发工具 */}
                        <Route path="devTools/encoding" element={<DevEncoding />} />

                        {/* AI小说 */}
                        <Route path="novel/NovalManage" element={<AiNovalManager/>}/>
                        <Route path="novel/worldViewManage" element={<AiWorldViewManager/>}/>
                        <Route path="novel/geographyManage" element={<AiWorldGeoManager/>}/>
                        <Route path="novel/toolConfig" element={<AiNovalToolsConfig/>}/>
                        <Route path="novel/roleManage" element={<AiNovalRoleManage/>}/>
                        <Route path="novel/factionManage" element={<AiNovalFactionManage/>}/>
                        <Route path="novel/eventManage" element={<AiNovalEventManage/>}/>
                        <Route path="novel/chapterManage" element={<AiNovalChapterManage/>}/>
                        <Route path="novel/timelineManage" element={<AiNovalTimelineManage/>}/>
                        <Route path="novel/summary" element={<AiNovalSummary/>}/>
                        <Route path="novel/runningState" element={<AiNovalRunningState/>}/>
                        <Route path="novel/magicSystemManage" element={<AiNovalMagicSystemManage/>}/>
                        <Route path="novel/worldStateManage" element={<AiWorldStateManage/>}/>
                        <Route path="novel/brainstormManage" element={<AiBrainstormManage/>}/>

                        {/* b2c爬虫 */}
                        <Route path="b2c-scrapy/*" element={<B2CScrapy />} />

                        {/* ETH账户管理 */}
                        <Route path="eth/account" element={<EthAccountManage />} />
                        <Route path="eth/network" element={<EthNetworkManage />} />
                        <Route path="eth/transaction" element={<EthTransaction />} />
                        <Route path="eth/transactionCustom" element={<EthTransaction mode="custom" />} />
                        <Route path="eth/contractDeploy" element={<EthContractDeploy />} />
                        <Route path="eth/nftManage" element={<EthNFTManage />} />
                        
                        {/* 兜底页面 */}
                        <Route path="*" element={<div><h1>此页面尚未实现！</h1></div>} />
                    </Route>
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}