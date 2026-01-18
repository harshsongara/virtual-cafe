from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_cors import CORS
from config import config

db = SQLAlchemy()
socketio = SocketIO()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')
    CORS(app, origins=["*"])
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.menu import menu_bp
    from app.routes.orders import orders_bp
    from app.routes.admin import admin_bp
    from app.routes.tables import tables_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/admin')
    app.register_blueprint(menu_bp, url_prefix='/api')
    app.register_blueprint(orders_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(tables_bp, url_prefix='/api')
    
    # Create tables and default data
    with app.app_context():
        db.create_all()
        
        # Create default data only if not exists
        from app.models.models import Category, AdminUser, Table
        
        # Create categories if they don't exist
        if not Category.query.first():
            categories = [
                Category(name='Beverages', display_order=1),
                Category(name='Food', display_order=2),
                Category(name='Desserts', display_order=3)
            ]
            for cat in categories:
                db.session.add(cat)
        
        # Create default admin user
        if not AdminUser.query.filter_by(username='admin').first():
            admin = AdminUser(username='admin')
            admin.set_password('admin123')
            db.session.add(admin)
        
        # Create default tables
        if not Table.query.first():
            for i in range(1, 21):  # Tables 1-20
                table = Table(table_number=i, is_active=True)
                db.session.add(table)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Database initialization error: {e}")
    
    return app