import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load .env inside ml folder
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    connect_args={"sslmode": "require"}   # Important for Neon
)

def get_engine():
    return engine
