"""
Create current month orders for real-time analytics
"""

import sys
import os
import random
from datetime import datetime, timedelta
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Order, OrderItem, MenuItem, Table

def create_current_month_orders():
    app = create_app('development')
    
    with app.app_context():
        print("Creating current month orders (January 2026)...")
        
        # Get menu items and tables
        menu_items = MenuItem.query.all()
        tables = Table.query.all()
        
        # January 2026 - from start of month to today
        start_date = datetime(2026, 1, 1)
        end_date = datetime(2026, 1, 22)  # Current date
        
        # Popular items
        popular_items = [
            'Masala Chai', 'South Indian Filter Coffee', 'Samosa', 'Pav Bhaji',
            'Masala Dosa', 'Idli Sambhar', 'Gulab Jamun', 'Mango Lassi'
        ]
        
        statuses = ['completed', 'completed', 'completed', 'preparing', 'ready', 'cancelled']
        
        orders_created = 0
        
        # Generate orders for each day up to today
        for single_date in (start_date + timedelta(n) for n in range((end_date - start_date).days + 1)):
            is_weekend = single_date.weekday() >= 5
            daily_orders = random.randint(12, 20) if is_weekend else random.randint(6, 15)
            
            for _ in range(daily_orders):
                hour = random.randint(7, 21)
                minute = random.randint(0, 59)
                order_time = single_date.replace(hour=hour, minute=minute)
                
                table = random.choice(tables)
                
                order = Order(
                    table_id=table.id,
                    total_amount=0,
                    status=random.choice(statuses),
                    created_at=order_time,
                    updated_at=order_time
                )
                db.session.add(order)
                db.session.flush()
                
                # Add items
                num_items = random.randint(1, 3)
                order_total = 0
                selected_items = []
                
                # Popular items preference
                if random.random() < 0.6:
                    popular_item_names = [item for item in popular_items if any(mi.name == item for mi in menu_items)]
                    if popular_item_names:
                        popular_item = random.choice(popular_item_names)
                        menu_item = next((mi for mi in menu_items if mi.name == popular_item), None)
                        if menu_item:
                            selected_items.append(menu_item)
                
                while len(selected_items) < num_items:
                    random_item = random.choice(menu_items)
                    if random_item not in selected_items:
                        selected_items.append(random_item)
                
                for menu_item in selected_items:
                    quantity = random.randint(1, 2)
                    
                    order_item = OrderItem(
                        order_id=order.id,
                        menu_item_id=menu_item.id,
                        quantity=quantity,
                        price_at_time=menu_item.price
                    )
                    db.session.add(order_item)
                    order_total += menu_item.price * quantity
                
                order.total_amount = order_total
                orders_created += 1
        
        db.session.commit()
        print(f"✅ Created {orders_created} current month orders")

if __name__ == "__main__":
    create_current_month_orders()