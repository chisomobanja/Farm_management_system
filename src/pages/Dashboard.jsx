import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Styles.css';

const Dashboard = () => {
  const [data, setData] = useState({
    totalEmployees: 0,
    totalTools: 0,
    pendingTasks: 0,
    activeAssignments: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/dashboard', {
          withCredentials: true,
        });
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <div className="dashboard-grid">
        <div className="dashboard-card employees">
          <h3>Total Employees</h3>
          <p>{data.totalEmployees}</p>
        </div>
        <div className="dashboard-card tools">
          <h3>Total Tools</h3>
          <p>{data.totalTools}</p>
        </div>
        <div className="dashboard-card tasks">
          <h3>Pending Tasks</h3>
          <p>{data.pendingTasks}</p>
        </div>
        <div className="dashboard-card assignments">
          <h3>Active Assignments</h3>
          <p>{data.activeAssignments}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
