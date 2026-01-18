from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import jwt
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
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + current_app.config['JWT_EXPIRATION_DELTA']
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'expires_in': int(current_app.config['JWT_EXPIRATION_DELTA'].total_seconds()),
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/validate', methods=['GET'])
def validate_token():
    try:
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = data['user_id']
            user = AdminUser.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 401
                
            return jsonify({'valid': True, 'user': user.to_dict()})
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500