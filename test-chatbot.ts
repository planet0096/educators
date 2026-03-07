import mongoose from "mongoose";
import { processIncomingMessage } from "./lib/chatbotEngine";
import dbConnect from "./lib/db";
import WhatsAppConfig from "./models/WhatsAppConfig";

async function run() {
  await dbConnect();
  
  const config = await WhatsAppConfig.findOne();
  if (!config) {
      console.log("No WhatsApp config found in DB.");
      process.exit(1);
  }

  console.log(`Starting test for educator ${config.user} with phone ${config.phoneNumberId}`);
  
  // Test with keyword "hi" (or "dr" as per the user's DB)
  await processIncomingMessage(
    config.user.toString(), 
    "918130678337", 
    "dr", 
    config
  );
  
  console.log("Finished test execution. Check the logs above.");
  process.exit(0);
}

run().catch(console.error);
