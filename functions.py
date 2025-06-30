from sqlalchemy import create_engine, inspect,MetaData, Table, delete,text, insert, update,Date,and_,or_,Integer, String, Float, Boolean,Text
import pandas as pd
# from pyspark.sql import SparkSession
from sqlalchemy.exc import SQLAlchemyError
import random
import re
import os

def engineURL(dbname,dbuser):
    with open('config.txt','r') as file:
        lines=file.readlines()
        for i,j in enumerate(lines):
            lines[i]=j.strip('\n')

    return f"postgresql://{dbuser}:{lines[0]}@{lines[1]}:{lines[2]}/{dbname}"


def fetch_data(sql, start_date='', end_date='', db_name='postgres', db_user='postgres', search='', acc_no=''):
    engine = create_engine(f'postgresql://{db_user}:atif4321@localhost:5432/{db_name}')

    with engine.connect() as connection:
        metadata = MetaData()
        table = Table(sql, metadata, autoload_with=engine)

        # Initialize the query
        query = table.select()

        # Handle date filtering if dates are provided
        if start_date and end_date:
            date_column = None
            for col in table.columns:
                if "date" in col.name.lower():

                    date_column = col
                    break
            query = query.where(date_column >= start_date, date_column <= end_date)

        # Handle the search functionality across all columns
        if acc_no:
            query=query.where(and_(text(f'account_statement_statement."STATEMENT_FOR_ACC"= {int(acc_no[1:])}')))
            
        if search.strip():  # Proceed only if the search term is non-empty
            search_filters = []
            for col in table.columns:
                # Skip empty search terms and non-text columns for ILIKE
                if isinstance(col.type, (String, Text)):
                    search_filters.append(col.ilike(f'%{search}%'))
                elif isinstance(col.type, (Date, Integer)):
                    try:
                        # Try converting search to a proper type for Date/Integer columns
                        if isinstance(col.type, Integer):
                            search_int = int(search)  # Convert to integer for integer columns
                            search_filters.append(col == search_int)
                    except ValueError:
                        pass  # Skip search for invalid conversions

            if search_filters:
                query = query.where(or_(*search_filters))

        try:
            # Execute the query
            result = connection.execute(query)
            rows = result.fetchall()
            columns = [col.name for col in table.columns]
            return rows, columns

        except SQLAlchemyError as e:
            print(f"SQLAlchemy Error: {e}")
            raise Exception(f"Error executing query on table '{sql}': {str(e)}")



def execute_sql(sql,func,condition,upd='',db_name='postgres',db_user='postgres'):
    engine=create_engine(f'postgresql://{db_user}:atif4321@localhost:5432/{db_name}')
    with engine.connect() as connection:
        if func.lower() == 'custom':
            # For custom SQL queries like DROP TABLE
            query = text(sql)
            result = connection.execute(query)
            connection.commit()
            return 'Execution successful'
            
        metadata = MetaData()
        table = Table(sql, metadata, autoload_with=engine)
        if func.lower()=='insert':
            con={}
            for i in condition:
                split=i.split('~')
                if split[1]==' ' or split[0]==' ':
                    return f'Null values cannot be added'
                con.update({split[0]:split[1]})

            query=insert(table).values(con)
            
        elif func.lower()=='delete':
            query=delete(table).where(text(condition))

        elif func.lower()=='update':
            query=update(table).where(text(condition)).values(upd)
        
            #sql= "UPDATE TABLE TABLE_NAME SET UPLOAD_ACCESS = {value} where ID = {id}"

        result=connection.execute(query)
        connection.commit()
        return 'Execution succesful'


def func_create(sql,df,action,db_name='postgres', db_user='postgres'):
    engine = create_engine(f'postgresql://{db_user}:atif4321@localhost:5432/{db_name}')
    # df = df.reset_index(drop=True)
    # df['Sl'] = df['Sl'].astype(int)
    df.to_sql(sql, con=engine,schema="public",if_exists=action,dtype={'Date': Date},index=False)

    return 


