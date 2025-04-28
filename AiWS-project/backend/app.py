from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import boto3
import json
import regex as re
from botocore.exceptions import ClientError

# Initialize the Flask app
app = Flask(__name__)
# Configure CORS to allow requests from your React app
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# SQLite database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = '1242421332'  # Change this to a secure random key in production
app.config['CORS_HEADERS'] = 'Content-Type'

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships defined in the User model
    stats = db.relationship('UserStats', backref='user', uselist=False)
    profile = db.relationship('UserProfile', backref='user', uselist=False)
    achievements = db.relationship('Achievement', backref='user_achievement', lazy=True)

# Updated models
class UserStats(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    paths_completed = db.Column(db.Integer, default=0)
    hours_learned = db.Column(db.Float, default=0.0)
    resources_used = db.Column(db.Integer, default=0)
    last_active = db.Column(db.DateTime)

class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    streak = db.Column(db.Integer, default=0)
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    bio = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    
    # Define the activities relationship
    activities = db.relationship('UserActivity', backref='profile', lazy=True)

class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50), default='🏆')
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profile.id'), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)
    details = db.Column(db.Text)
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

@app.route('/api/profile/<int:user_id>', methods=['GET','PATCH','POST'])
def get_profile(user_id):
    user = User.query.get_or_404(user_id)
    
    # Check if profile exists, if not create one
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        # Create a default profile for this user
        profile = UserProfile(
            user_id=user_id,
            streak=0,
            xp=0,
            level=1,
            bio="New learner"
        )
        db.session.add(profile)
        db.session.commit()
    
    # Now safely get activities
    activities = UserActivity.query.filter_by(user_profile_id=profile.id).order_by(UserActivity.created_at.desc()).limit(5).all()
    
    # Check if stats exist, if not create them
    stats = UserStats.query.filter_by(user_id=user_id).first()
    if not stats:
        stats = UserStats(
            user_id=user_id,
            paths_completed=0,
            hours_learned=0.0,
            resources_used=0,
            last_active=datetime.utcnow()
        )
        db.session.add(stats)
        db.session.commit()
    
    return jsonify({
        "username": user.username,
        "profile": {
            "streak": profile.streak,
            "xp": profile.xp,
            "level": profile.level,
            "bio": profile.bio,
            "avatar_url": profile.avatar_url
        },
        "stats": {
            "paths_completed": stats.paths_completed,
            "hours_learned": stats.hours_learned,
            "resources_used": stats.resources_used,
            "last_active": stats.last_active.isoformat() if stats.last_active else None
        },
        "achievements": [
            {
                "title": a.title,
                "description": a.description,
                "icon": a.icon,
                "earned_at": a.earned_at.isoformat()
            } for a in Achievement.query.filter_by(user_id=user_id).all()
        ],
        "recent_activity": [
            {
                "type": a.activity_type,
                "details": a.details,
                "created_at": a.created_at.isoformat()
            } for a in activities
        ]
    })




@app.route('/api/generate-learning-path', methods=['POST'])
def generate_learning_path():
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({"error": "No input prompt provided"}), 400
        
        input_text = data['prompt']
        
        # Create two separate API calls instead of one large response
        # First call: Get basic path structure with limited topics
        basic_path = generate_basic_path(input_text)
        
        # Second call: Enrich the path with details if necessary
        if basic_path and "topics" in basic_path and len(basic_path["topics"]) > 0:
            enriched_path = enrich_learning_path(basic_path)
            return validate_and_enhance_response(enriched_path)
        else:
            return jsonify({
                "status": "error",
                "message": "Could not generate a valid learning path",
                "suggestion": "Please try rephrasing your request"
            }), 500
                    
    except Exception as e:
        print(f"Endpoint error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Internal server error",
            "debug_info": str(e)
        }), 500

