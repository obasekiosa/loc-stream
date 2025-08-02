import * as SQLite from 'expo-sqlite';

// Type definitions
export interface SessionData {
  sessionId: string;
  userId?: string | null;
  deviceInfo?: string | null;
  appVersion?: string | null;
}

export interface LocationData {
  sessionId: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isSignificant?: number;
  batteryLevel?: number | null;
}

export interface UserPreferences {
  trackingEnabled?: number;
  locationAccuracy?: string;
  syncInterval?: number;
  dataRetentionDays?: number;
  privacyMode?: number;
}

export interface GeographicBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DatabaseStats {
  totalSessions: number;
  activeSessions: number;
  totalLocations: number;
  databaseSize: number;
}

export interface CleanupResult {
  locationsDeleted: number;
  sessionsDeleted: number;
}

export interface SessionRecord {
  id: number;
  session_id: string;
  user_id?: string;
  start_time: number;
  end_time?: number;
  device_info?: string;
  app_version?: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface LocationRecord {
  id: number;
  session_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
  address?: string;
  city?: string;
  country?: string;
  is_significant: number;
  battery_level?: number;
  created_at: number;
}

export interface UserPreferencesRecord {
  id: number;
  user_id: string;
  tracking_enabled: number;
  location_accuracy: string;
  sync_interval: number;
  data_retention_days: number;
  privacy_mode: number;
  created_at: number;
  updated_at: number;
}

// Database initialization states
enum InitializationState {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  FAILED = 'FAILED',
  CLOSED = 'CLOSED'
}

// Metadata table keys
enum MetadataKey {
  DB_INITIALIZED = 'db_initialized',
  DB_VERSION = 'db_version',
  LAST_INIT_TIMESTAMP = 'last_init_timestamp',
  INITIALIZATION_STATE = 'initialization_state'
}

class LocationTrackingDB {
  private static instance: LocationTrackingDB | null = null;
  private static readonly DB_NAME = 'LocationTracker.db';
  private static readonly DB_VERSION = 1;
  
  private db: SQLite.SQLiteDatabase | null = null;
  private initializationState: InitializationState = InitializationState.NOT_INITIALIZED;
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;
  private pendingOperations: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private persistentStateCheckPromise: Promise<boolean> | null = null;

  // Private constructor to enforce singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): LocationTrackingDB {
    if (!LocationTrackingDB.instance) {
      LocationTrackingDB.instance = new LocationTrackingDB();
    }
    return LocationTrackingDB.instance;
  }

