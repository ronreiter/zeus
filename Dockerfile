# Build frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# Build backend
FROM golang:1.21-alpine AS backend-build

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o zeus .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy backend binary
COPY --from=backend-build /app/zeus .

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8080

CMD ["./zeus"]