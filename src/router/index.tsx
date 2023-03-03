import { lazy } from "react";
// import { RouterProvider, createHashRouter as createRouter } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate, useMatches } from 'react-router-dom';

import MainFrame from '../framework';
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

async function mainFrameLoader() {
  let matches = useMatches();
  console.debug('matches', matches);
}

export default function() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" loader={mainFrameLoader} element={<MainFrame/>}>
          <Route path="taskManage/dashboard" element={<Dashboard />} />
          <Route path="taskManage/taskManage" element={<TaskManage />} />
          <Route path="taskManage/employeeManage" element={<EmployeeManage />} />
          <Route path="taskManage/bugTrace" element={<BugTrace />} />
          <Route path="taskManage/catfightLog" element={<CatfightLog />} />
          <Route path="taskManage/uplineCheck" element={<UplineCheck />} />
          <Route path="taskManage/weeklyReport" element={<WeekReport />} />

          <Route path="roadBook/planBoard" element={<RoadBookPlanBoard />} />
          <Route path="roadBook/editor" element={<RoadBookEditor />} />

          <Route path="infos/accounts" element={<AccountManage />} />

          <Route path="*" element={<div><h1>此页面尚未实现！</h1></div>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}