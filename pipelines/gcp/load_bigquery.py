"""pipelines.gcp.load_bigquery — processed Parquet -> BigQuery drilling_intel.* (SDD §5.4, §16).

Transforms dotted column names ('curves.GR' -> 'curves_GR') to BigQuery-compliant schemas
and loads the analytical tables with mandatory attribution labels.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd
from google.cloud import bigquery

REPO_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = REPO_ROOT / "data" / "processed"

PROJECT_ID = os.getenv("DI_PROJECT_ID", "drilling-intelligence-2-509714")
DATASET_ID = os.getenv("DI_DATASET_ID", "drilling_intel")
LOCATION = os.getenv("DI_REGION", "asia-south1")


def sanitize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Replace dots and slashes with underscores for BigQuery compatibility."""
    clean_cols = {c: c.replace(".", "_").replace("/", "_").replace("-", "_") for c in df.columns}
    return df.rename(columns=clean_cols)


def load_parquet_to_bigquery(
    client: bigquery.Client,
    parquet_path: Path,
    table_id: str,
    write_disposition: str = "WRITE_TRUNCATE",
) -> int:
    """Load a Parquet file to BigQuery table with schema sanitation and labeling."""
    df = pd.read_parquet(parquet_path)
    df_clean = sanitize_columns(df)

    full_table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_id}"
    job_config = bigquery.LoadJobConfig(
        write_disposition=write_disposition,
        labels={"datacloud": "jetski"},
    )

    print(f"Loading {len(df_clean)} rows from {parquet_path.name} to {full_table_id}...")
    job = client.load_table_from_dataframe(df_clean, full_table_id, job_config=job_config)
    job.result()  # Wait for completion

    table = client.get_table(full_table_id)
    print(f"✓ Table {table.table_id} loaded successfully: {table.num_rows} rows.")
    return table.num_rows


def main() -> None:
    client = bigquery.Client(project=PROJECT_ID, location=LOCATION)

    # 1. Load depth_frames
    df_path = PROCESSED_DIR / "depth_frames" / "mn_sm_dw_01.parquet"
    if df_path.exists():
        load_parquet_to_bigquery(client, df_path, "depth_frames")

    # 2. Load lwd
    lwd_path = PROCESSED_DIR / "lwd" / "mn_sm_dw_01.parquet"
    if lwd_path.exists():
        load_parquet_to_bigquery(client, lwd_path, "lwd_logs")

    # 3. Load mudlog
    mudlog_path = PROCESSED_DIR / "mudlog" / "mn_sm_dw_01.parquet"
    if mudlog_path.exists():
        load_parquet_to_bigquery(client, mudlog_path, "drilling_mudlog")

    # 4. Load mud_chemistry
    chem_path = PROCESSED_DIR / "mud_chemistry" / "mn_sm_dw_01.parquet"
    if chem_path.exists():
        load_parquet_to_bigquery(client, chem_path, "mud_chemistry")

    print("\n✓ BigQuery lakehouse load complete!")


if __name__ == "__main__":
    main()
