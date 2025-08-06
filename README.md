# Zeus - Athena Query Sharing Platform

Zeus is a web application that lets users share and execute Amazon Athena queries. Built with Go backend and React TypeScript frontend, it provides a collaborative environment for SQL query development and execution.

## Features

- **Query Management**: Create, save, update, and delete SQL queries
- **Query Execution**: Execute queries through Amazon Athena
- **Query History**: Track query runs with execution status and results
- **Results Visualization**: Display query results in paginated tables
- **CSV Export**: Export query results to CSV format
- **Real-time Status**: Monitor query execution status in real-time
- **Collaborative Interface**: Share queries across team members

## Architecture

### Backend (Go)
- **Framework**: Gin web framework
- **Database**: MongoDB for query and query run storage
- **Cloud Integration**: AWS SDK for Athena and S3 operations
- **API**: RESTful API with JSON responses

### Frontend (React TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **SQL Editor**: ACE Editor with SQL syntax highlighting
- **Icons**: Tabler Icons
- **State Management**: TanStack Query (React Query)
- **Build Tool**: Vite

### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Local Development**: LocalStack for Athena simulation
- **Database**: MongoDB container
- **Reverse Proxy**: Built-in Go server serving static React files in production

## Development Setup

### Prerequisites
- Docker and Docker Compose
- [Task](https://taskfile.dev/) - for running development tasks
- Go 1.20+ (for local development)
- Node.js 18+ (for local development)

### Quick Start with Docker Compose

1. **Clone and start the development environment**:
   ```bash
   git clone <repository-url>
   cd zeus
   task dev
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - MongoDB: localhost:27017
   - LocalStack: http://localhost:4566

3. **Initialize LocalStack** (in a new terminal):
   ```bash
   task localstack:init
   ```

### Local Development Setup

1. **Install dependencies**:
   ```bash
   task setup
   ```

2. **Start backend** (in one terminal):
   ```bash
   task start:backend
   ```

3. **Start frontend** (in another terminal):
   ```bash
   task start:frontend
   ```

4. **Start dependencies**:
   ```bash
   docker-compose -f docker-compose.dev.yml up mongodb localstack
   ```

## Production Deployment

Build and run the production container:

```bash
task docker:prod
```

This creates a single container that:
1. Builds the React frontend with Vite
2. Compiles the Go backend
3. Serves the frontend statically through the Go server

## Available Tasks

View all available tasks:
```bash
task --list-all
```

### Development Tasks
- `task dev` - Start development environment with Docker
- `task start:backend` - Start backend server locally
- `task start:frontend` - Start frontend dev server locally
- `task build` - Build both frontend and backend
- `task clean` - Clean build artifacts and Docker resources

### Testing & Quality
- `task test` - Run all tests
- `task lint` - Run linting for all components
- `task format` - Format code for all components

### Docker Operations
- `task docker:dev` - Start development environment
- `task docker:prod` - Start production environment
- `task docker:logs` - View Docker Compose logs
- `task docker:down` - Stop Docker services
- `task docker:clean` - Clean Docker resources

### Utilities
- `task setup` - Install all dependencies
- `task localstack:init` - Initialize LocalStack services
- `task db:reset` - Reset MongoDB database
- `task health` - Check service health

## API Endpoints

### Queries
- `GET /api/queries` - List all queries
- `POST /api/queries` - Create a new query
- `GET /api/queries/:id` - Get a specific query
- `PUT /api/queries/:id` - Update a query
- `DELETE /api/queries/:id` - Delete a query

### Query Runs
- `GET /api/queries/:id/runs` - Get query runs for a specific query
- `POST /api/queries/:id/runs` - Execute a query and create a query run
- `DELETE /api/query-runs/:id` - Delete a query run

### Athena Operations
- `POST /api/athena/execute` - Execute a query directly
- `GET /api/athena/results/:executionId` - Get query results with pagination
- `GET /api/athena/export/:executionId` - Export results as CSV

## Data Models

### Query
```go
type Query struct {
    ID          primitive.ObjectID `json:"id"`
    Name        string             `json:"name"`
    SQL         string             `json:"sql"`
    Description string             `json:"description"`
    CreatedAt   time.Time          `json:"createdAt"`
    UpdatedAt   time.Time          `json:"updatedAt"`
}
```

### Query Run
```go
type QueryRun struct {
    ID           primitive.ObjectID `json:"id"`
    QueryID      primitive.ObjectID `json:"queryId"`
    SQL          string             `json:"sql"`
    ExecutionID  string             `json:"executionId"`
    Status       string             `json:"status"`
    ResultsS3URL string             `json:"resultsS3Url"`
    ErrorMessage string             `json:"errorMessage,omitempty"`
    ExecutedAt   time.Time          `json:"executedAt"`
    CompletedAt  *time.Time         `json:"completedAt,omitempty"`
}
```

## Environment Variables

### Backend
- `MONGO_URI`: MongoDB connection string (default: `mongodb://localhost:27017/zeus`)
- `AWS_ENDPOINT_URL`: AWS endpoint URL for LocalStack
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_DEFAULT_REGION`: AWS region (default: `us-east-1`)
- `PORT`: Server port (default: `8080`)

### Frontend
- `VITE_API_URL`: Backend API URL (default: `http://localhost:8080`)

## Development Workflow

1. **Create a query**: Click "New Query" or the + button in the sidebar
2. **Write SQL**: Use the ACE editor with syntax highlighting
3. **Save query**: Click "Save Query" and provide a name
4. **Execute query**: Click "Execute" to run the query through Athena
5. **View results**: Results appear in the bottom panel with pagination
6. **Export results**: Click "Export to CSV" to download results
7. **Track runs**: View execution history in the right panel

## Features in Detail

### Query Editor
- SQL syntax highlighting
- Auto-completion and snippets
- Real-time query validation
- Unsaved changes indication with asterisk (*)

### Query Management
- Save/update queries with names and descriptions
- Delete queries (with confirmation)
- Track query modification status
- Multiple query tabs

### Execution & Results
- Execute queries through Amazon Athena
- Real-time status updates (QUEUED, RUNNING, SUCCEEDED, FAILED)
- Paginated results display
- CSV export functionality
- Error message display for failed queries

### Query Runs
- Execution history for each query
- Status tracking and timestamps
- Error logging and display
- Cleanup operations for old runs

## Troubleshooting

### LocalStack Issues
- Ensure LocalStack container is running: `docker-compose -f docker-compose.dev.yml logs localstack`
- Check if services are available: `curl http://localhost:4566/_localstack/health`
- Re-run initialization: `./localstack-init.sh`

### Database Connection Issues
- Verify MongoDB is running: `docker-compose -f docker-compose.dev.yml logs mongodb`
- Check connection string in environment variables
- Ensure database name matches across services

### Frontend Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version compatibility
- Verify Vite configuration

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the LICENSE file for details.