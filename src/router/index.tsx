import { lazy } from "react";
// import { RouterProvider, createHashRouter as createRouter } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate, useMatches } from 'react-router-dom';

import MainFrame from '../framework';
import WishBoard from "../business/roadbook/wishBoard";
const Dashboard = lazy(() => import("../business/dashboard"));
const TaskManage = lazy(() => import('../business/taskManage'));
const EmployeeManage = lazy(() => import('../business/employeeManage'));
const BugTrace = lazy(() => import('../business/bugTrace'));
const CatfightLog = lazy(() => import('../business/catfightLog'));
const UplineCheck = lazy(() => import('../business/fuckCheck'));
const WeekReport = lazy(() => import('../business/weeklyReport'));
const RoadBookPlanBoard = lazy(() => import('../business/roadbook/planBoard'));
const RoadBookEditor = lazy(() => import('../business/roadbook/roadBookEditor'));
const AccountManage = lazy(() => import('../business/accountManage'));
const RoadBookCalendar = lazy(() => import('../business/roadbook/calendar'));
const WheelDev = lazy(() => import('../business/bike/WheelDev/editor'));
const BikeManage = lazy(() => import('../business/bike/bikeManage/index'));
const Permission = lazy(() => import('../business/user/permission/index'));
const UserAccount = lazy(() => import('../business/user/account'));
const UserRole = lazy(() => import('../business/user/role'));

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

                    <Route path="taskManage/bugTrace" element={<BugTrace />} />
                    <Route path="taskManage/catfightLog" element={<CatfightLog />} />
                    <Route path="taskManage/uplineCheck" element={<UplineCheck />} />
                    <Route path="taskManage/weeklyReport" element={<WeekReport />} />

                    <Route path="roadBook/planBoard" element={<RoadBookPlanBoard />} />
                    <Route path="roadBook/editor" element={<RoadBookEditor />} />
                    <Route path="roadBook/calendar" element={<RoadBookCalendar />} />
                    <Route path="roadBook/wishboard" element={<WishBoard />} />

                    <Route path="infos/accounts" element={<AccountManage />} />
                    <Route path="infos/employeeManage" element={<EmployeeManage />} />

                    <Route path="bike/wheelDev" element={<WheelDev />} />
                    <Route path="bike/bikeManage" element={<BikeManage />} />

                    <Route path="user/permission" element={<Permission />} />
                    <Route path="user/account" element={<UserAccount />} />
                    <Route path="user/role" element={<UserRole />} />

                    <Route path="*" element={<div><h1>此页面尚未实现！</h1></div>} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}