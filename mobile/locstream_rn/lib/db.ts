import * as SQLite from 'expo-sqlite';

// Types
export interface LocationPoint {
  id?: number;
  serverId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number; // Unix timestamp in milliseconds
  createdAt: number;
  syncedAt?: number | null;
}

export interface Session {
  id?: number;
  serverId?: string;
  name?: string;
  description?: string;
  startTime: number; // Unix timestamp in milliseconds
  endTime?: number; // Unix timestamp in milliseconds, null if session is active
  userId?: string; // Optional user ID if logged in
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface DbInitStatus {
  id: number;
  isInitialized: number;
  version: number;
  createdAt: number;
}

export interface SessionBounds {
  startTime: number;
  endTime?: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface LocationQueryResult {
  locations: LocationPoint[];
  totalCount: number;
  hasMore: boolean;
}

export type TrackingStats = {
    totalLocations: number;
    totalSessions: number;
    activeSessions: number;
    unsyncedLocations: number;
    unsyncedSessions: number;
};

class LocationTrackingDB {
  private static instance: LocationTrackingDB;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  
  private readonly DB_NAME = 'location_tracking.db';
  private readonly DB_VERSION = 1;

  public isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): LocationTrackingDB {
    if (!LocationTrackingDB.instance) {
      LocationTrackingDB.instance = new LocationTrackingDB();
    }
    return LocationTrackingDB.instance;
  }

  /**
   * Initialize the database with proper singleton handling
   */
  public async initialize(): Promise<void> {
    // If already initializing, wait for that to complete
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // If already initialized, return immediately
    if (this.db) {
      return Promise.resolve();
    }

    // Set initializing flag and create promise
    this.isInitializing = true;
    this.initPromise = this._performInitialization();

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async _performInitialization(): Promise<void> {
    try {
      // Open database
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);

      // Check if database is already initialized
      const isInitialized = await this.checkIfInitialized();
      
      if (!isInitialized) {
        await this.createTables();
        await this.markAsInitialized();
      }

      this.isInitialized = true;

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.db = null;
      throw error;
    }
  }

  private async checkIfInitialized(): Promise<boolean> {
    if (!this.db) return false;

    try {
      const result = await this.db.getFirstAsync<DbInitStatus>(
        'SELECT * FROM db_init_status WHERE id = 1'
      );
      this.isInitialized = result?.isInitialized === 1; // SQLite stores booleans as integers
      return this.isInitialized;
    } catch (error) {
      // Table doesn't exist yet
      return false;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      // DB initialization status table
      `CREATE TABLE IF NOT EXISTS db_init_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        isInitialized INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL
      )`,

      // Location points table
      `CREATE TABLE IF NOT EXISTS location_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serverId TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        altitude REAL,
        altitudeAccuracy REAL,
        heading REAL,
        speed REAL,
        timestamp INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        syncedAt INTEGER
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serverId TEXT,
        name TEXT,
        description TEXT,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        userId TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        syncedAt INTEGER
      )`,

      // Indexes for better query performance
      `CREATE INDEX IF NOT EXISTS idx_location_timestamp ON location_points(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_location_synced ON location_points(syncedAt)`,
      `CREATE INDEX IF NOT EXISTS idx_location_server_id ON location_points(serverId) WHERE serverId IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_time_range ON sessions(startTime, endTime)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_synced ON sessions(syncedAt)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_server_id ON sessions(serverId) WHERE serverId IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId)`
    ];

    for (const query of queries) {
      await this.db.execAsync(query);
    }
  }

  private async markAsInitialized(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT OR REPLACE INTO db_init_status (id, isInitialized, version, createdAt) VALUES (1, 1, ?, ?)',
      [this.DB_VERSION, Date.now()]
    );
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  // LOCATION OPERATIONS

  /**
   * Insert a new location point
   */
  public async insertLocationPoint(location: Omit<LocationPoint, 'id' | 'createdAt'>): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const now = Date.now();
    const result = await this.db.runAsync(
      `INSERT INTO location_points 
       (serverId, latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, timestamp, createdAt, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        location.serverId || null,
        location.latitude,
        location.longitude,
        location.accuracy || null,
        location.altitude || null,
        location.altitudeAccuracy || null,
        location.heading || null,
        location.speed || null,
        location.timestamp,
        now,
        location.syncedAt || null
      ]
    );

    return result.lastInsertRowId;
  }

  /**
   * Get locations within a time range with pagination
   */
  public async getLocationsInRange(
    bounds: SessionBounds,
    pagination: PaginationOptions = {}
  ): Promise<LocationQueryResult> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const { limit = 1000, offset = 0 } = pagination;
    
    let whereClause = 'WHERE timestamp >= ?';
    const params: any[] = [bounds.startTime];
    
    if (bounds.endTime) {
      whereClause += ' AND timestamp <= ?';
      params.push(bounds.endTime);
    }

    // Get total count
    const countResult = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM location_points ${whereClause}`,
      params
    );
    const totalCount = countResult?.count || 0;

