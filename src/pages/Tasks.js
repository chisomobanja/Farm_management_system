import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import './Styles.css'; 

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      setTasks(data);
      setFilteredTasks(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    const filtered = tasks.filter((task) =>
      task.title.toLowerCase().includes(value) ||
      (task.description && task.description.toLowerCase().includes(value))
    );
    setFilteredTasks(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilteredTasks(tasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);

      const taskPayload = {
        ...formData,
        department_id: decoded.department_id,
      };

      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskPayload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create task');
      }

      const newTask = await response.json();
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      setFilteredTasks(updatedTasks);
      setMessage('Task added successfully');
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="tasks-container">
      <h2>Tasks in Your Department</h2>

      {/* Add Task Form */}
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Task Title"
          value={formData.title}
          onChange={handleInputChange}
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleInputChange}
        ></textarea>
        <select
          name="priority"
          value={formData.priority}
          onChange={handleInputChange}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <input
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleInputChange}
        />
        <button type="submit">Add Task</button>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search by title or description"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <button onClick={clearSearch}>Clear Search</button>
      </div>

      {/* Task Table */}
      <table className="tasks-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map((task) => (
            <tr key={task.id}>
              <td>{task.id}</td>
              <td>{task.title}</td>
              <td>{task.description}</td>
              <td>{task.priority}</td>
              <td>{task.status}</td>
              <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}</td>
              <td>{task.department_name || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Tasks;
