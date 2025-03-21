"use client";

import type { ProfileData } from "@/@types/ProfileData";
import { db } from "@/lib/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilesPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<ProfileData[]>([]);
    const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load profiles from database on component mount
    useEffect(() => {
        const loadProfiles = async () => {
            setIsLoading(true);
            try {
                const profilesData = await db.getProfiles();
                console.log('Loaded profiles:', profilesData);
                setProfiles(profilesData);
            } catch (error) {
                console.error('Error loading profiles:', error);
                setProfiles([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfiles();
    }, []);

    const handleProfileSelect = async (profile: ProfileData) => {
        try {
            // Store selected profile in the database
            await db.setSelectedProfile(profile);

            // Redirect to browse page
            router.push("/dashboard");
        } catch (error) {
            console.error('Error selecting profile:', error);
        }
    };

    const handleDeleteProfile = async (e: React.MouseEvent, profile: ProfileData) => {
        e.stopPropagation(); // Prevent triggering the handleProfileSelect

        try {
            // Delete profile from the database
            await db.deleteProfile(profile.id);

            // Update the profiles list
            setProfiles(profiles.filter(p => p.id !== profile.id));
        } catch (error) {
            console.error('Error deleting profile:', error);
        }
    };

    const getInitials = (name: string) => {
        return name.charAt(0).toUpperCase();
    };

    // Generate a color based on the username for the avatar background
    const getProfileColor = (username: string) => {
        const colors = [
            'bg-blue-600', 'bg-green-600', 'bg-red-600',
            'bg-yellow-600', 'bg-purple-600', 'bg-pink-600',
            'bg-indigo-600', 'bg-teal-600'
        ];

        // Simple hash function to get consistent color
        const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // Function to format date from timestamp
    const formatExpirationDate = (timestamp: string) => {
        if (!timestamp) return '';

        try {
            const date = new Date(parseInt(timestamp) * 1000);
            return date.toLocaleDateString();
        } catch {
            return '';
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <div className="mb-10">
                <h1 className="text-3xl md:text-5xl font-bold text-center">Select Profile</h1>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : profiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className="flex flex-col items-center cursor-pointer group relative"
                            onMouseEnter={() => setHoveredProfile(profile.id)}
                            onMouseLeave={() => setHoveredProfile(null)}
                            onClick={() => handleProfileSelect(profile)}
                        >
                            {hoveredProfile === profile.id && (
                                <button
                                    onClick={(e) => handleDeleteProfile(e, profile)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                                    title="Delete Profile"
                                >
                                    ×
                                </button>
                            )}
                            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-lg relative overflow-hidden mb-2 md:mb-4 border-2 ${hoveredProfile === profile.id ? "border-white" : "border-transparent"
                                } transition-all duration-200`}>
                                {profile.avatar ? (
                                    <div className="w-full h-full bg-gray-700">
                                        <img
                                            src={profile.avatar}
                                            alt={profile.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className={`w-full h-full ${getProfileColor(profile.username)} flex items-center justify-center`}>
                                        <span className="text-4xl font-bold text-white">{getInitials(profile.name)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <span className={`text-lg font-medium ${hoveredProfile === profile.id ? "text-white" : "text-gray-300"
                                    } transition-colors duration-200 group-hover:text-white`}>
                                    {profile.name}
                                </span>

                                {profile.status && (
                                    <div className="mt-1 text-xs text-gray-400">
                                        Status: <span className={profile.status === "Active" ? "text-green-500" : "text-yellow-500"}>
                                            {profile.status}
                                        </span>
                                    </div>
                                )}

                                {profile.expirationDate && (
                                    <div className="text-xs text-gray-400">
                                        Expires: {formatExpirationDate(profile.expirationDate)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 bg-gray-800 rounded-lg">
                    <p className="text-lg mb-4">No profiles found</p>
                    <p className="text-gray-400 mb-6">Add a profile to get started</p>
                </div>
            )}

            <Link
                href={'/login'}
                className="mt-10 md:mt-16 border border-gray-500 text-gray-300 px-6 py-2 rounded-md hover:border-white hover:text-white transition-colors duration-200"
            >
                {profiles.length > 0 ? "Add Another Profile" : "Add Profile"}
            </Link>
        </div>
    );
} 