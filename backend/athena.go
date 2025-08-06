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
	if status != "SUCCEEDED" {
		errorReason := ""
		if describeResult.QueryExecution.Status.StateChangeReason != nil {
			errorReason = *describeResult.QueryExecution.Status.StateChangeReason
		}
		return nil, fmt.Errorf("query execution failed or not completed. Status: %s, Reason: %s", status, errorReason)
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

