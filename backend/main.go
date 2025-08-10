package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var mongoClient *mongo.Client
var db *mongo.Database

func main() {
	// Load environment variables
	godotenv.Load()

	// Initialize MongoDB
	if err := initMongoDB(); err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer mongoClient.Disconnect(context.Background())

	// Initialize Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve static files in production
	r.Static("/static", "./frontend/dist")
	r.StaticFile("/", "./frontend/dist/index.html")
	r.StaticFile("/bolt.png", "./frontend/dist/assets/bolt.png")

	// API routes
	api := r.Group("/api")
	{
		api.GET("/health", healthCheck)

		// Query routes
		api.GET("/queries", getQueries)
		api.POST("/queries", createQuery)
		api.GET("/queries/:id", getQuery)
		api.PUT("/queries/:id", updateQuery)
		api.DELETE("/queries/:id", deleteQuery)

		// Query run routes
		api.GET("/queries/:id/runs", getQueryRuns)
		api.POST("/queries/:id/runs", executeQuery)
		api.DELETE("/query-runs/:id", deleteQueryRun)

		// Athena routes
		api.POST("/athena/execute", executeAthenaQuery)
		api.GET("/athena/results/:executionId", getQueryResults)
		api.GET("/athena/export/:executionId", exportResults)
		api.GET("/athena/catalog", getAthenaCatalog)
	}

	// Fallback to serve React app for any non-API routes
	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend/dist/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}

func initMongoDB() error {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/zeus"
	}

	clientOptions := options.Client().ApplyURI(mongoURI)

	var err error
	mongoClient, err = mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return err
	}

	// Test the connection
	err = mongoClient.Ping(context.Background(), nil)
	if err != nil {
		return err
	}

	db = mongoClient.Database("zeus")
	log.Println("Connected to MongoDB!")
	return nil
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "zeus-backend",
	})
}
