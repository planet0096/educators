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
    .find({ $or: [{ "payload.qstash_success": true }, { "payload.qstash_error": true }] })
    .sort({ _id: -1 })
    .limit(3)
    .toArray();

  for (const log of logs) {
    console.log(`[${log._id.getTimestamp()}] QStash Log:`, JSON.stringify(log.payload, null, 2));
  }

  console.log("\n=== Stuck Active Sessions ===");
  const activeSessions = await mongoose.connection.collection('automationsessions').find({ status: "active" }).toArray();
  console.log(JSON.stringify(activeSessions, null, 2));

  console.log("\n=== Engine Locked Sessions ===");
  const lockedSessions = await mongoose.connection.collection('automationsessions').find({ engineLocked: true }).toArray();
  console.log(JSON.stringify(lockedSessions, null, 2));

  process.exit(0);
}
run().catch(console.error);
