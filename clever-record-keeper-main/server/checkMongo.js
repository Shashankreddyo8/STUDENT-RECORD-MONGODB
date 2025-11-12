import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'clever_record_keeper';

(async () => {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    console.log('Connecting to', MONGO_URI, 'db', DB_NAME);
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('students');
    const count = await col.countDocuments();
    console.log('students.count =', count);
    const first = await col.find({}).limit(1).toArray();
    console.log('first doc sample:', JSON.stringify(first[0], null, 2));
  } catch (err) {
    console.error('Connection / query failed:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
})();
