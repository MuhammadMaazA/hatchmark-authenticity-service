import json
import boto3
import os
import uuid
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# Initialize AWS clients
s3_client = boto3.client('s3')
qldb_session = boto3.client('qldb-session')

def generate_presigned_url(event, context):
    """
    Lambda function to generate a presigned URL for S3 upload.
    This handles the /generate-upload-url API endpoint.
    """
    try:
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename')
        
        if not filename:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'filename is required'})
            }
        
        # Get S3 bucket from environment variable
        bucket_name = os.environ.get('S3_BUCKET')
        if not bucket_name:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'S3 bucket not configured'})
            }
        
        # Generate unique key for the upload
        unique_id = str(uuid.uuid4())
        file_extension = filename.split('.')[-1] if '.' in filename else ''
        s3_key = f"uploads/{unique_id}.{file_extension}" if file_extension else f"uploads/{unique_id}"
        
        # Generate presigned URL for PUT operation (15 minutes expiry)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key,
                'ContentType': 'image/*'
            },
            ExpiresIn=900  # 15 minutes
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                's3Key': s3_key,
                'originalFilename': filename
            })
        }
        
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }


def compute_phash(event, context):
    """
    Lambda function to compute perceptual hash of uploaded image.
    Triggered by S3 upload event.
    """
    try:
        # Parse S3 event
        s3_event = event['Records'][0]['s3']
        bucket_name = s3_event['bucket']['name']
        object_key = s3_event['object']['key']
        
        print(f"Processing image: {object_key} from bucket: {bucket_name}")
        
        # This will be implemented with ImageHash library
        # For now, return a placeholder
        return {
            'statusCode': 200,
            'body': {
                'bucketName': bucket_name,
                'objectKey': object_key,
                'perceptualHash': 'placeholder_hash',  # Will be computed with ImageHash
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        print(f"Error computing phash: {str(e)}")
        raise e


def write_to_ledger(event, context):
    """
    Lambda function to write registration data to QLDB.
    """
    try:
        # Get data from the previous step (compute_phash)
        input_data = event
        
        bucket_name = input_data.get('bucketName')
        object_key = input_data.get('objectKey')
        perceptual_hash = input_data.get('perceptualHash')
        timestamp = input_data.get('timestamp')
        
        # Generate transaction ID
        transaction_id = str(uuid.uuid4())
        
        print(f"Writing to ledger: {object_key}, hash: {perceptual_hash}")
        
        # This will be implemented with QLDB operations
        # For now, return a placeholder
        return {
            'statusCode': 200,
            'body': {
                'transactionId': transaction_id,
                'bucketName': bucket_name,
                'objectKey': object_key,
                'perceptualHash': perceptual_hash,
                'timestamp': timestamp,
                'status': 'REGISTERED'
            }
        }
        
    except Exception as e:
        print(f"Error writing to ledger: {str(e)}")
        raise e


def verify_artwork(event, context):
    """
    Lambda function to verify artwork authenticity.
    This handles the /verify-artwork API endpoint.
    """
    try:
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        
        # This will be implemented in Phase 4
        # For now, return a placeholder response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'verdict': 'Not Implemented Yet',
                'message': 'Verification endpoint will be implemented in Phase 4'
            })
        }
        
    except Exception as e:
        print(f"Error in verification: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
