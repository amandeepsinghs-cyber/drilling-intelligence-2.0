"""adapters.gcp.tabular_bigquery — BigQuery dataset drilling_intel adapter (SDD §4.2, §5.4).

Provides low-latency queries over Google BigQuery for Cloud Run and production deployments.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd
from google.cloud import bigquery

from app.core.config import get_settings


class BigQueryTabularAdapter:
    def __init__(self, project_id: str | None = None, dataset_id: str = "drilling_intel", location: str = "asia-south1"):
        s = get_settings()
        self.project_id = project_id or s.project_id or os.getenv("DI_PROJECT_ID", "drilling-intelligence-2-509714")
        self.dataset_id = dataset_id
        self.location = location
        self._client: bigquery.Client | None = None

    @property
    def client(self) -> bigquery.Client:
        if self._client is None:
            self._client = bigquery.Client(project=self.project_id, location=self.location)
        return self._client

    def fetch_frames_dataframe(
        self,
        table_name: str = "depth_frames",
        md_from: float | None = None,
        md_to: float | None = None,
    ) -> pd.DataFrame:
        """Fetch depth frames from BigQuery with optional depth window filtering."""
        where_clauses = []
        if md_from is not None:
            where_clauses.append(f"md_m >= {float(md_from)}")
        if md_to is not None:
            where_clauses.append(f"md_m <= {float(md_to)}")

        where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"""
            SELECT *
            FROM `{self.project_id}.{self.dataset_id}.{table_name}`
            {where_str}
            ORDER BY md_m ASC
        """
        job_config = bigquery.QueryJobConfig(labels={"datacloud": "jetski"})
        return self.client.query(query, job_config=job_config).to_dataframe()

    def fetch_columnar(
        self,
        md_from: float | None = None,
        md_to: float | None = None,
        step: int = 1,
    ) -> dict[str, Any]:
        """Fetch BigQuery table and format as columnar payload matching frontend contract."""
        df = self.fetch_frames_dataframe("depth_frames", md_from, md_to)
        if step > 1:
            df = df.iloc[::step]

        # Convert BigQuery column names (e.g. 'curves_GR') back to contract dotted names ('curves.GR')
        cols: dict[str, list] = {}
        for c in df.columns:
            if c == "md_m":
                continue
            dotted = c
            for prefix in ("curves_", "drilling_", "mudlog_", "mud_", "derived_", "overlays_", "trend_", "ghost_"):
                if c.startswith(prefix):
                    dotted = prefix.rstrip("_") + "." + c[len(prefix):]
                    break
            if c.startswith("ml_litho_probs_"):
                dotted = "ml.litho.probs." + c[len("ml_litho_probs_"):]
            elif c.startswith("ml_"):
                dotted = "ml." + c[len("ml_"):]

            cols[dotted] = [None if pd.isna(v) else round(float(v), 4) if isinstance(v, (float, np.floating)) else v for v in df[c]]

        return {
            "well_id": "MN-SM-DW-01",
            "source": "bigquery",
            "md_m": [float(x) for x in df["md_m"]],
            "columns": cols,
        }

    def fetch_window(self, current_depth: float, window_m: float = 100.0) -> pd.DataFrame:
        """Fetch depth slice for near-bit window (SDD §5.4)."""
        return self.fetch_frames_dataframe(
            "depth_frames",
            md_from=current_depth - window_m,
            md_to=current_depth,
        )


@lru_cache
def get_bq_adapter() -> BigQueryTabularAdapter:
    return BigQueryTabularAdapter()
