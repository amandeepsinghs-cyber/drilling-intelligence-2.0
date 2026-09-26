/**
 * Upstream Oil & Gas Data Lakehouse Architecture on Google Cloud (SDD §4.2, §5.4).
 *
 * Implements an Enterprise E&P Medallion Lakehouse covering:
 * - Unstructured Data: Raw WCR PDFs, Daily Drilling Reports (DDRs), SOPs, BHA tally sheets.
 * - Specialized O&G Binaries: RP66 DLIS wireline/LWD files, LAS 2.0/3.0 ASCII logs, WITSML logs.
 * - BigLake Object Tables: Exposes raw PDFs/DLIS directly to BigQuery SQL + Gemini Multimodal.
 * - Curated Analytics: Partitioned & clustered BigQuery tables for LWD, mud logging, and chemistry.
 * - Dataplex Governance: Universal catalog, data quality scanning, and lineage across assets.
 * - Vector Knowledge Store: RAG chunks and embeddings repository.
 */

# ─────────────────────────────────────────────────────────────────────────────
# 1. CLOUD STORAGE BUCKETS (MEDALLION ARCHITECTURE)
# ─────────────────────────────────────────────────────────────────────────────

# Bronze / Raw Lake: Immutable vault for all original well files
resource "google_storage_bucket" "lake_raw" {
  name                        = "${var.lake_prefix}-raw-${var.project_id}"
  location                    = var.region
  storage_class               = var.storage_class
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 90 # Move cold raw logs to Nearline after 90 days
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 365 # Move to Coldline after 1 year
    }
  }

  labels = {
    domain     = "exploration-production"
    tier       = "bronze-raw"
    governance = "immutable-archive"
  }
}

# Standard O&G raw lake folder structure
resource "google_storage_bucket_object" "folder_dlis" {
  name    = "dlis/"
  content = " "
  bucket  = google_storage_bucket.lake_raw.name
}

resource "google_storage_bucket_object" "folder_las" {
  name    = "las/"
  content = " "
  bucket  = google_storage_bucket.lake_raw.name
}

resource "google_storage_bucket_object" "folder_wcr" {
  name    = "wcr_pdf/"
  content = " "
  bucket  = google_storage_bucket.lake_raw.name
}

resource "google_storage_bucket_object" "folder_ddr" {
  name    = "ddr_reports/"
  content = " "
  bucket  = google_storage_bucket.lake_raw.name
}

resource "google_storage_bucket_object" "folder_sops" {
  name    = "sops/"
  content = " "
  bucket  = google_storage_bucket.lake_raw.name
}

resource "google_storage_bucket_object" "folder_incidents" {
  name    = "incidents/"
  content = " "
  bucket  = google_storage_bucket.lake_raw.name
}

# Silver / Processed Lake: Standardized Parquet curves & OCR extracted markdown
resource "google_storage_bucket" "lake_processed" {
  name                        = "${var.lake_prefix}-processed-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  labels = {
    domain = "exploration-production"
    tier   = "silver-processed"
  }
}

# Gold / Curated Lakehouse: Unified BigLake tables & ML feature store
resource "google_storage_bucket" "lake_curated" {
  name                        = "${var.lake_prefix}-curated-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  labels = {
    domain = "exploration-production"
    tier   = "gold-curated"
  }
}

# Knowledge & Vector Store: RAG corpus, chunk metadata & embeddings
resource "google_storage_bucket" "lake_knowledge" {
  name                        = "${var.lake_prefix}-knowledge-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  labels = {
    domain = "exploration-production"
    tier   = "rag-knowledge"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. BIGQUERY BIGLAKE CONNECTION & PERMISSIONS
# ─────────────────────────────────────────────────────────────────────────────

# Cloud Resource connection enabling BigLake to query Cloud Storage
resource "google_bigquery_connection" "lake_connection" {
  connection_id = "lakehouse-biglake-conn"
  project       = var.project_id
  location      = var.region
  description   = "BigLake connection for querying GCS DLIS, LAS, Parquet and PDF Object Tables"

  cloud_resource {}
}

# Grant BigLake service account read access to raw, processed, and curated buckets
resource "google_storage_bucket_iam_member" "lake_raw_reader" {
  bucket = google_storage_bucket.lake_raw.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_bigquery_connection.lake_connection.cloud_resource[0].service_account_id}"
}

resource "google_storage_bucket_iam_member" "lake_processed_reader" {
  bucket = google_storage_bucket.lake_processed.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_bigquery_connection.lake_connection.cloud_resource[0].service_account_id}"
}

