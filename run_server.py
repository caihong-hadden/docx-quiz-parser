import http.server
import socketserver
import json
import os
import sys
import threading
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("MAOGAI_QUIZ_PORT", "8000"))
DIRECTORY = os.environ.get("MAOGAI_QUIZ_DIR", os.path.dirname(os.path.abspath(__file__)))
LEADERBOARD_FILE = os.path.join(DIRECTORY, "leaderboard.json")

# In-memory leaderboard state
leaderboard_data = {
    "practice": [],
    "exam_20": [],
    "exam_30": [],
    "exam_50": [],
    "exam_100": []
}
leaderboard_lock = threading.Lock()

def load_leaderboard():
    global leaderboard_data
    if os.path.exists(LEADERBOARD_FILE):
        try:
            with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                leaderboard_data.update(data)
        except Exception as e:
            print(f"Error loading leaderboard: {e}", file=sys.stderr)

def save_leaderboard():
    with leaderboard_lock:
        try:
            with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
                json.dump(leaderboard_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving leaderboard: {e}", file=sys.stderr)

class LeaderboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/leaderboard':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            # Enable CORS if needed
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with leaderboard_lock:
                self.wfile.write(json.dumps(leaderboard_data).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/leaderboard':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username')
                category = data.get('category') # "practice" or "exam_20" etc
                score = data.get('score', 0)
                
                if username and category in leaderboard_data:
                    with leaderboard_lock:
                        # Find if user exists in category
                        users_list = leaderboard_data[category]
                        existing_user = next((u for u in users_list if u['username'] == username), None)
                        
                        if existing_user:
                            # Update score if higher, or update practice cumulative
                            if category == 'practice':
                                existing_user['score'] += score
                            else:
                                if score > existing_user['score']:
                                    existing_user['score'] = score
                        else:
                            users_list.append({"username": username, "score": score})
                        
                        # Sort descending
                        users_list.sort(key=lambda x: x['score'], reverse=True)
                        
                    save_leaderboard()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b'{"error": "Invalid payload"}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}" }}'.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            
    def do_OPTIONS(self):
        # Handle CORS preflight
        if self.path == '/api/leaderboard':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
        else:
            super().do_OPTIONS()

# Load initial data
load_leaderboard()

try:
    print(f"Starting server on port {PORT} in directory {DIRECTORY}...", flush=True)
    # Using ThreadingHTTPServer to handle multiple concurrent requests without blocking
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), LeaderboardHandler) as httpd:
        print(f"Serving at port {PORT} successfully!", flush=True)
        httpd.serve_forever()
except Exception as e:
    print("Server failed with error:", e, file=sys.stderr, flush=True)
