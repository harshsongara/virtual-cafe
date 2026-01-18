# Virtual Cafe Ordering System

A complete web-based cafe ordering system built with Python (Flask) backend and vanilla JavaScript frontend.

## Features

### Customer Features
- Scan QR code to access table-specific menu
- Browse categorized menu (Beverages, Food, Desserts)
- Add items to cart and place orders
- Real-time order status tracking
- View estimated preparation time

### Admin Features
- Secure admin dashboard with JWT authentication
- Live order management with status updates
- Menu item management (CRUD operations)
- Table management
- Dashboard with daily statistics
- Real-time notifications for new orders

## Quick Start

### Prerequisites
- Python 3.8+
- pip (Python package installer)

### Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up the database and sample data:**
   ```bash
   cd backend
   python ../create_sample_data.py
   ```

3. **Start the backend server:**
   ```bash
   cd backend
   python run.py
   ```
   The API server will run at `http://localhost:5000`

4. **Start the frontend server (in a new terminal):**
   ```bash
   python serve_frontend.py
   ```
   The frontend will be available at `http://localhost:8080`

### Default Admin Credentials
- **Username:** admin
- **Password:** admin123

## Usage

### For Customers
1. Scan QR code on table or visit: `http://localhost:8080?table=1` (replace 1 with table number)
2. Browse the menu and add items to cart
3. Place order and track status in real-time

### For Admin
1. Visit: `http://localhost:8080` (redirects to admin login)
2. Login with admin credentials
3. Manage orders, menu items, and tables through the dashboard

## Generate QR Codes

To generate QR codes for tables:

```bash
python generate_qr_codes.py
```

This creates printable QR codes in the `qr_codes/` directory.

## Project Structure

```
VirtualCafe/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── models.py          # Database models
│   │   ├── routes/
│   │   │   ├── auth.py            # Authentication routes
│   │   │   ├── menu.py            # Menu API routes
│   │   │   ├── orders.py          # Order API routes
│   │   │   ├── admin.py           # Admin API routes
│   │   │   └── tables.py          # Table API routes
│   │   ├── __init__.py            # Flask app factory
│   │   ├── utils.py               # Utilities (auth decorators)
│   │   └── socket_events.py       # WebSocket event handlers
│   ├── config.py                  # Configuration
│   └── run.py                     # Application entry point
├── frontend/
│   ├── js/
│   │   ├── menu.js                # Customer menu interface
│   │   └── admin.js               # Admin dashboard interface
│   ├── index.html                 # Customer menu page
│   └── admin.html                 # Admin dashboard page
├── requirements.txt               # Python dependencies
├── create_sample_data.py          # Database setup script
├── generate_qr_codes.py           # QR code generator
├── serve_frontend.py              # Frontend development server
└── README.md                      # This file
```

## API Endpoints

### Public Endpoints
- `GET /api/menu` - Get menu items by category
- `GET /api/tables/{table_number}` - Validate table number
- `POST /api/orders` - Place new order
- `GET /api/orders/{order_id}` - Get order details
- `GET /api/orders/table/{table_number}` - Get table orders

### Admin Endpoints (Authentication Required)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/orders/active` - Get active orders
- `PUT /api/admin/orders/{order_id}/status` - Update order status
- `GET /api/admin/menu-items` - Get all menu items
- `POST /api/admin/menu-items` - Create menu item
- `PUT /api/admin/menu-items/{item_id}` - Update menu item
- `DELETE /api/admin/menu-items/{item_id}` - Delete menu item
- `GET /api/admin/tables` - Get all tables
- `POST /api/admin/tables` - Create table
- `DELETE /api/admin/tables/{table_id}` - Delete table
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

## Real-time Features

The system uses WebSocket connections for real-time updates:

- **Customer notifications:** Order status changes, item availability
- **Admin notifications:** New orders, order updates
- **Live dashboard:** Real-time order and statistics updates

## Configuration

### Backend Configuration
Edit `backend/config.py` to modify:
- Database settings
- JWT token expiration
- Secret keys (change in production!)

### Frontend Configuration
Edit JavaScript files to modify:
- API base URL
- Socket.IO server URL
- Polling intervals

## Production Deployment

### Backend
1. Use a production WSGI server like Gunicorn:
   ```bash
   pip install gunicorn
   gunicorn -k eventlet -w 1 --bind 0.0.0.0:5000 run:app
   ```

2. Use PostgreSQL instead of SQLite:
   - Install PostgreSQL
   - Update `DATABASE_URL` in config
   - Install `psycopg2-binary`

3. Set environment variables:
   ```bash
   export FLASK_CONFIG=production
   export SECRET_KEY=your-secret-key-here
   export DATABASE_URL=postgresql://user:pass@localhost/cafe_db
   ```

### Frontend
1. Use a production web server like Nginx
2. Update API URLs to point to production backend
3. Enable HTTPS for security

## Troubleshooting

### Common Issues

1. **Port already in use:**
   - Change ports in `run.py` and `serve_frontend.py`
   - Kill existing processes using the ports

2. **Database errors:**
   - Delete `backend/cafe.db` and run `create_sample_data.py` again
   - Check file permissions

3. **WebSocket connection issues:**
   - Ensure both backend and frontend servers are running
   - Check firewall settings
   - Verify URL configuration in JavaScript files

4. **QR code generation fails:**
   - Install required packages: `pip install qrcode[pil]`
   - Ensure write permissions in project directory

### Support

For technical support or feature requests, please check the code documentation and error logs.

## License

This project is provided as-is for educational and commercial use.