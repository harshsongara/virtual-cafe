from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app import db, socketio
from app.models.models import Order, OrderItem, MenuItem, Table

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/orders', methods=['POST'])
def place_order():
    try:
        data = request.get_json()
        
        if not data or not data.get('table_number') or not data.get('items'):
            return jsonify({'error': 'Table number and items required'}), 400
        
        table_number = data.get('table_number')
        items_data = data.get('items')
        
        # Validate table
        table = Table.query.filter_by(table_number=table_number, is_active=True).first()
        if not table:
            return jsonify({'error': 'Invalid table number'}), 400
        
        # Check if there's a recent order (prevent duplicate orders within 2 minutes)
        recent_order = Order.query.filter_by(table_id=table.id)\
            .filter(Order.created_at > datetime.utcnow() - timedelta(minutes=2))\
            .filter(Order.status.in_(['pending', 'preparing']))\
            .first()
        
        if recent_order:
            return jsonify({'error': 'Please wait before placing another order'}), 429
        
        # Create new order
        order = Order(table_id=table.id, status='pending', estimated_time=15)
        db.session.add(order)
        db.session.flush()  # Get the order ID
        
        total_amount = 0
        
        # Add order items
        for item_data in items_data:
            if not item_data.get('menu_item_id') or not item_data.get('quantity'):
                return jsonify({'error': 'Invalid item data'}), 400
            
            menu_item = MenuItem.query.get(item_data['menu_item_id'])
            if not menu_item or not menu_item.is_available:
                return jsonify({'error': f'Menu item {item_data["menu_item_id"]} not available'}), 400
            
            quantity = item_data['quantity']
            if quantity <= 0:
                return jsonify({'error': 'Invalid quantity'}), 400
            
            order_item = OrderItem(
                order_id=order.id,
                menu_item_id=menu_item.id,
                quantity=quantity,
                price_at_time=menu_item.price
            )
            
            db.session.add(order_item)
            total_amount += float(menu_item.price) * quantity
        
        order.total_amount = total_amount
        db.session.commit()
        
        # Emit to admin dashboard
        socketio.emit('new_order', order.to_dict(), room='admin')
        
        return jsonify({
            'success': True,
            'order_id': order.id,
            'total_amount': total_amount,
            'estimated_time': order.estimated_time,
            'status': order.status
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        
        return jsonify({
            'success': True,
            'order': order.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/orders/table/<int:table_number>', methods=['GET'])
def get_table_orders(table_number):
    try:
        table = Table.query.filter_by(table_number=table_number).first()
        if not table:
            return jsonify({'error': 'Table not found'}), 404
        
        # Get active orders for this table
        orders = Order.query.filter_by(table_id=table.id)\
            .filter(Order.status.in_(['pending', 'preparing', 'ready']))\
            .order_by(Order.created_at.desc())\
            .all()
        
        return jsonify({
            'success': True,
            'orders': [order.to_dict() for order in orders],
            'table_number': table_number
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500