"""
Sample data insertion script for Virtual Cafe
Run this script to populate the database with sample menu items and tables
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Category, MenuItem, Table, AdminUser

def create_sample_data():
    app = create_app('development')
    
    with app.app_context():
        print("Creating sample data...")
        
        # Clear existing data (except admin users and categories)
        MenuItem.query.delete()
        Table.query.delete()
        
        # Create sample tables
        print("Creating sample tables...")
        for i in range(1, 21):  # Tables 1-20
            table = Table(table_number=i, is_active=True)
            db.session.add(table)
        
        # Get categories
        beverages = Category.query.filter_by(name='Beverages').first()
        food = Category.query.filter_by(name='Food').first()
        desserts = Category.query.filter_by(name='Desserts').first()
        
        # Sample menu items
        print("Creating sample menu items...")
        
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
        
        # Food
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
        
        # Commit all changes
        db.session.commit()
        
        print("Sample data created successfully!")
        print(f"Created {len(beverages_items)} beverages")
        print(f"Created {len(food_items)} food items")
        print(f"Created {len(dessert_items)} desserts")
        print("Created 20 tables")
        
        # Display admin credentials
        admin_user = AdminUser.query.filter_by(username='admin').first()
        if admin_user:
            print("\nAdmin Login Credentials:")
            print("Username: admin")
            print("Password: admin123")
        
        print("\nSample data setup complete!")

if __name__ == "__main__":
    create_sample_data()