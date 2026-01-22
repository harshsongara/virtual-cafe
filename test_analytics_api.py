"""
Test the actual API endpoints for analytics
"""

import requests
import json

def test_analytics_api():
    base_url = "http://127.0.0.1:5000/api"
    
    # First, login to get token
    login_response = requests.post(f"{base_url}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed")
        return
    
    token = login_response.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}
    
    print("=== ANALYTICS API TEST ===")
    
    endpoints = [
        "/admin/analytics/daily-trends?days=30",
        "/admin/analytics/product-performance?days=30", 
        "/admin/analytics/category-performance?days=30"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", headers=headers)
            print(f"\n{endpoint}")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data'):
                    print(f"✅ Success - {len(data['data'])} records")
                    # Show first record as sample
                    if data['data']:
                        print(f"Sample: {json.dumps(data['data'][0], indent=2)}")
                else:
                    print(f"❌ No data: {data}")
            else:
                print(f"❌ Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_analytics_api()