resource "google_storage_bucket_iam_member" "lake_curated_reader" {
  bucket = google_storage_bucket.lake_curated.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_bigquery_connection.lake_connection.cloud_resource[0].service_account_id}"
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. BIGQUERY DRILLING DATASET & TABLES
# ─────────────────────────────────────────────────────────────────────────────

resource "google_bigquery_dataset" "drilling_intel" {
  dataset_id                  = "drilling_intel"
  project                     = var.project_id
  friendly_name               = "Drilling Intelligence 2.0 Lakehouse"
  description                 = "Analytical and serving dataset for Sagar Drishti AI well operations"
  location                    = var.region
  default_table_expiration_ms = null

  labels = {
    env    = "production"
    domain = "energy-ep"
  }
}

# BigLake Object Table for WCR & DDR PDFs:
# Allows SQL users and Gemini Multimodal models to directly analyze scanned PDFs in SQL!
resource "google_bigquery_table" "obj_wcr_pdfs" {
  dataset_id          = google_bigquery_dataset.drilling_intel.dataset_id
  table_id            = "obj_wcr_pdfs"
  deletion_protection = false

  external_data_configuration {
    autodetect      = false
    connection_id   = google_bigquery_connection.lake_connection.name
    source_uris     = ["gs://${google_storage_bucket.lake_raw.name}/wcr_pdf/*"]
    object_metadata = "DIRECTORY"
  }
}

# BigLake Object Table for Raw DLIS Binary Files:
# Catalog of all raw wireline / LWD binary runs with metadata
resource "google_bigquery_table" "obj_dlis_files" {
  dataset_id          = google_bigquery_dataset.drilling_intel.dataset_id
  table_id            = "obj_dlis_files"
  deletion_protection = false

  external_data_configuration {
    autodetect      = false
    connection_id   = google_bigquery_connection.lake_connection.name
    source_uris     = ["gs://${google_storage_bucket.lake_raw.name}/dlis/*"]
    object_metadata = "DIRECTORY"
  }
}

