const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'farm_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
const handleError = (res, error, message = 'Internal server error') => {
  console.error(error);
  res.status(500).json({ error: message, details: error.message });
};

// EMPLOYEE ROUTES

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees WHERE is_active = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch employees');
  }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to fetch employee');
  }
});

// Add new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, position } = req.body;
    
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO employees (first_name, last_name, email, phone, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [first_name, last_name, email, phone, position]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    handleError(res, error, 'Failed to create employee');
  }
});

// Delete employee (soft delete)
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE employees SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully', employee: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Failed to delete employee');
  }
});

// TOOL ROUTES

// Get all tools
app.get('/api/tools', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tools ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch tools');
  }
});

// Add new tool
app.post('/api/tools', async (req, res) => {
  try {
    const { name, type, description, serial_number, purchase_date } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO tools (name, type, description, serial_number, purchase_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, description, serial_number, purchase_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to create tool');
  }
});

// TOOL ASSIGNMENT ROUTES

// Assign tool to employee
app.post('/api/tool-assignments', async (req, res) => {
  try {
    const { employee_id, tool_id, notes } = req.body;
    
    if (!employee_id || !tool_id) {
      return res.status(400).json({ error: 'Employee ID and Tool ID are required' });
    }
    
    // Check if tool is available
    const toolCheck = await pool.query('SELECT status FROM tools WHERE id = $1', [tool_id]);
    if (toolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    if (toolCheck.rows[0].status !== 'available') {
      return res.status(400).json({ error: 'Tool is not available for assignment' });
    }
    
    // Check if employee exists and is active
    const employeeCheck = await pool.query('SELECT is_active FROM employees WHERE id = $1', [employee_id]);
    if (employeeCheck.rows.length === 0 || !employeeCheck.rows[0].is_active) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create assignment
      const assignmentResult = await client.query(
        'INSERT INTO tool_assignments (employee_id, tool_id, notes) VALUES ($1, $2, $3) RETURNING *',
        [employee_id, tool_id, notes]
      );
      
      // Update tool status
      await client.query('UPDATE tools SET status = $1 WHERE id = $2', ['assigned', tool_id]);
      
      await client.query('COMMIT');
      res.status(201).json(assignmentResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    handleError(res, error, 'Failed to assign tool');
  }
});

// Get assigned tools for an employee
app.get('/api/employees/:id/tools', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, ta.assigned_date, ta.notes, ta.id as assignment_id
      FROM tools t
      JOIN tool_assignments ta ON t.id = ta.tool_id
      WHERE ta.employee_id = $1 AND ta.returned_date IS NULL
      ORDER BY ta.assigned_date DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch assigned tools');
  }
});

// Return tool (end assignment)
app.put('/api/tool-assignments/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get assignment details
      const assignmentResult = await client.query(
        'SELECT tool_id FROM tool_assignments WHERE id = $1 AND returned_date IS NULL',
        [id]
      );
      
      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Assignment not found or already returned' });
      }
      
      const toolId = assignmentResult.rows[0].tool_id;
      
      // Update assignment
      await client.query(
        'UPDATE tool_assignments SET returned_date = CURRENT_DATE, notes = $1 WHERE id = $2',
        [notes, id]
      );
      
      // Update tool status
      await client.query('UPDATE tools SET status = $1 WHERE id = $2', ['available', toolId]);
      
      await client.query('COMMIT');
      res.json({ message: 'Tool returned successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    handleError(res, error, 'Failed to return tool');
  }
});

// TASK ROUTES

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch tasks');
  }
});

// Add new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO tasks (title, description, priority, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, priority, due_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to create task');
  }
});

// TASK ASSIGNMENT ROUTES

// Assign task to employee
app.post('/api/task-assignments', async (req, res) => {
  try {
    const { employee_id, task_id, notes } = req.body;
    
    if (!employee_id || !task_id) {
      return res.status(400).json({ error: 'Employee ID and Task ID are required' });
    }
    
    // Check if employee exists and is active
    const employeeCheck = await pool.query('SELECT is_active FROM employees WHERE id = $1', [employee_id]);
    if (employeeCheck.rows.length === 0 || !employeeCheck.rows[0].is_active) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }
    
    // Check if task exists
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [task_id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const result = await pool.query(
      'INSERT INTO task_assignments (employee_id, task_id, notes) VALUES ($1, $2, $3) RETURNING *',
      [employee_id, task_id, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to assign task');
  }
});

// Get assigned tasks for an employee
app.get('/api/employees/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, ta.assigned_date, ta.notes, ta.id as assignment_id, ta.completed_date
      FROM tasks t
      JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.employee_id = $1
      ORDER BY ta.assigned_date DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch assigned tasks');
  }
});

// Mark task as completed
app.put('/api/task-assignments/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const result = await pool.query(
      'UPDATE task_assignments SET completed_date = CURRENT_DATE, notes = $1 WHERE id = $2 RETURNING *',
      [notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }
    
    res.json({ message: 'Task marked as completed', assignment: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Failed to complete task');
  }
});

// DASHBOARD/OVERVIEW ROUTES

// Get dashboard data
app.get('/api/dashboard', async (req, res) => {
  try {
    const [employees, tools, tasks, assignments] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM employees WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM tools'),
      pool.query('SELECT COUNT(*) as count FROM tasks WHERE status != $1', ['completed']),
      pool.query('SELECT COUNT(*) as count FROM tool_assignments WHERE returned_date IS NULL')
    ]);
    
    res.json({
      total_employees: parseInt(employees.rows[0].count),
      total_tools: parseInt(tools.rows[0].count),
      pending_tasks: parseInt(tasks.rows[0].count),
      active_tool_assignments: parseInt(assignments.rows[0].count)
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch dashboard data');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;