def generate_basic_path(input_text):
    """Generate basic path structure with limited topics"""
    bedrock_runtime = boto3.client("bedrock-runtime", region_name="us-east-1")
    
    # Simplified system prompt focusing on core structure
    system_prompt = """You MUST respond with valid JSON for a learning path with these fields:
{
  "title": "Short, concise title",
  "overview": "Very brief description (1-2 sentences)",
  "total_duration": "X weeks/months",
  "topics": [
    {
      "name": "Topic Name",
      "duration": "X days/weeks",
      "description": "Brief description"
    }
  ]
}

IMPORTANT RULES:
1. Keep descriptions SHORT and CONCISE
2. Include only 3-4 key topics maximum
3. ONLY respond with valid JSON, nothing else"""

    response = bedrock_runtime.invoke_model(
        modelId="anthropic.claude-3-haiku-20240307-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "temperature": 0.2,
            "system": system_prompt,
            "messages": [{
                "role": "user", 
                "content": f"Create a concise learning path for: {input_text}. Focus on core topics only."
            }]
        })
    )
    
    response_body = json.loads(response.get('body').read())
    raw_response = response_body['content'][0]['text']
    
    # Parse JSON response
    try:
        print(f"Raw response: {parse_json_response(raw_response)}")
        return parse_json_response(raw_response)
    except Exception as e:
        print(f"Basic path generation failed: {e}")
        return None

def enrich_learning_path(basic_path):
    """Add resources and projects to each topic"""
    bedrock_runtime = boto3.client("bedrock-runtime", region_name="us-east-1")
    
    enriched_path = basic_path.copy()
    
    # Process each topic in sequence to stay within token limits
    for i, topic in enumerate(basic_path['topics']):
        # Simplified system prompt for resources and projects
        system_prompt = f"""You MUST respond with valid JSON for learning resources and projects for the topic "{topic['name']}" with this structure:
{{
  "resources": [
    {{
      "type": "video/article/tutorial",
      "title": "Resource Title",
      "url": "https://example.com/resource",
      "estimated_time": "X min/hours"
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Brief project description",
      "complexity": "beginner/intermediate/advanced"
    }}
  ],
  "study_plan": [
    {{
      "day": "Day 1",
      "tasks": ["Brief task description"]
    }}
  ]
}}

IMPORTANT RULES:
1. Include 2-3 resources maximum (preferably YouTube links)
2. Include 1-2 projects maximum
3. Include 2-3 study days maximum
4. Keep all text VERY concise
5. ONLY respond with valid JSON, nothing else"""

        response = bedrock_runtime.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "temperature": 0.2,
                "system": system_prompt,
                "messages": [{
                    "role": "user", 
                    "content": f"Create learning resources and projects for the topic '{topic['name']}' in the context of {basic_path['title']}."
                }]
            })
        )
        
        response_body = json.loads(response.get('body').read())
        raw_response = response_body['content'][0]['text']
        print(f"Raw response: {raw_response}")
        
        try:
            topic_details = parse_json_response(raw_response)
            
            if topic_details:
                # Merge the topic details with the basic topic info
                enriched_path['topics'][i].update({
                    "resources": topic_details.get("resources", []),
                    "projects": topic_details.get("projects", []),
                    "study_plan": topic_details.get("study_plan", [])
                })
                
                # Convert YouTube URLs to embed format
                for resource in enriched_path['topics'][i]["resources"]:
                    if 'url' in resource and ('youtube.com' in resource['url'] or 'youtu.be' in resource['url']):
                        resource['url'] = convert_to_embed_url(resource['url'])
        except Exception as e:
            print(f"Topic enrichment failed for {topic['name']}: {e}")
            # If enrichment fails, provide default values
            enriched_path['topics'][i].update({
                "resources": [{"type": "article", "title": "Introduction to " + topic['name'], "url": "https://example.com", "estimated_time": "30 min"}],
                "projects": [{"name": "Basic " + topic['name'] + " Project", "description": "Apply what you learned", "complexity": "beginner"}],
                "study_plan": [{"day": "Day 1", "tasks": ["Study " + topic['name']]}]
            })
    
    return enriched_path

