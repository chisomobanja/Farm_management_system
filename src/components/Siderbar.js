// src/components/Sidebar.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  // Hide sidebar/header on login page
  if (location.pathname === '/login') return null;

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <header className="topbar">
        <button className="hamburger" onClick={toggleSidebar}>
          &#9776;
        </button>
        <h1 className="title">Farm Management System</h1>
      </header>

      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/employees">Employees</Link>
          <Link to="/tools">Tools</Link>
          <Link to="/assign-tool">Assign Tool</Link>
          <Link to="/tasks">Tasks</Link>
          {/* <Link to="/assign-task">Assign Task</Link> */}
          {/* <Link to="/attendance">Attendance</Link> */}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
