require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('test');
    
    console.log("Looking for recent ChatMessages...");
    const msgs = await db.collection('chatmessages')
      .find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
      
    console.log("Latest messages: ", msgs.map(m => ({
      _id: m._id,
      body: m.body,
      dir: m.direction,
      convId: m.conversationId,
      wamId: m.wamId
    })));
    
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
