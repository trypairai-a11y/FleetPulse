"""
Storage service abstraction supporting S3 and local file storage.

Auto-detects mode based on settings.S3_ENDPOINT:
  - If set: uses boto3 to interact with S3-compatible object storage.
  - If not set: stores files under backend/uploads/ and returns /uploads/... paths.

Path convention: {tenant_id}/{type}/{entity_id}/{filename}
"""

import asyncio
import os
from functools import partial
from pathlib import Path
from typing import Optional

from app.config import settings

# Resolve the uploads directory relative to this file:
# backend/app/services/storage_service.py -> backend/uploads/
_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"


class StorageService:
    """
    Unified storage abstraction.

    S3 mode  : requires boto3; generates presigned GET URLs.
    Local mode: writes to <backend>/uploads/; returns /uploads/<path> URLs.
    """

    def __init__(self) -> None:
        self._use_s3: bool = bool(settings.S3_ENDPOINT)

        if self._use_s3:
            import boto3  # type: ignore[import]

            self._s3_client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT,
                aws_access_key_id=settings.S3_ACCESS_KEY,
                aws_secret_access_key=settings.S3_SECRET_KEY,
                region_name=settings.S3_REGION,
            )
            self._bucket: str = settings.S3_BUCKET
        else:
            self._s3_client = None  # type: ignore[assignment]
            self._bucket = ""
            _UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def upload(
        self,
        file_bytes: bytes,
        path: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Upload *file_bytes* to *path* and return the stored path.

        Parameters
        ----------
        file_bytes:   raw bytes to store
        path:         storage key, e.g. ``{tenant_id}/{type}/{entity_id}/{filename}``
        content_type: MIME type of the file

        Returns
        -------
        The *path* argument — use :meth:`get_url` to obtain a downloadable URL.
        """
        if self._use_s3:
            await self._s3_upload(file_bytes, path, content_type)
        else:
            await self._local_upload(file_bytes, path)
        return path

    def get_url(self, path: str, expires_in: int = 3600) -> str:
        """
        Return a URL that can be used to download the object at *path*.

        S3 mode  : generates a presigned URL valid for *expires_in* seconds.
        Local mode: returns ``/uploads/<path>`` (served by the application).

        Parameters
        ----------
        path:       storage key as returned by :meth:`upload`
        expires_in: presigned URL lifetime in seconds (S3 only, default 1 h)
        """
        if self._use_s3:
            return self._s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": path},
                ExpiresIn=expires_in,
            )
        # Local: the frontend/API serves files under /uploads/
        return f"/uploads/{path}"

    async def delete(self, path: str) -> None:
        """
        Delete the object at *path*.

        Silently ignores missing objects in local mode.
        """
        if self._use_s3:
            await self._s3_delete(path)
        else:
            await self._local_delete(path)

    # ------------------------------------------------------------------
    # S3 helpers (run blocking boto3 calls in a thread-pool executor)
    # ------------------------------------------------------------------

    async def _s3_upload(
        self, file_bytes: bytes, path: str, content_type: str
    ) -> None:
        import io

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            partial(
                self._s3_client.upload_fileobj,
                io.BytesIO(file_bytes),
                self._bucket,
                path,
                ExtraArgs={"ContentType": content_type},
            ),
        )

    async def _s3_delete(self, path: str) -> None:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            partial(
                self._s3_client.delete_object,
                Bucket=self._bucket,
                Key=path,
            ),
        )

    # ------------------------------------------------------------------
    # Local filesystem helpers
    # ------------------------------------------------------------------

    async def _local_upload(self, file_bytes: bytes, path: str) -> None:
        dest = _UPLOADS_DIR / path
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(self._write_file, dest, file_bytes))

    @staticmethod
    def _write_file(dest: Path, data: bytes) -> None:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)

    async def _local_delete(self, path: str) -> None:
        dest = _UPLOADS_DIR / path
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, partial(self._remove_file, dest))

    @staticmethod
    def _remove_file(dest: Path) -> None:
        try:
            dest.unlink()
        except FileNotFoundError:
            pass


# ---------------------------------------------------------------------------
# Module-level singleton — import and use directly:
#   from app.services.storage_service import storage_service
# ---------------------------------------------------------------------------

storage_service = StorageService()
