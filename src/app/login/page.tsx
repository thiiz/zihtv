"use client";

import { ProfileData } from "@/@types/ProfileData";
import { db } from "@/lib/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
    name: z.string().optional(),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    url: z.string().url("Please enter a valid URL").min(1, "URL is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            name: "",
            username: "",
            password: "",
            url: "",
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: data.url,
                    username: data.username,
                    password: data.password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.message || 'Login failed. Please check your credentials.');
                return;
            }

            // Create a new profile with the login data and API response
            const newProfile: ProfileData = {
                id: generateProfileId(),
                name: data.name || data.username, // Use username as fallback if name is not provided
                username: data.username,
                password: data.password,
                url: data.url,
                maxConnections: result.data?.userData?.user_info?.max_connections || '1',
                activeConnections: result.data?.userData?.user_info?.active_cons || '0',
                expirationDate: result.data?.userData?.user_info?.exp_date || '',
                status: result.data?.userData?.user_info?.status || 'Active',
                serverInfo: result.data?.userData?.server_info || {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // Get existing profiles to check for duplicates
            const profiles = await db.getProfiles();

            // Check if a profile with the same username and url already exists
            const existingProfile = profiles.find(
                p => p.username === data.username && p.url === data.url
            );

            if (existingProfile) {
                // Update existing profile, keeping the same ID
                await db.saveProfile({
                    ...newProfile,
                    id: existingProfile.id
                });
            } else {
                // Add new profile to the database
                await db.saveProfile(newProfile);
            }

            // Store auth data in sessionStorage for future API calls
            if (result.data?.userData?.user_info?.auth === 1) {
                const authData = {
                    username: data.username,
                    password: data.password,
                    url: data.url,
                };
                sessionStorage.setItem('authData', JSON.stringify(authData));
            }

            // Set this profile as selected
            await db.setSelectedProfile(existingProfile || newProfile);

            // Redirect to profiles page to select a profile
            router.push('/profiles');
        } catch (error) {
            console.error("Login failed:", error);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Generate a unique ID for the profile
    const generateProfileId = (): string => {
        return 'profile_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 rounded-lg border p-6 shadow-md">
                <h1 className="text-center text-2xl font-bold">Login</h1>

                {error && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                            Profile Name (Optional)
                        </label>
                        <input
                            id="name"
                            type="text"
                            {...register("name")}
                            className="w-full rounded-md border p-2"
                            placeholder="Your profile name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="username"
                            type="text"
                            {...register("username")}
                            className="w-full rounded-md border p-2"
                            placeholder="Enter username"
                        />
                        {errors.username && (
                            <p className="text-sm text-red-500">{errors.username.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="password"
                            type="password"
                            {...register("password")}
                            className="w-full rounded-md border p-2"
                            placeholder="Enter password"
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="url" className="text-sm font-medium">
                            URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="url"
                            type="text"
                            {...register("url")}
                            className="w-full rounded-md border p-2"
                            placeholder="https://example.com"
                        />
                        {errors.url && (
                            <p className="text-sm text-red-500">{errors.url.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:bg-blue-400"
                    >
                        {isLoading ? "Validating..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}