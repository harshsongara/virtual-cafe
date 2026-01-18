"""
Simple HTTP server for serving the frontend files
"""

import http.server
import socketserver
import os
import webbrowser
from urllib.parse import urlparse, parse_qs

class CafeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="frontend", **kwargs)
    
    def do_GET(self):
        # Parse the URL and query parameters
        parsed_path = urlparse(self.path)
        
        # If accessing root and there's a table parameter, serve the menu
        if parsed_path.path == '/' and 'table' in parse_qs(parsed_path.query):
            self.path = '/index.html'
        
        # If accessing root without parameters, show the admin login
        elif parsed_path.path == '/':
            self.path = '/admin.html'
        
        return super().do_GET()

def start_server(port=8080):
    # Change to the project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)
    
    with socketserver.TCPServer(("", port), CafeHTTPRequestHandler) as httpd:
        print(f"Frontend server running at http://localhost:{port}")
        print(f"Admin Dashboard: http://localhost:{port}")
        print(f"Sample Menu (Table 1): http://localhost:{port}?table=1")
        print("Press Ctrl+C to stop the server")
        
        # Optionally open browser
        try:
            webbrowser.open(f'http://localhost:{port}')
        except:
            pass
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    start_server()