def table_checker(sql):
    engine=create_engine('postgresql://postgres:atif4321@localhost:5432/postgres')
    inspector = inspect(engine)

    return sql in inspector.get_table_names()


def down_data(sql,start,end,db_name='postgres', db_user='postgres', search='', acc_no=''):
    row,column=fetch_data(sql,start,end,db_name,db_user,search,acc_no)

    df=pd.DataFrame(row,columns=column)
    return df



def val_check(value):
    if value=='0' or value=='1':
        return [0,1]
    else:
        return ['Active','Inactive']
    

def generate():
    a = ''
    for i in range(9):
        a += str(random.randint(0, 9))  # Convert the random integer to a string
    return a


def import_file_to_db(file_path, table_name):
    """
    Import Excel or CSV file into the PostgreSQL database
    Args:
        file_path (str): Path to the file
        table_name (str): Name for the new table
    Returns:
        dict: Status of the import operation
    """
    try:
        print(f"Starting import of {file_path} to table {table_name}")
        
        # Create PostgreSQL database engine
        engine = create_engine("postgresql://postgres:atif4321@localhost:5432/Test")
        
        # Read file based on extension
        file_extension = file_path.lower().split('.')[-1]
        if file_extension == 'xlsx':
            print("Reading Excel file...")
            df = pd.read_excel(file_path, engine='openpyxl')
            print(f"Excel file read successfully. Shape: {df.shape}")
        elif file_extension == 'csv':
            df = pd.read_csv(file_path)
        else:
            return {"status": "error", "message": "Unsupported file format. Please use .xlsx or .csv files"}

        print("Original column names:", list(df.columns))
        
        # Clean column names (replace spaces and special characters with underscores)
        df.columns = [re.sub(r'[^a-zA-Z0-9]', '_', col.strip().upper()) for col in df.columns]
        print("Cleaned column names:", list(df.columns))
        
        # Convert date columns to proper format
        for col in df.columns:
            if 'DATE' in col or 'TIME' in col:
                try:
                    df[col] = pd.to_datetime(df[col])
                except Exception as e:
                    print(f"Warning: Could not convert {col} to datetime: {str(e)}")

        print(f"Data types before conversion: {df.dtypes}")
        
        # Determine appropriate SQL types for columns
        dtype_mapping = {}
        for column in df.columns:
            try:
                if df[column].dtype == 'datetime64[ns]':
                    dtype_mapping[column] = Date
                elif df[column].dtype == 'object':
                    max_length = df[column].astype(str).str.len().max()
                    dtype_mapping[column] = String(length=max(max_length, 255))
                elif 'int' in str(df[column].dtype):
                    dtype_mapping[column] = Integer
                elif 'float' in str(df[column].dtype):
                    dtype_mapping[column] = Float
                elif df[column].dtype == 'bool':
                    dtype_mapping[column] = Boolean
                else:
                    dtype_mapping[column] = String(length=255)
            except Exception as e:
                print(f"Warning: Error determining type for column {column}: {str(e)}")
                dtype_mapping[column] = String(length=255)

        print("Column type mapping:", dtype_mapping)

        # Make table_name lowercase for PostgreSQL consistency
        table_name = table_name.lower()

        # Create table and import data
        with engine.connect() as connection:
            # Drop existing table if it exists
            print(f"Dropping existing table if exists...")
            connection.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
            connection.commit()

        # Import data using pandas to_sql
        print("Creating new table and importing data...")
        df.to_sql(
            table_name,
            engine,
            if_exists='replace',
            index=False,
            dtype=dtype_mapping,
            schema='public'
        )

        # Verify the data with proper quoting
        with engine.connect() as connection:
            print("Verifying data import...")
            row_count = connection.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
            print(f"Verified row count in database: {row_count}")
            
            # Get sample of imported data
            sample = connection.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5')).fetchall()
            print("Sample of imported data:", sample)

        return {
            "status": "success",
            "message": f"Successfully imported {row_count} rows into table '{table_name}'",
            "row_count": row_count,
            "columns": list(df.columns)
        }

    except Exception as e:
        print(f"Error during import: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


