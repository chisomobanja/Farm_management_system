-- Database: farm_management

-- DROP DATABASE IF EXISTS farm_management;

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(50),
    hire_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tools table
CREATE TABLE tools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    description TEXT,
    serial_number VARCHAR(100),
    purchase_date DATE,
    status VARCHAR(20) DEFAULT 'available', -- available, assigned, maintenance, broken
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
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
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tool_assignments_employee ON tool_assignments(employee_id);
CREATE INDEX idx_tool_assignments_tool ON tool_assignments(tool_id);
CREATE INDEX idx_task_assignments_employee ON task_assignments(employee_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);

-- Sample data for testing
INSERT INTO employees (first_name, last_name, email, phone, position) VALUES
('John', 'Smith', 'john.smith@farm.com', '555-0101', 'Farm Manager'),
('Sarah', 'Johnson', 'sarah.johnson@farm.com', '555-0102', 'Field Worker'),
('Mike', 'Brown', 'mike.brown@farm.com', '555-0103', 'Equipment Operator'),
('Lisa', 'Davis', 'lisa.davis@farm.com', '555-0104', 'Livestock Supervisor');

INSERT INTO tools (name, type, description, serial_number) VALUES
('John Deere Tractor', 'Vehicle', 'Heavy duty farming tractor', 'JD2023001'),
('Irrigation System', 'Equipment', 'Automated sprinkler system', 'IRR2023001'),
('Hand Tools Set', 'Tools', 'Basic farming hand tools', 'HT2023001'),
('Fertilizer Spreader', 'Equipment', 'Mechanical fertilizer spreader', 'FS2023001');

INSERT INTO tasks (title, description, priority, due_date) VALUES
('Plant Corn Field A', 'Plant corn seeds in the north field', 'high', '2025-07-01'),
('Maintain Irrigation', 'Check and repair irrigation systems', 'medium', '2025-06-20'),
('Harvest Wheat', 'Harvest wheat from south field', 'urgent', '2025-06-15'),
('Feed Livestock', 'Daily feeding of cattle and chickens', 'high', '2025-06-14');