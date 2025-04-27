import json
import boto3
import uuid
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda function to store learning path data and mermaid flowcharts in S3.
    
    Parameters:
    - event: The event data containing:
        - learning_path: Complete learning path JSON from Bedrock
        - mermaid_code: Mermaid flowchart code 
        - user_id: Optional user ID
    - context: Lambda context
    
    Returns:
    - Response with status and storage information
    """
    try:
        # Parse input from the event
        body = json.loads(event['body']) if isinstance(event.get('body'), str) else event.get('body', {})
        
        learning_path = body.get('learning_path')
        mermaid_code = body.get('mermaid_code')
        user_id = body.get('user_id', 'anonymous')
        
        # Validate required inputs
        if not learning_path:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No learning path data provided'})
            }
        
        # Generate a unique ID for this learning path
        path_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare metadata
        metadata = {
            'path_id': path_id,
            'created_at': timestamp,
            'user_id': user_id,
            'title': learning_path.get('title', 'Untitled Learning Path')
        }
        
        # Initialize S3 client
        s3 = boto3.client('s3')
        bucket_name = 'aiws-challenge-bucket'
        
        # Create the complete storage object with metadata
        storage_object = {
            'metadata': metadata,
            'learning_path': learning_path,
            'mermaid_code': mermaid_code
        }
        
        # Store the complete data JSON
        s3.put_object(
            Bucket=bucket_name,
            Key=f'learning-paths/{user_id}/{path_id}/complete_data.json',
            Body=json.dumps(storage_object, indent=2),
            ContentType='application/json'
        )
        
        # Store just the mermaid code separately for easy access
        if mermaid_code:
            s3.put_object(
                Bucket=bucket_name,
                Key=f'learning-paths/{user_id}/{path_id}/flowchart.mmd',
                Body=mermaid_code,
                ContentType='text/plain'
            )
        
        # Return success response with path details
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'message': 'Learning path stored successfully',
                'path_details': {
                    'path_id': path_id,
                    'storage_location': f's3://{bucket_name}/learning-paths/{user_id}/{path_id}/',
                    'created_at': timestamp
                }
            })
        }
        
    except Exception as e:
        print(f"Error in lambda function: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
