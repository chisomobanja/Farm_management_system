// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from "./pages/LandingPage";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Tools from './pages/Tools';
import AssignTools from './pages/AssignTools';
import Tasks from './pages/Tasks';
// import AssignTasks from './pages/AssignTasks';
import Attendance from './pages/Attendance';
import Layout from './components/Layout';

function App() {
  // This is a mock check — replace with real auth logic (e.g. context or Redux)
  const isAuthenticated = localStorage.getItem('token'); // e.g. JWT token saved after login

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
         <Route path="/login" element={<Login/>}/>
        {/* Protected routes */}
        {isAuthenticated ? (
          <>
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/employees" element={<Layout><Employees /></Layout>} />
            <Route path="/tools" element={<Layout><Tools /></Layout>} />
            <Route path="/assign-tool" element={<Layout><AssignTools /></Layout>} />
            <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
            {/* <Route path="/assign-task" element={<Layout><AssignTasks /></Layout>} /> */}
            <Route path="/attendance" element={<Layout><Attendance /></Layout>} />

            {/* Default redirect to dashboard */}
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
