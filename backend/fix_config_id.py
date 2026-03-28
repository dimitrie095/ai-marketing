import os
import sys
from dotenv import load_dotenv
import pymongo

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = "marketing_ai"

client = pymongo.MongoClient(MONGODB_URL)
db = client[DB_NAME]

# Find the config we just inserted (provider_id 2)
config = db.llm_configs.find_one({"provider_id": 2})
if config:
    print("Found config:", config)
    # Check if id field exists
    if "id" not in config:
        # Set id = 1
        db.llm_configs.update_one({"_id": config["_id"]}, {"$set": {"id": 1}})
        print("Updated id field to 1")
    else:
        print("id field already exists:", config["id"])
else:
    print("No config found")

client.close()