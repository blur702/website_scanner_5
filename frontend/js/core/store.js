/**
 * Store Service
 * Manages application state with reactive updates
 */
class Store {
    constructor(initialState = {}) {
        this.state = {};
        this.subscribers = new Map();
        this.middlewares = [];
        
        // Initialize state
        this.setState(initialState);
    }

    /**
     * Get state value by path
     */
    get(path) {
        if (!path) return this.state;
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * Set state value by path
     */
    set(path, value) {
        if (!path) {
            throw new Error('Path is required');
        }

        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!(key in obj)) {
                obj[key] = {};
            }
            return obj[key];
        }, this.state);

        const oldValue = target[lastKey];
        if (oldValue === value) return;

        target[lastKey] = value;
        this.notify({ path, value, oldValue });
    }

    /**
     * Subscribe to state changes
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        this.subscribers.get(path).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(path);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(path);
                }
            }
        };
    }

    /**
     * Notify subscribers of state change
     */
    notify(change) {
        // Notify exact path subscribers
        this.notifyPath(change.path, change);

        // Notify parent path subscribers
        const parts = change.path.split('.');
        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('.');
            this.notifyPath(parentPath, change);
        }

        // Notify root subscribers
        this.notifyPath('*', change);
    }

    /**
     * Notify subscribers of a specific path
     */
    notifyPath(path, change) {
        const subscribers = this.subscribers.get(path);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(change);
                } catch (error) {
                    console.error('Error in store subscriber:', error);
                }
            });
        }
    }

    /**
     * Add middleware
     */
    use(middleware) {
        this.middlewares.push(middleware);
        return () => {
            const index = this.middlewares.indexOf(middleware);
            if (index >= 0) this.middlewares.splice(index, 1);
        };
    }

    /**
     * Set multiple state values at once
     */
    setState(updates) {
        Object.entries(this.flattenObject(updates)).forEach(([path, value]) => {
            this.set(path, value);
        });
    }

    /**
     * Reset state to initial values
     */
    reset(paths = null) {
        if (paths === null) {
            this.state = {};
            this.notify({ path: '*', value: this.state, oldValue: null });
        } else {
            const pathList = Array.isArray(paths) ? paths : [paths];
            pathList.forEach(path => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const target = keys.reduce((obj, key) => obj?.[key], this.state);
                if (target && lastKey in target) {
                    const oldValue = target[lastKey];
                    delete target[lastKey];
                    this.notify({ path, value: undefined, oldValue });
                }
            });
        }
    }

    /**
     * Watch multiple paths for changes
     */
    watch(paths, callback) {
        const unsubscribers = (Array.isArray(paths) ? paths : [paths])
            .map(path => this.subscribe(path, callback));

        // Return function to unsubscribe from all paths
        return () => unsubscribers.forEach(unsub => unsub());
    }

    /**
     * Create a computed value that updates when dependencies change
     */
    compute(dependencies, compute) {
        let value = compute();
        const update = () => {
            const newValue = compute();
            if (newValue !== value) {
                value = newValue;
            }
        };

        const unsubscribe = this.watch(dependencies, update);
        return {
            get: () => value,
            unsubscribe
        };
    }

    /**
     * Batch multiple state updates
     */
    batch(updates) {
        const changes = new Map();
        
        // Collect all changes
        Object.entries(this.flattenObject(updates)).forEach(([path, value]) => {
            const oldValue = this.get(path);
            if (oldValue !== value) {
                changes.set(path, { value, oldValue });
                
                const keys = path.split('.');
                const lastKey = keys.pop();
                const target = keys.reduce((obj, key) => {
                    if (!(key in obj)) obj[key] = {};
                    return obj[key];
                }, this.state);
                
                target[lastKey] = value;
            }
        });

        // Notify all changes at once
        changes.forEach((change, path) => {
            this.notify({ path, ...change });
        });
    }

    /**
     * Flatten nested object into dot notation
     */
    flattenObject(obj, prefix = '') {
        return Object.entries(obj).reduce((flat, [key, value]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(flat, this.flattenObject(value, path));
            } else {
                flat[path] = value;
            }
            return flat;
        }, {});
    }

    /**
     * Create a local store that syncs with a subset of the main store
     */
    createLocalStore(path) {
        const localStore = new Store(this.get(path) || {});
        
        // Sync from main to local
        this.subscribe(path, ({ value }) => {
            localStore.setState(value || {});
        });

        // Sync from local to main
        localStore.subscribe('*', ({ path: localPath, value }) => {
            const globalPath = path ? `${path}.${localPath}` : localPath;
            this.set(globalPath, value);
        });

        return localStore;
    }

    /**
     * Persist state to storage
     */
    persist(key, paths = null) {
        // Load initial state
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                this.setState(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Failed to load persisted state:', error);
        }

        // Save state changes
        this.use(({ path, value }) => {
            if (paths === null || paths.some(p => path.startsWith(p))) {
                try {
                    const state = paths === null ? this.state :
                        paths.reduce((obj, p) => {
                            obj[p] = this.get(p);
                            return obj;
                        }, {});
                    localStorage.setItem(key, JSON.stringify(state));
                } catch (error) {
                    console.error('Failed to persist state:', error);
                }
            }
        });
    }
}

// Create and export singleton instance
const store = new Store();
export default store;