#!/usr/bin/env python3
"""
Hatchmark Watermarker Service
A containerized service that applies invisible watermarks to digital content
"""

import os
import sys
import json
import time
import logging
import hashlib
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, Dict, Any

import boto3
from botocore.exceptions import ClientError
from PIL import Image
import imagehash

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HatchmarkWatermarker:
    """Main watermarker class"""
    
    def __init__(self):
        """Initialize the watermarker"""
        self.sqs_queue_url = os.environ.get('SQS_QUEUE_URL')
        self.ingestion_bucket = os.environ.get('INGESTION_BUCKET', 'hatchmark-ingestion-bucket-36933227')
        self.processed_bucket = os.environ.get('PROCESSED_BUCKET', 'hatchmark-processed-bucket-36933227')
        
        # Initialize AWS clients
        try:
            self.s3_client = boto3.client('s3')
            self.sqs_client = boto3.client('sqs') if self.sqs_queue_url else None
            self.dynamodb = boto3.resource('dynamodb')
            
            # Initialize DynamoDB table
            try:
                self.assets_table = self.dynamodb.Table('hatchmark-assets')
            except Exception as e:
                logger.warning(f"DynamoDB table not available: {e}")
                self.assets_table = None
                
        except Exception as e:
            logger.warning(f"AWS clients not available: {e}")
            self.s3_client = None
            self.sqs_client = None
            self.assets_table = None
        
        logger.info("Hatchmark Watermarker initialized")
    
    def compute_perceptual_hash(self, image: Image.Image) -> str:
        """Compute perceptual hash of an image"""
        try:
            # Compute phash using imagehash library
            phash = imagehash.phash(image)
            return str(phash)
        except Exception as e:
            logger.error(f"Error computing perceptual hash: {e}")
            raise
    
    def apply_watermark(self, image: Image.Image, watermark_data: str) -> Image.Image:
        """Apply invisible watermark to image using steganography"""
        try:
            # Simple steganography: modify LSB of pixels
            # Convert watermark data to binary
            watermark_binary = ''.join(format(ord(char), '08b') for char in watermark_data)
            watermark_binary += '1111111111111110'  # Delimiter
            
            # Convert image to RGB if not already
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Create a copy to modify
            watermarked = image.copy()
            pixels = list(watermarked.getdata())
            
            # Apply watermark to LSB of red channel
            watermark_index = 0
            for i, pixel in enumerate(pixels):
                if watermark_index < len(watermark_binary):
                    r, g, b = pixel
                    # Modify LSB of red channel
                    r = (r & 0xFE) | int(watermark_binary[watermark_index])
                    pixels[i] = (r, g, b)
                    watermark_index += 1
                else:
                    break
            
            # Create new image with modified pixels
            watermarked.putdata(pixels)
            return watermarked
            
        except Exception as e:
            logger.error(f"Error applying watermark: {e}")
            # Return original image if watermarking fails
            return image
    
    def process_image_standalone(self, image_path: str) -> str:
        """Process a single image in standalone mode"""
        try:
            logger.info(f"Processing image: {image_path}")
            
            # Open image
            image = Image.open(image_path)
            logger.info(f"Opened image: {image.size}, mode: {image.mode}")
            
            # Compute perceptual hash
            perceptual_hash = self.compute_perceptual_hash(image)
            logger.info(f"Computed perceptual hash: {perceptual_hash}")
            
            # Create watermark data
            watermark_data = json.dumps({
                'assetId': f"test_{int(time.time())}",
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'hash': perceptual_hash
            })
            
            # Apply watermark
            watermarked_image = self.apply_watermark(image, watermark_data)
            
            # Save watermarked image
            output_path = image_path.replace('.', '_watermarked.')
            watermarked_image.save(output_path, quality=95)
            
            logger.info(f"Successfully processed {image_path} -> {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            raise
    
    def run_standalone(self, image_path: str):
        """Run in standalone mode for testing"""
        logger.info("Running in standalone mode")
        
        try:
            processed_path = self.process_image_standalone(image_path)
            print(f"Successfully processed: {image_path} -> {processed_path}")
            return processed_path
        except Exception as e:
            print(f"Processing failed: {e}")
            return None

def main():
    """Main entry point"""
    watermarker = HatchmarkWatermarker()
    
    # Check for standalone mode (for testing)
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        watermarker.run_standalone(image_path)
    else:
        print("Usage: python main.py <image_path>")
        print("Example: python main.py test_image.jpg")

if __name__ == '__main__':
    main()

# Initialize AWS clients
s3_client = boto3.client('s3')
sqs_client = boto3.client('sqs')

# Environment variables with fallback defaults
INGESTION_BUCKET = os.environ.get('INGESTION_BUCKET', 'hatchmark-ingestion-bucket-36933227')
PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET', 'hatchmark-processed-bucket-36933227')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')

# Log configuration
print(f"Watermarker starting with config:")
print(f"  INGESTION_BUCKET: {INGESTION_BUCKET}")
print(f"  PROCESSED_BUCKET: {PROCESSED_BUCKET}")
print(f"  SQS_QUEUE_URL: {SQS_QUEUE_URL}")
print(f"  Running mode: {'Production' if SQS_QUEUE_URL else 'Test'}")

def download_image_from_s3(bucket_name, object_key):
    """Download image from S3 into memory."""
    try:
        print(f"Downloading image from S3: s3://{bucket_name}/{object_key}")
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        image_data = response['Body'].read()
        
        # Load image using PIL
        image = Image.open(io.BytesIO(image_data))
        print(f"Image loaded: {image.format}, Size: {image.size}, Mode: {image.mode}")
        return image
    except ClientError as e:
        print(f"Error downloading from S3: {e}")
        raise
    except Exception as e:
        print(f"Error processing image: {e}")
        raise

