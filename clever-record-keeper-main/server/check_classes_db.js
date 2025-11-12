import { MongoClient } from 'mongodb';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'clever_record_keeper';
(async()=>{
  const client = new MongoClient(MONGO_URI);
  try{
    await client.connect();
    const col = client.db(DB_NAME).collection('classes');
    const docs = await col.find({}).toArray();
    console.log('classes count =', docs.length);
    console.log(JSON.stringify(docs, null, 2));
  }catch(e){console.error(e)}finally{await client.close();}
})();
