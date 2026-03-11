import mongoose from 'mongoose';
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const configs = await mongoose.connection.collection('whatsappconfigs').find({}).toArray();
  console.log("Configs:");
  configs.forEach(c => console.log(`Educator: ${c.user}, Phone ID: ${c.phoneNumberId}, Phone: ${c.phoneNumber}`));
  process.exit(0);
}
run().catch(console.error);
