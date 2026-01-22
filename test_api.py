"""
Test API endpoints to identify issues
"""

import requests
import json

def test_api_endpoints():
    base_url = "http://127.0.0.1:5000"
    
    print("=== API ENDPOINT TESTS ===\n")
    
    # Test menu endpoint
    print("1. Testing menu endpoint...")
    try:
        response = requests.get(f"{base_url}/api/menu")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Categories: {len(data.get('categories', []))}")
            for cat in data.get('categories', [])[:3]:
                print(f"     - {cat['name']}: {len(cat['items'])} items")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test tables endpoint
    print("\n2. Testing tables endpoint...")
    try:
        response = requests.get(f"{base_url}/api/tables")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Tables found: {len(data.get('tables', []))}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test admin login (to get token for analytics)
    print("\n3. Testing admin login...")
    try:
        login_data = {"username": "admin", "password": "admin123"}
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Login success: {data.get('success')}")
            token = data.get('token')
            
            if token:
                # Test analytics with token
                print("\n4. Testing analytics endpoints...")
                headers = {"Authorization": f"Bearer {token}"}
                
                analytics_endpoints = [
                    "/api/admin/analytics/sales-by-hour",
                    "/api/admin/analytics/revenue-detail", 
                    "/api/admin/orders/recent",
                    "/api/admin/menu-items"
                ]
                
                for endpoint in analytics_endpoints:
                    try:
                        response = requests.get(f"{base_url}{endpoint}", headers=headers)
                        print(f"   {endpoint}: {response.status_code}")
                        if response.status_code != 200:
                            print(f"     Error: {response.text[:100]}")
                    except Exception as e:
                        print(f"     Exception: {e}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_api_endpoints()