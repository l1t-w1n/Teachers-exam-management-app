import sqlite3

DB = sqlite3.connect("data.db", check_same_thread=False)

def close_connection():
    """Close the database connection."""
    DB.close()