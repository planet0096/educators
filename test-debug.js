const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://gurdarwin280:Ecommerce123@cluster0.nbq6c.mongodb.net/educators?appName=Cluster0');

  console.log("=== Active Flows ===");
  const flows = await mongoose.connection.collection('automationflows').find({ isActive: true }).toArray();
  for (const f of flows) {
    console.log(`Flow: ${f.name}`);
    console.log(`Keywords:`, f.keywords);
    console.log(`Nodes:`, JSON.stringify(f.flowData.nodes, null, 2));
    console.log(`Edges:`, JSON.stringify(f.flowData.edges, null, 2));
  }

  console.log("\n=== Recent Webhooks === ");
  const logs = await mongoose.connection.collection('webhooklogs')
    .find({ "payload.entry.0.changes.0.value.messages": { $exists: true } })
    .sort({ _id: -1 })
    .limit(3)
    .toArray();

  for (const log of logs) {
    const msg = log.payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg) console.log(`Received message: "${msg.text?.body}" from ${msg.from}`);
  }

  console.log("\n=== Active Sessions ===");
  const sessions = await mongoose.connection.collection('automationsessions').find({}).toArray();
  console.log(JSON.stringify(sessions, null, 2));

  process.exit(0);
}
run().catch(console.error);
