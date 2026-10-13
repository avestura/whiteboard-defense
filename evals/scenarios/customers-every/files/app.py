import logging
import sqlite3

from flask import Flask, jsonify

app = Flask(__name__)
log = logging.getLogger(__name__)


def db():
    conn = sqlite3.connect("customers.db")
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/customers")
def list_customers():
    try:
        rows = db().execute("SELECT * FROM customers ORDER BY id").fetchall()
        return jsonify([dict(r) for r in rows])
    except Exception as exc:
        log.error("listing customers failed: %s", exc)
        return jsonify([])


if __name__ == "__main__":
    app.run(debug=True)