  // Initialize database with proper error handling and state management
  public async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.initializationState === InitializationState.INITIALIZED) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationState === InitializationState.INITIALIZING && this.initializationPromise) {
      return this.initializationPromise;
    }

    // Check persistent initialization state first (with synchronization)
    const persistentState = await this.checkPersistentInitializationStateSafe();
    
    // If already initialized persistently and in memory, return immediately
    // @ts-ignore
    if (persistentState && this.initializationState === InitializationState.INITIALIZED) {
      return;
    }

    // If previous initialization failed, retry
    if (this.initializationState === InitializationState.FAILED) {
      this.initializationError = null;
    }

    // Start initialization
    this.initializationState = InitializationState.INITIALIZING;
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
      this.initializationState = InitializationState.INITIALIZED;
      await this.setPersistentInitializationState(InitializationState.INITIALIZED);
      console.log('Database initialized successfully');
      
      // Process any queued operations
      await this.processQueuedOperations();
    } catch (error) {
      this.initializationState = InitializationState.FAILED;
      this.initializationError = error as Error;
      await this.setPersistentInitializationState(InitializationState.FAILED);
      console.error('Database initialization failed:', error);
      throw error;
    } finally {
      // Reset promises
      this.initializationPromise = null;
      this.persistentStateCheckPromise = null;
    }
  }

  // Perform the actual database initialization
  private async performInitialization(): Promise<void> {
    try {
      // Check if we're still in initializing state (app might have been closed)
      if (this.initializationState !== InitializationState.INITIALIZING) {
        throw new Error('Initialization was cancelled');
      }

      // If database is already open from persistent state check, use it
      if (!this.db) {
        this.db = await SQLite.openDatabaseAsync(LocationTrackingDB.DB_NAME);
      }
      
      // Check again after async operation
      if (this.initializationState !== InitializationState.INITIALIZING) {
        await this.db.closeAsync();
        this.db = null;
        throw new Error('Initialization was cancelled');
      }

      await this.createTables();
      
      // Final check
      if (this.initializationState !== InitializationState.INITIALIZING) {
        await this.db.closeAsync();
        this.db = null;
        throw new Error('Initialization was cancelled');
      }

      // Mark as initialized in persistent storage
      await this.setPersistentInitializationState(InitializationState.INITIALIZING);
    } catch (error) {
      if (this.db) {
        try {
          await this.db.closeAsync();
        } catch (closeError) {
          console.error('Error closing database during failed initialization:', closeError);
        }
        this.db = null;
      }
      throw error;
    }
  }

  // Ensure database is ready before operations
  private async ensureInitialized(): Promise<void> {
    if (this.initializationState === InitializationState.INITIALIZED) {
      return;
    }

    if (this.initializationState === InitializationState.FAILED) {
      throw new Error(`Database initialization failed: ${this.initializationError?.message}`);
    }

    if (this.initializationState === InitializationState.CLOSED) {
      throw new Error('Database has been closed');
    }

    if (this.initializationState === InitializationState.NOT_INITIALIZED) {
      await this.init();
    } else if (this.initializationState === InitializationState.INITIALIZING) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
    }
  }

  // Queue operations when database is not ready
  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await this.ensureInitialized();
      return await operation();
    } catch (error) {
      // If initialization failed or database is not ready, queue the operation
      if (this.initializationState !== InitializationState.INITIALIZED) {
        return new Promise((resolve, reject) => {
          this.pendingOperations.push(async () => {
            try {
              const result = await operation();
              resolve(result);
              return result;
            } catch (opError) {
              reject(opError);
              throw opError;
            }
          });
        });
      }
      throw error;
    }
  }

  // Process queued operations after successful initialization
  private async processQueuedOperations(): Promise<void> {
    if (this.isProcessingQueue || this.pendingOperations.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    try {
      for (const operation of operations) {
        await operation();
      }
    } catch (error) {
      console.error('Error processing queued operations:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Create all necessary tables
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.createMetadataTable();
    await this.createSessionsTable();
    await this.createLocationsTable();
    await this.createUserPreferencesTable();
  }

  // Metadata table - stores persistent database state and configuration
  private async createMetadataTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `;
    
    await this.db.execAsync(query);
    
    // Set initial metadata values if they don't exist
    await this.setMetadataIfNotExists(MetadataKey.DB_VERSION, LocationTrackingDB.DB_VERSION.toString());
    await this.setMetadataIfNotExists(MetadataKey.LAST_INIT_TIMESTAMP, Math.floor(Date.now() / 1000).toString());
  }

  // Sessions table - tracks user sessions
  private async createSessionsTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        device_info TEXT,
        app_version TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `;
    
    await this.db.execAsync(query);
    
    // Create indexes for better performance
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);');
  }

  // Locations table - stores location data
  private async createLocationsTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL,
        accuracy REAL,
        speed REAL,
        heading REAL,
        timestamp INTEGER NOT NULL,
        address TEXT,
        city TEXT,
        country TEXT,
        is_significant INTEGER DEFAULT 0,
        battery_level REAL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
    `;
    
    await this.db.execAsync(query);
    
    // Create indexes for better query performance
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_locations_session_id ON locations(session_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);');
  }

  // User preferences table - stores app settings
  private async createUserPreferencesTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        tracking_enabled INTEGER DEFAULT 1,
        location_accuracy TEXT DEFAULT 'high',
        sync_interval INTEGER DEFAULT 300,
        data_retention_days INTEGER DEFAULT 30,
        privacy_mode INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `;
    
    await this.db.execAsync(query);
  }

  // SESSION MANAGEMENT METHODS

  // Start a new session
  public async startSession(sessionData: SessionData): Promise<string> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const {
        sessionId,
        userId = null,
        deviceInfo = null,
        appVersion = null
      } = sessionData;

      const query = `
        INSERT INTO sessions (session_id, user_id, start_time, device_info, app_version)
        VALUES (?, ?, ?, ?, ?);
      `;
      
      const startTime = Math.floor(Date.now() / 1000);
      
      await this.db.runAsync(query, [sessionId, userId, startTime, deviceInfo, appVersion]);
      console.log('Session started:', sessionId);
      return sessionId;
    });
  }

  // End a session
  public async endSession(sessionId: string): Promise<void> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const endTime = Math.floor(Date.now() / 1000);
      const query = `
        UPDATE sessions 
        SET end_time = ?, is_active = 0, updated_at = ?
        WHERE session_id = ?;
      `;
      
      await this.db.runAsync(query, [endTime, endTime, sessionId]);
      console.log('Session ended:', sessionId);
    });
  }

  // Get active session
  public async getActiveSession(userId?: string): Promise<SessionRecord | null> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      let query = 'SELECT * FROM sessions WHERE is_active = 1';
      const params: any[] = [];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY start_time DESC LIMIT 1;';
      
      const result = await this.db.getFirstAsync(query, params);
      return result as SessionRecord | null;
    });
  }

  // LOCATION TRACKING METHODS

  // Add location data
  public async addLocation(locationData: LocationData): Promise<number> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const {
        sessionId,
        latitude,
        longitude,
        altitude = null,
        accuracy = null,
        speed = null,
        heading = null,
        timestamp = Math.floor(Date.now() / 1000),
        address = null,
        city = null,
        country = null,
        isSignificant = 0,
        batteryLevel = null
      } = locationData;

      const query = `
        INSERT INTO locations (
          session_id, latitude, longitude, altitude, accuracy, speed, 
          heading, timestamp, address, city, country, is_significant, battery_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      const result = await this.db.runAsync(query, [
        sessionId, latitude, longitude, altitude, accuracy, speed,
        heading, timestamp, address, city, country, isSignificant, batteryLevel
      ]);
      
      console.log('Location added:', result.lastInsertRowId);
      return result.lastInsertRowId as number;
    });
  }

  // Get locations for a session
  public async getSessionLocations(sessionId: string, limit: number = 1000): Promise<LocationRecord[]> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const query = `
        SELECT * FROM locations 
        WHERE session_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?;
      `;

      const result = await this.db.getAllAsync(query, [sessionId, limit]);
      return result as LocationRecord[];
    });
  }

  // Get locations within time range
  public async getLocationsByTimeRange(
    startTime: number, 
    endTime: number, 
    sessionId?: string
  ): Promise<LocationRecord[]> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      let query = `
        SELECT l.*, s.user_id 
        FROM locations l
        LEFT JOIN sessions s ON l.session_id = s.session_id
        WHERE l.timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (sessionId) {
        query += ' AND l.session_id = ?';
        params.push(sessionId);
      }

      query += ' ORDER BY l.timestamp DESC;';

      const result = await this.db.getAllAsync(query, params);
      return result as LocationRecord[];
    });
  }

  // Get locations within geographic bounds
  public async getLocationsByBounds(
    bounds: GeographicBounds, 
    sessionId?: string
  ): Promise<LocationRecord[]> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const { north, south, east, west } = bounds;
      
      let query = `
        SELECT * FROM locations 
        WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ?
      `;
      const params: any[] = [south, north, west, east];

      if (sessionId) {
        query += ' AND session_id = ?';
        params.push(sessionId);
      }

      query += ' ORDER BY timestamp DESC;';

      const result = await this.db.getAllAsync(query, params);
      return result as LocationRecord[];
    });
  }

  // USER PREFERENCES METHODS

  // Set user preferences
  public async setUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const {
        trackingEnabled = 1,
        locationAccuracy = 'high',
        syncInterval = 300,
        dataRetentionDays = 30,
        privacyMode = 0
      } = preferences;

      const query = `
        INSERT OR REPLACE INTO user_preferences 
        (user_id, tracking_enabled, location_accuracy, sync_interval, data_retention_days, privacy_mode, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

      const updatedAt = Math.floor(Date.now() / 1000);

      await this.db.runAsync(query, [
        userId, trackingEnabled, locationAccuracy, syncInterval, 
        dataRetentionDays, privacyMode, updatedAt
      ]);
      console.log('User preferences updated for:', userId);
    });
  }

  // Get user preferences
  public async getUserPreferences(userId: string): Promise<UserPreferencesRecord | null> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const query = 'SELECT * FROM user_preferences WHERE user_id = ?;';
      const result = await this.db.getFirstAsync(query, [userId]);
      return result as UserPreferencesRecord | null;
    });
  }

  // UTILITY METHODS

  // Metadata management methods
  private async setMetadata(key: MetadataKey, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO metadata (key, value, updated_at)
      VALUES (?, ?, ?);
    `;
    
    const updatedAt = Math.floor(Date.now() / 1000);
    await this.db.runAsync(query, [key, value, updatedAt]);
  }

  private async setMetadataIfNotExists(key: MetadataKey, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR IGNORE INTO metadata (key, value)
      VALUES (?, ?);
    `;
    
    await this.db.runAsync(query, [key, value]);
  }

  private async getMetadata(key: MetadataKey): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT value FROM metadata WHERE key = ?;';
    const result = await this.db.getFirstAsync(query, [key]) as { value: string } | null;
    return result?.value || null;
  }

  // Check persistent initialization state with proper synchronization
  private async checkPersistentInitializationStateSafe(): Promise<boolean> {
    // If already checking, wait for the existing check
    if (this.persistentStateCheckPromise) {
      return this.persistentStateCheckPromise;
    }

    // Start the check and store the promise
    this.persistentStateCheckPromise = this.performPersistentStateCheck();
    
    try {
      const result = await this.persistentStateCheckPromise;
      return result;
    } finally {
      // Don't reset the promise here - let init() handle it
      // this.persistentStateCheckPromise = null;
    }
  }

  // Perform the actual persistent state check
  private async performPersistentStateCheck(): Promise<boolean> {
    // If we already have a database connection, check its state
    if (this.db) {
      try {
        const isInitialized = await this.checkCurrentDatabaseState();
        if (isInitialized) {
          this.initializationState = InitializationState.INITIALIZED;
          return true;
        }
      } catch (error) {
        console.error('Error checking current database state:', error);
        // Continue to open a new connection
      }
    }

    try {
      // Only open a new connection if we don't have one
      let tempDb: SQLite.SQLiteDatabase;
      let shouldCloseTemp = false;

      if (this.db) {
        tempDb = this.db;
      } else {
        tempDb = await SQLite.openDatabaseAsync(LocationTrackingDB.DB_NAME);
        shouldCloseTemp = true;
      }
      
      try {
        // Check if metadata table exists
        const tableExists = await tempDb.getFirstAsync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='metadata';
        `);
        
        if (!tableExists) {
          return false;
        }

        // Check initialization state
        const stateResult = await tempDb.getFirstAsync(
          'SELECT value FROM metadata WHERE key = ?;',
          [MetadataKey.INITIALIZATION_STATE]
        ) as { value: string } | null;

        const dbInitialized = await tempDb.getFirstAsync(
          'SELECT value FROM metadata WHERE key = ?;',
          [MetadataKey.DB_INITIALIZED]
        ) as { value: string } | null;

        const isInitialized = stateResult?.value === InitializationState.INITIALIZED && 
                             dbInitialized?.value === 'true';

        if (isInitialized) {
          // Reuse the connection if we opened a temp one and don't have a main one
          if (!this.db && shouldCloseTemp) {
            this.db = tempDb;
            shouldCloseTemp = false;
          }
          this.initializationState = InitializationState.INITIALIZED;
          return true;
        }

        return false;
      } finally {
        // Only close if it's a temporary connection we won't reuse
        if (shouldCloseTemp) {
          await tempDb.closeAsync();
        }
      }
    } catch (error) {
      console.log('No existing database found or error checking state:', error);
      return false;
    }
  }

  // Check the current database connection state
  private async checkCurrentDatabaseState(): Promise<boolean> {
    if (!this.db) return false;

    try {
      // Check if metadata table exists
      const tableExists = await this.db.getFirstAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='metadata';
      `);
      
      if (!tableExists) {
        return false;
      }

      // Check initialization state
      const stateResult = await this.db.getFirstAsync(
        'SELECT value FROM metadata WHERE key = ?;',
        [MetadataKey.INITIALIZATION_STATE]
      ) as { value: string } | null;

      const dbInitialized = await this.db.getFirstAsync(
        'SELECT value FROM metadata WHERE key = ?;',
        [MetadataKey.DB_INITIALIZED]
      ) as { value: string } | null;

      return stateResult?.value === InitializationState.INITIALIZED && 
             dbInitialized?.value === 'true';
    } catch (error) {
      console.error('Error checking current database state:', error);
      return false;
    }
  }

  // Set persistent initialization state
  private async setPersistentInitializationState(state: InitializationState): Promise<void> {
    if (!this.db) return;

    try {
      await this.setMetadata(MetadataKey.INITIALIZATION_STATE, state);
      await this.setMetadata(MetadataKey.DB_INITIALIZED, 
        state === InitializationState.INITIALIZED ? 'true' : 'false');
      await this.setMetadata(MetadataKey.LAST_INIT_TIMESTAMP, 
        Math.floor(Date.now() / 1000).toString());
    } catch (error) {
      console.error('Failed to set persistent initialization state:', error);
    }
  }

  // Example method demonstrating non-null WHERE clauses
  public async getLocationsWithNonNullValues(sessionId: string): Promise<LocationRecord[]> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      // Different ways to check for non-null values in SQLite:
      const query = `
        SELECT * FROM locations 
        WHERE session_id = ?
        AND accuracy IS NOT NULL          -- Check for non-null accuracy
        AND speed IS NOT NULL            -- Check for non-null speed
        AND altitude IS NOT NULL         -- Check for non-null altitude
        AND address IS NOT NULL          -- Check for non-null address
        AND address != ''                -- Also exclude empty strings
        AND city IS NOT NULL 
        AND city != ''
        AND battery_level IS NOT NULL
        ORDER BY timestamp DESC;
      `;

      const result = await this.db.getAllAsync(query, [sessionId]);
      return result as LocationRecord[];
    });
  }

  // Get sessions with complete information (non-null values)
  public async getCompleteSessions(): Promise<SessionRecord[]> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const query = `
        SELECT * FROM sessions 
        WHERE user_id IS NOT NULL 
        AND device_info IS NOT NULL 
        AND app_version IS NOT NULL
        AND end_time IS NOT NULL         -- Only completed sessions
        ORDER BY start_time DESC;
      `;

      const result = await this.db.getAllAsync(query);
      return result as SessionRecord[];
    });
  }

  // Clean old data based on retention policy
  public async cleanOldData(retentionDays: number = 30): Promise<CleanupResult> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const cutoffTime = Math.floor(Date.now() / 1000) - (retentionDays * 24 * 60 * 60);
      
      // Delete old locations
      const locationsResult = await this.db.runAsync(
        'DELETE FROM locations WHERE timestamp < ?;',
        [cutoffTime]
      );
      
      // Delete old inactive sessions
      const sessionsResult = await this.db.runAsync(
        'DELETE FROM sessions WHERE is_active = 0 AND start_time < ?;',
        [cutoffTime]
      );

      console.log(`Cleaned ${locationsResult.changes} old locations and ${sessionsResult.changes} old sessions`);
      
      return {
        locationsDeleted: locationsResult.changes || 0,
        sessionsDeleted: sessionsResult.changes || 0
      };
    });
  }

  // Get database statistics
  public async getStats(): Promise<DatabaseStats> {
    return this.executeOperation(async () => {
      if (!this.db) throw new Error('Database not initialized');

      const totalSessions = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM sessions;') as { count: number };
      const activeSessions = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1;') as { count: number };
      const totalLocations = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM locations;') as { count: number };
      const dbSize = await this.db.getFirstAsync("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();") as { size: number };

      return {
        totalSessions: totalSessions.count,
        activeSessions: activeSessions.count,
        totalLocations: totalLocations.count,
        databaseSize: dbSize.size
      };
    });
  }

  // Get initialization state
  public getInitializationState(): InitializationState {
    return this.initializationState;
  }

  // Check if database is ready
  public isReady(): boolean {
    return this.initializationState === InitializationState.INITIALIZED;
  }

  // Close database connection and reset singleton
  public async close(): Promise<void> {
    this.initializationState = InitializationState.CLOSED;
    
    // Set persistent state before closing
    if (this.db) {
      try {
        await this.setPersistentInitializationState(InitializationState.CLOSED);
      } catch (error) {
        console.error('Error setting persistent state on close:', error);
      }
    }
    
    // Cancel any pending operations
    this.initializationPromise = null;
    this.persistentStateCheckPromise = null;

    // Clear pending operations
    this.pendingOperations = [];

    if (this.db) {
      try {
        await this.db.closeAsync();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
      }
      this.db = null;
    }

    // Reset singleton instance
    LocationTrackingDB.instance = null;
  }
}

// Export the database class and types
export default LocationTrackingDB;
export { InitializationState, MetadataKey };

// Usage example:
/*
import LocationTrackingDB, { SessionData, LocationData } from './LocationTrackingDB';

// Get singleton instance
const db = LocationTrackingDB.getInstance();

// Initialize database (safe to call multiple times)
try {
  await db.init();
} catch (error) {
  console.error('Failed to initialize database:', error);
  // Handle initialization failure
}

// Check if ready
if (db.isReady()) {
  // Start a session
  const sessionData: SessionData = {
    sessionId: 'session_' + Date.now(),
    userId: 'user123',
    deviceInfo: JSON.stringify({ platform: 'ios', model: 'iPhone 12' }),
    appVersion: '1.0.0'
  };
  
  const sessionId = await db.startSession(sessionData);

  // Add location
  const locationData: LocationData = {
    sessionId,
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 5,
    timestamp: Math.floor(Date.now() / 1000),
    city: 'San Francisco',
    country: 'USA'
  };
  
  await db.addLocation(locationData);

  // Get session locations
  const locations = await db.getSessionLocations(sessionId);

  // End session
  await db.endSession(sessionId);
}

// Operations can be called even during initialization - they will be queued
// const activeSession = await db.getActiveSession('user123');
*/