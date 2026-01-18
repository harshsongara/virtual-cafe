from flask import Blueprint, jsonify
from app import db
from app.models.models import Category, MenuItem

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/menu', methods=['GET'])
def get_menu():
    try:
        categories = Category.query.order_by(Category.display_order).all()
        
        menu_data = []
        for category in categories:
            # Only include available items
            available_items = [item for item in category.menu_items if item.is_available]
            if available_items:  # Only include categories that have available items
                category_dict = category.to_dict()
                menu_data.append(category_dict)
        
        return jsonify({
            'success': True,
            'categories': menu_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@menu_bp.route('/menu/items/<int:item_id>', methods=['GET'])
def get_menu_item(item_id):
    try:
        item = MenuItem.query.get_or_404(item_id)
        
        return jsonify({
            'success': True,
            'item': item.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500