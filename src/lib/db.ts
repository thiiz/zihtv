import { ProfileData, SelectedProfileData } from '@/@types/ProfileData';
import { DBSchema, IDBPDatabase, openDB } from 'idb';

// Define interfaces for streaming data
interface Category {
    category_id: string;
    category_name: string;
}

interface LiveStream {
    stream_id: number;
    name: string;
    stream_icon: string;
    epg_channel_id: string;
    category_id: string;
}

interface Movie {
    stream_id: number;
    name: string;
    stream_icon: string;
    rating: string;
    plot: string;
    director: string;
    cast: string;
    genre: string;
    releaseDate: string;
    category_id: string;
}

interface Series {
    series_id: number;
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    category_id: string;
}

// Define the database schema
interface ZihtvDB extends DBSchema {
    profiles: {
        key: string;
        value: ProfileData;
        indexes: {
            'by-created': number;
        };
    };
    selectedProfile: {
        key: 'current';
        value: SelectedProfileData;
    };
    // Live TV data stores
    liveCategories: {
        key: string; // profileId
        value: {
            id: string;
            data: Category[];
        };
    };
    liveStreams: {
        key: string; // profileId
        value: {
            id: string;
            data: LiveStream[];
        };
    };
    // Movie data stores
    movieCategories: {
        key: string; // profileId
        value: {
            id: string;
            data: Category[];
        };
    };
    movieStreams: {
        key: string; // profileId
        value: {
            id: string;
            data: Movie[];
        };
    };
    // Series data stores
    seriesCategories: {
        key: string; // profileId
        value: {
            id: string;
            data: Category[];
        };
    };
    seriesStreams: {
        key: string; // profileId
        value: {
            id: string;
            data: Series[];
        };
    };
}

// Database version
const DB_VERSION = 2;

// Database name
const DB_NAME = 'Zihtv-db';

// Get database connection
async function getDB(): Promise<IDBPDatabase<ZihtvDB>> {
    return openDB<ZihtvDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // Handle different upgrade paths
            if (oldVersion < 1) {
                // Create stores for profiles
                const profileStore = db.createObjectStore('profiles', {
                    keyPath: 'id'
                });

                // Create index for sorting by creation date
                profileStore.createIndex('by-created', 'createdAt');

                // Create store for selected profile
                db.createObjectStore('selectedProfile', {
                    // Only one selected profile at a time
                    keyPath: 'key'
                });
            }

            if (oldVersion < 2) {
                // Create stores for Live TV data
                if (!db.objectStoreNames.contains('liveCategories')) {
                    db.createObjectStore('liveCategories', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('liveStreams')) {
                    db.createObjectStore('liveStreams', { keyPath: 'id' });
                }

                // Create stores for Movie data
                if (!db.objectStoreNames.contains('movieCategories')) {
                    db.createObjectStore('movieCategories', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('movieStreams')) {
                    db.createObjectStore('movieStreams', { keyPath: 'id' });
                }

                // Create stores for Series data
                if (!db.objectStoreNames.contains('seriesCategories')) {
                    db.createObjectStore('seriesCategories', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('seriesStreams')) {
                    db.createObjectStore('seriesStreams', { keyPath: 'id' });
                }
            }

            console.log('Database setup complete');
        }
    });
}

