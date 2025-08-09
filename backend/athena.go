package main

import (
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/athena"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/gin-gonic/gin"
)

var athenaClient *athena.Athena
var s3Client *s3.S3
var athenaResultsBucket string

func init() {
	// Create AWS session using default profile credentials
	region := os.Getenv("AWS_DEFAULT_REGION")
	if region == "" {
		region = "us-east-1" // Default region
	}

	// Get configurable S3 bucket name
	athenaResultsBucket = os.Getenv("ATHENA_RESULTS_BUCKET")
	if athenaResultsBucket == "" {
		panic("ATHENA_RESULTS_BUCKET environment variable must be set")
	}

	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(region),
	})
	if err != nil {
		panic(fmt.Sprintf("Failed to create AWS session: %v", err))
	}

	athenaClient = athena.New(sess)
	s3Client = s3.New(sess)
}

func executeAthenaQueryInternal(sql string) (string, error) {
	// Start query execution
	input := &athena.StartQueryExecutionInput{
		QueryString: aws.String(sql),
		ResultConfiguration: &athena.ResultConfiguration{
			OutputLocation: aws.String(fmt.Sprintf("s3://%s/", athenaResultsBucket)),
		},
		WorkGroup: aws.String("primary"),
	}

	result, err := athenaClient.StartQueryExecution(input)
	if err != nil {
		return "", fmt.Errorf("failed to start query execution: %v", err)
	}

	return *result.QueryExecutionId, nil
}

func getAthenaResults(executionID string, page, size int) (*QueryResults, error) {
	// Get query execution status
	describeInput := &athena.GetQueryExecutionInput{
		QueryExecutionId: aws.String(executionID),
	}

	describeResult, err := athenaClient.GetQueryExecution(describeInput)
	if err != nil {
		return nil, fmt.Errorf("failed to get query execution: %v", err)
	}

	status := *describeResult.QueryExecution.Status.State
	fmt.Printf("Query %s status: %s\n", executionID, status)
	
	// If query is not yet complete, return status information without error
	if status != "SUCCEEDED" {
		errorMessage := ""
		if describeResult.QueryExecution.Status.StateChangeReason != nil {
			errorMessage = *describeResult.QueryExecution.Status.StateChangeReason
		}
		
		result := &QueryResults{
			Columns: []string{},
			Rows:    [][]string{},
			Total:   0,
			Page:    page,
			Size:    size,
			Status:  status,
		}
		
		if errorMessage != "" {
			result.ErrorMessage = &errorMessage
		}
		
		return result, nil
	}

	// Get results
	resultsInput := &athena.GetQueryResultsInput{
		QueryExecutionId: aws.String(executionID),
		MaxResults:       aws.Int64(int64(size)),
	}

	// Calculate offset for pagination
	offset := (page - 1) * size
	if offset > 0 {
		// For pagination, we'd need to handle NextToken properly
		// This is a simplified implementation
	}

	resultsOutput, err := athenaClient.GetQueryResults(resultsInput)
	if err != nil {
		return nil, fmt.Errorf("failed to get query results: %v", err)
	}

	// Parse results
	var columns []string
	var rows [][]string

	if len(resultsOutput.ResultSet.Rows) > 0 {
		// First row contains column headers
		headerRow := resultsOutput.ResultSet.Rows[0]
		for _, col := range headerRow.Data {
			if col.VarCharValue != nil {
				columns = append(columns, *col.VarCharValue)
			}
		}

		// Remaining rows contain data
		for i := 1; i < len(resultsOutput.ResultSet.Rows); i++ {
			row := resultsOutput.ResultSet.Rows[i]
			var dataRow []string
			for _, col := range row.Data {
				value := ""
				if col.VarCharValue != nil {
					value = *col.VarCharValue
				}
				dataRow = append(dataRow, value)
			}
			rows = append(rows, dataRow)
		}
	}

	return &QueryResults{
		Columns: columns,
		Rows:    rows,
		Total:   int64(len(rows)),
		Page:    page,
		Size:    size,
		Status:  status,
	}, nil
}


func getResultsS3URL(executionID string) (string, error) {
	// Get query execution details
	describeInput := &athena.GetQueryExecutionInput{
		QueryExecutionId: aws.String(executionID),
	}

	result, err := athenaClient.GetQueryExecution(describeInput)
	if err != nil {
		return "", fmt.Errorf("failed to get query execution: %v", err)
	}

	if result.QueryExecution.ResultConfiguration.OutputLocation == nil {
		return "", fmt.Errorf("no output location found")
	}

	return *result.QueryExecution.ResultConfiguration.OutputLocation, nil
}

func proxyS3File(c *gin.Context, s3URL string) error {
	// Parse S3 URL
	parts := strings.Split(strings.TrimPrefix(s3URL, "s3://"), "/")
	if len(parts) < 2 {
		return fmt.Errorf("invalid S3 URL")
	}

	bucket := parts[0]
	key := strings.Join(parts[1:], "/")

	// Get object from S3
	input := &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}

	result, err := s3Client.GetObject(input)
	if err != nil {
		return fmt.Errorf("failed to get S3 object: %v", err)
	}
	defer result.Body.Close()

	// Stream the file to the client
	_, err = io.Copy(c.Writer, result.Body)
	return err
}

func fetchAthenaCatalog() (*AthenaCatalog, error) {
	var databases []CatalogDatabase
	
	// For now, let's focus on the default 'AwsDataCatalog'
	// In a production environment, you'd iterate through all catalogs
	catalogName := "AwsDataCatalog"
	
	// List databases in the default catalog
	listDatabasesInput := &athena.ListDatabasesInput{
		CatalogName: &catalogName,
	}
	
	databasesResult, err := athenaClient.ListDatabases(listDatabasesInput)
	if err != nil {
		return nil, fmt.Errorf("failed to list databases: %v", err)
	}

	for _, db := range databasesResult.DatabaseList {
		database := CatalogDatabase{
			Name:        *db.Name,
			Description: "",
			Tables:      []CatalogTable{},
		}
		
		if db.Description != nil {
			database.Description = *db.Description
		}

		// List tables in the database
		listTablesInput := &athena.ListTableMetadataInput{
			CatalogName:  &catalogName,
			DatabaseName: db.Name,
		}
		
		tablesResult, err := athenaClient.ListTableMetadata(listTablesInput)
		if err != nil {
			// Continue even if we can't list tables for this database
			databases = append(databases, database)
			continue
		}

		for _, table := range tablesResult.TableMetadataList {
			catalogTable := CatalogTable{
				Name:    *table.Name,
				Type:    "",
				Columns: []Column{},
			}
			
			if table.TableType != nil {
				catalogTable.Type = *table.TableType
			}
			
			if table.Parameters != nil {
				if location, ok := table.Parameters["location"]; ok && location != nil {
					catalogTable.Location = *location
				}
				if inputFormat, ok := table.Parameters["inputformat"]; ok && inputFormat != nil {
					catalogTable.InputFormat = *inputFormat
				}
			}

			// Add columns
			for _, col := range table.Columns {
				column := Column{
					Name: *col.Name,
					Type: *col.Type,
				}
				catalogTable.Columns = append(catalogTable.Columns, column)
			}

			database.Tables = append(database.Tables, catalogTable)
		}

		databases = append(databases, database)
	}

	return &AthenaCatalog{
		Databases: databases,
	}, nil
}

