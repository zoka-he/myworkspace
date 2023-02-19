import { lazy } from "react";
// import { RouterProvider, createHashRouter as createRouter } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate, useMatches } from 'react-router-dom';

import MainFrame from '../framework';
const Dashboard = lazy(() => import("../business/dashboard"));
const TaskManage = lazy(() => import('../business/taskManage'));

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
          <Route path="*" element={<div><h1>此页面尚未实现！</h1></div>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}