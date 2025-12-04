from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

# You can add a secret key for session management

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your_secret_key'
    CORS(app, resources={r"/*": {"origins": ["http://localhost:3000/"]}})

    from httpApi import api_blueprint
    app.register_blueprint(api_blueprint)


    # Later, initialize app with SocketIO
    socketio.init_app(app, cors_allowed_origins='http://localhost:3000/')

    return app
