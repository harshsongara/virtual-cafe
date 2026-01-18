"""
Generate sample orders for today to show real-time analytics
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Order, OrderItem, MenuItem, Table
from datetime import datetime, timedelta
import random

def create_todays_orders():
    app = create_app('development')
    
    with app.app_context():
        print("Creating orders for today's analytics...")
        
        # Get existing data
        menu_items = MenuItem.query.all()
        tables = Table.query.all()
        
        if not menu_items or not tables:
            print("Please run create_sample_data.py first to create menu items and tables")
            return
        
        # Create orders for today
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        current_hour = datetime.now().hour
        
        # Current day order patterns (simulate a busy cafe day)
        order_patterns = {
            8: (3, 6, 2),   # Morning coffee rush
            9: (4, 8, 2),   # Breakfast peak
            10: (2, 5, 3),  # Mid-morning
            11: (3, 6, 3),  # Pre-lunch
            12: (8, 15, 4), # Lunch rush - PEAK
            13: (6, 12, 4), # Lunch continuation
            14: (3, 7, 3),  # Afternoon
            15: (2, 4, 2),  # Afternoon lull
            16: (3, 6, 3),  # Afternoon pick-up
            17: (4, 8, 3),  # Early dinner
            18: (7, 12, 4), # Dinner rush
            19: (5, 10, 4), # Dinner continuation
            20: (3, 6, 3),  # Evening
            21: (2, 4, 2)   # Late evening
        }
        
        order_count = 0
        
        # Create orders for hours that have already passed today
        for hour in range(8, min(current_hour + 1, 22)):
            if hour in order_patterns:
                min_orders, max_orders, avg_items = order_patterns[hour]
                num_orders = random.randint(min_orders, max_orders)
                
                for _ in range(num_orders):
                    # Random time within the hour
                    order_time = today.replace(
                        hour=hour, 
                        minute=random.randint(0, 59), 
                        second=random.randint(0, 59)
                    )
                    
                    # Random table
                    table = random.choice(tables)
                    
                    # Determine status based on time
                    time_diff = datetime.now() - order_time
                    if time_diff > timedelta(hours=1):
                        status = 'completed'
                    elif time_diff > timedelta(minutes=30):
                        status = random.choice(['completed', 'ready'])
                    elif time_diff > timedelta(minutes=15):
                        status = random.choice(['preparing', 'ready'])
                    else:
                        status = random.choice(['pending', 'preparing'])
                    
                    # Create order
                    order = Order(
                        table_id=table.id,
                        status=status,
                        estimated_time=random.randint(5, 25) if status != 'completed' else 0,
                        created_at=order_time,
                        updated_at=order_time + timedelta(minutes=random.randint(1, 30))
                    )
                    
                    db.session.add(order)
                    db.session.flush()
                    
                    # Add items based on time preferences
                    beverages = [item for item in menu_items if item.category_id == 1]
                    food_items = [item for item in menu_items if item.category_id == 2]
                    desserts = [item for item in menu_items if item.category_id == 3]
                    
                    chosen_items = []
                    num_items = max(1, int(random.gauss(avg_items, 1)))
                    
                    # Morning (8-10): More beverages
                    if hour <= 10:
                        chosen_items.extend(random.choices(beverages, k=min(2, num_items)))
                        if num_items > len(chosen_items):
                            chosen_items.extend(random.choices(food_items, k=num_items - len(chosen_items)))
                    
                    # Lunch/Dinner (12-13, 18-19): More food
                    elif hour in [12, 13, 18, 19]:
                        chosen_items.extend(random.choices(food_items, k=min(num_items, len(food_items))))
                        if random.random() > 0.6:  # Add beverages
                            chosen_items.extend(random.choices(beverages, k=1))
                        if hour >= 18 and random.random() > 0.7:  # Add desserts for dinner
                            chosen_items.extend(random.choices(desserts, k=1))
                    
                    # Other times: Mixed
                    else:
                        chosen_items = random.choices(menu_items, k=num_items)
                    
                    # Create order items
                    total_amount = 0
                    for item in chosen_items[:5]:  # Max 5 items per order
                        quantity = random.choices([1, 2, 3], weights=[60, 30, 10])[0]
                        
                        order_item = OrderItem(
                            order_id=order.id,
                            menu_item_id=item.id,
                            quantity=quantity,
                            price_at_time=item.price
                        )
                        
                        db.session.add(order_item)
                        total_amount += float(item.price) * quantity
                    
                    order.total_amount = total_amount
                    order_count += 1
        
        db.session.commit()
        
        # Create some live orders for demonstration
        current_time = datetime.now()
        for i in range(3):  # 3 active orders
            table = random.choice(tables)
            order_time = current_time - timedelta(minutes=random.randint(5, 20))
            
            order = Order(
                table_id=table.id,
                status=random.choice(['pending', 'preparing']),
                estimated_time=random.randint(8, 18),
                created_at=order_time,
                updated_at=order_time
            )
            
            db.session.add(order)
            db.session.flush()
            
            # Add 2-4 items
            num_items = random.randint(2, 4)
            chosen_items = random.choices(menu_items, k=num_items)
            
            total_amount = 0
            for item in chosen_items:
                quantity = random.randint(1, 2)
                
                order_item = OrderItem(
                    order_id=order.id,
                    menu_item_id=item.id,
                    quantity=quantity,
                    price_at_time=item.price
                )
                
                db.session.add(order_item)
                total_amount += float(item.price) * quantity
            
            order.total_amount = total_amount
            order_count += 1
        
        db.session.commit()
        
        print(f"✅ Created {order_count} orders for today")
        print(f"📅 Date: {today.strftime('%Y-%m-%d')}")
        print(f"🕐 Time range: 8:00 AM - {current_hour}:00")
        print("📊 Today's patterns:")
        print(f"   - Morning rush (8-10 AM): Beverages + light food")
        print(f"   - Lunch peak (12-13 PM): High volume, food-focused")
        print(f"   - Dinner rush (18-19 PM): Food + beverages + desserts")
        print(f"   - {3} active orders currently pending/preparing")
        print("\n🎯 Now check the Analytics tab with 'Last 7 Days' to see today's data!")

if __name__ == "__main__":
    create_todays_orders()