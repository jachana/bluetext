# Polytope Stack Template

A complete full-stack application template for Polytope that includes:

- **Frontend**: React app with user registration form (port 3000)
- **API**: FastAPI Python backend with Users REST endpoint (port 4000)
- **Redpanda**: Message streaming platform with 'users' topic
- **Redpanda Console**: Web UI for monitoring and managing Redpanda (port 8079)

## Architecture

```
Frontend (React) → API (FastAPI) → Redpanda (Message Queue)
     ↓                 ↓               ↓
   Port 3000        Port 4000      Port 9092
                                       ↓
                              Redpanda Console (Web UI)
                                   Port 8079
```

## Quick Start

1. **Set default values and secrets:**
   ```bash
   ./values_and_secrets.defaults.sh
   ```

2. **Run the stack:**
   ```bash
   pt run stack
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - API Health: http://localhost:4000/health
   - Redpanda Console: http://localhost:8079

## Components

### Frontend (React)
- Location: `src/frontend/`
- Form with fields: `first_name` (string), `age` (number)
- Posts data to `/users` API endpoint
- Responsive UI with error handling

### API (FastAPI)
- Location: `src/api/`
- REST endpoint: `POST /users`
- Validates input data
- Sends user data to Redpanda 'users' topic
- Health check endpoint: `GET /health`

### Redpanda
- Message streaming platform
- Topic: `users`
- Automatically initialized with required topics

### Redpanda Console
- Web UI for monitoring and managing Redpanda
- View topics, messages, and cluster health
- Real-time message browsing
- Consumer group monitoring

### Redpanda Init
- Location: `src/redpanda-init/`
- Ensures 'users' topic exists
- Handles connection retries
- Configurable via `conf/redpanda/data_structure.yml`

## Configuration

### Environment Values
All configurable values are stored as Polytope values:

- `frontend_port`: Frontend server port (default: 3000)
- `api_port`: API server port (default: 4000)
- `api_url`: API URL for frontend (default: http://localhost:4000)
- `redpanda_bootstrap_servers`: Redpanda connection string (default: redpanda:9092)
- `redpanda_console_port`: Redpanda Console web UI port (default: 8079)

### Customizing Topics
Edit `conf/redpanda/data_structure.yml` to add more topics:

```yaml
topics:
  - users
  - orders
  - notifications
```

## Development

### Local Development
Each component can be developed independently:

```bash
# Frontend
cd src/frontend
npm install
npm start

# API
cd src/api
pip install -r requirements.txt
python src/main.py

# Redpanda Init
cd src/redpanda-init
pip install -r requirements.txt
python src/main.py
```

### Adding Features

1. **New API Endpoints**: Add to `src/api/src/main.py`
2. **Frontend Components**: Add to `src/frontend/src/`
3. **New Topics**: Update `conf/redpanda/data_structure.yml`

## Deployment

The template uses Polytope values for environment-specific configuration:

```bash
# Production values
pt value set frontend_port 80
pt value set api_port 8080
pt value set api_url "https://api.yourdomain.com"
```

## Troubleshooting

### Connection Issues
- Check Redpanda is running: `pt logs redpanda`
- Verify API health: `curl http://localhost:4000/health`
- Check frontend environment: Browser developer tools

### Topic Creation
- View Redpanda init logs: `pt logs redpanda-init`
- Manually create topics if needed

### API Issues
- Check API logs: `pt logs api`
- Verify Kafka connection in health endpoint

## File Structure

```
├── polytope.yml                    # Polytope configuration
├── .values_and_secrets.defaults.sh # Default configuration
├── src/
│   ├── frontend/                   # React application
│   │   ├── bin/run                 # Startup script
│   │   ├── bin/init                # Dependency installer
│   │   ├── package.json            # Node dependencies
│   │   ├── public/index.html       # HTML template
│   │   └── src/                    # React components
│   ├── api/                        # FastAPI application
│   │   ├── bin/run                 # Startup script
│   │   ├── requirements.txt        # Python dependencies
│   │   └── src/main.py             # API implementation
│   └── redpanda-init/              # Topic initialization
│       ├── bin/run                 # Startup script
│       ├── requirements.txt        # Python dependencies
│       └── src/main.py             # Initialization logic
└── conf/
    └── redpanda/
        └── data_structure.yml      # Topic configuration
