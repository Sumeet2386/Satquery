"""SatQuery AI — Tests for Image Validation Module."""

import os
import pytest
import tempfile
from pathlib import Path


# ── Unit tests for ImageValidator ────────────────────────────────────────────

class TestImageValidator:
    """Tests for the core image validation logic.
    
    These tests do not require real GeoTIFF files — they test the validator's
    error-handling, path checking, and compatibility logic with minimal mocking.
    """

    def test_missing_file_returns_error(self):
        """Validator should return a clear error for non-existent files."""
        try:
            from core.validation.image_validator import ImageValidator
        except ImportError:
            pytest.skip("core.validation not importable in this environment")

        validator = ImageValidator()
        valid, errors, metadata = validator.validate_single("/nonexistent/path.tif")
        assert not valid
        assert any("not found" in e.lower() for e in errors)
        assert metadata is None

    def test_overlap_ratio_full_overlap(self):
        """Two identical bounding boxes should have 100% overlap."""
        try:
            from core.validation.image_validator import ImageValidator
        except ImportError:
            pytest.skip("core.validation not importable in this environment")

        bounds = (10.0, 20.0, 30.0, 40.0)
        ratio = ImageValidator._compute_overlap_ratio(bounds, bounds)
        assert abs(ratio - 1.0) < 1e-6

    def test_overlap_ratio_no_overlap(self):
        """Non-intersecting bounding boxes should have 0% overlap."""
        try:
            from core.validation.image_validator import ImageValidator
        except ImportError:
            pytest.skip("core.validation not importable in this environment")

        bounds_a = (0.0, 0.0, 10.0, 10.0)
        bounds_b = (20.0, 20.0, 30.0, 30.0)
        ratio = ImageValidator._compute_overlap_ratio(bounds_a, bounds_b)
        assert ratio == 0.0

    def test_overlap_ratio_partial_overlap(self):
        """Partially overlapping boxes should return a ratio between 0 and 1."""
        try:
            from core.validation.image_validator import ImageValidator
        except ImportError:
            pytest.skip("core.validation not importable in this environment")

        bounds_a = (0.0, 0.0, 10.0, 10.0)   # 100 sq units
        bounds_b = (5.0, 0.0, 15.0, 10.0)   # 100 sq units, overlaps 50%
        ratio = ImageValidator._compute_overlap_ratio(bounds_a, bounds_b)
        assert 0.4 < ratio < 0.6   # ~50% of the smaller box

    def test_oversized_file_returns_error(self):
        """A file exceeding max_size_mb should produce a size error (if file exists)."""
        try:
            from core.validation.image_validator import ImageValidator
        except ImportError:
            pytest.skip("core.validation not importable in this environment")

        # Create a temp file of known size
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as f:
            f.write(b"0" * 1024)  # 1 KB
            tmp_path = f.name

        try:
            validator = ImageValidator(max_size_mb=0.0005)  # 0.5 KB limit
            valid, errors, _ = validator.validate_single(tmp_path)
            # Should fail size check
            assert not valid
            assert any("MB" in e and "limit" in e for e in errors)
        finally:
            os.unlink(tmp_path)


# ── API integration tests ─────────────────────────────────────────────────────

class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_register_new_user(self, client, sample_user_data):
        response = await client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert "id" in data
        assert "hashed_password" not in data  # Never expose password hash

    @pytest.mark.asyncio
    async def test_register_duplicate_email_rejected(self, client, sample_user_data):
        await client.post("/api/v1/auth/register", json=sample_user_data)
        response = await client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_login_valid_credentials(self, client, sample_user_data):
        await client.post("/api/v1/auth/register", json=sample_user_data)
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": sample_user_data["email"], "password": sample_user_data["password"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password_rejected(self, client, sample_user_data):
        await client.post("/api/v1/auth/register", json=sample_user_data)
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": sample_user_data["email"], "password": "wrongpassword"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_without_auth_rejected(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_auth_returns_profile(self, client, sample_user_data):
        # Register + login
        await client.post("/api/v1/auth/register", json=sample_user_data)
        login = await client.post(
            "/api/v1/auth/login",
            data={"username": sample_user_data["email"], "password": sample_user_data["password"]},
        )
        token = login.json()["access_token"]

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == sample_user_data["email"]


class TestUploadEndpoint:
    @pytest.mark.asyncio
    async def test_upload_unsupported_format_rejected(self, client, sample_user_data):
        """Uploading a .png file should be rejected with a clear error."""
        await client.post("/api/v1/auth/register", json=sample_user_data)
        login = await client.post(
            "/api/v1/auth/login",
            data={"username": sample_user_data["email"], "password": sample_user_data["password"]},
        )
        token = login.json()["access_token"]

        response = await client.post(
            "/api/v1/uploads",
            files={"file": ("test.png", b"fake image data", "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422
        assert ".png" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_valid_format_accepted(self, client, sample_user_data):
        """Uploading a .tif file should be accepted (content not validated in upload step)."""
        await client.post("/api/v1/auth/register", json=sample_user_data)
        login = await client.post(
            "/api/v1/auth/login",
            data={"username": sample_user_data["email"], "password": sample_user_data["password"]},
        )
        token = login.json()["access_token"]

        response = await client.post(
            "/api/v1/uploads",
            files={"file": ("test.tif", b"fake tif data", "image/tiff")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "upload_id" in data
        assert data["filename"] == "test.tif"


class TestAgentAndInferEndpoints:
    @pytest.mark.asyncio
    async def test_query_statistical_audit(self, client):
        response = await client.post(
            "/api/query",
            json={
                "query": "What is the mean and std dev?",
                "llm_config": {"provider": "statistical"},
                "analysis_context": {
                    "title": "unit_test",
                    "total_area_m2": 3000,
                    "clusters": [
                        {"id": "c1", "label": "C1", "category": "building", "area_m2": 2000, "span_m": 50, "confidence": 95},
                        {"id": "c2", "label": "C2", "category": "building", "area_m2": 1000, "span_m": 40, "confidence": 92},
                    ],
                },
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["statistical_audit"]["area_statistics"]["mean_m2"] == 1500.0
        assert data["statistical_audit"]["totals"]["cluster_count"] == 2

    @pytest.mark.asyncio
    async def test_infer_pair_endpoint(self, client):
        import io
        from PIL import Image, ImageDraw

        img_a = Image.new("RGB", (256, 256), (40, 80, 40))
        img_b = img_a.copy()
        draw = ImageDraw.Draw(img_b)
        draw.rectangle([64, 64, 160, 160], fill=(210, 200, 190))

        buf_a, buf_b = io.BytesIO(), io.BytesIO()
        img_a.save(buf_a, format="PNG")
        img_b.save(buf_b, format="PNG")
        buf_a.seek(0)
        buf_b.seek(0)

        response = await client.post(
            "/api/infer-pair",
            files={
                "pre_image": ("pre.png", buf_a.getvalue(), "image/png"),
                "post_image": ("post.png", buf_b.getvalue(), "image/png"),
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "highlighted_image_url" in data
        assert "mask_image_url" in data
        assert "pixel_stats" in data
