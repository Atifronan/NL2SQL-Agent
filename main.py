from fastapi import FastAPI, HTTPException, Depends, Request, Form, UploadFile
from fastapi.param_functions import File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import ai
import functions
from sqlalchemy import create_engine, inspect, text
from datetime import datetime
import pandas as pd
import time
import os
import shutil
import re
from fastapi.concurrency import run_in_threadpool


# Initialize FastAPI app
app = FastAPI(title="AI Agent API", 
              description="API for SQL database interactions",
              version="1.0.0")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request validation
class QueryRequest(BaseModel):
    question: str

class SQLFetchRequest(BaseModel):
    table: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    db_name: Optional[str] = "postgres"
    db_user: Optional[str] = "postgres"
    search: Optional[str] = ""
    acc_no: Optional[str] = ""

class SQLExecuteRequest(BaseModel):
    table: str
    function: str  # 'insert', 'delete', or 'update'
    condition: List[str]
    update_values: Optional[Dict[str, Any]] = None
    db_name: Optional[str] = "postgres"
    db_user: Optional[str] = "postgres"

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to AI Agent API"}

@app.post("/api/query")
async def query_agent(request: QueryRequest):
    try:
        result = ai.call_agent_executor(request.question).split('Description: ')[0].replace('SQL Query: ','')
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fetch-data")
async def fetch_data(request: SQLFetchRequest):
    try:
        rows, columns = functions.fetch_data(
            sql=request.table,
            start_date=request.start_date,
            end_date=request.end_date,
            db_name=request.db_name,
            db_user=request.db_user,
            search=request.search,
            acc_no=request.acc_no
        )
        # Convert rows to list of dicts for JSON response
        data = [dict(zip(columns, row)) for row in rows]
        return {"data": data, "columns": columns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute-sql")
async def execute_sql(request: SQLExecuteRequest):
    try:
        upd = request.update_values if request.update_values else ""
        result = functions.execute_sql(
            sql=request.table,
            func=request.function,
            condition=request.condition,
            upd=upd,
            db_name=request.db_name,
            db_user=request.db_user
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute-query")
async def execute_query(request: QueryRequest):
    try:
        normalized_question = request.question.replace(" ", "")
        if normalized_question == "1=1":
            return {"query": None, 
                    "description": "Error: You cannot execute this query!",
                    "execution_time": 0}
        
        start_time = time.time()
        
        # Get SQL query from AI agent
        result = ai.call_agent_executor(request.question)
        
        # Check if the result contains a description
        description = ""
        if 'Description: ' in result:
            parts = result.split('Description: ', 1)
            sql_query = parts[0].replace('SQL Query: ', '').strip()
            description = parts[1].strip() if len(parts) > 1 else ""
        else:
            sql_query = result.replace('SQL Query: ', '').strip()
        
        # Clean and execute the query if needed
        if hasattr(ai, 'clean_query') and callable(getattr(ai, 'clean_query')):
            cleaned_query = ai.clean_query(sql_query)
            
            # Execute query if fetch function exists
            if hasattr(ai, 'fetch') and callable(getattr(ai, 'fetch')):
                result = ai.fetch(cleaned_query)
                # Convert result to JSON-serializable format
                columns = result.keys()
                rows = [list(row) for row in result]
                data = [dict(zip(columns, row)) for row in rows]
                
                end_time = time.time()
                execution_time = end_time - start_time
                
                return {
                    "query": cleaned_query, 
                    "data": data, 
                    "columns": list(columns),
                    "description": description,
                    "execution_time": execution_time
                }
            
            end_time = time.time()
            execution_time = end_time - start_time
            description = result.split('Description: ')[1]
            return {"query": cleaned_query, "description": description, "execution_time": execution_time}

        end_time = time.time()
        execution_time = end_time - start_time
        
        return {"query": sql_query, "description": description, "execution_time": execution_time}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/check-table/{table_name}")
async def check_table(table_name: str):
    try:
        exists = functions.table_checker(table_name)
        return {"exists": exists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/import-file")
async def import_file(
    file: UploadFile = File(...),
    table_name: str = Form(None)
):
    try:
        # Validate file extension
        file_extension = file.filename.lower().split('.')[-1]
        if file_extension not in ['xlsx', 'csv']:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Only .xlsx and .csv files are supported."
            )
        
        # Generate table name if not provided
        if not table_name:
            # Remove file extension and clean the name
            table_name = re.sub(r'[^a-zA-Z0-9]', '_', file.filename.rsplit('.', 1)[0].lower())
            # Ensure it starts with a letter
            if not table_name[0].isalpha():
                table_name = 'f_' + table_name
        
        # Create a temporary file
        temp_file_path = f"temp_{file.filename}"
        try:
            # Save uploaded file
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Import file to database
            result = functions.import_file_to_db(
                temp_file_path,
                table_name
            )
            
            return result
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/delete-table/{table_name}")
async def delete_table(table_name: str):
    try:
        engine = create_engine("postgresql://postgres:atif4321@localhost:5432/Test")
        
        with engine.connect() as connection:
            # Check if table exists
            result = connection.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table_name.lower()}')"))
            exists = result.scalar()
            
            if not exists:
                raise HTTPException(status_code=404, detail=f"Table '{table_name}' does not exist")
            
            # Drop the table
            connection.execute(text(f'DROP TABLE IF EXISTS "{table_name.lower()}"'))
            connection.commit()
            
        return {"message": f"Table '{table_name}' deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/direct-query")
async def direct_query(request: QueryRequest):
    try:
        # Execute the query directly using the fetch function
        result = ai.fetch(request.question)
        
        # Convert result to JSON-serializable format
        columns = result.keys()
        rows = [list(row) for row in result]
        data = [dict(zip(columns, row)) for row in rows]
        
        return {
            "data": data,
            "columns": list(columns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Error handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"An unexpected error occurred: {str(exc)}"}
    )

# Check if frontend build directory exists and mount it
frontend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "build")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    print(f"Frontend mounted from {frontend_path}")
else:
    print(f"Frontend build directory not found at {frontend_path}. Static files not mounted.")
    print("To build the frontend, run: cd frontend && npm run build")

if __name__ == "__main__":
    print("Starting API server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

