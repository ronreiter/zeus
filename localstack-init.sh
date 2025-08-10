#!/bin/bash

echo "Initializing LocalStack for Zeus..."

# Wait for LocalStack to be ready
until curl -s http://localhost:4566/_localstack/health | grep -q '"athena": "available"'; do
  echo "Waiting for LocalStack Athena service..."
  sleep 2
done

echo "LocalStack is ready!"

# Get bucket name from environment variable, default to zeus-athena-results
BUCKET_NAME=${ATHENA_RESULTS_BUCKET:-zeus-athena-results}

# Create S3 bucket for Athena results
aws --endpoint-url=http://localhost:4566 s3 mb s3://$BUCKET_NAME --region us-east-1

# Create a sample database and table (using Glue)
aws --endpoint-url=http://localhost:4566 glue create-database \
  --database-input Name=sample_db \
  --region us-east-1

# Create a sample table
aws --endpoint-url=http://localhost:4566 glue create-table \
  --database-name sample_db \
  --table-input '{
    "Name": "users",
    "StorageDescriptor": {
      "Columns": [
        {"Name": "id", "Type": "bigint"},
        {"Name": "name", "Type": "string"},
        {"Name": "email", "Type": "string"},
        {"Name": "created_at", "Type": "timestamp"}
      ],
      "Location": "s3://zeus-sample-data/users/",
      "InputFormat": "org.apache.hadoop.mapred.TextInputFormat",
      "OutputFormat": "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
      "SerdeInfo": {
        "SerializationLibrary": "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
        "Parameters": {
          "field.delim": ","
        }
      }
    }
  }' \
  --region us-east-1

echo "LocalStack initialization complete!"