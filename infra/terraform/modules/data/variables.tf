variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP Region for analytics and storage"
  type        = string
  default     = "asia-south1"
}

variable "lake_prefix" {
  description = "Naming prefix for data lake buckets and resources"
  type        = string
  default     = "sagar-drishti"
}

variable "storage_class" {
  description = "Default storage class for lakehouse raw files"
  type        = string
  default     = "STANDARD"
}

variable "retention_days_raw" {
  description = "Retention period for immutable raw drilling files (DLIS, LAS, PDF WCRs)"
  type        = number
  default     = 2555 # 7 years regulatory retention standard for E&P well data
}
