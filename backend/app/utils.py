from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.models import AdminUser

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Verify JWT token
            verify_jwt_in_request()
            
            # Get user ID from JWT
            current_user_id = get_jwt_identity()
            current_user = AdminUser.query.get(current_user_id)
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
            return f(current_user, *args, **kwargs)
            
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
    
    return decorated_function