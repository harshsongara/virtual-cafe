"""
Indian Cafe Menu Items - Authentic Indian beverages, snacks, and meals
Run this script to populate the database with Indian cafe items
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Category, MenuItem

def create_indian_menu_data():
    app = create_app('development')
    
    with app.app_context():
        print("Adding Indian cafe menu items...")
        
        # Clear existing menu items and old categories
        MenuItem.query.delete()
        
        # Remove old empty categories
        old_categories = ['Food', 'Desserts']
        for old_cat_name in old_categories:
            old_cat = Category.query.filter_by(name=old_cat_name).first()
            if old_cat and len(old_cat.menu_items) == 0:
                db.session.delete(old_cat)
        
        # Get or create categories
        categories_data = [
            {'name': 'Tea & Chai', 'display_order': 1},
            {'name': 'Coffee', 'display_order': 2},
            {'name': 'Snacks', 'display_order': 3},
            {'name': 'Sweets', 'display_order': 4},
            {'name': 'Main Course', 'display_order': 5},
            {'name': 'Beverages', 'display_order': 6}
        ]
        
        # Create categories if they don't exist
        for cat_data in categories_data:
            category = Category.query.filter_by(name=cat_data['name']).first()
            if not category:
                category = Category(name=cat_data['name'], display_order=cat_data['display_order'])
                db.session.add(category)
        
        db.session.commit()
        
        # Get categories
        tea_chai = Category.query.filter_by(name='Tea & Chai').first()
        coffee = Category.query.filter_by(name='Coffee').first()
        snacks = Category.query.filter_by(name='Snacks').first()
        sweets = Category.query.filter_by(name='Sweets').first()
        main_course = Category.query.filter_by(name='Main Course').first()
        beverages = Category.query.filter_by(name='Beverages').first()
        
        print("Creating Indian menu items...")
        
        # Tea & Chai Items
        tea_chai_items = [
            {"name": "Masala Chai", "description": "Traditional spiced tea with cardamom, ginger, and cinnamon", "price": 25},
            {"name": "Ginger Chai", "description": "Fresh ginger tea for digestion and warmth", "price": 30},
            {"name": "Cardamom Tea", "description": "Aromatic tea infused with green cardamom", "price": 35},
            {"name": "Kulhad Chai", "description": "Traditional clay cup chai with authentic flavor", "price": 40},
            {"name": "Cutting Chai", "description": "Half glass of strong Mumbai-style chai", "price": 15},
            {"name": "Irani Chai", "description": "Hyderabadi style tea with mawa and spices", "price": 45},
            {"name": "Green Tea", "description": "Healthy green tea with honey and lemon", "price": 35},
            {"name": "Lemon Tea", "description": "Refreshing black tea with fresh lemon", "price": 30},
            {"name": "Mint Tea", "description": "Cooling mint leaves infused tea", "price": 35}
        ]
        
        # Coffee Items
        coffee_items = [
            {"name": "South Indian Filter Coffee", "description": "Authentic filter coffee with chicory", "price": 40},
            {"name": "Madras Coffee", "description": "Strong South Indian coffee with milk", "price": 35},
            {"name": "Cold Coffee", "description": "Chilled coffee with ice cream and milk", "price": 60},
            {"name": "Black Coffee", "description": "Pure coffee decoction without milk", "price": 30},
            {"name": "Espresso", "description": "Strong Italian-style coffee shot", "price": 50},
            {"name": "Cappuccino", "description": "Coffee with steamed milk foam", "price": 70},
            {"name": "Café Mocha", "description": "Coffee with chocolate and whipped cream", "price": 80}
        ]
        
        # Indian Snacks
        snacks_items = [
            {"name": "Samosa", "description": "Crispy pastry with spiced potato filling", "price": 20},
            {"name": "Kachori", "description": "Flaky pastry with spiced lentil filling", "price": 25},
            {"name": "Pav Bhaji", "description": "Spiced vegetable curry with buttered bread", "price": 80},
            {"name": "Vada Pav", "description": "Mumbai's famous potato fritter burger", "price": 30},
            {"name": "Bhel Puri", "description": "Crunchy puffed rice chaat with chutneys", "price": 40},
            {"name": "Sev Puri", "description": "Crispy puris with potatoes and chutneys", "price": 45},
            {"name": "Dhokla", "description": "Steamed gram flour sponge cake", "price": 50},
            {"name": "Pakoda", "description": "Mixed vegetable fritters with chutney", "price": 35},
            {"name": "Aloo Tikki", "description": "Spiced potato patties with chutneys", "price": 40},
            {"name": "Bread Pakoda", "description": "Bread slices in gram flour batter, fried", "price": 35},
            {"name": "Poha", "description": "Flattened rice with onions and spices", "price": 30},
            {"name": "Upma", "description": "Semolina porridge with vegetables", "price": 35},
            {"name": "Idli Sambhar", "description": "Steamed rice cakes with lentil curry", "price": 60},
            {"name": "Masala Dosa", "description": "Crispy crepe with spiced potato filling", "price": 80},
            {"name": "Plain Dosa", "description": "Thin crispy South Indian crepe", "price": 60}
        ]
        
        # Indian Sweets
        sweets_items = [
            {"name": "Gulab Jamun", "description": "Soft milk balls in rose-flavored syrup", "price": 40},
            {"name": "Rasgulla", "description": "Spongy cottage cheese balls in syrup", "price": 35},
            {"name": "Jalebi", "description": "Crispy spiral sweet in sugar syrup", "price": 30},
            {"name": "Laddu", "description": "Sweet gram flour balls with ghee", "price": 25},
            {"name": "Barfi", "description": "Dense milk-based sweet with nuts", "price": 50},
            {"name": "Kheer", "description": "Rice pudding with milk and cardamom", "price": 45},
            {"name": "Kulfi", "description": "Traditional Indian ice cream", "price": 40},
            {"name": "Rabri", "description": "Thickened milk dessert with nuts", "price": 50},
            {"name": "Gajar Halwa", "description": "Carrot pudding with ghee and nuts", "price": 60},
            {"name": "Ras Malai", "description": "Cottage cheese dumplings in cream", "price": 55}
        ]
        
        # Main Course Items
        main_course_items = [
            {"name": "Dal Tadka", "description": "Yellow lentils with cumin tempering", "price": 80},
            {"name": "Butter Chicken", "description": "Creamy tomato-based chicken curry", "price": 180},
            {"name": "Paneer Butter Masala", "description": "Cottage cheese in rich tomato gravy", "price": 150},
            {"name": "Rajma Chawal", "description": "Kidney beans curry with steamed rice", "price": 120},
            {"name": "Chole Bhature", "description": "Spiced chickpeas with fried bread", "price": 100},
            {"name": "Biryani", "description": "Fragrant basmati rice with spices", "price": 200},
            {"name": "Roti", "description": "Whole wheat flatbread", "price": 15},
            {"name": "Naan", "description": "Leavened bread from tandoor", "price": 25},
            {"name": "Jeera Rice", "description": "Cumin-flavored basmati rice", "price": 60},
            {"name": "Mixed Vegetable Curry", "description": "Seasonal vegetables in spiced gravy", "price": 100}
        ]
        
        # Beverages
        beverages_items = [
            {"name": "Sweet Lassi", "description": "Yogurt drink with sugar and cardamom", "price": 50},
            {"name": "Mango Lassi", "description": "Creamy yogurt drink with mango pulp", "price": 70},
            {"name": "Salt Lassi", "description": "Savory yogurt drink with cumin", "price": 45},
            {"name": "Fresh Lime Water", "description": "Fresh lime juice with mint", "price": 30},
            {"name": "Sugarcane Juice", "description": "Fresh pressed sugarcane juice", "price": 40},
            {"name": "Coconut Water", "description": "Fresh tender coconut water", "price": 50},
            {"name": "Aam Panna", "description": "Raw mango drink with mint", "price": 45},
            {"name": "Thandai", "description": "Milk drink with almonds and spices", "price": 60},
            {"name": "Fresh Orange Juice", "description": "Freshly squeezed orange juice", "price": 55},
            {"name": "Watermelon Juice", "description": "Fresh watermelon juice", "price": 40}
        ]
        
        # Add items to categories
        categories_items = [
            (tea_chai, tea_chai_items),
            (coffee, coffee_items),
            (snacks, snacks_items),
            (sweets, sweets_items),
            (main_course, main_course_items),
            (beverages, beverages_items)
        ]
        
        for category, items in categories_items:
            if category:
                for item_data in items:
                    menu_item = MenuItem(
                        name=item_data["name"],
                        description=item_data["description"],
                        price=item_data["price"],
                        category_id=category.id,
                        is_available=True
                    )
                    db.session.add(menu_item)
        
        db.session.commit()
        print("✅ Indian menu items created successfully!")
        
        # Print summary
        total_items = MenuItem.query.count()
        print(f"📋 Total menu items: {total_items}")
        
        for category in [tea_chai, coffee, snacks, sweets, main_course, beverages]:
            if category:
                count = MenuItem.query.filter_by(category_id=category.id).count()
                print(f"   {category.name}: {count} items")

if __name__ == "__main__":
    create_indian_menu_data()