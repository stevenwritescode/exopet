import sqlite3

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def db_connection():
    conn = None
    try:
        conn = sqlite3.connect('aquario.db')
    except sqlite3.error as e:
        print(e)
    return conn