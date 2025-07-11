# Full Stack React + Python API on Polytope

This is a full stack application with a React frontend and Python API backend configured to run on the Polytope platform.

## Project Structure

```
.
├── polytope.yml          # Polytope configuration file
├── frontend/             # React application directory
│   ├── bin/
│   │   ├── run           # Executable script to start the app
│   │   └── init          # Executable script to install dependencies
│   ├── public/
│   │   └── index.html    # HTML template
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # App styles
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   └── package.json      # Node.js dependencies
├── api/                  # Python API server directory
│   ├── bin/
│   │   └── run           # Executable script to start the API
│   ├── app.py            # FastAPI application
│   └── requirements.txt  # Python dependencies
└── README.md             # This file
```

## How to Run

### Using Polytope

1. Make sure you have Polytope CLI installed and configured
2. Run the full stack application:
   ```bash
   pt run stack
   ```
   Or run only the API server:
   ```bash
   pt run api-only
   ```

3. The React app will be available at port 3000 and the Python API at port 5000

### What the App Does

**Frontend (React):**
- Displays a "Hello World!" message
- Shows information about the React app running on Polytope
- Lists the key features of the setup
- Includes responsive design for mobile devices

**Backend (Python API):**
- FastAPI-based REST API with automatic OpenAPI documentation
- Provides a `/date` endpoint that returns the current date and time
- Includes a `/health` endpoint for health checks
- Returns JSON responses with multiple date formats
- Interactive API documentation available at `/docs`

### API Endpoints

- `GET /date` - Returns current date and time in multiple formats:
  ```json
  {
    "date": "2025-01-07T15:30:00.123456",
    "timestamp": 1704639000.123456,
    "formatted_date": "2025-01-07 15:30:00"
  }
  ```
- `GET /health` - Health check endpoint:
  ```json
  {
    "status": "healthy",
    "service": "date-api"
  }
  ```

## Polytope Configuration

The `polytope.yml` file defines:

- **Frontend Module**: Uses the `polytope/node` module to run the React app
- **API Module**: Uses the `polytope/python` module to run the FastAPI API
- **Templates**: 
  - `stack` - Runs both frontend and API modules
  - `api-only` - Runs only the API module
- **Features**:
  - Node.js 22 and Python 3.11 runtimes
  - Volume mounts for dependency caching
  - Hot reloading support
  - Service exposure on ports 3000 and 5000
  - Automatic restart policy

## Development

The app is configured with:
- React 18
- React Scripts for development server
- Hot reloading enabled
- Dependency caching for faster builds
- Proper error handling and logging

## Key Features

- ✅ **Full Stack**: React frontend + Python FastAPI backend
- ✅ **React 18**: Latest React version with modern features
- ✅ **FastAPI**: Modern Python web framework with automatic API docs
- ✅ **Python 3.11**: Modern Python runtime with async support
- ✅ **Hot Reloading**: Changes are reflected immediately
- ✅ **Docker Containers**: Runs in isolated environments
- ✅ **Polytope Integration**: Full platform integration
- ✅ **Volume Caching**: Fast dependency installation
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **RESTful API**: Clean JSON API endpoints with OpenAPI docs
- ✅ **Health Checks**: Built-in monitoring endpoints
- ✅ **Interactive Docs**: Automatic Swagger UI at `/docs`

## Customization

To modify the app:

**Frontend:**
1. Edit files in the `frontend/src/` directory
2. The changes will be automatically reflected due to hot reloading
3. Add new dependencies to `frontend/package.json`

**Backend:**
1. Edit files in the `api/` directory
2. Add new endpoints to `api/app.py`
3. Add new dependencies to `api/requirements.txt`

**Restart if needed:**
```bash
pt run stack
```

Enjoy building full stack applications with React and Python on Polytope! 🚀
