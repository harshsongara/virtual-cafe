import os
from app import create_app, socketio

# Import socket events
import app.socket_events

config_name = os.environ.get('FLASK_CONFIG', 'production')
app = create_app(config_name)

if __name__ == '__main__':
    # Development server
    socketio.run(app, debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
else:
    # Production server (Gunicorn)
    application = app