def upload_image_to_s3(image, bucket_name, object_key):
    """Upload processed image to S3."""
    try:
        # Convert PIL Image to bytes
        img_byte_arr = io.BytesIO()
        # Preserve original format or use PNG as fallback
        image_format = image.format if image.format else 'PNG'
        image.save(img_byte_arr, format=image_format)
        img_byte_arr.seek(0)
        
        print(f"Uploading watermarked image to S3: s3://{bucket_name}/{object_key}")
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=img_byte_arr.getvalue(),
            ContentType=f'image/{image_format.lower()}'
        )
        print(f"Successfully uploaded to s3://{bucket_name}/{object_key}")
        return True
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        raise

def embed_watermark(image, watermark_data):
    """Embed invisible watermark using steganography."""
    try:
        print(f"Embedding watermark data: {watermark_data}")
        
        # Convert PIL Image to temporary file for steganography library
        temp_input = "/tmp/temp_input.png"
        temp_output = "/tmp/temp_output.png"
        
        # Save image temporarily
        image.save(temp_input, "PNG")
        
        # Embed the watermark
        Steganography.encode(temp_input, temp_output, watermark_data)
        
        # Load the watermarked image
        watermarked_image = Image.open(temp_output)
        
        # Clean up temporary files
        os.remove(temp_input)
        os.remove(temp_output)
        
        print("Watermark successfully embedded")
        return watermarked_image
    except Exception as e:
        print(f"Error embedding watermark: {e}")
        # If steganography fails, return the original image
        print("Falling back to original image without watermark")
        return image

def extract_watermark(image):
    """Extract watermark from image."""
    try:
        # Save image temporarily
        temp_input = "/tmp/temp_extract.png"
        image.save(temp_input, "PNG")
        
        # Extract the watermark
        extracted_data = Steganography.decode(temp_input)
        
        # Clean up temporary file
        os.remove(temp_input)
        
        print(f"Extracted watermark: {extracted_data}")
        return extracted_data
    except Exception as e:
        print(f"Error extracting watermark: {e}")
        return None

def process_sqs_message():
    """Process a single message from SQS queue."""
    try:
        if not SQS_QUEUE_URL:
            print("No SQS queue URL configured, running in test mode")
            return process_test_image()
        
        # Receive message from SQS
        print(f"Polling SQS queue: {SQS_QUEUE_URL}")
        response = sqs_client.receive_message(
            QueueUrl=SQS_QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20  # Long polling
        )
        
        messages = response.get('Messages', [])
        if not messages:
            print("No messages in queue")
            return
        
        message = messages[0]
        receipt_handle = message['ReceiptHandle']
        
        try:
            # Parse message body
            message_body = json.loads(message['Body'])
            # Parse message body for object key and QLDB document ID
            object_key = message_body.get('objectKey')
            qldb_document_id = message_body.get('qldbDocumentId')
            bucket_name = message_body.get('bucketName', INGESTION_BUCKET)
            
            if not object_key or not qldb_document_id:
                print(f"Invalid message format: {message_body}")
                return
            
            print(f"Processing watermarking request for {object_key} with QLDB document ID: {qldb_document_id}")
            
            # Download the original image file from the ingestion S3 bucket
            image = download_image_from_s3(bucket_name, object_key)
            
            # Use steganography library to embed the qldbDocumentId as invisible watermark
            watermarked_image = embed_watermark(image, qldb_document_id)
            
            # Generate output key for the processed bucket
            # Extract original filename from the object key
            original_filename = object_key.split('/')[-1]
            output_key = f"watermarked/{original_filename}"
            
            # Upload the watermarked image to the processed S3 bucket
            upload_image_to_s3(watermarked_image, PROCESSED_BUCKET, output_key)
            
            # Delete message from queue on success
            sqs_client.delete_message(
                QueueUrl=SQS_QUEUE_URL,
                ReceiptHandle=receipt_handle
            )
            
            print(f"Successfully processed watermarking for QLDB document {qldb_document_id}")
            
        except Exception as e:
            print(f"Error processing message: {e}")
            # Message will remain in queue for retry
            raise
            
    except Exception as e:
        print(f"Error in SQS processing: {e}")
        raise

def process_test_image():
    """Create and process a test image for development/testing."""
    print("Running in test mode - creating dummy image")
    
    # Create a test image
    test_image = Image.new('RGB', (400, 400), color='blue')
    
    # Add some visual content
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(test_image)
    try:
        # Try to use a default font
        font = ImageFont.load_default()
    except:
        font = None
    
    draw.text((50, 180), "HATCHMARK TEST IMAGE", fill='white', font=font)
    
    # Embed test watermark
    test_transaction_id = "test-transaction-12345"
    watermarked_image = embed_watermark(test_image, test_transaction_id)
    
    # Save to local file for testing
    output_path = "/app/test_watermarked.png"
    watermarked_image.save(output_path)
    print(f"Test watermarked image saved to {output_path}")
    
    # Test extraction
    extracted = extract_watermark(watermarked_image)
    print(f"Watermark extraction test result: {extracted}")
    
    return True

def main():
    """Main entry point for the watermarker service."""
    print("--- Hatchmark Watermarker Service Started ---")
    
    try:
        # Check if running in Fargate (with SQS) or test mode
        if SQS_QUEUE_URL:
            print("Running in production mode with SQS")
            while True:
                process_sqs_message()
        else:
            print("Running in test mode")
            process_test_image()
            
    except KeyboardInterrupt:
        print("Service interrupted by user")
    except Exception as e:
        print(f"Fatal error in watermarker service: {e}")
        raise
    finally:
        print("--- Hatchmark Watermarker Service Finished ---")

if __name__ == "__main__":
    main()