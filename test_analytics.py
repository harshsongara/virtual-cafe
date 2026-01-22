"""
Test analytics endpoints to see exact errors
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.models import Order, OrderItem, MenuItem, Category
from datetime import datetime, timedelta
from sqlalchemy import func

def test_analytics_queries():
    app = create_app('development')
    
    with app.app_context():
        print("=== ANALYTICS QUERIES TEST ===\n")
        
        try:
            # Test basic data exists
            total_orders = Order.query.count()
            completed_orders = Order.query.filter_by(status='completed').count()
            total_items = OrderItem.query.count()
            
            print(f"Total orders: {total_orders}")
            print(f"Completed orders: {completed_orders}")
            print(f"Total order items: {total_items}")
            
            if completed_orders == 0:
                print("❌ NO COMPLETED ORDERS FOUND!")
                return
            
            # Test daily trends query
            print("\n1. Testing daily trends query...")
            days_back = 30
            start_date = datetime.utcnow().date() - timedelta(days=days_back)
            
            daily_stats = db.session.query(
                func.date(Order.created_at).label('date'),
                func.count(Order.id).label('order_count'),
                func.sum(Order.total_amount).label('revenue'),
                func.avg(Order.total_amount).label('avg_order_value')
            ).filter(
                func.date(Order.created_at) >= start_date,
                Order.status == 'completed'
            ).group_by(
                func.date(Order.created_at)
            ).order_by('date').limit(5).all()
            
            print(f"Daily stats sample: {len(daily_stats)} records")
            for row in daily_stats[:2]:
                print(f"  {row.date}: {row.order_count} orders, ₹{row.revenue}")
            
            # Test product performance query
            print("\n2. Testing product performance query...")
            product_stats = db.session.query(
                MenuItem.id,
                MenuItem.name,
                Category.name.label('category'),
                func.sum(OrderItem.quantity).label('total_quantity'),
                func.sum(OrderItem.quantity * OrderItem.price_at_time).label('total_revenue')
            ).join(OrderItem)\
             .join(Order)\
             .join(Category)\
             .filter(
                 func.date(Order.created_at) >= start_date,
                 Order.status == 'completed'
             ).group_by(MenuItem.id, MenuItem.name, Category.name)\
             .limit(5).all()
            
            print(f"Product stats sample: {len(product_stats)} records")
            for row in product_stats[:2]:
                print(f"  {row.name}: {row.total_quantity} sold, ₹{row.total_revenue}")
            
            # Test category performance query
            print("\n3. Testing category performance query...")
            category_stats = db.session.query(
                Category.name,
                func.sum(OrderItem.quantity).label('total_quantity'),
                func.sum(OrderItem.quantity * OrderItem.price_at_time).label('total_revenue')
            ).join(MenuItem)\
             .join(OrderItem)\
             .join(Order)\
             .filter(
                 func.date(Order.created_at) >= start_date,
                 Order.status == 'completed'
             ).group_by(Category.name).all()
            
            print(f"Category stats: {len(category_stats)} records")
            for row in category_stats[:3]:
                print(f"  {row.name}: {row.total_quantity} items, ₹{row.total_revenue}")
                
        except Exception as e:
            print(f"❌ Error in analytics queries: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_analytics_queries()