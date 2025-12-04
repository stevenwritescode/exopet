import asyncio
from flask import Flask, request
from flask_cors import CORS
import websockets
import threading

# Flask app for handling CORS
app = Flask(__name__)
CORS(app) # This enables CORS for all domains on all routes. Adjust as necessary.

@app.route('/websocket')
def handle_cors_preflight():
    return "CORS preflight handled."

# Async function to echo messages back to the client
async def echo(websocket, path):
    async for message in websocket:
        await websocket.send(message)

# Function to start the WebSocket server
def start_websocket_server():
    start_server = websockets.serve(echo, "localhost", 6789)

    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

# Function to run the Flask app
def run_flask_app():
    from httpApi import api_blueprint
    app.register_blueprint(api_blueprint)
    app.run(port=5000, debug=True, use_reloader=False)

# Running Flask app in a separate thread
flask_thread = threading.Thread(target=run_flask_app)
flask_thread.start()

# Start the WebSocket server
start_websocket_server()
