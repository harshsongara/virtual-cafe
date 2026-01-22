"""
Debug script to check database state
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Category, MenuItem, Order, OrderItem
from sqlalchemy import func

def debug_database():
    app = create_app('development')
    
    with app.app_context():
        print("=== DATABASE DEBUG REPORT ===\n")
        
        # Check categories
        print("1. CATEGORIES:")
        categories = Category.query.all()
        for cat in categories:
            item_count = MenuItem.query.filter_by(category_id=cat.id, is_available=True).count()
            print(f"   {cat.id}: {cat.name} ({item_count} available items)")
        
        print(f"\nTotal categories: {len(categories)}")
        
        # Check menu items
        print("\n2. MENU ITEMS:")
        total_items = MenuItem.query.count()
        available_items = MenuItem.query.filter_by(is_available=True).count()
        print(f"   Total items: {total_items}")
        print(f"   Available items: {available_items}")
        
        # Sample items per category
        print("\n3. SAMPLE ITEMS PER CATEGORY:")
        for cat in categories:
            items = MenuItem.query.filter_by(category_id=cat.id, is_available=True).limit(3).all()
            if items:
                print(f"   {cat.name}:")
                for item in items:
                    print(f"     - {item.name}: ₹{item.price}")
        
        # Check orders
        print("\n4. ORDERS:")
        total_orders = Order.query.count()
        completed_orders = Order.query.filter_by(status='completed').count()
        print(f"   Total orders: {total_orders}")
        print(f"   Completed orders: {completed_orders}")
        
        # Check recent orders
        recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
        print(f"\n5. RECENT ORDERS:")
        for order in recent_orders:
            print(f"   Order {order.id}: ₹{order.total_amount} ({order.status}) - {order.created_at}")
        
        # Test menu API response structure
        print("\n6. MENU API TEST:")
        menu_data = []
        for category in categories:
            available_items = [item for item in category.menu_items if item.is_available]
            if available_items:
                category_dict = {
                    'id': category.id,
                    'name': category.name,
                    'display_order': category.display_order,
                    'items': [{'id': item.id, 'name': item.name, 'price': float(item.price)} for item in available_items[:2]]
                }
                menu_data.append(category_dict)
        
        print(f"   Menu categories returned: {len(menu_data)}")
        for cat in menu_data:
            print(f"     {cat['name']}: {len(cat['items'])} items")

if __name__ == "__main__":
    debug_database()