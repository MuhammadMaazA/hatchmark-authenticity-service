#!/usr/bin/env python3
"""
QLDB Setup Script for Hatchmark
This script sets up the QLDB ledger and creates the necessary tables and indexes.
"""

import boto3
import json
import time
from botocore.exceptions import ClientError

# QLDB Configuration
LEDGER_NAME = "hatchmark-ledger-dev"
TABLE_NAME = "registrations"

def create_qldb_session():
    """Create a QLDB session client."""
    try:
        session_client = boto3.client('qldb-session')
        return session_client
    except Exception as e:
        print(f"Error creating QLDB session: {e}")
        return None

def check_ledger_exists(ledger_name):
    """Check if the QLDB ledger exists."""
    try:
        qldb_client = boto3.client('qldb')
        response = qldb_client.describe_ledger(Name=ledger_name)
        print(f"✅ Ledger '{ledger_name}' exists with status: {response['State']}")
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(f"❌ Ledger '{ledger_name}' not found")
            return False
        else:
            print(f"Error checking ledger: {e}")
            return False

def create_ledger(ledger_name):
    """Create a new QLDB ledger."""
    try:
        qldb_client = boto3.client('qldb')
        response = qldb_client.create_ledger(
            Name=ledger_name,
            PermissionsMode='STANDARD'
        )
        print(f"✅ Created ledger '{ledger_name}'")
        
        # Wait for ledger to become active
        print("Waiting for ledger to become active...")
        waiter = qldb_client.get_waiter('ledger_active')
        waiter.wait(Name=ledger_name)
        print("✅ Ledger is now active")
        
        return True
    except Exception as e:
        print(f"❌ Error creating ledger: {e}")
        return False

def execute_qldb_statement(session_token, transaction_id, statement, parameters=None):
    """Execute a statement in QLDB."""
    try:
        session_client = boto3.client('qldb-session')
        
        request = {
            'SessionToken': session_token,
            'ExecuteStatement': {
                'TransactionId': transaction_id,
                'Statement': statement
            }
        }
        
        if parameters:
            request['ExecuteStatement']['Parameters'] = parameters
        
        response = session_client.send_command(**request)
        return response
    except Exception as e:
        print(f"Error executing statement: {e}")
        return None

def setup_tables_and_indexes():
    """Set up the required tables and indexes in QLDB."""
    try:
        from pyqldb.driver.qldb_driver import QldbDriver
        
        # Create QLDB driver
        driver = QldbDriver(LEDGER_NAME)
        
        def create_table(txn):
            """Create the registrations table."""
            statement = f"CREATE TABLE {TABLE_NAME}"
            cursor = txn.execute_statement(statement)
            print(f"✅ Created table '{TABLE_NAME}'")
        
        def create_indexes(txn):
            """Create indexes for efficient querying."""
            # Index on perceptual hash for similarity search
            statement1 = f"CREATE INDEX ON {TABLE_NAME} (perceptualHash)"
            txn.execute_statement(statement1)
            print("✅ Created index on perceptualHash")
            
            # Index on timestamp for chronological queries
            statement2 = f"CREATE INDEX ON {TABLE_NAME} (timestamp)"
            txn.execute_statement(statement2)
            print("✅ Created index on timestamp")
            
            # Index on creator ID for user-specific queries
            statement3 = f"CREATE INDEX ON {TABLE_NAME} (creatorId)"
            txn.execute_statement(statement3)
            print("✅ Created index on creatorId")
        
        # Execute table creation
        driver.execute_lambda(create_table)
        
        # Execute index creation
        driver.execute_lambda(create_indexes)
        
        driver.close()
        print("✅ QLDB setup completed successfully")
        return True
        
    except ImportError:
        print("❌ pyqldb library not installed. Install with: pip install pyqldb")
        return False
    except Exception as e:
        print(f"❌ Error setting up tables: {e}")
        return False