def parse_json_response(raw_response):
    """Try multiple methods to parse JSON from the response"""
    # Direct JSON parse
    try:
        return json.loads(raw_response)
    except json.JSONDecodeError:
        # Extract JSON from markdown code block
        try:
            json_match = re.search(r'```(?:json)?\n(.*?)\n```', raw_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
        except Exception:
            pass
        
        # Attempt repair
        try:
            return repair_json_response(raw_response)
        except Exception:
            pass
    
    return None

def validate_and_enhance_response(learning_path):
    """Validate and add missing structure to the response"""
    if not isinstance(learning_path, dict):
        raise ValueError("Response is not a JSON object")
    
    # Required fields with defaults
    learning_path.setdefault('title', 'Custom Learning Path')
    learning_path.setdefault('overview', '')
    learning_path.setdefault('total_duration', '4-6 weeks')
    
    # Ensure topics array exists
    if not isinstance(learning_path.get('topics'), list):
        learning_path['topics'] = []
    
    # Enhance each topic
    for i, topic in enumerate(learning_path['topics']):
        topic.setdefault('name', f'Topic {i+1}')
        topic.setdefault('duration', '1 week')
        topic.setdefault('description', '')
        
        # Ensure resources exist
        topic.setdefault('resources', [])
        
        # Ensure study plan exists
        if not isinstance(topic.get('study_plan'), list):
            topic['study_plan'] = [{
                'day': 'Day 1',
                'tasks': ['Study core concepts']
            }]
        
        # Validate projects
        if not isinstance(topic.get('projects'), list):
            topic['projects'] = [{
                'name': 'Practical Application',
                'description': 'Apply what you learned',
                'complexity': 'intermediate'
            }]
    
    return jsonify({
        "status": "success",
        "learning_path": learning_path
    })

def repair_json_response(raw_text):
    """Use AI to repair malformed JSON responses"""
    client = boto3.client("bedrock-runtime", region_name="us-east-1")
    
    response = client.invoke_model(
        modelId="anthropic.claude-3-haiku-20240307-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 500,
            "temperature": 0,
            "system": "You are a helpful assistant who can fix malformed JSON responses.",
            "messages": [{
                "role": "user", 
                "content": f"Repair this malformed JSON: {raw_text}"
            }]
        })
    )
    
    response_body = json.loads(response.get('body').read())
    return json.loads(response_body['content'][0]['text'])

def convert_to_embed_url(url):
    """Convert YouTube URL to embed format"""
    # Handle standard YouTube URLs
    if 'youtube.com/watch' in url:
        video_id = url.split('v=')[1].split('&')[0]
        return f"https://www.youtube.com/embed/{video_id}"
    # Handle youtu.be shortened URLs
    elif 'youtu.be' in url:
        video_id = url.split('/')[-1].split('?')[0]
        return f"https://www.youtube.com/embed/{video_id}"
    # Already an embed URL or not a YouTube URL
    return url


