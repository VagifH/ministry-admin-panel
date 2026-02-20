# Storage Configuration Guide

This document explains how to configure video storage for the Ministry Admin Panel.

## Overview

The application supports two storage providers:
- **Local** (default): Stores files on the server filesystem
- **GCS** (Google Cloud Storage): Stores files in a GCS bucket

## Configuration

Set the storage provider via the `STORAGE_PROVIDER` environment variable:

```env
STORAGE_PROVIDER=local  # or "gcs"
```

---

## Local Storage (Default)

Files are stored in `/app/backend/uploads/videos/`.

### Pros
- No cloud configuration needed
- Zero cost
- Fast local access

### Cons
- Limited by server disk space
- Lost if server is recreated
- No geographic redundancy

### Configuration

```env
STORAGE_PROVIDER=local
```

No additional configuration required.

---

## Google Cloud Storage (GCS)

Files are stored in a private GCS bucket.

### Pros
- Scalable to petabytes
- 99.999999999% durability
- Geographic redundancy
- Lifecycle management

### Cons
- Requires GCP account
- Network latency for uploads/downloads
- Storage costs

### Prerequisites

1. **GCP Project** with billing enabled
2. **GCS Bucket** (Standard or Nearline class recommended)
3. **Service Account** with `Storage Object Admin` role on the bucket

### Creating a Service Account

1. Go to [GCP Console > IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Name: `ministry-panel-storage`
4. Grant role: `Storage Object Admin` (or custom role with `storage.objects.*`)
5. Create JSON key and download

### Creating the Bucket

```bash
# Using gcloud CLI
gcloud storage buckets create gs://your-ministry-videos-bucket \
  --location=us-central1 \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access
```

**Important:** Keep the bucket **private** (no public access).

### Configuration

```env
STORAGE_PROVIDER=gcs

# Required
GCS_BUCKET_NAME=your-ministry-videos-bucket
GCS_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"ministry-panel-storage@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# Optional
GCS_PROJECT_ID=your-project-id
```

### JSON Credentials Format

The `GCS_CREDENTIALS_JSON` must be a single-line JSON string. To convert a downloaded JSON key file:

```bash
# Convert multi-line JSON to single line
cat service-account-key.json | jq -c '.'
```

### Security Best Practices

1. **Never commit credentials** to version control
2. **Rotate keys** periodically
3. **Limit service account scope** to specific bucket
4. **Enable audit logging** on the bucket
5. **Use VPC Service Controls** in production

---

## Switching Providers

To migrate from local to GCS:

1. Export existing videos (if needed)
2. Set GCS environment variables
3. Set `STORAGE_PROVIDER=gcs`
4. Restart the backend

**Note:** Existing video records in MongoDB will still reference local paths. New uploads will use GCS.

For a full migration, you would need to:
1. Upload existing files to GCS manually
2. Update `storage_provider` and `storage_path` in MongoDB `videos` collection

---

## Storage Path Format

Both providers use the same path format:

```
videos/{task_id}/{uuid}.{extension}
```

Example:
```
videos/f984af4f-89a4-4057-81e0-5678b205e15b/b75b6b4a-ea3e-42f4-9837-32e7e2504cb7.mp4
```

---

## Download Behavior

| Provider | Method | Advantage |
|----------|--------|-----------|
| Local | Direct streaming from filesystem | Fast, no egress cost |
| GCS | Backend streams from GCS | Keeps bucket private, no signed URLs exposed |

The frontend API contract remains unchanged regardless of provider.

---

## Troubleshooting

### GCS: "Invalid GCS_CREDENTIALS_JSON format"
- Ensure JSON is valid and properly escaped
- Use `jq -c` to convert to single line

### GCS: "Permission denied" errors
- Verify service account has `Storage Object Admin` role
- Check bucket name is correct
- Ensure uniform bucket-level access is enabled

### GCS: Slow uploads
- Consider chunked uploads for large files
- Check network connectivity to GCS endpoints

### Local: "No space left on device"
- Check disk usage: `df -h /app/backend/uploads`
- Clean up old/unused videos
- Migrate to GCS for unlimited storage

---

## API Reference

### Upload Video
```bash
POST /api/tasks/{task_id}/video/upload
Content-Type: multipart/form-data

# Returns storage_provider field indicating which provider was used
```

### Download Video
```bash
GET /api/tasks/{task_id}/video/download
# Works identically for both providers
```

### Delete Video
```bash
DELETE /api/tasks/{task_id}/video
# Removes from storage and database
```
