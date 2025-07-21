const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET ;

// Database connection
const pool = new Pool({
  /*user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'farm_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  Commented out becay=use now using supabase*/
  //connectionString: process.env.DATABASE_URL,
  //ssl: { rejectUnauthorized: false }
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // For development only
    // For production, you should provide the CA certificate
    // ca: fs.readFileSync('/path/to/cert.pem').toString()
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
const handleError = (res, error, message = 'Internal server error') => {
  console.error(error);
  res.status(500).json({ error: message, details: error.message });
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Department access middleware
const requireDepartmentAccess = (req, res, next) => {
  const { role, department_id } = req.user;
  
  // Farm owner has access to everything
  if (role === 'farm_owner') {
    req.departmentFilter = {}; // No department filter
    return next();
  }
  
  // Supervisors only have access to their department
  if (role === 'supervisor' && department_id) {
    req.departmentFilter = { department_id };
    return next();
  }
  
  return res.status(403).json({ error: 'Insufficient permissions' });
};

// AUTHENTICATION ROUTES

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get user with department info
    const result = await pool.query(`
      SELECT u.*, d.name as department_name 
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      WHERE u.username = $1 AND u.is_active = true
    `, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    
    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        department_id: user.department_id 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name
      }
    });
  } catch (error) {
    handleError(res, error, 'Login failed');
  }
});

// Register new user (for admin use)
app.post('/api/auth/register', authenticateToken, async (req, res) => {
  try {
    // Only farm owner can register new users
    if (req.user.role !== 'farm_owner') {
      return res.status(403).json({ error: 'Only farm owner can register new users' });
    }
    
    const { username, email, password, role, department_id } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, department_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, department_id',
      [username, email, password_hash, role, department_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    handleError(res, error, 'Failed to register user');
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.role, u.department_id, u.last_login, u.created_at,
             d.name as department_name
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id 
      WHERE u.id = $1
    `, [req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to fetch profile');
  }
});
//Test route 
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      message: 'Database connection successful', 
      time: result.rows[0].current_time 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: error.message 
    });
  }
});
// DEPARTMENT ROUTES

// Get all departments (farm owner only)
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'farm_owner') {
      return res.status(403).json({ error: 'Only farm owner can view all departments' });
    }
    
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch departments');
  }
});

// EMPLOYEE ROUTES

// Get all employees (filtered by department)
app.get('/api/employees', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    let query = `
      SELECT e.*, d.name as department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      WHERE e.is_active = true
    `;
    let params = [];
    
    if (req.departmentFilter.department_id) {
      query += ' AND e.department_id = $1';
      params.push(req.departmentFilter.department_id);
    }
    
    query += ' ORDER BY e.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch employees');
  }
});

// Get employee by ID (with department access check)
app.get('/api/employees/:id', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT e.*, d.name as department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      WHERE e.id = $1
    `;
    let params = [id];
    
    if (req.departmentFilter.department_id) {
      query += ' AND e.department_id = $2';
      params.push(req.departmentFilter.department_id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to fetch employee');
  }
});

// Add new employee
app.post('/api/employees', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, position, department_id } = req.body;
    
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Check department access
    if (req.user.role === 'supervisor' && department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Cannot create employee in different department' });
    }
    
    const result = await pool.query(
      'INSERT INTO employees (first_name, last_name, email, phone, position, department_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [first_name, last_name, email, phone, position, department_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    handleError(res, error, 'Failed to create employee');
  }
});

// Delete employee (soft delete)
app.delete('/api/employees/:id', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    let query = 'UPDATE employees SET is_active = false WHERE id = $1';
    let params = [id];
    
    if (req.departmentFilter.department_id) {
      query += ' AND department_id = $2';
      params.push(req.departmentFilter.department_id);
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found or access denied' });
    }
    
    res.json({ message: 'Employee deleted successfully', employee: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Failed to delete employee');
  }
});

// TOOL ROUTES

// Get all tools (filtered by department)
app.get('/api/tools', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    let query = `
      SELECT t.*, d.name as department_name 
      FROM tools t 
      LEFT JOIN departments d ON t.department_id = d.id
    `;
    let params = [];
    
    if (req.departmentFilter.department_id) {
      query += ' WHERE t.department_id = $1';
      params.push(req.departmentFilter.department_id);
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch tools');
  }
});

// Add new tool
app.post('/api/tools', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { name, type, description, serial_number, purchase_date, department_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    
    // Check department access
    if (req.user.role === 'supervisor' && department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Cannot create tool in different department' });
    }
    
    const result = await pool.query(
      'INSERT INTO tools (name, type, description, serial_number, purchase_date, department_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, type, description, serial_number, purchase_date, department_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to create tool');
  }
});

// TASK ROUTES

// Get all tasks (filtered by department)
app.get('/api/tasks', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    let query = `
      SELECT t.*, d.name as department_name 
      FROM tasks t 
      LEFT JOIN departments d ON t.department_id = d.id
    `;
    let params = [];
    
    if (req.departmentFilter.department_id) {
      query += ' WHERE t.department_id = $1';
      params.push(req.departmentFilter.department_id);
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch tasks');
  }
});

