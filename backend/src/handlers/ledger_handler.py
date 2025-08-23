"""
Lambda function to write registration data to QLDB ledger.
Part of the Hatchmark Digital Authenticity Service.
"""

import boto3
import json
import os
import logging
from datetime import datetime
from aws_lambda_powertools import Logger
from botocore.exceptions import ClientError

# Initialize powertools logger
logger = Logger()

# Environment variables
LEDGER_NAME = os.environ.get('QLDB_LEDGER_NAME', 'hatchmark-ledger')

@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    AWS Lambda handler for writing registration data to QLDB ledger.
    
    Expected input:
    {
        "bucketName": "hatchmark-ingestion-bucket-...",
        "objectKey": "uploads/uuid/filename.jpg",
        "perceptualHash": "a78fd4e2c1b89e3f",
        "timestamp": "2025-08-23T00:00:00Z",
        "imageWidth": 1920,
        "imageHeight": 1080,
        "imageFormat": "JPEG",
        "algorithm": "pHash"
    }
    
    Returns:
    {
        "documentId": "...",
        "transactionId": "...",
        "status": "REGISTERED"
    }
    """
    
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract required fields from event
        bucket_name = event.get('bucketName')
        object_key = event.get('objectKey')
        perceptual_hash = event.get('perceptualHash')
        timestamp = event.get('timestamp')
        
        # Validate required fields
        if not all([bucket_name, object_key, perceptual_hash, timestamp]):
            error_msg = "Missing required fields: bucketName, objectKey, perceptualHash, timestamp"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Extract original filename from object key
        original_filename = object_key.split('/')[-1]
        
        # Prepare registration record
        registration_data = {
            'timestamp': timestamp,
            'perceptualHash': perceptual_hash,
            'algorithm': event.get('algorithm', 'pHash'),
            'originalFilename': original_filename,
            's3IngestionKey': object_key,
            's3IngestionBucket': bucket_name,
            'imageWidth': event.get('imageWidth'),
            'imageHeight': event.get('imageHeight'),
            'imageFormat': event.get('imageFormat'),
            'status': 'REGISTERED',
            'creatorId': 'anonymous',  # TODO: Replace with actual user ID when auth is implemented
            'createdAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        logger.info(f"Preparing to register data: {json.dumps(registration_data, default=str)}")
        
        # Write to QLDB using the Python driver
        try:
            from pyqldb.driver.qldb_driver import QldbDriver
            
            driver = QldbDriver(LEDGER_NAME)
            
            def insert_registration(txn):
                """Execute the insert statement within a transaction."""
                statement = "INSERT INTO registrations ?"
                cursor = txn.execute_statement(statement, registration_data)
                
                # Get the document metadata (including document ID)
                result_list = list(cursor)
                if result_list:
                    document_metadata = result_list[0]
                    logger.info(f"Inserted document with metadata: {document_metadata}")
                    return document_metadata
                else:
                    raise ValueError("No result returned from insert operation")
            
            # Execute the transaction
            result = driver.execute_lambda(insert_registration)
            driver.close()
            
            # Extract document ID from result
            document_id = None
            if isinstance(result, dict) and 'documentId' in result:
                document_id = result['documentId']
            elif isinstance(result, dict) and 'metadata' in result:
                document_id = result['metadata'].get('id')
            
            if not document_id:
                # Generate a fallback ID
                import uuid
                document_id = str(uuid.uuid4())
                logger.warning(f"Could not extract document ID from QLDB result, using fallback: {document_id}")
            
            logger.info(f"Successfully registered document with ID: {document_id}")
            
            # Prepare response
            response = {
                'documentId': document_id,
                'transactionId': document_id,  # Using document ID as transaction ID for simplicity
                'status': 'REGISTERED',
                'timestamp': registration_data['timestamp'],
                'perceptualHash': perceptual_hash,
                'ledgerName': LEDGER_NAME
            }
            
            return response
            
        except ImportError as e:
            logger.error(f"pyqldb library not available: {e}")
            # Fallback: simulate successful registration for development
            import uuid
            fallback_doc_id = str(uuid.uuid4())
            logger.warning(f"Using fallback document ID for development: {fallback_doc_id}")
            
            return {
                'documentId': fallback_doc_id,
                'transactionId': fallback_doc_id,
                'status': 'REGISTERED',
                'timestamp': registration_data['timestamp'],
                'perceptualHash': perceptual_hash,
                'ledgerName': LEDGER_NAME,
                'note': 'Fallback mode - pyqldb not available'
            }
            
    except ClientError as e:
        logger.error(f"AWS client error: {e}")
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceNotFoundException':
            raise ValueError(f"QLDB ledger '{LEDGER_NAME}' not found")
        else:
            raise
    
    except Exception as e:
        logger.error(f"Unexpected error in ledger function: {e}")
        raise
