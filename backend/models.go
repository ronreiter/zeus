package main

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Query struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	SQL         string             `bson:"sql" json:"sql"`
	Description string             `bson:"description" json:"description"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type QueryRun struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	QueryID      primitive.ObjectID `bson:"queryId" json:"queryId"`
	SQL          string             `bson:"sql" json:"sql"`
	ExecutionID  string             `bson:"executionId" json:"executionId"`
	Status       string             `bson:"status" json:"status"` // QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
	ResultsS3URL string             `bson:"resultsS3Url" json:"resultsS3Url"`
	ErrorMessage string             `bson:"errorMessage,omitempty" json:"errorMessage,omitempty"`
	Parameters   map[string]string  `bson:"parameters,omitempty" json:"parameters,omitempty"`
	ExecutedAt   time.Time          `bson:"executedAt" json:"executedAt"`
	CompletedAt  *time.Time         `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
}

type CreateQueryRequest struct {
	Name        string `json:"name" binding:"required"`
	SQL         string `json:"sql"`
	Description string `json:"description"`
}

type UpdateQueryRequest struct {
	Name        string `json:"name"`
	SQL         string `json:"sql"`
	Description string `json:"description"`
}

type ExecuteQueryRequest struct {
	SQL        string            `json:"sql" binding:"required"`
	Parameters map[string]string `json:"parameters,omitempty"`
}

type QueryResults struct {
	Columns      []string   `json:"columns"`
	Rows         [][]string `json:"rows"`
	Total        int64      `json:"total"`
	Page         int        `json:"page"`
	Size         int        `json:"size"`
	Status       string     `json:"status"` // QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
	ErrorMessage *string    `json:"errorMessage,omitempty"`
	CompletedAt  *time.Time `json:"completedAt,omitempty"`
}

type CatalogTable struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Columns     []Column `json:"columns"`
	Location    string   `json:"location,omitempty"`
	InputFormat string   `json:"inputFormat,omitempty"`
}

type Column struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type CatalogDatabase struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Tables      []CatalogTable `json:"tables"`
}

type AthenaCatalog struct {
	Databases []CatalogDatabase `json:"databases"`
}
