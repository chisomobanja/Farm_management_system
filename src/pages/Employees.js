import React, { useEffect, useState } from 'react';
import './Styles.css';
import { jwtDecode } from 'jwt-decode';

const Employee = () => {
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: ''
  });
  const [searchId, setSearchId] = useState('');

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch employees');

      const data = await response.json();
      setEmployees(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();

    const { first_name, last_name, email, phone, position } = form;

    if (!first_name || !last_name || !email) {
      setError('First name, last name, and email are required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      const department_id = decoded.department_id;

      const response = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name,
          last_name,
          email,
          phone,
          position,
          department_id
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to add employee');

      setForm({ first_name: '', last_name: '', email: '', phone: '', position: '' });
      setError('');
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchId) {
      fetchEmployees();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/employees/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Employee not found');

      const data = await response.json();
      setEmployees([data]);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearSearch = () => {
    setSearchId('');
    fetchEmployees();
  };

  return (
    <div className="employee-container">
      <h2>Employees in Your Department</h2>
      
      {error && <p className="error">{error}</p>}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="form-inline">
        <input
          type="text"
          placeholder="Search by ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />
        <button type="submit">Search</button>
        <button type="button" onClick={handleClearSearch} style={{ marginLeft: '10px' }}>Clear</button>
      </form>

      {/* Add Employee Form */}
      <form onSubmit={handleAddEmployee} className="employee-form">
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={form.first_name}
          onChange={handleChange}
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={form.last_name}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
        />
        <input
          type="text"
          name="position"
          placeholder="Position"
          value={form.position}
          onChange={handleChange}
        />
        <button type="submit">Add Employee</button>
      </form>

      {/* Employee Table */}
      <table className="employee-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Position</th>
            <th>Department</th>
            <th>Date Hired</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id}>
              <td>{emp.id}</td>
              <td>{emp.first_name} {emp.last_name}</td>
              <td>{emp.position}</td>
              <td>{emp.department_name}</td>
              <td>{new Date(emp.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Employee;
