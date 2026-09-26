output "lakehouse_raw_bucket" {
  description = "GCS Raw Lake bucket for DLIS, LAS, PDF WCRs, and DDR reports"
  value       = module.data.bucket_raw
}

output "lakehouse_processed_bucket" {
  description = "GCS Processed Lake bucket for standardized Parquet and OCR markdown"
  value       = module.data.bucket_processed
}

output "lakehouse_curated_bucket" {
  description = "GCS Curated Lake bucket for BigLake Iceberg depth frames"
  value       = module.data.bucket_curated
}

output "lakehouse_knowledge_bucket" {
  description = "GCS Knowledge Lake bucket for RAG vector embeddings"
  value       = module.data.bucket_knowledge
}

output "bigquery_drilling_dataset" {
  description = "BigQuery dataset ID"
  value       = module.data.bigquery_dataset_id
}

output "biglake_connection" {
  description = "BigLake connection ID for multi-modal SQL on raw files"
  value       = module.data.biglake_connection_id
}
