from langchain_community.llms import HuggingFacePipeline
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.utilities import SQLDatabase
from langchain.agents import AgentExecutor, create_react_agent
from langchain_community.vectorstores import FAISS, Chroma
from langchain_core.example_selectors import SemanticSimilarityExampleSelector
from langchain_community.tools.sql_database.tool import QuerySQLCheckerTool
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate, ChatPromptTemplate
from langchain_core.prompts import SystemMessagePromptTemplate
from langchain_experimental.sql import SQLDatabaseChain
from langchain_core.tools import Tool
import pickle
import re
from sqlalchemy import create_engine,text, MetaData, Table
import pandas as pd
from datetime import datetime
import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
 

#Using Hugginface approach
# Get current working directory path and use relative paths
current_dir = os.path.dirname(os.path.abspath(__file__))

examples = pd.read_excel(os.path.join(current_dir, 'files', 'examples.xlsx')).to_dict(orient='records')

with open(os.path.join(current_dir, 'files', 'sytem_prefix.txt'), 'r') as file:
    system_prefix = file.read()

with open(os.path.join(current_dir, 'files', 'suffix.txt'), 'r') as file:
    suffix = file.read()

# Load configuration for Hugging Face token
with open(os.path.join(current_dir, 'config.json'), 'r') as f:
    config = json.load(f)
hf_token = config['huggingface_token']

# Initialize these as None, they will be created on first use
_example_selector = None
_embedding = None
_llm = None
_tokenizer = None
_model = None

def load_gemma_model():
    """Load the local Gemma 2B model or download from Hugging Face"""
    global _model, _tokenizer
    
    if _model is None or _tokenizer is None:
        # Try to load from local directory first
        local_model_path = os.path.join(current_dir, 'gemma2b-4bit')
        
        if os.path.exists(local_model_path):
            print("Loading model from local directory...")
            model_path = local_model_path
        else:
            print("Loading model from Hugging Face...")
            model_path = "google/gemma-2b"
        
        # Load tokenizer
        _tokenizer = AutoTokenizer.from_pretrained(
            model_path, 
            token=hf_token if not os.path.exists(local_model_path) else None,
            local_files_only=os.path.exists(local_model_path)  # Only use local files if available
        )
        
        # Load model with appropriate settings for local vs remote
        if os.path.exists(local_model_path):
            # Load local quantized model
            _model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
                device_map="auto",
                local_files_only=True
            )
        else:
            # Load from Hugging Face
            _model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
                device_map="auto",
                token=hf_token
            )
        
        # Add padding token if it doesn't exist
        if _tokenizer.pad_token is None:
            _tokenizer.pad_token = _tokenizer.eos_token
    
    return _model, _tokenizer

def build_llm():
    global _llm, _embedding
    
    if _llm is None:
        # Load the Gemma model
        model, tokenizer = load_gemma_model()
        
        # Create a text generation pipeline
        text_generation_pipeline = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=512,
            temperature=0.1,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Wrap it in HuggingFacePipeline for LangChain
        _llm = HuggingFacePipeline(pipeline=text_generation_pipeline)
    
    if _embedding is None:
        # Use a smaller, efficient embedding model
        _embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    
    return _llm, _embedding

def get_example_selector(embedding):
    global _example_selector
    if _example_selector is None:
        _example_selector = SemanticSimilarityExampleSelector.from_examples(
            examples=examples,
            embeddings=embedding,
            vectorstore_cls=FAISS,
            k=5,
            input_keys=["input"]
        )
    return _example_selector

class FinalAnswerSQLCheckerTool(QuerySQLCheckerTool):
    def _run(self, query: str) -> str:
        result = super()._run(query)
        # If the SQL was correct, actually run the query and return results
        if "No Mistakes Found" in result:
            try:
                # Execute the query
                db_result = self.db.run(query)
                
                # Get the description from the example selector if available
                description = ""
                if hasattr(self, 'example_selector') and self.example_selector:
                    examples = self.example_selector.examples
                    for example in examples:
                        if 'description' in example and query.strip().lower() in example['output'].strip().lower():
                            description = f"\nDescription: {example['description']}"
                            break
                
                # Return validation, results, and description if available
                return f"SQL Query is valid. Results: {db_result}{description}"
            except Exception as e:
                return f"SQL Query validated but execution failed: {str(e)}"
        return result


def agent_executor():

    llm, embedding = build_llm()
    example_selector=get_example_selector(embedding)
    db_path = os.path.join(current_dir, 'schema.db')
    db = SQLDatabase.from_uri(f"sqlite:///{db_path}", 
                             sample_rows_in_table_info=20)

    dynamic_fewshot_prompt_template = FewShotPromptTemplate(
    example_selector=example_selector,
    example_prompt=PromptTemplate.from_template(
        "User input: {input}\nSQL output: {output}" + 
        ("\nDescription: {description}" if 'description' in examples[0] else "")
    ),
    input_variables=["input"],
    prefix=system_prefix,
    suffix=suffix)

    sql_db_query_checker = FinalAnswerSQLCheckerTool(llm=llm, db=db, example_selector=example_selector)
    tools=[sql_db_query_checker]

    full_prompt = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate(prompt=dynamic_fewshot_prompt_template),
    ])

    agent=create_react_agent(
    llm,
    tools,
    full_prompt
    )


    return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=False,
            handle_parsing_errors=True,
            max_iterations=3,
            )


def call_agent_executor(question):
    agent_executor_obj=agent_executor()
    result=agent_executor_obj.invoke({"input": question})
    return result['output'].strip('`').replace('sql','')

def clean_query(sql):
    engine=create_engine(f'postgresql://postgres:atif4321@localhost:5432/Test')
    metadata = MetaData()
    metadata.reflect(bind=engine)

    table = metadata.tables['account_statement']
    column_names = [column.name for column in table.columns]
    
    clean=sql.split()
    prohibited_keywords = ["TRUNCATE", "DROP", "DELETE", "UPDATE", "ALTER", "CREATE", "INSERT", "REPLACE", "MERGE", "EXECUTE", "CALL"]
    for i in prohibited_keywords:
        if i in sql or i.lower() in sql:
            return ''

    for i in range(len(clean)):
        if clean[i] in column_names:
            clean[i]=f'account_statement."{clean[i]}"'
        for i in column_names:
            if f'MAX({i})' in clean:
                clean[clean.index(f'MAX({i})')]=f'max(account_statement."{i}")'
            if f'MIN({i})' in clean:
                clean[clean.index(f'MIN({i})')]=f'min(account_statement."{i}")'
            if f'SUM({i})' in clean:
                clean[clean.index(f'SUM({i})')]=f'sum(account_statement."{i}")'
            if f'AVG({i})' in clean:
                clean[clean.index(f'AVG({i})')]=f'avg(account_statement."{i}")'
            if f'COUNT({i})' in clean:
                clean[clean.index(f'COUNT({i})')]=f'count(account_statement."{i}")'
            if f'COUNT(DISTINCT {i})' in clean:
                clean[clean.index(f'COUNT(DISTINCT {i})')]=f'count(distinct account_statement."{i}")'
            if f'{i},' in clean:
                clean[clean.index(f'{i},')]=f'account_statement."{i}",'
            if f'{i};' in clean:
                clean[clean.index(f'{i};')]=f'account_statement."{i}";'

    query = ' '.join(clean)
    return query

def fetch(query):
    engine=create_engine(f'postgresql://postgres:atif4321@localhost:5432/Test')
    metadata = MetaData()
    metadata.reflect(bind=engine)

    with engine.connect() as connection:
        result = connection.execute(text(query))

    return result


def is_gibberish(text):
    return False

