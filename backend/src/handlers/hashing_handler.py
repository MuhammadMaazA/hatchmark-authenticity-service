"""
Lambda function to compute perceptual hash of uploaded images.
Part of the Hatchmark Digital Authenticity Service.
"""

import boto3
import json
import io
import os
import logging
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError
from PIL import Image
import imagehash

# Initialize powertools logger
logger = Logger()

# Initialize S3 client
s3_client = boto3.client('s3')

@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    AWS Lambda handler for computing perceptual hash of uploaded images.
    
    Expected input from S3 event:
    {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": "bucket-name"},
                    "object": {"key": "uploads/uuid/filename.jpg"}
                }
            }
        ]
    }
    
    Returns:
    {
        "perceptualHash": "a78fd4e2c1b89e3f",
        "bucketName": "bucket-name",
        "objectKey": "uploads/uuid/filename.jpg",
        "algorithm": "pHash",
        "timestamp": "2025-08-23T00:00:00Z"
    }
    """
    
    try:
        # Parse S3 event record
        if 'Records' not in event or not event['Records']:
            logger.error("No S3 records found in event")
            raise ValueError("Invalid S3 event format")
        
        s3_record = event['Records'][0]['s3']
        bucket_name = s3_record['bucket']['name']
        object_key = s3_record['object']['key']
        
        logger.info(f"Processing image: s3://{bucket_name}/{object_key}")
        
        # Download the image from S3
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            image_data = response['Body'].read()
            logger.info(f"Downloaded {len(image_data)} bytes from S3")
        except ClientError as e:
            logger.error(f"Failed to download image from S3: {e}")
            raise
        
        # Load image into PIL
        try:
            image = Image.open(io.BytesIO(image_data))
            logger.info(f"Image loaded: {image.format}, Size: {image.size}, Mode: {image.mode}")
        except Exception as e:
            logger.error(f"Failed to load image with PIL: {e}")
            raise ValueError(f"Invalid image format: {e}")
        
        # Convert to RGB if necessary (required for perceptual hashing)
        if image.mode != 'RGB':
            image = image.convert('RGB')
            logger.info("Converted image to RGB mode")
        
        # Compute perceptual hash using pHash algorithm
        try:
            phash = imagehash.phash(image)
            perceptual_hash = str(phash)
            logger.info(f"Computed perceptual hash: {perceptual_hash}")
        except Exception as e:
            logger.error(f"Failed to compute perceptual hash: {e}")
            raise
        
        # Prepare response
        from datetime import datetime
        result = {
            "perceptualHash": perceptual_hash,
            "bucketName": bucket_name,
            "objectKey": object_key,
            "algorithm": "pHash",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "imageWidth": image.width,
            "imageHeight": image.height,
            "imageFormat": image.format or "Unknown"
        }
        
        logger.info(f"Successfully processed image hash: {perceptual_hash}")
        
        # Trigger Step Functions workflow
        step_function_arn = os.environ.get('STEP_FUNCTION_ARN')
        if step_function_arn:
            try:
                stepfunctions_client = boto3.client('stepfunctions')
                stepfunctions_client.start_execution(
                    stateMachineArn=step_function_arn,
                    input=json.dumps(result)
                )
                logger.info("Successfully started Step Functions execution")
            except Exception as e:
                logger.error(f"Failed to start Step Functions execution: {e}")
                # Don't fail the whole function if Step Functions fails
        
        return result
        
    except ClientError as e:
        logger.error(f"AWS client error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in hash function: {e}")
        raise
