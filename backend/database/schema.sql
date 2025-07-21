-- Database: farm_management

-- DROP DATABASE IF EXISTS farm_management;

-- Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'supervisor', -- supervisor, farm_owner
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated employees table with department
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(50),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated tools table with department
CREATE TABLE tools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    description TEXT,
    serial_number VARCHAR(100),
    purchase_date DATE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'available', -- available, assigned, maintenance, broken
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated tasks table with department
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tool assignments table (many-to-many relationship between employees and tools)
CREATE TABLE tool_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    tool_id INTEGER REFERENCES tools(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    returned_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task assignments table (many-to-many relationship between employees and tasks)
CREATE TABLE task_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_department ON tools(department_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_department ON tasks(department_id);
CREATE INDEX idx_tool_assignments_employee ON tool_assignments(employee_id);
CREATE INDEX idx_tool_assignments_tool ON tool_assignments(tool_id);
CREATE INDEX idx_task_assignments_employee ON task_assignments(employee_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_department ON users(department_id);

-- Sample departments
INSERT INTO departments (name, description) VALUES
('Crop Production', 'Manages field crops, planting, and harvesting'),
('Livestock', 'Manages cattle, chickens, and other farm animals'),
('Equipment Maintenance', 'Maintains and repairs farm equipment and tools'),
('Administration', 'General farm administration and oversight');

-- Sample users (password is 'password123' hashed with bcrypt)
INSERT INTO users (username, email, password_hash, role, department_id) VALUES
('farmowner', 'owner@farm.com', '$2b$10$rOmRbB.dXhK7V8/y8Q9JjO8ZQgP5Y3k4l2I1X6F9M7N8O2P3Q4R5S6', 'farm_owner', NULL),
('crop_supervisor', 'crops@farm.com', '$2b$10$rOmRbB.dXhK7V8/y8Q9JjO8ZQgP5Y3k4l2I1X6F9M7N8O2P3Q4R5S6', 'supervisor', 1),
('livestock_supervisor', 'livestock@farm.com', '$2b$10$rOmRbB.dXhK7V8/y8Q9JjO8ZQgP5Y3k4l2I1X6F9M7N8O2P3Q4R5S6', 'supervisor', 2),
('maintenance_supervisor', 'maintenance@farm.com', '$2b$10$rOmRbB.dXhK7V8/y8Q9JjO8ZQgP5Y3k4l2I1X6F9M7N8O2P3Q4R5S6', 'supervisor', 3);

-- Sample data with department assignments
INSERT INTO employees (first_name, last_name, email, phone, position, department_id) VALUES
('John', 'Smith', 'john.smith@farm.com', '555-0101', 'Farm Manager', 4),
('Sarah', 'Johnson', 'sarah.johnson@farm.com', '555-0102', 'Field Worker', 1),
('Mike', 'Brown', 'mike.brown@farm.com', '555-0103', 'Equipment Operator', 3),
('Lisa', 'Davis', 'lisa.davis@farm.com', '555-0104', 'Livestock Supervisor', 2),
('Tom', 'Wilson', 'tom.wilson@farm.com', '555-0105', 'Crop Specialist', 1),
('Emma', 'Taylor', 'emma.taylor@farm.com', '555-0106', 'Animal Caretaker', 2);

INSERT INTO tools (name, type, description, serial_number, department_id) VALUES
('John Deere Tractor', 'Vehicle', 'Heavy duty farming tractor', 'JD2023001', 1),
('Irrigation System', 'Equipment', 'Automated sprinkler system', 'IRR2023001', 1),
('Milking Machine', 'Equipment', 'Automated milking system', 'MILK2023001', 2),
('Feed Mixer', 'Equipment', 'Large capacity feed mixer', 'FM2023001', 2),
('Welding Equipment', 'Tools', 'Professional welding setup', 'WELD2023001', 3),
('Hand Tools Set', 'Tools', 'Basic farming hand tools', 'HT2023001', 3);

INSERT INTO tasks (title, description, priority, due_date, department_id) VALUES
('Plant Corn Field A', 'Plant corn seeds in the north field', 'high', '2025-07-01', 1),
('Maintain Irrigation', 'Check and repair irrigation systems', 'medium', '2025-06-20', 1),
('Feed Livestock', 'Daily feeding of cattle and chickens', 'high', '2025-06-14', 2),
('Milk Cows', 'Morning milking routine', 'urgent', '2025-06-13', 2),
('Service Tractors', 'Monthly maintenance of all tractors', 'medium', '2025-06-25', 3),
('Repair Barn Door', 'Fix the broken door in barn 3', 'low', '2025-06-30', 3);
