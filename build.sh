#!/usr/bin/env bash

# Install dependencies
pip install -r requirements-production.txt

# Run database migrations/setup
cd backend
python -c "
from app import create_app, db
from app.models.models import *
from initialize_production_data import initialize_data
import os

app = create_app(os.environ.get('FLASK_CONFIG', 'production'))
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
    # Initialize production data
    initialize_data()
    print('Production data initialized successfully')
"

cd ..
echo "Build completed successfully"