    // Get paginated results
    const locations = await this.db.getAllAsync<LocationPoint>(
      `SELECT * FROM location_points ${whereClause} 
       ORDER BY timestamp ASC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      locations,
      totalCount,
      hasMore: offset + locations.length < totalCount
    };
  }

  /**
   * Get unsynced location points
   */
  public async getUnsyncedLocations(limit: number = 100): Promise<LocationPoint[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    return this.db.getAllAsync<LocationPoint>(
      'SELECT * FROM location_points WHERE syncedAt IS NULL ORDER BY timestamp ASC LIMIT ?',
      [limit]
    );
  }

  /**
   * Mark location as synced
   */
  public async markLocationSynced(localId: number, serverId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    await this.db.runAsync(
      'UPDATE location_points SET serverId = ?, syncedAt = ? WHERE id = ?',
      [serverId, Date.now(), localId]
    );
  }

  // SESSION OPERATIONS

  /**
   * Create a new session
   */
  public async createSession(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const now = Date.now();
    const result = await this.db.runAsync(
      `INSERT INTO sessions 
       (serverId, name, description, startTime, endTime, userId, createdAt, updatedAt, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.serverId || null,
        session.name || null,
        session.description || null,
        session.startTime,
        session.endTime || null,
        session.userId || null,
        now,
        now,
        session.syncedAt || null
      ]
    );

    return result.lastInsertRowId;
  }

  /**
   * End a session
   */
  public async endSession(sessionId: number, endTime?: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const now = Date.now();
    await this.db.runAsync(
      'UPDATE sessions SET endTime = ?, updatedAt = ? WHERE id = ?',
      [endTime || now, now, sessionId]
    );
  }

  /**
   * Get all sessions with optional user filter
   */
  public async getSessions(userId?: string): Promise<Session[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    if (userId) {
      return this.db.getAllAsync<Session>(
        'SELECT * FROM sessions WHERE userId = ? ORDER BY startTime DESC',
        [userId]
      );
    } else {
      return this.db.getAllAsync<Session>(
        'SELECT * FROM sessions ORDER BY startTime DESC'
      );
    }
  }

  /**
   * Get active sessions (no end time)
   */
  public async getActiveSessions(userId?: string): Promise<Session[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    let query = 'SELECT * FROM sessions WHERE endTime IS NULL';
    const params: any[] = [];

    if (userId) {
      query += ' AND userId = ?';
      params.push(userId);
    }

    query += ' ORDER BY startTime DESC';

    return this.db.getAllAsync<Session>(query, params);
  }

  /**
   * Get session by ID
   */
  public async getSessionById(sessionId: number): Promise<Session | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const session = await this.db.getFirstAsync<Session>(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    );

    return session || null;
  }

  /**
   * Get locations for a specific session with pagination
   */
  public async getSessionLocations(
    sessionId: number,
    pagination: PaginationOptions = {}
  ): Promise<LocationQueryResult> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const bounds: SessionBounds = {
      startTime: session.startTime,
      endTime: session.endTime || undefined
    };

    return this.getLocationsInRange(bounds, pagination);
  }

  /**
   * Get unsynced sessions
   */
  public async getUnsyncedSessions(): Promise<Session[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    return this.db.getAllAsync<Session>(
      'SELECT * FROM sessions WHERE syncedAt IS NULL ORDER BY startTime ASC'
    );
  }

  /**
   * Mark session as synced
   */
  public async markSessionSynced(localId: number, serverId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    await this.db.runAsync(
      'UPDATE sessions SET serverId = ?, syncedAt = ? WHERE id = ?',
      [serverId, Date.now(), localId]
    );
  }

  /**
   * Update session details
   */
  public async updateSession(
    sessionId: number,
    updates: Partial<Pick<Session, 'name' | 'description' | 'endTime'>>
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description);
    }
    if (updates.endTime !== undefined) {
      setClauses.push('endTime = ?');
      params.push(updates.endTime);
    }

    if (setClauses.length === 0) return;

    setClauses.push('updatedAt = ?');
    params.push(Date.now());
    params.push(sessionId);

    await this.db.runAsync(
      `UPDATE sessions SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }

  // UTILITY OPERATIONS

  /**
   * Get database statistics
   */
  public async getStats(): Promise<TrackingStats> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    const [
      locationCount,
      sessionCount,
      activeSessionCount,
      unsyncedLocationCount,
      unsyncedSessionCount
    ] = await Promise.all([
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM location_points'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions WHERE endTime IS NULL'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM location_points WHERE syncedAt IS NULL'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions WHERE syncedAt IS NULL')
    ]);

    return {
      totalLocations: locationCount?.count || 0,
      totalSessions: sessionCount?.count || 0,
      activeSessions: activeSessionCount?.count || 0,
      unsyncedLocations: unsyncedLocationCount?.count || 0,
      unsyncedSessions: unsyncedSessionCount?.count || 0
    };
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  /**
   * Clear all data (for testing or reset purposes)
   */
  public async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    await this.db.execAsync(`
      DELETE FROM location_points;
      DELETE FROM sessions;
      UPDATE db_init_status SET isInitialized = 1 WHERE id = 1;
    `);
  }
}

// Export the singleton instance
const db = LocationTrackingDB.getInstance();

export default db;
export { LocationTrackingDB };


// Usage example:
/*
// Initialize the database
await LocationDB.initialize();

// Create a session
const sessionId = await LocationDB.createSession({
  name: "Morning Run",
  startTime: Date.now(),
  userId: "user123"
});

// Add location points
await LocationDB.insertLocationPoint({
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  timestamp: Date.now()
});

// Get session locations with pagination
const result = await LocationDB.getSessionLocations(sessionId, {
  limit: 50,
  offset: 0
});

// End the session
await LocationDB.endSession(sessionId);

// Get stats
const stats = await LocationDB.getStats();
console.log(stats);
*/