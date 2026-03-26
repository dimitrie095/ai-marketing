# MongoDB Migration Guide

## Overview
Your project has been successfully migrated from PostgreSQL to MongoDB (MongoDB Atlas).

## What Changed

### Database Layer
- ✅ Replaced SQLAlchemy ORM with **Beanie ODM** (MongoDB ODM for Python)
- ✅ Replaced asyncpg/psycopg2 with **motor** (async MongoDB driver)
- ✅ Removed Alembic (MongoDB doesn't need migrations)
- ✅ Updated all models to MongoDB document structure

### Configuration
- ✅ Updated `.env` with MongoDB connection format
- ✅ Removed PostgreSQL-specific setup scripts
- ✅ Created MongoDB-specific connection test

### Models
All SQLAlchemy models converted to Beanie Documents:
- `Campaign`
- `AdSet`
- `Ad`
- `Metric`
- `ProcessedData`
- `RawData`
- `MetaInsights`
- `GoogleAdsReport`

## Setting Up MongoDB Atlas

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or sign in
3. Create a new project

### 2. Create Your Cluster
1. Click "Build a Database"
2. Choose M0 (Free tier) for development
3. Select your cloud provider and region
4. Click "Create Cluster"

### 3. Configure Network Access
1. Go to "Network Access" → "IP Access List"
2. Click "Add IP Address"
3. Add your current IP address
4. Optionally add `0.0.0.0/0` for testing (not recommended for production)

### 4. Create Database User
1. Go to "Database Access" → "Database Users"
2. Click "Add New Database User"
3. Choose username/password authentication
4. Create a username and password (save these!)
5. Grant "Read and write to any database" role

### 5. Get Connection String
1. Go to your cluster → "Connect"
2. Click "Connect your application"
3. Select "Python" as driver
4. Copy the connection string

### 6. Update Your .env File

Replace the MongoDB URL in your `.env` file:

```env
MONGODB_URL=mongodb+srv://username:password@cluster0.mongodb.net/marketing_ai?retryWrites=true&w=majority
DATABASE_NAME=marketing_ai
```

**Important:** Replace `username` and `password` with your actual credentials.

## Running Tests

### Test MongoDB Connection
```bash
cd backend
python test_mongodb_connection.py
```

This will verify:
- Connection string format
- Network connectivity
- Database access
- Collection initialization

## Start the Application

```bash
cd backend
uvicorn app.main:app --reload
```

The application will:
1. Initialize the MongoDB connection on startup
2. Create necessary indexes automatically
3. Be ready to use with MongoDB Atlas

## Next Steps

### Install New Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Verify Collections
Once the app is running, MongoDB Atlas will automatically create collections when documents are inserted. You can view them in the Atlas web interface.

### Data Migration (Optional)
If you need to migrate data from PostgreSQL to MongoDB:
1. Export data from PostgreSQL to JSON
2. Use a MongoDB import script (can be provided on request)

## Troubleshooting

### Connection Errors
- Check that your IP is whitelisted in Atlas
- Verify username/password in connection string
- Ensure network connectivity
- Check Atlas cluster is running

### Authentication Errors
- Verify database user has correct permissions
- Check username/password are URL-encoded if they contain special characters

### Helpful Commands
```bash
# Test connection only
python test_mongodb_connection.py

# Run with debug output
DEBUG=true uvicorn app.main:app --reload
```

## Notes
- MongoDB is schema-less, so no migrations needed
- Indexes are created automatically on startup
- Use the Atlas web interface to monitor queries and performance
- For production, consider upgrade to paid Atlas tier

## Benefits of Migration
✅ No complex SQL migrations needed
✅ Flexible schema - easy to add new fields
✅ Better for evolving AI/ML features
✅ Native JSON support
✅ Horizontal scalability
✅ MongoDB Atlas provides automatic backups