# Curated LWD Petrophysical Logs Table (depth-indexed)
resource "google_bigquery_table" "tbl_lwd_logs" {
  dataset_id          = google_bigquery_dataset.drilling_intel.dataset_id
  table_id            = "lwd_logs"
  deletion_protection = false

  clustering = ["well_id", "hole_section"]

  schema = jsonencode([
    { "name" : "well_id", "type" : "STRING", "mode" : "REQUIRED", "description" : "Unique well identifier e.g. MN-SM-DW-01" },
    { "name" : "hole_section", "type" : "STRING", "mode" : "NULLABLE", "description" : "Hole size e.g. 12.25 in" },
    { "name" : "md_m", "type" : "FLOAT", "mode" : "REQUIRED", "description" : "Measured depth in meters" },
    { "name" : "tvd_m", "type" : "FLOAT", "mode" : "REQUIRED", "description" : "True vertical depth in meters" },
    { "name" : "gr_api", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Gamma Ray in GAPI" },
    { "name" : "rdep_ohmm", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Deep resistivity in ohm-m" },
    { "name" : "rmed_ohmm", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Medium resistivity in ohm-m" },
    { "name" : "rhob_gcc", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Bulk density in g/cm3" },
    { "name" : "nphi_dec", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Neutron porosity decimal" },
    { "name" : "dt_us_ft", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Compressional acoustic transit time in us/ft" },
    { "name" : "pef_barns", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Photoelectric factor in barns/e-" },
    { "name" : "cali_in", "type" : "FLOAT", "mode" : "NULLABLE", "description" : "Caliper borehole diameter in inches" },
    { "name" : "provenance", "type" : "STRING", "mode" : "REQUIRED", "description" : "PUBLIC | SYNTHETIC | SIMULATED" }
  ])
}

# Curated Drilling Mechanics & Mudlog Table
resource "google_bigquery_table" "tbl_drilling_mudlog" {
  dataset_id          = google_bigquery_dataset.drilling_intel.dataset_id
  table_id            = "drilling_mudlog"
  deletion_protection = false

  clustering = ["well_id"]

  schema = jsonencode([
    { "name" : "well_id", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "md_m", "type" : "FLOAT", "mode" : "REQUIRED" },
    { "name" : "timestamp_utc", "type" : "TIMESTAMP", "mode" : "NULLABLE" },
    { "name" : "rop_m_hr", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "wob_klb", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "rpm", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "torque_kft_lb", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "spp_psi", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "flow_in_gpm", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "flow_out_pct", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "total_gas_pct", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "conn_gas_pct", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "c1_ppm", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "c2_ppm", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "dxc", "type" : "FLOAT", "mode" : "NULLABLE" }
  ])
}

# Curated Mud Chemistry Table
resource "google_bigquery_table" "tbl_mud_chemistry" {
  dataset_id          = google_bigquery_dataset.drilling_intel.dataset_id
  table_id            = "mud_chemistry"
  deletion_protection = false

  schema = jsonencode([
    { "name" : "well_id", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "md_m", "type" : "FLOAT", "mode" : "REQUIRED" },
    { "name" : "mud_type", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "mw_in_ppg", "type" : "FLOAT", "mode" : "REQUIRED" },
    { "name" : "mw_out_ppg", "type" : "FLOAT", "mode" : "REQUIRED" },
    { "name" : "pv_cp", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "yp_lb_100ft2", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "chlorides_mg_l", "type" : "FLOAT", "mode" : "NULLABLE" },
    { "name" : "active_vol_bbl", "type" : "FLOAT", "mode" : "NULLABLE" }
  ])
}

# Decision Ledger Table (Immutable MOC Approvals & Dispatch Audits)
resource "google_bigquery_table" "tbl_decision_ledger" {
  dataset_id          = google_bigquery_dataset.drilling_intel.dataset_id
  table_id            = "decision_ledger"
  deletion_protection = false

  clustering = ["well_id", "kind"]

  schema = jsonencode([
    { "name" : "entry_id", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "well_id", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "timestamp_utc", "type" : "TIMESTAMP", "mode" : "REQUIRED" },
    { "name" : "kind", "type" : "STRING", "mode" : "REQUIRED", "description" : "TRIGGER | MEMO | APPROVAL | DISPATCH | ROP_CAP" },
    { "name" : "md_m", "type" : "FLOAT", "mode" : "REQUIRED" },
    { "name" : "title", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "actor", "type" : "STRING", "mode" : "REQUIRED" },
    { "name" : "basis_snapshot_json", "type" : "STRING", "mode" : "NULLABLE" },
    { "name" : "citations", "type" : "STRING", "mode" : "REPEATED" },
    { "name" : "status", "type" : "STRING", "mode" : "NULLABLE" }
  ])
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. DATAPLEX GOVERNANCE & METADATA LAKE
# ─────────────────────────────────────────────────────────────────────────────

resource "google_dataplex_lake" "drilling_lake" {
  name         = "ongc-drilling-lake"
  project      = var.project_id
  location     = var.region
  display_name = "ONGC Upstream Drilling Data Lake"
  description  = "Governance, schema harvesting, and quality monitoring for well logs, WCRs, and DDRs"

  labels = {
    organization = "ongc"
    campaign     = "samudra-manthan"
  }
}

resource "google_dataplex_zone" "raw_zone" {
  name         = "raw-unstructured-zone"
  project      = var.project_id
  location     = var.region
  lake         = google_dataplex_lake.drilling_lake.name
  type         = "RAW"
  display_name = "Raw Unstructured Well Vault"

  resource_spec {
    location_type = "SINGLE_REGION"
  }

  discovery_spec {
    enabled = true
  }
}

resource "google_dataplex_asset" "raw_bucket_asset" {
  name          = "raw-gcs-asset"
  project       = var.project_id
  location      = var.region
  lake          = google_dataplex_lake.drilling_lake.name
  dataplex_zone = google_dataplex_zone.raw_zone.name
  display_name  = "Raw Well Logs & Reports Bucket"

  resource_spec {
    name = "projects/${var.project_id}/buckets/${google_storage_bucket.lake_raw.name}"
    type = "STORAGE_BUCKET"
  }

  discovery_spec {
    enabled  = true
    schedule = "0 2 * * *" # Daily discovery scan at 2 AM
  }
}

resource "google_dataplex_zone" "curated_zone" {
  name         = "curated-analytics-zone"
  project      = var.project_id
  location     = var.region
  lake         = google_dataplex_lake.drilling_lake.name
  type         = "CURATED"
  display_name = "Curated BigLake Petrophysics Zone"

  resource_spec {
    location_type = "SINGLE_REGION"
  }

  discovery_spec {
    enabled = true
  }
}

resource "google_dataplex_asset" "curated_bq_asset" {
  name          = "curated-bq-dataset-asset"
  project       = var.project_id
  location      = var.region
  lake          = google_dataplex_lake.drilling_lake.name
  dataplex_zone = google_dataplex_zone.curated_zone.name
  display_name  = "Drilling Intel Dataset Asset"

  resource_spec {
    name = "projects/${var.project_id}/datasets/${google_bigquery_dataset.drilling_intel.dataset_id}"
    type = "BIGQUERY_DATASET"
  }

  discovery_spec {
    enabled = true
  }
}