// Database operations
export const db = {
    // Get all profiles
    async getProfiles(): Promise<ProfileData[]> {
        try {
            const db = await getDB();
            const profiles = await db.getAllFromIndex('profiles', 'by-created');
            return profiles;
        } catch (error) {
            console.error('Error getting profiles:', error);
            return [];
        }
    },

    // Save a profile (add or update)
    async saveProfile(profile: ProfileData): Promise<string> {
        try {
            const db = await getDB();
            const id = await db.put('profiles', profile);
            return id as string;
        } catch (error) {
            console.error('Error saving profile:', error);
            throw error;
        }
    },

    // Delete a profile
    async deleteProfile(id: string): Promise<void> {
        try {
            const db = await getDB();
            await db.delete('profiles', id);

            // Also delete all associated streaming data
            try {
                await db.delete('liveCategories', id);
                await db.delete('liveStreams', id);
                await db.delete('movieCategories', id);
                await db.delete('movieStreams', id);
                await db.delete('seriesCategories', id);
                await db.delete('seriesStreams', id);
            } catch (e) {
                console.error('Error deleting associated streaming data:', e);
                // Continue with profile deletion even if streaming data deletion fails
            }
        } catch (error) {
            console.error('Error deleting profile:', error);
            throw error;
        }
    },

    // Get selected profile
    async getSelectedProfile(): Promise<ProfileData | null> {
        try {
            const db = await getDB();
            const selectedProfile = await db.get('selectedProfile', 'current');
            if (selectedProfile) {
                // Create a new object without the key property
                const { id, name, username, password, url, maxConnections, activeConnections,
                    expirationDate, status, avatar, serverInfo, createdAt, updatedAt } = selectedProfile;
                return {
                    id, name, username, password, url, maxConnections, activeConnections,
                    expirationDate, status, avatar, serverInfo, createdAt, updatedAt
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting selected profile:', error);
            return null;
        }
    },

    // Set selected profile
    async setSelectedProfile(profile: ProfileData): Promise<void> {
        try {
            const db = await getDB();
            const selectedProfile: SelectedProfileData = {
                ...profile,
                key: 'current'
            };
            await db.put('selectedProfile', selectedProfile);
        } catch (error) {
            console.error('Error setting selected profile:', error);
            throw error;
        }
    },

    // Live TV Methods
    async saveLiveCategories(profileId: string, categories: Category[]): Promise<void> {
        try {
            const db = await getDB();
            await db.put('liveCategories', { id: profileId, data: categories });
        } catch (error) {
            console.error('Error saving live categories:', error);
            throw error;
        }
    },

    async getLiveCategories(profileId: string): Promise<Category[]> {
        try {
            const db = await getDB();
            const result = await db.get('liveCategories', profileId);
            return result?.data || [];
        } catch (error) {
            console.error('Error getting live categories:', error);
            return [];
        }
    },

    async saveLiveStreams(profileId: string, streams: LiveStream[]): Promise<void> {
        try {
            const db = await getDB();
            await db.put('liveStreams', { id: profileId, data: streams });
        } catch (error) {
            console.error('Error saving live streams:', error);
            throw error;
        }
    },

    async getLiveStreams(profileId: string): Promise<LiveStream[]> {
        try {
            const db = await getDB();
            const result = await db.get('liveStreams', profileId);
            return result?.data || [];
        } catch (error) {
            console.error('Error getting live streams:', error);
            return [];
        }
    },

    // Movie Methods
    async saveMovieCategories(profileId: string, categories: Category[]): Promise<void> {
        try {
            const db = await getDB();
            await db.put('movieCategories', { id: profileId, data: categories });
        } catch (error) {
            console.error('Error saving movie categories:', error);
            throw error;
        }
    },

    async getMovieCategories(profileId: string): Promise<Category[]> {
        try {
            const db = await getDB();
            const result = await db.get('movieCategories', profileId);
            return result?.data || [];
        } catch (error) {
            console.error('Error getting movie categories:', error);
            return [];
        }
    },

    async saveMovieStreams(profileId: string, streams: Movie[]): Promise<void> {
        try {
            const db = await getDB();
            await db.put('movieStreams', { id: profileId, data: streams });
        } catch (error) {
            console.error('Error saving movie streams:', error);
            throw error;
        }
    },

    async getMovieStreams(profileId: string): Promise<Movie[]> {
        try {
            const db = await getDB();
            const result = await db.get('movieStreams', profileId);
            return result?.data || [];
        } catch (error) {
            console.error('Error getting movie streams:', error);
            return [];
        }
    },

    // Series Methods
    async saveSeriesCategories(profileId: string, categories: Category[]): Promise<void> {
        try {
            const db = await getDB();
            await db.put('seriesCategories', { id: profileId, data: categories });
        } catch (error) {
            console.error('Error saving series categories:', error);
            throw error;
        }
    },

    async getSeriesCategories(profileId: string): Promise<Category[]> {
        try {
            const db = await getDB();
            const result = await db.get('seriesCategories', profileId);
            return result?.data || [];
        } catch (error) {
            console.error('Error getting series categories:', error);
            return [];
        }
    },

    async saveSeriesStreams(profileId: string, streams: Series[]): Promise<void> {
        try {
            const db = await getDB();
            await db.put('seriesStreams', { id: profileId, data: streams });
        } catch (error) {
            console.error('Error saving series streams:', error);
            throw error;
        }
    },

    async getSeriesStreams(profileId: string): Promise<Series[]> {
        try {
            const db = await getDB();
            const result = await db.get('seriesStreams', profileId);
            return result?.data || [];
        } catch (error) {
            console.error('Error getting series streams:', error);
            return [];
        }
    },
};