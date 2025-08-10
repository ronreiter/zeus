package main

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Helper function to substitute parameters in SQL
func substituteParameters(sql string, parameters map[string]string) string {
	result := sql
	if parameters != nil {
		for key, value := range parameters {
			placeholder := "{{" + key + "}}"
			result = strings.ReplaceAll(result, placeholder, value)
		}
	}
	return result
}

// Query handlers
func getQueries(c *gin.Context) {
	ctx := context.Background()
	collection := db.Collection("queries")

	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var queries []Query
	if err := cursor.All(ctx, &queries); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if queries == nil {
		queries = []Query{}
	}

	c.JSON(http.StatusOK, queries)
}

func createQuery(c *gin.Context) {
	var req CreateQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := Query{
		Name:        req.Name,
		SQL:         req.SQL,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ctx := context.Background()
	collection := db.Collection("queries")

	result, err := collection.InsertOne(ctx, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	query.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, query)
}

func getQuery(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	ctx := context.Background()
	collection := db.Collection("queries")

	var query Query
	err = collection.FindOne(ctx, bson.M{"_id": id}).Decode(&query)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Query not found"})
		return
	}

	c.JSON(http.StatusOK, query)
}

func updateQuery(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	var req UpdateQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	collection := db.Collection("queries")

	update := bson.M{
		"$set": bson.M{
			"name":        req.Name,
			"sql":         req.SQL,
			"description": req.Description,
			"updatedAt":   time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Query not found"})
		return
	}

	var updatedQuery Query
	err = collection.FindOne(ctx, bson.M{"_id": id}).Decode(&updatedQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedQuery)
}

func deleteQuery(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	ctx := context.Background()
	collection := db.Collection("queries")

	result, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Query not found"})
		return
	}

	// Also delete associated query runs
	runsCollection := db.Collection("queryruns")
	runsCollection.DeleteMany(ctx, bson.M{"queryId": id})

	c.JSON(http.StatusOK, gin.H{"message": "Query deleted successfully"})
}

// Query run handlers
func getQueryRuns(c *gin.Context) {
	queryID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	ctx := context.Background()
	collection := db.Collection("queryruns")

	opts := options.Find().SetSort(bson.D{{"executedAt", -1}})
	cursor, err := collection.Find(ctx, bson.M{"queryId": queryID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var runs []QueryRun
	if err := cursor.All(ctx, &runs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if runs == nil {
		runs = []QueryRun{}
	}

	// Update status of non-final queries
	for i, run := range runs {
		if run.Status == "RUNNING" || run.Status == "QUEUED" {
			updatedRun, err := updateQueryRunStatus(ctx, collection, run)
			if err == nil {
				runs[i] = updatedRun
			}
		}
	}

	c.JSON(http.StatusOK, runs)
}

func executeQuery(c *gin.Context) {
	queryID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query ID"})
		return
	}

	var req ExecuteQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Substitute parameters in SQL
	finalSQL := substituteParameters(req.SQL, req.Parameters)
    c.JSON(http.StatusBadRequest, gin.H{"finalSQL": finalSQL})

	// Execute the query through Athena
	executionID, err := executeAthenaQueryInternal(finalSQL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create query run record
	queryRun := QueryRun{
		QueryID:     queryID,
		SQL:         req.SQL,
		ExecutionID: executionID,
		Status:      "QUEUED",
		Parameters:  req.Parameters,
		ExecutedAt:  time.Now(),
	}

	ctx := context.Background()
	collection := db.Collection("queryruns")

	result, err := collection.InsertOne(ctx, queryRun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	queryRun.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, queryRun)
}

func deleteQueryRun(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query run ID"})
		return
	}

	ctx := context.Background()
	collection := db.Collection("queryruns")

	result, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Query run not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Query run deleted successfully"})
}

// Athena handlers
func executeAthenaQuery(c *gin.Context) {
	var req ExecuteQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Substitute parameters in SQL  
	finalSQL := substituteParameters(req.SQL, req.Parameters)

	executionID, err := executeAthenaQueryInternal(finalSQL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"executionId": executionID})
}

func getQueryResults(c *gin.Context) {
	executionID := c.Param("executionId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))

	results, err := getAthenaResults(executionID, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Find the QueryRun record to get completion timestamp
	ctx := context.Background()
	collection := db.Collection("queryruns")
	var queryRun QueryRun
	err = collection.FindOne(ctx, bson.M{"executionId": executionID}).Decode(&queryRun)
	if err == nil && queryRun.CompletedAt != nil {
		results.CompletedAt = queryRun.CompletedAt
	}

	c.JSON(http.StatusOK, results)
}

func exportResults(c *gin.Context) {
	executionID := c.Param("executionId")

	// Get the results S3 URL and proxy the file
	s3URL, err := getResultsS3URL(executionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Set headers for CSV download
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=query_results.csv")

	// Proxy the S3 file to the client
	err = proxyS3File(c, s3URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
}

func getAthenaCatalog(c *gin.Context) {
	catalog, err := fetchAthenaCatalog()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, catalog)
}


// Helper function to update query run status by checking Athena
func updateQueryRunStatus(ctx context.Context, collection *mongo.Collection, run QueryRun) (QueryRun, error) {
	// Get current status from Athena
	results, err := getAthenaResults(run.ExecutionID, 1, 1)
	if err != nil {
		return run, err
	}

	// Only update if status changed
	if results.Status != run.Status {
		now := time.Now()
		update := bson.M{
			"$set": bson.M{
				"status": results.Status,
			},
		}

		// Set completion time and error message if applicable
		if results.Status == "SUCCEEDED" || results.Status == "FAILED" || results.Status == "CANCELLED" {
			update["$set"].(bson.M)["completedAt"] = now
			
			// Get S3 URL for successful queries
			if results.Status == "SUCCEEDED" {
				s3URL, err := getResultsS3URL(run.ExecutionID)
				if err == nil {
					update["$set"].(bson.M)["resultsS3Url"] = s3URL
				}
			}
			
			// Set error message for failed queries
			if results.Status == "FAILED" && results.ErrorMessage != nil {
				update["$set"].(bson.M)["errorMessage"] = *results.ErrorMessage
			}
		}

		_, err := collection.UpdateOne(ctx, bson.M{"_id": run.ID}, update)
		if err != nil {
			return run, err
		}

		// Update the run object with new values
		run.Status = results.Status
		if results.Status == "SUCCEEDED" || results.Status == "FAILED" || results.Status == "CANCELLED" {
			run.CompletedAt = &now
		}
		if results.Status == "SUCCEEDED" {
			s3URL, err := getResultsS3URL(run.ExecutionID)
			if err == nil {
				run.ResultsS3URL = s3URL
			}
		}
		if results.Status == "FAILED" && results.ErrorMessage != nil {
			run.ErrorMessage = *results.ErrorMessage
		}
	}

	return run, nil
}