// Add new task
app.post('/api/tasks', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { title, description, priority, due_date, department_id } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    // Check department access
    if (req.user.role === 'supervisor' && department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Cannot create task in different department' });
    }
    
    const result = await pool.query(
      'INSERT INTO tasks (title, description, priority, due_date, department_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, priority, due_date, department_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleError(res, error, 'Failed to create task');
  }
});

// TOOL ASSIGNMENT ROUTES (updated with department access)

// Assign tool to employee
app.post('/api/tool-assignments', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { employee_id, tool_id, notes } = req.body;
    
    if (!employee_id || !tool_id) {
      return res.status(400).json({ error: 'Employee ID and Tool ID are required' });
    }
    
    // Check if tool is available and accessible
    let toolQuery = 'SELECT status FROM tools WHERE id = $1';
    let toolParams = [tool_id];
    
    if (req.departmentFilter.department_id) {
      toolQuery += ' AND department_id = $2';
      toolParams.push(req.departmentFilter.department_id);
    }
    
    const toolCheck = await pool.query(toolQuery, toolParams);
    if (toolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tool not found or access denied' });
    }
    
    if (toolCheck.rows[0].status !== 'available') {
      return res.status(400).json({ error: 'Tool is not available for assignment' });
    }
    
    // Check if employee exists and is accessible
    let employeeQuery = 'SELECT is_active FROM employees WHERE id = $1';
    let employeeParams = [employee_id];
    
    if (req.departmentFilter.department_id) {
      employeeQuery += ' AND department_id = $2';
      employeeParams.push(req.departmentFilter.department_id);
    }
    
    const employeeCheck = await pool.query(employeeQuery, employeeParams);
    if (employeeCheck.rows.length === 0 || !employeeCheck.rows[0].is_active) {
      return res.status(404).json({ error: 'Employee not found, inactive, or access denied' });
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

// Get assigned tools for an employee (with department access)
app.get('/api/employees/:id/tools', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT t.*, ta.assigned_date, ta.notes, ta.id as assignment_id
      FROM tools t
      JOIN tool_assignments ta ON t.id = ta.tool_id
      JOIN employees e ON ta.employee_id = e.id
      WHERE ta.employee_id = $1 AND ta.returned_date IS NULL
    `;
    let params = [id];
    
    if (req.departmentFilter.department_id) {
      query += ' AND e.department_id = $2';
      params.push(req.departmentFilter.department_id);
    }
    
    query += ' ORDER BY ta.assigned_date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch assigned tools');
  }
});

// Return tool (end assignment)
app.put('/api/tool-assignments/:id/return', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get assignment details with department check
      let assignmentQuery = `
        SELECT ta.tool_id, t.department_id
        FROM tool_assignments ta
        JOIN tools t ON ta.tool_id = t.id
        WHERE ta.id = $1 AND ta.returned_date IS NULL
      `;
      let assignmentParams = [id];
      
      if (req.departmentFilter.department_id) {
        assignmentQuery += ' AND t.department_id = $2';
        assignmentParams.push(req.departmentFilter.department_id);
      }
      
      const assignmentResult = await client.query(assignmentQuery, assignmentParams);
      
      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Assignment not found, already returned, or access denied' });
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

// TASK ASSIGNMENT ROUTES (updated with department access)

// Assign task to employee
app.post('/api/task-assignments', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { employee_id, task_id, notes } = req.body;
    
    if (!employee_id || !task_id) {
      return res.status(400).json({ error: 'Employee ID and Task ID are required' });
    }
    
    // Check if employee exists and is accessible
    let employeeQuery = 'SELECT is_active FROM employees WHERE id = $1';
    let employeeParams = [employee_id];
    
    if (req.departmentFilter.department_id) {
      employeeQuery += ' AND department_id = $2';
      employeeParams.push(req.departmentFilter.department_id);
    }
    
    const employeeCheck = await pool.query(employeeQuery, employeeParams);
    if (employeeCheck.rows.length === 0 || !employeeCheck.rows[0].is_active) {
      return res.status(404).json({ error: 'Employee not found, inactive, or access denied' });
    }
    
    // Check if task exists and is accessible
    let taskQuery = 'SELECT id FROM tasks WHERE id = $1';
    let taskParams = [task_id];
    
    if (req.departmentFilter.department_id) {
      taskQuery += ' AND department_id = $2';
      taskParams.push(req.departmentFilter.department_id);
    }
    
    const taskCheck = await pool.query(taskQuery, taskParams);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
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

// Get assigned tasks for an employee (with department access)
app.get('/api/employees/:id/tasks', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    let query = `
      SELECT t.*, ta.assigned_date, ta.notes, ta.id as assignment_id, ta.completed_date
      FROM tasks t
      JOIN task_assignments ta ON t.id = ta.task_id
      JOIN employees e ON ta.employee_id = e.id
      WHERE ta.employee_id = $1
    `;
    let params = [id];
    
    if (req.departmentFilter.department_id) {
      query += ' AND e.department_id = $2';
      params.push(req.departmentFilter.department_id);
    }
    
    query += ' ORDER BY ta.assigned_date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch assigned tasks');
  }
});

// Mark task as completed
app.put('/api/task-assignments/:id/complete', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    let { notes } = req.body;
    
    // If department filter exists, verify access
    if (req.departmentFilter.department_id) {
      const accessCheck = await pool.query(`
        SELECT ta.id FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.id = $1 AND t.department_id = $2
      `, [id, req.departmentFilter.department_id]);
      
      if (accessCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task assignment not found or access denied' });
      }
    }
    
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

// Get dashboard data (filtered by department)
app.get('/api/dashboard', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    let employeeQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = true';
    let toolQuery = 'SELECT COUNT(*) as count FROM tools';
    let taskQuery = 'SELECT COUNT(*) as count FROM tasks WHERE status != $1';
    let assignmentQuery = 'SELECT COUNT(*) as count FROM tool_assignments ta JOIN tools t ON ta.tool_id = t.id WHERE ta.returned_date IS NULL';
    
    let params = [['completed']];
    
    if (req.departmentFilter.department_id) {
      employeeQuery += ' AND department_id = $1';
      toolQuery += ' WHERE department_id = $1';
      taskQuery += ' AND department_id = $2';
      assignmentQuery += ' AND t.department_id = $1';
      params = [
        [req.departmentFilter.department_id],
        [req.departmentFilter.department_id], 
        ['completed', req.departmentFilter.department_id],
        [req.departmentFilter.department_id]
      ];
    }
    
    const [employees, tools, tasks, assignments] = await Promise.all([
      pool.query(employeeQuery, params[0]),
      pool.query(toolQuery, params[1]),
      pool.query(taskQuery, params[2] || ['completed']),
      pool.query(assignmentQuery, params[3] || [])
    ]);
    
    let dashboardData = {
      total_employees: parseInt(employees.rows[0].count),
      total_tools: parseInt(tools.rows[0].count),
      pending_tasks: parseInt(tasks.rows[0].count),
      active_tool_assignments: parseInt(assignments.rows[0].count)
    };
    
    // If farm owner, add department breakdown
    if (req.user.role === 'farm_owner') {
      const departmentStats = await pool.query(`
        SELECT 
          d.name as department_name,
          COUNT(DISTINCT e.id) as employee_count,
          COUNT(DISTINCT t.id) as tool_count,
          COUNT(DISTINCT tk.id) as task_count
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN tools t ON d.id = t.department_id
        LEFT JOIN tasks tk ON d.id = tk.department_id AND tk.status != 'completed'
        GROUP BY d.id, d.name
        ORDER BY d.name
      `);
      
      dashboardData.department_breakdown = departmentStats.rows;
    }
    
    res.json(dashboardData);
  } catch (error) {
    handleError(res, error, 'Failed to fetch dashboard data');
  }
});

// Get department-specific reports (farm owner only)
app.get('/api/reports/departments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'farm_owner') {
      return res.status(403).json({ error: 'Only farm owner can access department reports' });
    }
    
    const departmentReports = await pool.query(`
      SELECT 
        d.id,
        d.name as department_name,
        d.description,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT CASE WHEN e.is_active = true THEN e.id END) as active_employees,
        COUNT(DISTINCT t.id) as total_tools,
        COUNT(DISTINCT CASE WHEN t.status = 'available' THEN t.id END) as available_tools,
        COUNT(DISTINCT CASE WHEN t.status = 'assigned' THEN t.id END) as assigned_tools,
        COUNT(DISTINCT tk.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN tk.status = 'pending' THEN tk.id END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN tk.status = 'completed' THEN tk.id END) as completed_tasks
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      LEFT JOIN tools t ON d.id = t.department_id
      LEFT JOIN tasks tk ON d.id = tk.department_id
      GROUP BY d.id, d.name, d.description
      ORDER BY d.name
    `);
    
    res.json(departmentReports.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch department reports');
  }
});

// Get all users (farm owner only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'farm_owner') {
      return res.status(403).json({ error: 'Only farm owner can view all users' });
    }
    
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.last_login, u.created_at,
             d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    handleError(res, error, 'Failed to fetch users');
  }
});

// Update user status (farm owner only)
app.put('/api/users/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'farm_owner') {
      return res.status(403).json({ error: 'Only farm owner can modify user status' });
    }
    
    const { id } = req.params;
    const { is_active } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, is_active',
      [is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User status updated', user: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Failed to update user status');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test route to verify authentication
app.get('/api/test/auth', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Authentication successful', 
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Farm Management System with Authentication');
  console.log('Default login credentials:');
  console.log('Farm Owner: username=farmowner, password=password123');
  console.log('Crop Supervisor: username=crop_supervisor, password=password123');
  console.log('Livestock Supervisor: username=livestock_supervisor, password=password123');
  console.log('Maintenance Supervisor: username=maintenance_supervisor, password=password123');
});

module.exports = app;
