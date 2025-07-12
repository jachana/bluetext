import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from couchbase.cluster import Cluster
from couchbase.auth import PasswordAuthenticator
from couchbase.options import ClusterOptions
from couchbase.exceptions import DocumentNotFoundException, CouchbaseException
import uuid

# Environment variables
COUCHBASE_HOST = os.getenv('COUCHBASE_HOST', 'couchbase')
COUCHBASE_USERNAME = os.getenv('COUCHBASE_USERNAME', 'admin')
COUCHBASE_PASSWORD = os.getenv('COUCHBASE_PASSWORD', 'password')
COUCHBASE_BUCKET_NAME = os.getenv('COUCHBASE_BUCKET_NAME', 'main')
COUCHBASE_TLS = os.getenv('COUCHBASE_TLS', 'false').lower() == 'true'

app = FastAPI(title="Users API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class UserCreate(BaseModel):
    first_name: str
    age: int

class User(BaseModel):
    id: str
    first_name: str
    age: int
    created_at: datetime

# Global variables for Couchbase connection
cluster = None
bucket = None
collection = None

def get_connection_string():
    protocol = "couchbases" if COUCHBASE_TLS else "couchbase"
    return f"{protocol}://{COUCHBASE_HOST}"

def connect_to_couchbase():
    """Connect to Couchbase with retry logic"""
    global cluster, bucket, collection
    
    max_retries = 30
    retry_interval = 2
    
    for attempt in range(max_retries):
        try:
            auth = PasswordAuthenticator(COUCHBASE_USERNAME, COUCHBASE_PASSWORD)
            cluster_options = ClusterOptions(auth)
            cluster = Cluster(get_connection_string(), cluster_options)
            
            # Test connection
            bucket = cluster.bucket(COUCHBASE_BUCKET_NAME)
            bucket.ping()
            
            collection = bucket.scope("_default").collection("users")
            print(f"Successfully connected to Couchbase bucket '{COUCHBASE_BUCKET_NAME}'")
            return
            
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed to connect to Couchbase after {max_retries} attempts: {e}")
                raise e
            print(f"Attempt {attempt + 1}: Waiting for Couchbase connection... ({e})")
            time.sleep(retry_interval)

@app.on_event("startup")
async def startup_event():
    """Initialize Couchbase connection on startup"""
    connect_to_couchbase()

@app.on_event("shutdown")
async def shutdown_event():
    """Close Couchbase connection on shutdown"""
    if cluster:
        cluster.close()

@app.get("/")
async def root():
    return {"message": "Users API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        if bucket:
            bucket.ping()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

@app.post("/users", response_model=User)
async def create_user(user: UserCreate):
    """Create a new user"""
    try:
        user_id = str(uuid.uuid4())
        user_data = {
            "first_name": user.first_name,
            "age": user.age,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Store in Couchbase users collection
        collection.insert(user_id, user_data)
        
        return User(
            id=user_id,
            first_name=user.first_name,
            age=user.age,
            created_at=datetime.fromisoformat(user_data["created_at"])
        )
        
    except CouchbaseException as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/users", response_model=List[User])
async def get_users():
    """Get all users"""
    try:
        # Query all users from the collection
        query = "SELECT META().id, * FROM `main`._default.users"
        result = cluster.query(query)
        
        users = []
        for row in result:
            users.append(User(
                id=row["id"],
                first_name=row["first_name"],
                age=row["age"],
                created_at=datetime.fromisoformat(row["created_at"])
            ))
        
        return users
        
    except CouchbaseException as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        result = collection.get(user_id)
        user_data = result.content_as[dict]
        
        return User(
            id=user_id,
            first_name=user_data["first_name"],
            age=user_data["age"],
            created_at=datetime.fromisoformat(user_data["created_at"])
        )
        
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="User not found")
    except CouchbaseException as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user by ID"""
    try:
        collection.remove(user_id)
        return {"message": f"User {user_id} deleted successfully"}
        
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="User not found")
    except CouchbaseException as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('API_PORT', 4000)))
