import mongoose from 'mongoose';
import dbConnect from './lib/db';
import User from './models/User';
import AutomationFlow from './models/AutomationFlow';

async function check() {
    await dbConnect();
    const users = await User.find({}, 'name email').limit(5);
    console.log("Users:", users);

    const flows = await AutomationFlow.find({ name: "Demo: Advanced Routing" });
    console.log("Flows:", flows.map(f => ({ id: f._id, educatorId: f.educatorId, name: f.name })));
    process.exit(0);
}
check();
