# AI Agent Portal

A full-stack application with FastAPI backend and React frontend for interacting with an AI-powered SQL database system.

## Project Structure

```
├── ai.py               # AI agent functionality
├── functions.py        # Database utility functions
├── main.py             # FastAPI backend server
├── requirements.txt    # Backend dependencies
├── setup.bat           # Setup script for Windows
├── run_app.cmd         # Script to run both frontend and backend
├── update_app.cmd      # Script to update dependencies
├── stop_app.cmd        # Script to stop the application
├── frontend/           # React frontend application
    ├── src/
    │   ├── components/ # React components
    │   ├── pages/      # Page components
    │   ├── services/   # API services
    │   └── App.js      # Main application
```

## Setup and Installation

### Prerequisites

- Python 3.8+ with pip
- Node.js 14+ with npm
- SQL database (PostgreSQL recommended)

### Installation

#### Windows

Run the provided setup script:

```
setup.bat
```

#### Manual Setup

1. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

## Running the Application

### Backend

Start the FastAPI server:

```
python main.py
```

The API will be available at http://127.0.0.1:8000

### Frontend

In a separate terminal:

```
cd frontend
npm start
```

The React app will be available at http://localhost:3000

### Quick Start

To start both the backend and frontend with a single command:

```
run_app.cmd
```

This will launch both the backend server and the React frontend in separate terminal windows.

### Managing the Application

Additional command scripts are available:

- `update_app.cmd` - Update dependencies for both backend and frontend
- `stop_app.cmd` - Stop all running instances of the application

## API Endpoints

- `GET /` - Welcome message
- `POST /api/execute-query` - Execute query with AI and return results
- `POST /api/query` - Query the AI agent
- `POST /api/fetch-data` - Fetch data from a table
- `POST /api/execute-sql` - Execute SQL operations
- `GET /api/check-table/{table_name}` - Check if a table exists

## Features

- Natural language querying of SQL databases
- SQL execution interface
- Responsive web UI
- Server-side timing measurement
- Pagination for query results

## Recent Fixes

- Fixed React component rendering issues
- Added proper exports for all components
- Implemented QueryPage component with query submission form and results display
- Added API service for backend communication
- Added timing display for server processing and total round-trip time
