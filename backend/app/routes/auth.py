from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db
from app.models.models import AdminUser

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password required'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # Find user
        user = AdminUser.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        access_token = create_access_token(
            identity=user.id,
            expires_delta=current_app.config['JWT_EXPIRATION_DELTA']
        )
        
        return jsonify({
            'success': True,
            'token': access_token,
            'expires_in': int(current_app.config['JWT_EXPIRATION_DELTA'].total_seconds()),
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/validate', methods=['GET'])
@jwt_required()
def validate_token():
    try:
        user_id = get_jwt_identity()
        user = AdminUser.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        return jsonify({
            'valid': True,
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500