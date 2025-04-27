from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import boto3
import json

# Initialize the Flask app
app = Flask(__name__)
CORS(app) 

# SQLite database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Change this to a secure random key in production
app.config['CORS_HEADERS'] = 'Content-Type'

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)  # Storing hashed password
    email = db.Column(db.String(150), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables in a function that we'll call after defining the app
def create_tables():
    with app.app_context():
        db.create_all()

# Registration route
@app.route('/api/register', methods=['GET','POST'])
def register():
    data = request.get_json()
    
    # Validate required fields
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Username and password are required"}), 400
    
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')  # Optional field
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    
    # Check if email already exists (if provided)
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    
    # Hash the password before storing
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    
    # Create new user
    new_user = User(
        username=username,
        password=hashed_password,
        email=email
    )
    
    # Add to database
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Registration successful", "user_id": new_user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

# Login route
@app.route('/api/login', methods=['GET','POST'])
def login():
    data = request.get_json()
    
    # Validate required fields
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Username and password are required"}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    # Find user by username
    user = User.query.filter_by(username=username).first()
    
    # Check if user exists and password is correct
    if user and check_password_hash(user.password, password):
        return jsonify({
            "message": "Login successful",
            "user_id": user.id,
            "username": user.username
        }), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

# User profile route 
@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if user:
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }), 200
    return jsonify({"error": "User not found"}), 404


@app.route('/api/generate-learning-path', methods=['POST'])
def generate_learning_path():
    try:
        # Get the input text from the frontend
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({"error": "No input prompt provided"}), 400
        
        input_text = data['prompt']
        
        # Initialize Bedrock client
        bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name="us-east-1"  # Change to your AWS region
        )
        
        # Prepare the request for Bedrock
        model_id = "anthropic.claude-3-haiku-20240307-v1:0"
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 50,
            "temperature": 0.3,
            "top_p": 0.9,
            "top_k": 30,
            "system": "You are an AI learning path generator. Create structured educational plans in JSON format with these keys: 'duration', 'topics', 'resources' (URLs only), and 'projects'. Never include explanations or disclaimers.",
            "messages": [
                {
                    "role": "user",
                    "content": input_text  
                }
            ]
        })
        
        # Make the request to Bedrock
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=body
        )
        
        # Parse and process the response
        response_body = json.loads(response.get('body').read())
        
        # Print the response for debugging
        print("Bedrock API Response:", json.dumps(response_body, indent=2))
        
        # Extract the content from the response
        if 'content' in response_body:
            ai_response = response_body['content'][0]['text']
            return jsonify({"result": ai_response})
        else:
            return jsonify({"error": "No content in response"}), 500
            
    except Exception as e:
        print(f"Error calling Bedrock API: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Call the function to create tables
if __name__ == '__main__':
    create_tables()  # Create tables before running the app
    app.run(debug=True)