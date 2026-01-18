"""
Generate sample order data for analytics demonstration
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Order, OrderItem, MenuItem, Table
from datetime import datetime, timedelta
import random

def create_sample_orders():
    app = create_app('development')
    
    with app.app_context():
        print("Creating sample orders for analytics...")
        
        # Get existing data
        menu_items = MenuItem.query.all()
        tables = Table.query.all()
        
        if not menu_items or not tables:
            print("Please run create_sample_data.py first to create menu items and tables")
            return
        
        # Create orders for the last 30 days
        start_date = datetime.utcnow() - timedelta(days=30)
        
        # Different order patterns for different times
        order_patterns = {
            # Hour: (min_orders, max_orders, avg_items_per_order)
            8: (2, 5, 2),   # Breakfast
            9: (3, 8, 2),
            10: (1, 4, 3),
            11: (2, 6, 3),
            12: (5, 12, 4), # Lunch rush
            13: (4, 10, 4),
            14: (2, 6, 3),
            15: (1, 3, 2),  # Afternoon lull
            16: (2, 5, 3),
            17: (3, 7, 3),
            18: (4, 9, 4),  # Dinner
            19: (3, 8, 4),
            20: (2, 5, 3),
            21: (1, 3, 2)
        }
        
        order_count = 0
        
        for day in range(30):
            current_date = start_date + timedelta(days=day)
            
            # Weekend vs weekday patterns
            is_weekend = current_date.weekday() >= 5
            multiplier = 1.3 if is_weekend else 1.0
            
            for hour, (min_orders, max_orders, avg_items) in order_patterns.items():
                # Adjust for weekend
                num_orders = int(random.randint(min_orders, max_orders) * multiplier)
                
                for _ in range(num_orders):
                    # Random time within the hour
                    order_time = current_date.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
                    
                    # Random table
                    table = random.choice(tables)
                    
                    # Create order
                    order = Order(
                        table_id=table.id,
                        status='completed',  # Mark as completed for analytics
                        estimated_time=random.randint(10, 30),
                        created_at=order_time,
                        updated_at=order_time + timedelta(minutes=random.randint(15, 45))
                    )
                    
                    db.session.add(order)
                    db.session.flush()  # Get order ID
                    
                    # Add random items to order
                    num_items = max(1, int(random.gauss(avg_items, 1)))
                    total_amount = 0
                    
                    # Choose items with some preference patterns
                    beverages = [item for item in menu_items if item.category_id == 1]
                    food_items = [item for item in menu_items if item.category_id == 2]
                    desserts = [item for item in menu_items if item.category_id == 3]
                    
                    chosen_items = []
                    
                    # Morning orders favor beverages
                    if hour <= 10:
                        chosen_items.extend(random.choices(beverages, k=min(2, num_items)))
                        if num_items > len(chosen_items):
                            chosen_items.extend(random.choices(food_items, k=num_items - len(chosen_items)))
                    
                    # Lunch/dinner favor food
                    elif hour in [12, 13, 18, 19]:
                        chosen_items.extend(random.choices(food_items, k=min(num_items, len(food_items))))
                        if num_items > len(chosen_items) and random.random() > 0.7:
                            chosen_items.extend(random.choices(beverages, k=1))
                    
                    # Other times - mixed
                    else:
                        chosen_items = random.choices(menu_items, k=num_items)
                    
                    # Add desserts occasionally
                    if random.random() > 0.8 and desserts:
                        chosen_items.append(random.choice(desserts))
                    
                    # Create order items
                    for item in chosen_items[:6]:  # Max 6 items per order
                        quantity = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
                        
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
        print(f"Created {order_count} sample orders for analytics")
        print("Sample data includes:")
        print(f"- Orders spanning last 30 days")
        print(f"- Peak hours: 12-13 (lunch) and 18-19 (dinner)")
        print(f"- Weekend vs weekday patterns")
        print(f"- Time-based item preferences")
        print("\nNow you can view comprehensive analytics in the admin dashboard!")

if __name__ == "__main__":
    create_sample_orders()