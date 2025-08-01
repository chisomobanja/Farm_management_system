import React, { useEffect, useState } from 'react';
import './Styles.css';
import { jwtDecode } from 'jwt-decode';

const Tools = () => {
  const [tools, setTools] = useState([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    serial_number: '',
    purchase_date: '',
  });

  const fetchTools = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tools', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }

      const data = await response.json();
      setTools(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      const department_id = decoded.department_id;

      const response = await fetch('http://localhost:5000/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          department_id,
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add tool');
      }

      const newTool = await response.json();
      setTools(prev => [...prev, newTool]);
      setFormData({
        name: '',
        type: '',
        description: '',
        serial_number: '',
        purchase_date: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="tools-container">
      <h2>Tools in Your Department</h2>

      {error && <p className="error">{error}</p>}

      <form className="tool-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          value={formData.name}
          placeholder="Tool Name"
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="type"
          value={formData.type}
          placeholder="Type"
          onChange={handleChange}
        />
        <input
          type="text"
          name="description"
          value={formData.description}
          placeholder="Description"
          onChange={handleChange}
        />
        <input
          type="text"
          name="serial_number"
          value={formData.serial_number}
          placeholder="Serial Number"
          onChange={handleChange}
        />
        <input
          type="date"
          name="purchase_date"
          value={formData.purchase_date}
          onChange={handleChange}
        />
        <button type="submit">Add Tool</button>
      </form>

      <table className="tools-table">
        <thead>
          <tr>
            <th>Serial Number</th>
            <th>Name</th>
            <th>Condition</th>
            <th>Department</th>
            <th>Added On</th>
          </tr>
        </thead>
        <tbody>
          {tools.map(tool => (
            <tr key={tool.id}>
              <td>{tool.serial_number}</td>
              <td>{tool.name}</td>
              <td>{tool.condition}</td>
              <td>{tool.department_name}</td>
              <td>{new Date(tool.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Tools;
