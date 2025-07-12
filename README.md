# User Management Stack

A full-stack application built with React, FastAPI, and Couchbase, designed to run on Polytope.

## Architecture

This stack consists of three main components:

### Frontend (React)
- **Port**: 3000 (configurable via `frontend_port` value)
- **Technology**: React 18 with modern hooks
- **Features**: 
  - User creation form with first_name and age fields
  - User listing with delete functionality
  - Responsive design with modern UI
  - Real-time updates after operations

### API (FastAPI)
- **Port**: 4000 (configurable via `api_port` value)
- **Technology**: Python FastAPI with async support
- **Features**:
  - RESTful API for user management
  - CORS enabled for frontend communication
  - Automatic API documentation at `/docs`
  - Health check endpoint at `/health`
  - Full CRUD operations for users

### Database (Couchbase)
- **Technology**: Couchbase Server Community Edition
- **Collections**: Users stored in `_default.users` collection
- **Features**:
  - Document-based NoSQL storage
  - Automatic initialization and setup
  - Fault-tolerant connection handling

## Quick Start

1. **Set up values and secrets**:
   ```bash
   ./.values_and_secrets.defaults.sh
   ```

2. **Run the stack**:
   ```bash
   pt run stack
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:4000/docs
   - API Health Check: http://localhost:4000/health

## Configuration

The application uses Polytope values and secrets for configuration:

### Values
- `frontend_port`: Port for the React frontend (default: 3000)
- `api_port`: Port for the FastAPI backend (default: 4000)
- `api_protocol`: Protocol for API communication (default: http)
- `api_host`: Hostname for API (default: api)
- `couchbase_host`: Couchbase server hostname (default: couchbase)
- `couchbase_bucket_name`: Main bucket name (default: main)
- `couchbase_tls`: Enable TLS for Couchbase (default: false)

### Secrets
- `couchbase_username`: Couchbase admin username
- `couchbase_password`: Couchbase admin password

## Development

### Project Structure
```
├── polytope.yml                 # Polytope configuration
├── conf/
│   └── couchbase/
│       └── data_structure.yml   # Couchbase collections setup
├── src/
│   ├── frontend/                # React application
│   │   ├── bin/run              # Frontend startup script
│   │   ├── package.json         # Node.js dependencies
│   │   ├── src/                 # React source code
│   │   └── public/              # Static assets
│   ├── api/                     # FastAPI application
│   │   ├── bin/run              # API startup script
│   │   ├── requirements.txt     # Python dependencies
│   │   └── src/main.py          # FastAPI application
│   └── couchbase-init/          # Couchbase initialization
│       ├── bin/run              # Init script
│       ├── requirements.txt     # Python dependencies
│       └── src/                 # Initialization code
└── .values_and_secrets.defaults.sh  # Default configuration
```

### API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `GET /users` - List all users
- `POST /users` - Create a new user
- `GET /users/{user_id}` - Get specific user
- `DELETE /users/{user_id}` - Delete user

### User Data Model

```json
{
  "id": "uuid",
  "first_name": "string",
  "age": "integer",
  "created_at": "datetime"
}
```

## Production Deployment

For production deployment:

1. Update secrets with real values:
   ```bash
   pt secret set couchbase_username <your-username>
   pt secret set couchbase_password <your-password>
   ```

2. Configure appropriate values for your environment:
   ```bash
   pt value set api_host <your-api-host>
   pt value set couchbase_host <your-couchbase-host>
   ```

3. Consider enabling TLS:
   ```bash
   pt value set couchbase_tls "true"
   pt value set api_protocol "https"
   ```

## Troubleshooting

### Common Issues

1. **Couchbase connection failures**: 
   - The API includes retry logic for Couchbase connections
   - Couchbase initialization can take up to 10 minutes on first run
   - Check the couchbase-init logs for initialization progress

2. **Frontend can't connect to API**:
   - Verify API is running on the expected port
   - Check CORS configuration in the API
   - Ensure environment variables are set correctly

3. **Users not persisting**:
   - Verify Couchbase collections are created properly
   - Check the data_structure.yml configuration
   - Ensure the API has proper permissions to write to Couchbase

### Logs

Check individual component logs using Polytope:
```bash
pt logs <job-id> <step-id>
```

## License

This project is provided as an example for Polytope stack development.
