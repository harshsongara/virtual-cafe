from flask import Blueprint, request, jsonify
from app import db, socketio
from app.models.models import MenuItem, Category, Table, Order, OrderItem
from app.utils import admin_required
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

# Menu Management
@admin_bp.route('/menu-items', methods=['GET'])
@admin_required
def get_all_menu_items(current_user):
    try:
        items = MenuItem.query.all()
        return jsonify({
            'success': True,
            'items': [item.to_dict() for item in items]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/menu-items', methods=['POST'])
@admin_required
def create_menu_item(current_user):
    try:
        data = request.get_json()
        
        required_fields = ['name', 'price', 'category_id']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Validate category exists
        category = Category.query.get(data['category_id'])
        if not category:
            return jsonify({'error': 'Invalid category'}), 400
        
        item = MenuItem(
            name=data['name'],
            description=data.get('description', ''),
            price=data['price'],
            category_id=data['category_id'],
            is_available=data.get('is_available', True)
        )
        
        db.session.add(item)
        db.session.commit()
        
        # Notify all clients about menu update
        socketio.emit('menu_updated', room='customers')
        
        return jsonify({
            'success': True,
            'item': item.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/menu-items/<int:item_id>', methods=['PUT'])
@admin_required
def update_menu_item(current_user, item_id):
    try:
        item = MenuItem.query.get_or_404(item_id)
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            item.name = data['name']
        if 'description' in data:
            item.description = data['description']
        if 'price' in data:
            item.price = data['price']
        if 'category_id' in data:
            category = Category.query.get(data['category_id'])
            if not category:
                return jsonify({'error': 'Invalid category'}), 400
            item.category_id = data['category_id']
        if 'is_available' in data:
            item.is_available = data['is_available']
            # If item becomes unavailable, notify customers
            if not data['is_available']:
                socketio.emit('item_unavailable', {'item_id': item_id}, room='customers')
        
        item.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Notify all clients about menu update
        socketio.emit('menu_updated', room='customers')
        
        return jsonify({
            'success': True,
            'item': item.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/menu-items/<int:item_id>', methods=['DELETE'])
@admin_required
def delete_menu_item(current_user, item_id):
    try:
        item = MenuItem.query.get_or_404(item_id)
        
        # Check if item is in pending orders
        pending_orders = OrderItem.query.join(Order).filter(
            OrderItem.menu_item_id == item_id,
            Order.status.in_(['pending', 'preparing'])
        ).first()
        
        if pending_orders:
            return jsonify({'error': 'Cannot delete item with pending orders'}), 400
        
        db.session.delete(item)
        db.session.commit()
        
        # Notify all clients about menu update
        socketio.emit('menu_updated', room='customers')
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Order Management
@admin_bp.route('/orders/active', methods=['GET'])
@admin_required
def get_active_orders(current_user):
    try:
        orders = Order.query.filter(Order.status.in_(['pending', 'preparing', 'ready']))\
            .order_by(Order.created_at.asc())\
            .all()
        
        return jsonify({
            'success': True,
            'orders': [order.to_dict() for order in orders]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(current_user, order_id):
    try:
        order = Order.query.get_or_404(order_id)
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({'error': 'Status required'}), 400
        
        valid_statuses = ['pending', 'preparing', 'ready', 'completed']
        if data['status'] not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        order.status = data['status']
        
        if 'estimated_time' in data:
            order.estimated_time = data['estimated_time']
        
        order.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Notify customer of status update
        socketio.emit('order_status_updated', order.to_dict(), room=f'table_{order.table.table_number}')
        
        # Notify admin dashboard
        socketio.emit('order_updated', order.to_dict(), room='admin')
        
        return jsonify({
            'success': True,
            'order': order.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Table Management
@admin_bp.route('/tables', methods=['GET'])
@admin_required
def get_admin_tables(current_user):
    try:
        tables = Table.query.order_by(Table.table_number).all()
        
        # Add order count for each table
        table_data = []
        for table in tables:
            active_orders = Order.query.filter_by(table_id=table.id)\
                .filter(Order.status.in_(['pending', 'preparing', 'ready']))\
                .count()
            
            table_dict = table.to_dict()
            table_dict['active_orders'] = active_orders
            table_data.append(table_dict)
        
        return jsonify({
            'success': True,
            'tables': table_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/tables', methods=['POST'])
@admin_required
def create_table(current_user):
    try:
        data = request.get_json()
        
        if 'table_number' not in data:
            return jsonify({'error': 'Table number required'}), 400
        
        table_number = data['table_number']
        
        # Check if table number already exists
        existing_table = Table.query.filter_by(table_number=table_number).first()
        if existing_table:
            return jsonify({'error': 'Table number already exists'}), 400
        
        table = Table(
            table_number=table_number,
            is_active=data.get('is_active', True)
        )
        
        db.session.add(table)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'table': table.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/tables/<int:table_id>', methods=['DELETE'])
@admin_required
def delete_table(current_user, table_id):
    try:
        table = Table.query.get_or_404(table_id)
        
        # Check for active orders
        active_orders = Order.query.filter_by(table_id=table_id)\
            .filter(Order.status.in_(['pending', 'preparing', 'ready']))\
            .first()
        
        if active_orders:
            return jsonify({'error': 'Cannot delete table with active orders'}), 400
        
        db.session.delete(table)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Dashboard Stats
@admin_bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats(current_user):
    try:
        from sqlalchemy import func
        
        today = datetime.utcnow().date()
        
        # Daily stats
        daily_orders = Order.query.filter(func.date(Order.created_at) == today).count()
        daily_revenue = db.session.query(func.sum(Order.total_amount))\
            .filter(func.date(Order.created_at) == today)\
            .scalar() or 0
        
        # Active orders
        active_orders = Order.query.filter(Order.status.in_(['pending', 'preparing', 'ready'])).count()
        
        # Popular items today
        popular_items = db.session.query(
            MenuItem.name,
            func.sum(OrderItem.quantity).label('total_quantity')
        ).join(OrderItem)\
         .join(Order)\
         .filter(func.date(Order.created_at) == today)\
         .group_by(MenuItem.id, MenuItem.name)\
         .order_by(func.sum(OrderItem.quantity).desc())\
         .limit(5).all()
        
        return jsonify({
            'success': True,
            'stats': {
                'daily_orders': daily_orders,
                'daily_revenue': float(daily_revenue),
                'active_orders': active_orders,
                'popular_items': [{'name': item[0], 'quantity': item[1]} for item in popular_items]
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Analytics Routes
@admin_bp.route('/analytics/sales-by-hour', methods=['GET'])
@admin_required
def get_sales_by_hour(current_user):
    try:
        from sqlalchemy import func, text
        
        # Get date range from query params (default to last 7 days)
        days_back = int(request.args.get('days', 7))
        start_date = datetime.utcnow().date() - timedelta(days=days_back)
        
        # Sales by hour of day
        hourly_sales = db.session.query(
            func.extract('hour', Order.created_at).label('hour'),
            func.count(Order.id).label('order_count'),
            func.sum(Order.total_amount).label('revenue')
        ).filter(
            func.date(Order.created_at) >= start_date,
            Order.status == 'completed'
        ).group_by(
            func.extract('hour', Order.created_at)
        ).order_by('hour').all()
        
        return jsonify({
            'success': True,
            'data': [{
                'hour': int(row.hour),
                'order_count': row.order_count,
                'revenue': float(row.revenue or 0)
            } for row in hourly_sales]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/analytics/product-performance', methods=['GET'])
@admin_required
def get_product_performance(current_user):
    try:
        from sqlalchemy import func
        
        days_back = int(request.args.get('days', 30))
        start_date = datetime.utcnow().date() - timedelta(days=days_back)
        
        # Product performance metrics
        product_stats = db.session.query(
            MenuItem.id,
            MenuItem.name,
            Category.name.label('category'),
            func.sum(OrderItem.quantity).label('total_quantity'),
            func.sum(OrderItem.quantity * OrderItem.price_at_time).label('total_revenue'),
            func.count(func.distinct(Order.id)).label('order_count'),
            func.avg(OrderItem.price_at_time).label('avg_price')
        ).join(OrderItem)\
         .join(Order)\
         .join(Category)\
         .filter(
             func.date(Order.created_at) >= start_date,
             Order.status == 'completed'
         ).group_by(MenuItem.id, MenuItem.name, Category.name)\
         .order_by(func.sum(OrderItem.quantity * OrderItem.price_at_time).desc())\
         .all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': row.id,
                'name': row.name,
                'category': row.category,
                'total_quantity': row.total_quantity,
                'total_revenue': float(row.total_revenue),
                'order_count': row.order_count,
                'avg_price': float(row.avg_price)
            } for row in product_stats]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/analytics/daily-trends', methods=['GET'])
@admin_required
def get_daily_trends(current_user):
    try:
        from sqlalchemy import func
        
        days_back = int(request.args.get('days', 30))
        start_date = datetime.utcnow().date() - timedelta(days=days_back)
        
        # Daily trends
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
        ).order_by('date').all()
        
        return jsonify({
            'success': True,
            'data': [{
                'date': row.date.isoformat(),
                'order_count': row.order_count,
                'revenue': float(row.revenue or 0),
                'avg_order_value': float(row.avg_order_value or 0)
            } for row in daily_stats]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/analytics/category-performance', methods=['GET'])
@admin_required
def get_category_performance(current_user):
    try:
        from sqlalchemy import func
        
        days_back = int(request.args.get('days', 30))
        start_date = datetime.utcnow().date() - timedelta(days=days_back)
        
        # Category performance
        category_stats = db.session.query(
            Category.name,
            func.sum(OrderItem.quantity).label('total_quantity'),
            func.sum(OrderItem.quantity * OrderItem.price_at_time).label('total_revenue'),
            func.count(func.distinct(Order.id)).label('order_count')
        ).join(MenuItem)\
         .join(OrderItem)\
         .join(Order)\
         .filter(
             func.date(Order.created_at) >= start_date,
             Order.status == 'completed'
         ).group_by(Category.name)\
         .order_by(func.sum(OrderItem.quantity * OrderItem.price_at_time).desc())\
         .all()
        
        return jsonify({
            'success': True,
            'data': [{
                'category': row.name,
                'total_quantity': row.total_quantity,
                'total_revenue': float(row.total_revenue),
                'order_count': row.order_count
            } for row in category_stats]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500