@app.route('/api/save-learning-path', methods=['POST'])
def save_learning_path():
    try:
        data = request.get_json()
        
        # Validate input data
        if not data or 'learning_path' not in data:
            return jsonify({"error": "No learning path data provided"}), 400
        
        # Extract data
        learning_path = data.get('learning_path')
        user_id = data.get('userId', 'anonymous')
        
        # Prepare the payload for Lambda
        lambda_payload = {
            'body': {
                'learning_path': learning_path,
                'user_id': user_id
            }
        }
        
        # Initialize Lambda client
        lambda_client = boto3.client('lambda', region_name='ap-southeast-2')
        
        # Invoke Lambda function
        response = lambda_client.invoke(
            FunctionName='aiws-lambda',  
            InvocationType='RequestResponse',
            Payload=json.dumps(lambda_payload)
        )
        
        # Parse Lambda response
        response_payload = json.loads(response['Payload'].read().decode('utf-8'))

        
        # Return success response to client
        if response['StatusCode'] == 200:
            return jsonify(json.loads(response_payload.get('body'))), 200
        else:
            return jsonify({"error": "Failed to store learning path"}), 500
    
    except ClientError as e:
        print(f"AWS client error: {str(e)}")
        return jsonify({"error": f"AWS error: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in save_learning_path: {str(e)}")
        return jsonify({"error": str(e)}), 500



# Add this function to your Flask app
def generate_roadmap_flowchart(learning_path):
    """Generate a Mermaid flowchart string based on the learning path"""
    
    # Start the flowchart
    flowchart = "flowchart TD\n"
    
    # Add title node
    title_id = "title"
    title_text = learning_path.get('title', 'Learning Path')
    flowchart += f"    {title_id}[\"{title_text}\"] --> overview\n"
    
    # Add overview node
    overview_text = learning_path.get('overview', 'Complete this learning path')
    flowchart += f"    overview[\"Overview: {overview_text}\"] --> start\n"
    flowchart += f"    start([\"Start Learning\"])\n"
    
    # Add connections from start to first topics
    if learning_path.get('topics') and len(learning_path['topics']) > 0:
        flowchart += f"    start --> topic0\n"
    
    # Process each topic
    for i, topic in enumerate(learning_path.get('topics', [])):
        topic_name = topic.get('name', f'Topic {i+1}')
        topic_id = f"topic{i}"
        
        # Add topic node
        flowchart += f"    {topic_id}[\"{topic_name}\"] --> {topic_id}_details\n"
        
        # Add topic details subgraph
        topic_duration = topic.get('duration', '1 week')
        flowchart += f"    {topic_id}_details[\"Duration: {topic_duration}\"] --> {topic_id}_resources\n"
        
        # Add resources node
        flowchart += f"    {topic_id}_resources{{{len(topic.get('resources', []))} Resources}}\n"
        
        # Add projects node
        flowchart += f"    {topic_id}_resources --> {topic_id}_projects\n"
        flowchart += f"    {topic_id}_projects{{{len(topic.get('projects', []))} Projects}}\n"
        
        # Connect to next topic
        if i < len(learning_path.get('topics', [])) - 1:
            flowchart += f"    {topic_id}_projects --> topic{i+1}\n"
        else:
            flowchart += f"    {topic_id}_projects --> complete\n"
    
    # Add completion node
    total_duration = learning_path.get('total_duration', 'Several weeks')
    flowchart += f"    complete([\"Complete! Total: {total_duration}\"])\n"
    
    # Add styling
    flowchart += "    classDef topic fill:#f9f7ed,stroke:#333,stroke-width:1px;\n"
    flowchart += "    classDef milestone fill:#e8f4ea,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5;\n"
    flowchart += "    class title,complete milestone;\n"
    flowchart += "    class " + ",".join([f"topic{i}" for i in range(len(learning_path.get('topics', [])))]) + " topic;\n"
    
    return flowchart

# Modify the validate_and_enhance_response function to include the flowchart
def validate_and_enhance_response(learning_path):
    """Validate and add missing structure to the response"""
    if not isinstance(learning_path, dict):
        raise ValueError("Response is not a JSON object")
    
    # Required fields with defaults
    learning_path.setdefault('title', 'Custom Learning Path')
    learning_path.setdefault('overview', '')
    learning_path.setdefault('total_duration', '4-6 weeks')
    
    # Ensure topics array exists
    if not isinstance(learning_path.get('topics'), list):
        learning_path['topics'] = []
    
    # Enhance each topic
    for i, topic in enumerate(learning_path['topics']):
        topic.setdefault('name', f'Topic {i+1}')
        topic.setdefault('duration', '1 week')
        topic.setdefault('description', '')
        
        # Ensure resources exist
        topic.setdefault('resources', [])
        
        # Ensure study plan exists
        if not isinstance(topic.get('study_plan'), list):
            topic['study_plan'] = [{
                'day': 'Day 1',
                'tasks': ['Study core concepts']
            }]
        
        # Validate projects
        if not isinstance(topic.get('projects'), list):
            topic['projects'] = [{
                'name': 'Practical Application',
                'description': 'Apply what you learned',
                'complexity': 'intermediate'
            }]
    
    # Generate roadmap flowchart
    roadmap_flowchart = generate_roadmap_flowchart(learning_path)
    print(f"Generated flowchart: {roadmap_flowchart}")
    
    return jsonify({
        "status": "success",
        "learning_path": learning_path,
        "roadmap_flowchart": roadmap_flowchart
    })


# Call the function to create tables
if __name__ == '__main__':
    create_tables()  # Create tables before running the app
    app.run(debug=True)
