"""
Debug script to test menu loading directly
"""

import requests
import json

def test_menu_detailed():
    try:
        # Test the menu API directly
        response = requests.get('http://127.0.0.1:5000/api/menu')
        
        print("=== DETAILED MENU API TEST ===")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Structure: {list(data.keys())}")
            print(f"Success: {data.get('success')}")
            
            if 'categories' in data:
                categories = data['categories']
                print(f"\nCategories Count: {len(categories)}")
                
                for i, category in enumerate(categories):
                    print(f"\nCategory {i+1}: {category.get('name', 'NO NAME')}")
                    print(f"  - ID: {category.get('id', 'NO ID')}")
                    print(f"  - Display Order: {category.get('display_order', 'NO ORDER')}")
                    print(f"  - Items Count: {len(category.get('items', []))}")
                    
                    # Show first 2 items from each category
                    items = category.get('items', [])
                    if items:
                        print("  - Sample Items:")
                        for item in items[:2]:
                            print(f"    * {item.get('name', 'NO NAME')}: ₹{item.get('price', 0)}")
                    else:
                        print("  - NO ITEMS FOUND!")
            else:
                print("NO CATEGORIES FOUND!")
                print(f"Full Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_menu_detailed()