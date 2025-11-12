from pymongo import MongoClient
from bson.json_util import dumps
import sys

# Configuration
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "clever_record_keeper"
COLLECTION_NAME = "students"
SAMPLE_LIMIT = 5  # how many sample docs to print

def main():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Force connection / server selection
        client.admin.command('ping')
    except Exception as e:
        print(f"ERROR: Unable to connect to MongoDB at {MONGO_URI}: {e}", file=sys.stderr)
        sys.exit(2)

    db = client[DB_NAME]
    col = db[COLLECTION_NAME]

    try:
        count = col.count_documents({})
        print(f"Connected to {MONGO_URI} -> DB: {DB_NAME} -> Collection: {COLLECTION_NAME}")
        print(f"Document count: {count}")
        if count == 0:
            print("Collection is empty.")
        else:
            print(f"\nShowing up to {SAMPLE_LIMIT} sample documents:\n")
            cursor = col.find({}).limit(SAMPLE_LIMIT)
            for i, doc in enumerate(cursor, start=1):
                # dumps converts BSON types (ObjectId, Date) to JSON-friendly format
                print(f"--- Document {i} ---")
                print(dumps(doc, indent=2))
                print()
    except Exception as e:
        print("ERROR while querying the collection:", e, file=sys.stderr)
        sys.exit(3)
    finally:
        client.close()

if __name__ == '__main__':
    main()