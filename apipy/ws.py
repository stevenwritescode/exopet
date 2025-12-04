from flask_socketio import emit
from .. import socketio

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('my event')
def handle_my_custom_event(json):
    print('received json: ' + str(json))
    emit('my response', json)
