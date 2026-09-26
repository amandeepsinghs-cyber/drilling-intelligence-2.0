terraform {
  required_version = ">= 1.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enterprise Upstream Oil & Gas Data Lakehouse (GCS, BigLake, BigQuery, Dataplex)
module "data" {
  source      = "./modules/data"
  project_id  = var.project_id
  region      = var.region
  lake_prefix = "sagar-drishti"
}

# IAM & Service Accounts (Phase 7)
# module "iam" { source = "./modules/iam" project_id = var.project_id }

# Cloud Run Services: Backend API & Static Frontend (Phase 7)
# module "cloud_run" { source = "./modules/cloud_run" project_id = var.project_id region = var.region }
