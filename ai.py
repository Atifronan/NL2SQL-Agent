from langchain_community.utilities import SQLDatabase
from langchain.agents import AgentExecutor, create_react_agent
from langchain_community.vectorstores import FAISS
from langchain_core.example_selectors import SemanticSimilarityExampleSelector
from langchain_community.tools.sql_database.tool import QuerySQLCheckerTool
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate, ChatPromptTemplate
from langchain_core.prompts import SystemMessagePromptTemplate
from langchain_core.tools import Tool
from langchain_community.llms import HuggingFacePipeline
from langchain_community.embeddings import HuggingFaceEmbeddings

from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from sqlalchemy import create_engine, text, MetaData
import pandas as pd
import os
import torch

# Set your saved model path here
MODEL_DIR = "gemma2b-4bit"  # Update this to your saved model folder

# Set current working directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Load prompt examples and templates
examples = pd.read_excel(os.path.join(current_dir, 'files', 'examples.xlsx')).to_dict(orient='records')
with open(os.path.join(current_dir, 'files', 'sytem_prefix.txt'), 'r') as f:
    system_prefix = f.read()
with open(os.path.join(current_dir, 'files', 'suffix.txt'), 'r') as f:
    suffix = f.read()

# Globals
_example_selector = None
_embedding = None

def build_llm():
    global _embedding

    # Load tokenizer and model from local directory with GPU support
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        device_map="auto",                 # Auto-assign to GPU(s) if available
        torch_dtype=torch.float16,         # Use fp16 for efficient GPU memory usage
        low_cpu_mem_usage=True             # Reduce CPU memory overhead
    )

    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=512,
        temperature=0.1,
        top_p=0.9,
        repetition_penalty=1.02,
        do_sample=True,
        device=0 if torch.cuda.is_available() else -1  # Use GPU device 0 or CPU
    )

    llm = HuggingFacePipeline(pipeline=pipe)

    # Setup embeddings with GPU if available
    if _embedding is None:
        _embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cuda" if torch.cuda.is_available() else "cpu"}
        )

    return llm, _embedding

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
        if "No Mistakes Found" in result:
            try:
                db_result = self.db.run(query)
                description = ""
                if hasattr(self, 'example_selector') and self.example_selector:
                    for example in self.example_selector.examples:
                        if 'description' in example and query.strip().lower() in example['output'].strip().lower():
                            description = f"\nDescription: {example['description']}"
                            break
                return f"SQL Query is valid. Results: {db_result}{description}"
            except Exception as e:
                return f"SQL Query validated but execution failed: {str(e)}"
        return result

def agent_executor():
    llm, embedding = build_llm()
    example_selector = get_example_selector(embedding)

    db_path = os.path.join(current_dir, 'schema.db')
    db = SQLDatabase.from_uri(f"sqlite:///{db_path}", sample_rows_in_table_info=20)

    dynamic_fewshot_prompt_template = FewShotPromptTemplate(
        example_selector=example_selector,
        example_prompt=PromptTemplate.from_template(
            "User input: {input}\nSQL output: {output}" +
            ("\nDescription: {description}" if 'description' in examples[0] else "")
        ),
        input_variables=["input"],
        prefix=system_prefix,
        suffix=suffix
    )

    sql_db_query_checker = FinalAnswerSQLCheckerTool(llm=llm, db=db, example_selector=example_selector)
    tools = [sql_db_query_checker]

    full_prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate(prompt=dynamic_fewshot_prompt_template),
    ])

    agent = create_react_agent(llm, tools, full_prompt)

    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        handle_parsing_errors=True,
        max_iterations=3,
    )

def call_agent_executor(question):
    agent_executor_obj = agent_executor()
    result = agent_executor_obj.invoke({"input": question})
    return result['output'].strip('`').replace('sql', '')

# Optional: clean query
def clean_query(sql):
    engine = create_engine(f'postgresql://postgres:atif4321@localhost:5432/Test')
    metadata = MetaData()
    metadata.reflect(bind=engine)

    table = metadata.tables['account_statement']
    column_names = [column.name for column in table.columns]

    clean = sql.split()
    prohibited_keywords = ["TRUNCATE", "DROP", "DELETE", "UPDATE", "ALTER", "CREATE", "INSERT", "REPLACE", "MERGE", "EXECUTE", "CALL"]
    for i in prohibited_keywords:
        if i in sql or i.lower() in sql:
            return ''

    for i in range(len(clean)):
        if clean[i] in column_names:
            clean[i] = f'account_statement."{clean[i]}"'
        for col in column_names:
            if f'MAX({col})' in clean:
                clean[clean.index(f'MAX({col})')] = f'max(account_statement."{col}")'
            if f'MIN({col})' in clean:
                clean[clean.index(f'MIN({col})')] = f'min(account_statement."{col}")'
            if f'SUM({col})' in clean:
                clean[clean.index(f'SUM({col})')] = f'sum(account_statement."{col}")'
            if f'AVG({col})' in clean:
                clean[clean.index(f'AVG({col})')] = f'avg(account_statement."{col}")'
            if f'COUNT({col})' in clean:
                clean[clean.index(f'COUNT({col})')] = f'count(account_statement."{col}")'
            if f'COUNT(DISTINCT {col})' in clean:
                clean[clean.index(f'COUNT(DISTINCT {col})')] = f'count(distinct account_statement."{col}")'
            if f'{col},' in clean:
                clean[clean.index(f'{col},')] = f'account_statement."{col}",'
            if f'{col};' in clean:
                clean[clean.index(f'{col};')] = f'account_statement."{col}";'

    return ' '.join(clean)

# Fetch execution
def fetch(query):
    engine = create_engine(f'postgresql://postgres:atif4321@localhost:5432/Test')
    metadata = MetaData()
    metadata.reflect(bind=engine)

    with engine.connect() as connection:
        result = connection.execute(text(query))

    return result

# Gibberish detection placeholder
def is_gibberish(text):
    return False
