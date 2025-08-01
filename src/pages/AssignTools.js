import React, { useState, useEffect } from 'react';
import './Styles.css';

const AssignTools = () => {
  const [tools, setTools] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [notes, setNotes] = useState('');
  const [toolName, setToolName] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [toolsRes, empRes, assignRes] = await Promise.all([
        fetch('/api/tools/available', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/tool-assignments', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setTools(await toolsRes.json());
      setEmployees(await empRes.json());
      setAssignments(await assignRes.json());
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignTool = async (e) => {
    e.preventDefault();
    if (!selectedTool || !selectedEmployee) return alert('Select tool and employee');

    try {
      const res = await fetch('/api/tool-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tool_id: selectedTool,
          employee_id: selectedEmployee,
          notes
        })
      });

      if (res.ok) {
        alert('Tool assigned successfully');
        setSelectedTool('');
        setSelectedEmployee('');
        setNotes('');
        fetchData();
      } else {
        alert('Failed to assign tool');
      }
    } catch (err) {
      console.error('Assignment error:', err);
    }
  };

  const handleAddTool = async (e) => {
    e.preventDefault();
    if (!toolName) return alert('Tool name required');

    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: toolName })
      });

      if (res.ok) {
        alert('Tool added');
        setToolName('');
        fetchData();
      } else {
        alert('Failed to add tool');
      }
    } catch (err) {
      console.error('Add tool error:', err);
    }
  };

  const handleReturn = async (id) => {
    try {
      const res = await fetch(`/api/tool-assignments/return/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Tool returned');
        fetchData();
      } else {
        alert('Failed to mark return');
      }
    } catch (err) {
      console.error('Return error:', err);
    }
  };

  return (
    <div className="assign-tool-container">
      <h2>Tool Assignment</h2>

      <form className="assign-tool-form" onSubmit={handleAssignTool}>
        <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
          <option value="">Select Tool</option>
          {tools.map(tool => (
            <option key={tool.id} value={tool.id}>{tool.name}</option>
          ))}
        </select>

        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button type="submit">Assign Tool</button>
      </form>

      <form className="add-tool-form" onSubmit={handleAddTool}>
        <input
          type="text"
          placeholder="New Tool Name"
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
        />
        <button type="submit">Add Tool</button>
      </form>

      <table className="tool-assignment-table">
        <thead>
          <tr>
            <th>Tool</th>
            <th>Employee</th>
            <th>Assigned Date</th>
            <th>Notes</th>
            <th>Status</th>
            <th>Return</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map(assign => (
            <tr key={assign.id}>
              <td>{assign.tool_name}</td>
              <td>{assign.employee_name}</td>
              <td>{assign.assigned_date}</td>
              <td>{assign.notes}</td>
              <td>{assign.returned_date ? 'Returned' : 'Assigned'}</td>
              <td>
                {!assign.returned_date && (
                  <button onClick={() => handleReturn(assign.id)}>Return</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Inline styling to make the file standalone */}
      <style>{`
        .assign-tool-container {
          padding: 2rem;
          max-width: 1100px;
          margin: auto;
        }
        .assign-tool-form,
        .add-tool-form {
          display: flex;
          gap: 10px;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .assign-tool-form select,
        .assign-tool-form input,
        .add-tool-form input {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .assign-tool-form button,
        .add-tool-form button {
          background-color: #2f855a;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 5px;
          cursor: pointer;
        }
        .assign-tool-form button:hover,
        .add-tool-form button:hover {
          background-color: #276749;
        }
        .tool-assignment-table {
          width: 100%;
          border-collapse: collapse;
        }
        .tool-assignment-table th,
        .tool-assignment-table td {
          border: 1px solid #ccc;
          padding: 10px;
          text-align: left;
        }
      `}</style>
    </div>
  );
};

export default AssignTools;
