output "bucket_raw" {
  description = "Name of the Bronze Raw GCS bucket"
  value       = google_storage_bucket.lake_raw.name
}

output "bucket_processed" {
  description = "Name of the Silver Processed GCS bucket"
  value       = google_storage_bucket.lake_processed.name
}

output "bucket_curated" {
  description = "Name of the Gold Curated GCS bucket"
  value       = google_storage_bucket.lake_curated.name
}

output "bucket_knowledge" {
  description = "Name of the RAG Knowledge GCS bucket"
  value       = google_storage_bucket.lake_knowledge.name
}

output "bigquery_dataset_id" {
  description = "BigQuery dataset ID for drilling intelligence"
  value       = google_bigquery_dataset.drilling_intel.dataset_id
}

output "biglake_connection_id" {
  description = "BigLake connection ID for querying GCS external object tables"
  value       = google_bigquery_connection.lake_connection.name
}

output "dataplex_lake_name" {
  description = "Dataplex governance lake name"
  value       = google_dataplex_lake.drilling_lake.name
}
