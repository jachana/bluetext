import os
import json
import time
import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from kafka import KafkaProducer
from kafka.errors import KafkaError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
PORT = int(os.getenv('PORT', 4000))
REDPANDA_HOST = os.getenv('REDPANDA_HOST', 'redpanda')
REDPANDA_PORT = int(os.getenv('REDPANDA_PORT', 9092))
REDPANDA_TOPIC = os.getenv('REDPANDA_TOPIC', 'messages')

app = FastAPI(title="Messages API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message: str

class MessageResponse(BaseModel):
    id: str
    message: str
    timestamp: str
    status: str

class KafkaProducerManager:
    def __init__(self):
        self.producer = None
        self.connect_with_retry()
    
    def connect_with_retry(self, max_retries=30, retry_interval=2):
        """Connect to Kafka with retry logic"""
        for attempt in range(max_retries):
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=[f'{REDPANDA_HOST}:{REDPANDA_PORT}'],
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    key_serializer=lambda k: k.encode('utf-8') if k else None,
                    retries=3,
                    retry_backoff_ms=1000,
                    request_timeout_ms=30000,
                    api_version=(0, 10, 1)
                )
                logger.info(f"Connected to Kafka at {REDPANDA_HOST}:{REDPANDA_PORT}")
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to connect to Kafka after {max_retries} attempts: {e}")
                    raise
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed to connect to Kafka: {e}")
                time.sleep(retry_interval)
    
    def send_message(self, topic: str, message: Dict[str, Any], key: str = None):
        """Send message to Kafka topic"""
        if not self.producer:
            raise Exception("Kafka producer not initialized")
        
        try:
            future = self.producer.send(topic, value=message, key=key)
            record_metadata = future.get(timeout=10)
            logger.info(f"Message sent to topic {topic}, partition {record_metadata.partition}, offset {record_metadata.offset}")
            return record_metadata
        except KafkaError as e:
            logger.error(f"Failed to send message to Kafka: {e}")
            raise

# Initialize Kafka producer
kafka_manager = KafkaProducerManager()

@app.get("/")
async def root():
    return {"message": "Messages API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/messages", response_model=MessageResponse)
async def create_message(request: MessageRequest):
    """Create a new message and send it to Redpanda"""
    try:
        # Generate message ID and timestamp
        message_id = f"msg_{int(time.time() * 1000)}"
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare message for Kafka
        kafka_message = {
            "id": message_id,
            "message": request.message,
            "timestamp": timestamp,
            "source": "api"
        }
        
        # Send to Kafka
        kafka_manager.send_message(REDPANDA_TOPIC, kafka_message, key=message_id)
        
        logger.info(f"Message {message_id} sent to topic {REDPANDA_TOPIC}")
        
        return MessageResponse(
            id=message_id,
            message=request.message,
            timestamp=timestamp,
            status="sent"
        )
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@app.get("/messages/stats")
async def get_message_stats():
    """Get basic stats about the messages API"""
    return {
        "kafka_config": {
            "host": REDPANDA_HOST,
            "port": REDPANDA_PORT,
            "topic": REDPANDA_TOPIC
        },
        "status": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Messages API on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
