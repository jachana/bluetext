import os
import json
import time
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from kafka import KafkaProducer
from kafka.errors import KafkaError
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
PORT = int(os.getenv('PORT', 4000))
REDPANDA_BOOTSTRAP_SERVERS = os.getenv('REDPANDA_BOOTSTRAP_SERVERS', 'redpanda:9092')

# Pydantic models
class User(BaseModel):
    first_name: str
    age: int

class UserResponse(BaseModel):
    id: str
    first_name: str
    age: int
    status: str

# FastAPI app
app = FastAPI(title="User API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Kafka producer
producer: Optional[KafkaProducer] = None

def get_kafka_producer():
    """Get or create Kafka producer with retry logic"""
    global producer
    if producer is None:
        max_retries = 30
        retry_interval = 2
        
        for attempt in range(max_retries):
            try:
                producer = KafkaProducer(
                    bootstrap_servers=REDPANDA_BOOTSTRAP_SERVERS.split(','),
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    key_serializer=lambda k: k.encode('utf-8') if k else None,
                    retries=5,
                    retry_backoff_ms=1000,
                    request_timeout_ms=30000,
                    api_version=(0, 10, 1)
                )
                logger.info(f"Connected to Kafka at {REDPANDA_BOOTSTRAP_SERVERS}")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to connect to Kafka after {max_retries} attempts: {e}")
                    raise
                logger.warning(f"Attempt {attempt + 1}/{max_retries}: Failed to connect to Kafka: {e}")
                time.sleep(retry_interval)
    
    return producer

@app.on_event("startup")
async def startup_event():
    """Initialize Kafka producer on startup"""
    try:
        get_kafka_producer()
        logger.info("API startup completed successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Kafka producer: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    global producer
    if producer:
        producer.close()
        logger.info("Kafka producer closed")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "User API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Test Kafka connection
        kafka_producer = get_kafka_producer()
        kafka_status = "connected" if kafka_producer else "disconnected"
        
        return {
            "status": "healthy",
            "kafka": kafka_status,
            "redpanda_servers": REDPANDA_BOOTSTRAP_SERVERS
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "kafka": "disconnected"
        }

@app.post("/users", response_model=UserResponse)
async def create_user(user: User):
    """Create a new user and send to Redpanda"""
    try:
        # Generate a simple ID (in production, use UUID or database ID)
        user_id = f"user_{int(time.time() * 1000)}"
        
        # Prepare user data for Kafka
        user_data = {
            "id": user_id,
            "first_name": user.first_name,
            "age": user.age,
            "created_at": time.time()
        }
        
        # Send to Kafka
        kafka_producer = get_kafka_producer()
        future = kafka_producer.send('users', key=user_id, value=user_data)
        
        # Wait for the message to be sent (with timeout)
        try:
            record_metadata = future.get(timeout=10)
            logger.info(f"Message sent to topic {record_metadata.topic} partition {record_metadata.partition} offset {record_metadata.offset}")
        except KafkaError as e:
            logger.error(f"Failed to send message to Kafka: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to send user data to message queue: {e}")
        
        return UserResponse(
            id=user_id,
            first_name=user.first_name,
            age=user.age,
            status="created"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating user: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID (placeholder - in real app would query database)"""
    # This is a placeholder endpoint
    # In a real application, you would query a database
    return {"message": f"User {user_id} endpoint - not implemented yet"}

if __name__ == "__main__":
    logger.info(f"Starting API server on port {PORT}")
    logger.info(f"Redpanda servers: {REDPANDA_BOOTSTRAP_SERVERS}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
        log_level="info"
    )