def insert_sample_data():
    """Insert sample data for testing."""
    try:
        from pyqldb.driver.qldb_driver import QldbDriver
        from datetime import datetime
        import uuid
        
        driver = QldbDriver(LEDGER_NAME)
        
        def insert_sample_record(txn):
            """Insert a sample registration record."""
            sample_data = {
                'creatorId': 'test-creator-123',
                'timestamp': datetime.utcnow().isoformat(),
                'originalFilename': 'sample-artwork.png',
                's3IngestionKey': 'uploads/sample-artwork.png',
                's3ProcessedKey': 'processed/sample-watermarked.png',
                'perceptualHash': 'a1b2c3d4e5f6g7h8',
                'hashAlgorithm': 'pHash',
                'fileSizeBytes': 2048576,
                'status': 'REGISTERED'
            }
            
            statement = f"INSERT INTO {TABLE_NAME} ?"
            cursor = txn.execute_statement(statement, sample_data)
            print("✅ Inserted sample record")
            
            # Get the document ID
            result = list(cursor)
            if result:
                print(f"Sample record ID: {result[0]['documentId']}")
        
        driver.execute_lambda(insert_sample_record)
        driver.close()
        return True
        
    except Exception as e:
        print(f"❌ Error inserting sample data: {e}")
        return False

def verify_setup():
    """Verify the QLDB setup by querying the table."""
    try:
        from pyqldb.driver.qldb_driver import QldbDriver
        
        driver = QldbDriver(LEDGER_NAME)
        
        def query_table(txn):
            """Query the registrations table."""
            statement = f"SELECT COUNT(*) as record_count FROM {TABLE_NAME}"
            cursor = txn.execute_statement(statement)
            result = list(cursor)
            count = result[0]['record_count'] if result else 0
            print(f"✅ Table '{TABLE_NAME}' contains {count} records")
            
            # Test index usage
            statement2 = f"SELECT * FROM {TABLE_NAME} WHERE perceptualHash = 'a1b2c3d4e5f6g7h8'"
            cursor2 = txn.execute_statement(statement2)
            results = list(cursor2)
            print(f"✅ Index query returned {len(results)} results")
        
        driver.execute_lambda(query_table)
        driver.close()
        return True
        
    except Exception as e:
        print(f"❌ Error verifying setup: {e}")
        return False

def show_ledger_info():
    """Display information about the ledger."""
    try:
        qldb_client = boto3.client('qldb')
        response = qldb_client.describe_ledger(Name=LEDGER_NAME)
        
        print(f"\n📊 Ledger Information:")
        print(f"Name: {response['Name']}")
        print(f"State: {response['State']}")
        print(f"Creation Date: {response['CreationDateTime']}")
        print(f"ARN: {response['Arn']}")
        print(f"Permissions Mode: {response['PermissionsMode']}")
        
        if 'EncryptionDescription' in response:
            print(f"Encryption: {response['EncryptionDescription']['EncryptionStatus']}")
        
        return True
    except Exception as e:
        print(f"❌ Error getting ledger info: {e}")
        return False

def main():
    """Main setup function."""
    print("🔒 Hatchmark QLDB Setup")
    print("=" * 40)
    
    # Check if ledger exists
    if not check_ledger_exists(LEDGER_NAME):
        print(f"\nCreating ledger '{LEDGER_NAME}'...")
        if not create_ledger(LEDGER_NAME):
            print("❌ Failed to create ledger. Exiting.")
            return
    
    # Show ledger information
    show_ledger_info()
    
    # Setup tables and indexes
    print(f"\n📋 Setting up tables and indexes...")
    if setup_tables_and_indexes():
        print("✅ Tables and indexes created successfully")
    else:
        print("❌ Failed to setup tables. Check if pyqldb is installed.")
        return
    
    # Insert sample data
    print(f"\n🧪 Inserting sample data...")
    if insert_sample_data():
        print("✅ Sample data inserted")
    else:
        print("⚠️ Failed to insert sample data")
    
    # Verify setup
    print(f"\n🔍 Verifying setup...")
    if verify_setup():
        print("✅ Setup verification successful")
    else:
        print("❌ Setup verification failed")
    
    print("\n" + "=" * 40)
    print("🎯 QLDB setup completed!")
    print("\nNext steps:")
    print("1. Update Lambda functions with QLDB access")
    print("2. Test the Step Functions workflow")
    print("3. Deploy the complete system")

if __name__ == "__main__":
    main()