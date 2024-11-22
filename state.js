class GlobalState {
    constructor() {
        // Just the configuration, no route handling
        this.MAIN_SCREENS = [
            { path: '/inbox', index: 0 },
            { path: '/home', index: 1, default: true },
            { path: '/profile', index: 2 }
        ];
    }

    _getIndexFromPaths(path, paths) {
        return paths.find(config => config.path === path)?.index ?? null;
    }

    static getInstance() {
        if (!GlobalState._instance) {
            GlobalState._instance = new GlobalState();
        }
        return GlobalState._instance;
    }
}

export const globalState = GlobalState.getInstance();