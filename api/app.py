from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os
import uvicorn
import uuid
import time
from couchbase.cluster import Cluster
from couchbase.auth import PasswordAuthenticator
from couchbase.options import ClusterOptions, WaitUntilReadyOptions
from couchbase.exceptions import CouchbaseException, RequestCanceledException, AuthenticationException
from couchbase.diagnostics import ServiceType
from datetime import timedelta

app = FastAPI(
    title="Date API",
    description="A simple API that returns the current date and time",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for remote VM compatibility
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Couchbase configuration
COUCHBASE_HOST = os.environ.get('COUCHBASE_HOST', 'localhost')
COUCHBASE_USERNAME = os.environ.get('COUCHBASE_USERNAME', 'admin')
COUCHBASE_PASSWORD = os.environ.get('COUCHBASE_PASSWORD', 'password')
COUCHBASE_BUCKET_NAME = os.environ.get('COUCHBASE_MAIN_BUCKET_NAME', 'main')

# Global variables for Couchbase connection
cluster = None
bucket = None
users_collection = None

def connect_to_couchbase_with_retry(max_retries=30, retry_interval=2):
    """Connect to Couchbase with retry logic"""
    global cluster, bucket, users_collection
    
    for attempt in range(max_retries):
        try:
            print(f"Attempting to connect to Couchbase (attempt {attempt + 1}/{max_retries})...")
            
            # Connect to Couchbase cluster
            auth = PasswordAuthenticator(COUCHBASE_USERNAME, COUCHBASE_PASSWORD)
            cluster_options = ClusterOptions(auth)
            cluster = Cluster(f'couchbase://{COUCHBASE_HOST}', cluster_options)
            
            # Wait until cluster is ready
            wait_options = WaitUntilReadyOptions(
                service_types=[ServiceType.KeyValue, ServiceType.Query, ServiceType.Management]
            )
            cluster.wait_until_ready(timedelta(seconds=30), wait_options)
            
            # Get bucket and collection
            bucket = cluster.bucket(COUCHBASE_BUCKET_NAME)
            users_collection = bucket.scope("_default").collection("users")
            
            print(f"Successfully connected to Couchbase at {COUCHBASE_HOST}")
            return True
            
        except (RequestCanceledException, AuthenticationException, CouchbaseException) as e:
            if attempt == max_retries - 1:
                print(f"Failed to connect to Couchbase after {max_retries} attempts: {e}")
                cluster = None
                bucket = None
                users_collection = None
                return False
            
            if isinstance(e, RequestCanceledException):
                print("Waiting for connection to cluster...")
            elif isinstance(e, AuthenticationException):
                print("Waiting for cluster to initialize...")
            else:
                print(f"Connection attempt failed: {e}")
            
            time.sleep(retry_interval)
        except Exception as e:
            print(f"Unexpected error connecting to Couchbase: {e}")
            if attempt == max_retries - 1:
                cluster = None
                bucket = None
                users_collection = None
                return False
            time.sleep(retry_interval)
    
    return False

def ensure_couchbase_connection():
    """Ensure we have a valid Couchbase connection, retry if needed"""
    global users_collection
    
    if users_collection is None:
        print("No Couchbase connection, attempting to connect...")
        connect_to_couchbase_with_retry(max_retries=10, retry_interval=1)
    
    return users_collection is not None

@app.on_event("startup")
async def startup_event():
    """Initialize Couchbase connection on startup"""
    print("Starting API server...")
    # Don't block startup if Couchbase isn't ready yet
    # Connection will be attempted lazily when needed
    connect_to_couchbase_with_retry(max_retries=100, retry_interval=1)

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up Couchbase connection on shutdown"""
    global cluster
    if cluster:
        cluster.close()

@app.get("/date")
async def get_current_date():
    """Return the current date in ISO format"""
    now = datetime.now()
    return {
        'date': now.isoformat(),
        'timestamp': now.timestamp(),
        'formatted_date': now.strftime('%Y-%m-%d %H:%M:%S')
    }

class UserData(BaseModel):
    name: str
    age: int

@app.post("/user")
async def create_user(user_data: UserData):
    """Create a user with name and age"""
    global users_collection
    
    # Ensure we have a connection, retry if needed
    if not ensure_couchbase_connection():
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    try:
        # Generate a unique ID for the user
        user_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        # Create user document
        user_document = {
            'id': user_id,
            'name': user_data.name,
            'age': user_data.age,
            'created_at': created_at,
            'type': 'user'
        }
        
        # Insert user into Couchbase
        users_collection.insert(user_id, user_document)
        
        return {
            'message': f'User {user_data.name} created successfully',
            'user': user_document
        }
        
    except CouchbaseException as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global users_collection, cluster, bucket
    
    couchbase_status = "connected" if users_collection is not None else "disconnected"
    
    return {
        'status': 'healthy', 
        'service': 'date-api',
        'couchbase_status': couchbase_status,
        'couchbase_host': COUCHBASE_HOST,
        'bucket_name': COUCHBASE_BUCKET_NAME
    }

@app.get("/debug/couchbase")
async def debug_couchbase():
    """Debug endpoint to check Couchbase connection status"""
    global users_collection, cluster, bucket
    
    return {
        'cluster_connected': cluster is not None,
        'bucket_connected': bucket is not None,
        'collection_connected': users_collection is not None,
        'couchbase_host': COUCHBASE_HOST,
        'bucket_name': COUCHBASE_BUCKET_NAME,
        'username': COUCHBASE_USERNAME
    }

@app.post("/debug/reconnect")
async def debug_reconnect():
    """Debug endpoint to force reconnection to Couchbase"""
    global cluster, bucket, users_collection
    
    # Close existing connection
    if cluster:
        cluster.close()
    
    cluster = None
    bucket = None
    users_collection = None
    
    # Attempt reconnection
    success = connect_to_couchbase_with_retry(max_retries=5, retry_interval=1)
    
    return {
        'reconnection_successful': success,
        'cluster_connected': cluster is not None,
        'bucket_connected': bucket is not None,
        'collection_connected': users_collection is not None
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    uvicorn.run(app, host='0.0.0.0', port=port, reload=True)
