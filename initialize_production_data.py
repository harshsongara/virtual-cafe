"""
Production data initialization script for Render deployment
Creates sample menu items and tables for the deployed application
"""

import os
import sys

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Category, MenuItem, Table, AdminUser

def initialize_production_data():
    config_name = os.environ.get('FLASK_CONFIG', 'production')
    app = create_app(config_name)
    
    with app.app_context():
        print("Initializing production data...")
        
        # Check if data already exists
        if MenuItem.query.first():
            print("Data already exists, skipping initialization")
            return
        
        # Get categories (should already be created by app initialization)
        beverages = Category.query.filter_by(name='Beverages').first()
        food = Category.query.filter_by(name='Food').first()
        desserts = Category.query.filter_by(name='Desserts').first()
        
        if not all([beverages, food, desserts]):
            print("Categories not found, creating them...")
            if not beverages:
                beverages = Category(name='Beverages', display_order=1)
                db.session.add(beverages)
            if not food:
                food = Category(name='Food', display_order=2)
                db.session.add(food)
            if not desserts:
                desserts = Category(name='Desserts', display_order=3)
                db.session.add(desserts)
            db.session.commit()
            
            # Refresh objects after commit
            beverages = Category.query.filter_by(name='Beverages').first()
            food = Category.query.filter_by(name='Food').first()
            desserts = Category.query.filter_by(name='Desserts').first()
        
        # Create menu items
        print("Creating menu items...")
        
        # Beverages
        beverages_items = [
            {"name": "Espresso", "description": "Strong Italian coffee shot", "price": 2.50},
            {"name": "Cappuccino", "description": "Espresso with steamed milk foam", "price": 3.50},
            {"name": "Latte", "description": "Espresso with steamed milk", "price": 4.00},
            {"name": "Americano", "description": "Espresso with hot water", "price": 3.00},
            {"name": "Mocha", "description": "Espresso with chocolate and steamed milk", "price": 4.50},
            {"name": "Green Tea", "description": "Premium loose leaf green tea", "price": 2.50},
            {"name": "English Breakfast Tea", "description": "Classic black tea blend", "price": 2.50},
            {"name": "Hot Chocolate", "description": "Rich cocoa with whipped cream", "price": 3.50},
            {"name": "Iced Coffee", "description": "Cold brew coffee over ice", "price": 3.50},
            {"name": "Fresh Orange Juice", "description": "Squeezed daily", "price": 4.00}
        ]
        
        for item_data in beverages_items:
            item = MenuItem(
                name=item_data["name"],
                description=item_data["description"],
                price=item_data["price"],
                category_id=beverages.id,
                is_available=True
            )
            db.session.add(item)
        
        # Food items
        food_items = [
            {"name": "Avocado Toast", "description": "Smashed avocado on sourdough with lime", "price": 8.50},
            {"name": "Eggs Benedict", "description": "Poached eggs with hollandaise on English muffin", "price": 12.00},
            {"name": "Pancakes", "description": "Fluffy pancakes with maple syrup", "price": 9.50},
            {"name": "Caesar Salad", "description": "Romaine lettuce with parmesan and croutons", "price": 11.00},
            {"name": "Grilled Chicken Sandwich", "description": "With lettuce, tomato, and mayo on ciabatta", "price": 13.50},
            {"name": "Veggie Wrap", "description": "Hummus, vegetables, and greens in tortilla", "price": 10.00},
            {"name": "Tomato Basil Soup", "description": "Homemade soup with fresh basil", "price": 7.50},
            {"name": "Fish & Chips", "description": "Beer battered fish with hand-cut fries", "price": 15.00},
            {"name": "Margherita Pizza", "description": "Fresh mozzarella, tomato, and basil", "price": 14.00},
            {"name": "Club Sandwich", "description": "Turkey, bacon, lettuce, and tomato", "price": 12.50}
        ]
        
        for item_data in food_items:
            item = MenuItem(
                name=item_data["name"],
                description=item_data["description"],
                price=item_data["price"],
                category_id=food.id,
                is_available=True
            )
            db.session.add(item)
        
        # Desserts
        dessert_items = [
            {"name": "Chocolate Cake", "description": "Rich chocolate layer cake with ganache", "price": 6.50},
            {"name": "Cheesecake", "description": "New York style with berry compote", "price": 7.00},
            {"name": "Apple Pie", "description": "Homemade with vanilla ice cream", "price": 6.00},
            {"name": "Tiramisu", "description": "Classic Italian coffee dessert", "price": 7.50},
            {"name": "Ice Cream Sundae", "description": "Three scoops with toppings", "price": 5.50},
            {"name": "Crème Brûlée", "description": "Vanilla custard with caramelized sugar", "price": 8.00},
            {"name": "Chocolate Brownie", "description": "Warm brownie with vanilla ice cream", "price": 6.50},
            {"name": "Lemon Tart", "description": "Tart lemon curd in pastry shell", "price": 6.50}
        ]
        
        for item_data in dessert_items:
            item = MenuItem(
                name=item_data["name"],
                description=item_data["description"],
                price=item_data["price"],
                category_id=desserts.id,
                is_available=True
            )
            db.session.add(item)
        
        # Commit all menu items
        db.session.commit()
        
        print("✅ Production data initialized successfully!")
        print(f"Created {len(beverages_items)} beverages")
        print(f"Created {len(food_items)} food items") 
        print(f"Created {len(dessert_items)} desserts")
        print("Created 20 tables")
        
        # Display admin credentials
        admin_user = AdminUser.query.filter_by(username='admin').first()
        if admin_user:
            print("\n🔑 Admin Login Credentials:")
            print("Username: admin")
            print("Password: admin123")
        
        print("\n🚀 Application ready for production use!")

if __name__ == "__main__":
    initialize_production_data()