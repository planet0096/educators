/**
 * Cleanup Script: Clear ALL stuck engineLocked sessions
 * These are sessions with engineLocked: true that were never released due to
 * server timeouts / crashes. They permanently block the chatbot engine.
 */

import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://gurdarwin280:Ecommerce123@cluster0.nbq6c.mongodb.net/educators?appName=Cluster0";

const AutomationSessionSchema = new mongoose.Schema({}, { strict: false });
const AutomationSession = mongoose.models.AutomationSession || 
    mongoose.model("AutomationSession", AutomationSessionSchema);

async function main() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("✅ Connected\n");

    // Count before
    const countBefore = await AutomationSession.countDocuments({ engineLocked: true });
    console.log(`Found ${countBefore} stuck locked session(s) to clear...`);

    if (countBefore === 0) {
        console.log("✅ No stuck locks found. Nothing to do.");
        await mongoose.disconnect();
        return;
    }

    // Clear ALL stuck locks across ALL educators
    const result = await AutomationSession.updateMany(
        { engineLocked: true },
        { $unset: { engineLocked: 1, lockedAt: 1 } }
    );

    console.log(`✅ Cleared ${result.modifiedCount} stuck locked sessions.`);

    // Also clear any stale "active" sessions that are more than 24 hours old
    // (these would block the chatbot from starting a new flow for a contact)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const staleResult = await AutomationSession.updateMany(
        { status: "active", updatedAt: { $lt: oneDayAgo } },
        { $set: { status: "completed" } }
    );
    console.log(`✅ Marked ${staleResult.modifiedCount} stale active sessions as completed.`);

    // Verify
    const countAfter = await AutomationSession.countDocuments({ engineLocked: true });
    const activeCount = await AutomationSession.countDocuments({ status: "active" });
    console.log(`\n📊 After cleanup:`);
    console.log(`   Stuck locks remaining: ${countAfter}`);
    console.log(`   Active sessions remaining: ${activeCount}`);

    console.log("\n✅ Cleanup complete! The chatbot engine should now work correctly.");
    await mongoose.disconnect();
}

main().catch(err => {
    console.error("Fatal Error:", err);
    mongoose.disconnect();
    process.exit(1);
});
