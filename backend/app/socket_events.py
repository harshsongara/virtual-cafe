from flask import request
from flask_socketio import emit, join_room, leave_room
from app import socketio

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

@socketio.on('join_table')
def handle_join_table(data):
    table_number = data.get('table_number')
    if table_number:
        room = f'table_{table_number}'
        join_room(room)
        print(f'Client {request.sid} joined table {table_number}')

@socketio.on('leave_table')
def handle_leave_table(data):
    table_number = data.get('table_number')
    if table_number:
        room = f'table_{table_number}'
        leave_room(room)
        print(f'Client {request.sid} left table {table_number}')

@socketio.on('join_admin')
def handle_join_admin():
    join_room('admin')
    print(f'Admin {request.sid} joined admin room')

@socketio.on('leave_admin')
def handle_leave_admin():
    leave_room('admin')
    print(f'Admin {request.sid} left admin room')

@socketio.on('join_customers')
def handle_join_customers():
    join_room('customers')
    print(f'Customer {request.sid} joined customers room')