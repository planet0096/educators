import mongoose from "mongoose";

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/educators");
    const users = await mongoose.connection.collection("users").find({}).toArray();
    console.log(users.map(u => ({ email: u.email, wallet: u.walletBalance })));
    process.exit(0);
}
run();
