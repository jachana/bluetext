from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os
import uvicorn
import uuid
from couchbase.cluster import Cluster
from couchbase.auth import PasswordAuthenticator
from couchbase.options import ClusterOptions
from couchbase.exceptions import CouchbaseException

app = FastAPI(
    title="Date API",
    description="A simple API that returns the current date and time",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
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

@app.on_event("startup")
async def startup_event():
    """Initialize Couchbase connection on startup"""
    global cluster, bucket, users_collection
    try:
        # Connect to Couchbase cluster
        auth = PasswordAuthenticator(COUCHBASE_USERNAME, COUCHBASE_PASSWORD)
        cluster = Cluster(f'couchbase://{COUCHBASE_HOST}', ClusterOptions(auth))
        
        # Get bucket and collection
        bucket = cluster.bucket(COUCHBASE_BUCKET_NAME)
        users_collection = bucket.scope("_default").collection("users")
        
        print(f"Connected to Couchbase at {COUCHBASE_HOST}")
    except Exception as e:
        print(f"Failed to connect to Couchbase: {e}")
        # Don't fail startup, just log the error
        cluster = None
        bucket = None
        users_collection = None

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
    
    if users_collection is None:
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
    return {'status': 'healthy', 'service': 'date-api'}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    uvicorn.run(app, host='0.0.0.0', port=port, reload=True)
