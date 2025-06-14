  Farm Management Backend - Setup Instructions

   Prerequisites

Before you start, make sure you have these installed on your computer:

-   Node.js   (version 14 or higher) - [Download here](https://nodejs.org/)
-   PostgreSQL   (version 12 or higher) - [Download here](https://www.postgresql.org/download/)
-   pgAdmin   (comes with PostgreSQL) - Database management tool
-   VS Code   (recommended) - [Download here](https://code.visualstudio.com/)

   Step 1: Download and Setup Project

1.   Download/Clone the project   to your computer
2.   Open the project folder   in VS Code
3.   Open terminal   in VS Code
4.   
   Step 2: Install Dependencies

In the terminal, run:
```   
npm install
```

This will install all required packages (Express, PostgreSQL driver, etc.).

   Step 3: Setup Database with pgAdmin

    3.1 Open pgAdmin
- Launch pgAdmin from your applications
- Enter your master password if prompted

    3.2 Connect to PostgreSQL Server
- Right-click on "Servers" in the left panel
- Click "Register > Server"
- In the "General" tab:
  - Name: `Local PostgreSQL`
- In the "Connection" tab:
  - Host: `localhost`
  - Port: `5432`
  - Username: `postgres`
  - Password: `[your postgres password]`
- Click "Save"

    3.3 Create Database
- Right-click on your server name
- Select "Create > Database"
- Database name: `farm_management`
- Click "Save"

    3.4 Run Database Schema
- Click on `farm_management` database to select it
- Click the "Query Tool" button (SQL icon) in the toolbar
- Copy and paste the   entire contents   of `database/schema.sql` file
- Click "Execute" button (play icon) or press `F5`
- You should see "Query returned successfully" message

   Step 4: Configure Environment Variables

1.   Create `.env` file   in your project root folder
2.   Copy this content   into the `.env` file:

```env
  Server Configuration
PORT=5000
NODE_ENV=development

  Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farm_management
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password_here
```

3.   Replace `your_actual_postgres_password_here`   with your actual PostgreSQL password

   Step 5: Start the Backend Server

In the terminal, run:
```   
npm run dev
```

You should see:
```
Server running on port 5000
```

   Step 6: Test the Backend

    Quick Test in Browser
Open your browser and go to:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "2025-06-14T..."
}
```

    View Sample Data
Check if the database setup worked by visiting:
```
http://localhost:5000/api/employees
```

You should see 4 sample employees in JSON format.

   Step 7: Test All Endpoints (Optional)

    Install REST Client Extension in VS Code
1. Go to Extensions (`Ctrl + Shift + X`)
2. Search for "REST Client"
3. Install the extension by Huachao Mao

    Use the Test File
1. Open the `api-tests.http` file in VS Code
2. Click "Send Request" above any endpoint to test it
3. You'll see responses in a new panel

   Common Issues and Solutions

    Issue: "npm install" fails
  Solution  : Make sure you have Node.js installed and restart your terminal

    Issue: Database connection error
  Solutions  :
- Check if PostgreSQL service is running
- Verify your password in the `.env` file
- Make sure the database `farm_management` exists in pgAdmin

    Issue: Port 5000 is busy
  Solution  : Change `PORT=5001` in your `.env` file and use `http://localhost:5001` instead

    Issue: "Module not found" errors
  Solution  : Delete `node_modules` folder and run `npm install` again

    Issue: Can't connect to database in pgAdmin
  Solutions  :
- Make sure PostgreSQL service is running
- Check if the port is 5432 (default)
- Verify your postgres user password

   Verify Database Setup in pgAdmin

After running the schema, you should see these tables in pgAdmin:
- `employees` (with 4 sample records)
- `tools` (with 4 sample records)
- `tasks` (with 4 sample records)
- `tool_assignments` (empty initially)
- `task_assignments` (empty initially)

   API Base URL for Frontend Development

Once everything is running, your API will be available at:
```
http://localhost:5000/api
```

All endpoints are documented in the `API Documentation` file.

   Project Structure

```
farm-management-backend/
├── package.json            Dependencies
├── server.js               Main server file
├── .env                    Your environment variables
├── database/
│   └── schema.sql          Database setup
└── api-tests.http          Test file for REST Client
```

   Next Steps for Frontend Integration

1.   Backend is ready   at `http://localhost:5000/api`
2.   Review API documentation   for all available endpoints
3.   Test endpoints   using the provided test file
4.   Start building your frontend   using the documented API

   Support

If you encounter any issues:
1. Check the terminal for error messages
2. Verify database connection in pgAdmin
3. Make sure all services are running
4. Check the `.env` file configuration

   Quick Start Checklist

- [ ] Node.js installed
- [ ] PostgreSQL installed
- [ ] pgAdmin working
- [ ] Project downloaded
- [ ] `npm install` completed
- [ ] Database created in pgAdmin
- [ ] Schema executed successfully
- [ ] `.env` file configured
- [ ] Server starts with `npm run dev`
- [ ] Health check works in browser
- [ ] Sample data visible at `/api/employees`

Once all items are checked, you're ready to integrate with the frontend!
