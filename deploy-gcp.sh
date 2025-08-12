#!/bin/bash

# Bluetext MCP Server - GCP Cloud Run Deployment Script
# This script builds and deploys the Bluetext MCP server to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-${PROJECT_ID:-"multi-repo-mcp-server"}}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="bluetext-mcp-server"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Bluetext MCP Server to Google Cloud Run"
echo "Project ID: ${PROJECT_ID}"
echo "Service Name: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo "Image: ${IMAGE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verify gcloud authentication
echo "🔐 Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: Not authenticated with gcloud"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the application locally first
echo "🔨 Building application..."
npm run build

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

echo "📤 Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}:latest

# Update the Cloud Run service configuration with the correct project ID
echo "📝 Updating Cloud Run configuration..."
sed "s/PROJECT_ID/${PROJECT_ID}/g" cloudrun.yaml > cloudrun-deploy.yaml

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run services replace cloudrun-deploy.yaml --region=${REGION}

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Service URL: ${SERVICE_URL}"
echo "🏥 Health Check: ${SERVICE_URL}/health"
echo "📊 SSE Endpoint: ${SERVICE_URL}/sse"
echo "📨 Message Endpoint: ${SERVICE_URL}/message"
echo ""
echo "🔧 To update your MCP client configuration, use:"
echo "   SSE URL: ${SERVICE_URL}/sse"
echo "   Message URL: ${SERVICE_URL}/message"
echo ""
echo "📝 To view logs:"
echo "   gcloud logs tail --follow --project=${PROJECT_ID} --resource-type=cloud_run_revision --resource-labels=service_name=${SERVICE_NAME}"
echo ""
echo "🗑️  To delete the service:"
echo "   gcloud run services delete ${SERVICE_NAME} --region=${REGION}"

# Clean up temporary file
rm -f cloudrun-deploy.yaml

echo ""
echo "🎉 Bluetext MCP Server is now running remotely on Google Cloud Run!"
