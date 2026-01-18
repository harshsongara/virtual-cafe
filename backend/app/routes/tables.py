from flask import Blueprint, jsonify
from app import db
from app.models.models import Table

tables_bp = Blueprint('tables', __name__)

@tables_bp.route('/tables/<int:table_number>', methods=['GET'])
def validate_table(table_number):
    try:
        table = Table.query.filter_by(table_number=table_number, is_active=True).first()
        
        return jsonify({
            'exists': table is not None,
            'is_active': table.is_active if table else False,
            'table_id': table.id if table else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tables_bp.route('/tables', methods=['GET'])
def get_all_tables():
    try:
        tables = Table.query.filter_by(is_active=True).order_by(Table.table_number).all()
        
        return jsonify({
            'success': True,
            'tables': [table.to_dict() for table in tables]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500