# Virtual Cafe Deployment Guide

## Deploy to Render

### Prerequisites
1. GitHub account with your code repository
2. Render account (free tier available)

### Deployment Steps

1. **Prepare your repository**
   - Ensure all files are committed to your Git repository
   - Push your code to GitHub

2. **Create a new Web Service on Render**
   - Go to [render.com](https://render.com) and sign in
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     ```
     Name: virtual-cafe
     Environment: Python 3
     Build Command: ./build.sh
     Start Command: gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT wsgi:app
     ```

3. **Set Environment Variables**
   - Go to your service settings
   - Add these environment variables:
     ```
     FLASK_CONFIG = production
     SECRET_KEY = your-secret-key-here (generate a secure random string)
     ```

4. **Create PostgreSQL Database**
   - In Render dashboard, click "New +" and select "PostgreSQL"
   - Database Name: virtualcafe
   - Note down the database connection details

5. **Connect Database to Web Service**
   - In your web service settings, go to "Environment"
   - Add environment variable:
     ```
     DATABASE_URL = [your-postgresql-connection-string]
     ```
   - Or connect using Render's database linking feature

6. **Deploy**
   - Click "Deploy Latest Commit" or push new changes to trigger deployment
   - Monitor the build logs for any issues

### Manual Deployment (Alternative)

If you prefer using render.yaml (Infrastructure as Code):

1. **Add render.yaml to your repository**
   - The render.yaml file is already created in your project root

2. **Deploy using Blueprint**
   - In Render dashboard, click "New +" and select "Blueprint"
   - Connect your repository and deploy

### Environment Variables Required

- `FLASK_CONFIG`: Set to `production`
- `SECRET_KEY`: Generate a secure random string
- `DATABASE_URL`: PostgreSQL connection string (auto-provided by Render when you link database)

### Custom Domain (Optional)

Once deployed, you can:
1. Use the provided Render URL (e.g., virtual-cafe-xyz.onrender.com)
2. Add a custom domain in your service settings

### Monitoring

- Check the Render dashboard for:
  - Deployment logs
  - Service health
  - Database connections
  - Error monitoring

### Troubleshooting

Common issues and solutions:

1. **Build fails**: Check build logs for missing dependencies
2. **Database connection issues**: Verify DATABASE_URL is set correctly
3. **WebSocket issues**: Ensure eventlet worker is used in start command
4. **Static files not loading**: Verify frontend files are properly served

### Production Features Enabled

- PostgreSQL database for scalability
- Gunicorn with eventlet workers for WebSocket support
- Production-grade configuration
- Automatic HTTPS
- Environment-based configuration
- Sample data initialization on first deployment

### Access Your Application

After successful deployment:
- **Customer Interface**: `https://your-app-url.onrender.com/`
- **Admin Interface**: `https://your-app-url.onrender.com/admin.html`
  - Default admin: email `admin@virtualcafe.com`, password `admin123`

### Next Steps

1. Change default admin password
2. Customize menu items through admin interface
3. Set up table QR codes for your physical location
4. Monitor analytics and sales data
5. Configure backup strategies for your database