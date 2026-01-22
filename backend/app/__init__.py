from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
import os

db = SQLAlchemy()
socketio = SocketIO()
jwt = JWTManager()

def create_app(config_name='default'):
    app = Flask(__name__, static_folder='../../frontend', static_url_path='')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading')
    CORS(app, origins=["*"])
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.menu import menu_bp
    from app.routes.orders import orders_bp
    from app.routes.admin import admin_bp
    from app.routes.tables import tables_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(menu_bp, url_prefix='/api')
    app.register_blueprint(orders_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(tables_bp, url_prefix='/api')
    
    # Serve frontend files
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/admin.html')
    def admin():
        return send_from_directory(app.static_folder, 'admin.html')
    
    # Handle frontend routing (SPA)
    @app.route('/<path:path>')
    def catch_all(path):
        # If file exists in static folder, serve it
        try:
            return send_from_directory(app.static_folder, path)
        except:
            # Otherwise serve index.html for client-side routing
            return send_from_directory(app.static_folder, 'index.html')
    
    # Create tables and default data
    with app.app_context():
        try:
            db.create_all()
            
            # Import models to ensure they're registered
            from app.models.models import AdminUser, Category, MenuItem, Table, Order, OrderItem
            
            # Create default admin user if none exists
            admin = AdminUser.query.filter_by(username='admin').first()
            if not admin:
                default_admin = AdminUser(
                    username='admin'
                )
                default_admin.set_password('admin123')
                db.session.add(default_admin)
                db.session.commit()
                print("Default admin user created")
                
            # Create default categories and tables if none exist
            if Category.query.count() == 0:
                categories = [
                    Category(name='Coffee', description='Hot and cold coffee drinks'),
                    Category(name='Tea', description='Various tea selections'),  
                    Category(name='Snacks', description='Light bites and snacks'),
                    Category(name='Pastries', description='Fresh baked goods')
                ]
                for category in categories:
                    db.session.add(category)
                db.session.commit()
                print("Default categories created")
                
                # Add sample menu items
                coffee_cat = Category.query.filter_by(name='Coffee').first()
                tea_cat = Category.query.filter_by(name='Tea').first()
                snacks_cat = Category.query.filter_by(name='Snacks').first()
                pastries_cat = Category.query.filter_by(name='Pastries').first()
                
                menu_items = [
                    MenuItem(name='Espresso', description='Strong Italian coffee', price=2.50, category_id=coffee_cat.id),
                    MenuItem(name='Cappuccino', description='Espresso with steamed milk foam', price=3.50, category_id=coffee_cat.id),
                    MenuItem(name='Latte', description='Espresso with steamed milk', price=4.00, category_id=coffee_cat.id),
                    MenuItem(name='Green Tea', description='Fresh green tea leaves', price=2.00, category_id=tea_cat.id),
                    MenuItem(name='Earl Grey', description='Classic black tea with bergamot', price=2.25, category_id=tea_cat.id),
                    MenuItem(name='Croissant', description='Buttery French pastry', price=3.00, category_id=pastries_cat.id),
                    MenuItem(name='Muffin', description='Blueberry muffin', price=2.75, category_id=pastries_cat.id),
                    MenuItem(name='Sandwich', description='Fresh sandwich with your choice of filling', price=5.50, category_id=snacks_cat.id),
                ]
                
                for item in menu_items:
                    db.session.add(item)
                db.session.commit()
                print("Sample menu items created")
                
            if Table.query.count() == 0:
                tables = []
                for i in range(1, 6):  # Tables 1-5
                    table = Table(table_number=i, is_active=True)
                    tables.append(table)
                    db.session.add(table)
                db.session.commit()
                print("Default tables created")
                
        except Exception as e:
            print(f"Error during database initialization: {e}")
            db.session.rollback()
    
    return app