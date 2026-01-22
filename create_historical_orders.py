"""
Create historical orders for analytics - Previous month (December 2025)
Run this script to populate the database with test orders for analytics dashboard
"""

import sys
import os
import random
from datetime import datetime, timedelta
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Order, OrderItem, MenuItem, Table

def create_historical_orders():
    app = create_app('development')
    
    with app.app_context():
        print("Creating historical orders for December 2025...")
        
        # Get menu items and tables
        menu_items = MenuItem.query.all()
        tables = Table.query.all()
        
        if not menu_items:
            print("❌ No menu items found! Please run create_indian_menu_data.py first")
            return
        
        if not tables:
            print("❌ No tables found! Creating sample tables...")
            for i in range(1, 21):
                table = Table(table_number=i, is_active=True)
                db.session.add(table)
            db.session.commit()
            tables = Table.query.all()
        
        # December 2025 date range
        start_date = datetime(2025, 12, 1)
        end_date = datetime(2025, 12, 31)
        
        # Popular items for realistic distribution
        popular_items = [
            'Masala Chai', 'South Indian Filter Coffee', 'Samosa', 'Pav Bhaji',
            'Masala Dosa', 'Butter Chicken', 'Paneer Butter Masala', 'Biryani',
            'Gulab Jamun', 'Mango Lassi', 'Vada Pav', 'Dhokla'
        ]
        
        # Order statuses with weights (more completed orders)
        statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'refunded']
        
        orders_created = 0
        total_revenue = 0
        
        # Generate orders for each day
        for single_date in (start_date + timedelta(n) for n in range((end_date - start_date).days + 1)):
            # Weekend has more orders
            is_weekend = single_date.weekday() >= 5
            daily_orders = random.randint(15, 25) if is_weekend else random.randint(8, 18)
            
            for _ in range(daily_orders):
                # Random time during cafe hours (7 AM to 10 PM)
                hour = random.randint(7, 21)
                minute = random.randint(0, 59)
                order_time = single_date.replace(hour=hour, minute=minute)
                
                # Select random table
                table = random.choice(tables)
                
                # Create order
                order = Order(
                    table_id=table.id,
                    total_amount=0,  # Will calculate after adding items
                    status=random.choice(statuses),
                    created_at=order_time,
                    updated_at=order_time
                )
                db.session.add(order)
                db.session.flush()  # Get order ID
                
                # Add 1-4 items per order
                num_items = random.randint(1, 4)
                order_total = 0
                
                selected_items = []
                
                # 70% chance to include popular items
                if random.random() < 0.7 and popular_items:
                    popular_item_names = [item for item in popular_items if any(mi.name == item for mi in menu_items)]
                    if popular_item_names:
                        popular_item = random.choice(popular_item_names)
                        menu_item = next((mi for mi in menu_items if mi.name == popular_item), None)
                        if menu_item:
                            selected_items.append(menu_item)
                
                # Fill remaining slots with random items
                while len(selected_items) < num_items:
                    random_item = random.choice(menu_items)
                    if random_item not in selected_items:
                        selected_items.append(random_item)
                
                # Create order items
                for menu_item in selected_items:
                    quantity = random.randint(1, 3)
                    
                    order_item = OrderItem(
                        order_id=order.id,
                        menu_item_id=menu_item.id,
                        quantity=quantity,
                        price_at_time=menu_item.price
                    )
                    db.session.add(order_item)
                    order_total += menu_item.price * quantity
                
                # Update order total
                order.total_amount = order_total
                if order.status == 'completed':
                    total_revenue += order_total
                
                orders_created += 1
        
        db.session.commit()
        
        print(f"✅ Created {orders_created} historical orders for December 2025")
        print(f"💰 Total revenue generated: ₹{total_revenue:,.2f}")
        
        # Analytics summary
        completed_orders = Order.query.filter_by(status='completed').count()
        cancelled_orders = Order.query.filter_by(status='cancelled').count()
        
        print(f"\n📊 Order Statistics:")
        print(f"   Completed: {completed_orders}")
        print(f"   Cancelled: {cancelled_orders}")
        print(f"   Success Rate: {(completed_orders/orders_created)*100:.1f}%")
        
        # Popular items analysis
        from sqlalchemy import func
        popular_query = db.session.query(
            MenuItem.name,
            func.sum(OrderItem.quantity).label('total_sold'),
            func.sum(OrderItem.price_at_time * OrderItem.quantity).label('revenue')
        ).join(OrderItem).join(Order).filter(
            Order.status == 'completed'
        ).group_by(MenuItem.name).order_by(
            func.sum(OrderItem.quantity).desc()
        ).limit(5)
        
        print(f"\n🔥 Top 5 Selling Items:")
        for item_name, quantity, revenue in popular_query:
            print(f"   {item_name}: {quantity} sold (₹{revenue})")

if __name__ == "__main__":
    create_historical_orders()