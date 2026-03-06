import { auth } from "@/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import Profile from "@/models/Profile";
import ProfileEditClient from "./ProfileEditClient";

export default async function EditProfilePage() {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        redirect("/login");
    }

    await dbConnect();

    // Fetch the user's current profile data to pre-populate the form
    const profile = await Profile.findOne({ user: session.user.id }).lean();

    if (!profile) {
        redirect("/onboarding");
    }

    // Convert MongoDB ObjectIds or Date objects to strings/JSON-safe structures if needed,
    // though Next.js Server Components passing props to Client Components handles most objects fine.
    // For safety with lean(), we'll serialize to JSON and back to ensure clean plain objects.
    const serializedProfile = JSON.parse(JSON.stringify(profile));

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                    Edit Profile
                </h1>
                <p className="text-zinc-500 mt-1">
                    Manage your professional educator information and customize how you appear to others.
                </p>
            </div>

            <ProfileEditClient initialData={serializedProfile} />
        </div>
    );
}
