// web_lib/core/state.js
class GlobalState {
    constructor() {
        this.activeIndex = 1;
    }
    
    // Singleton instance
    static getInstance() {
        if (!GlobalState._instance) {
            GlobalState._instance = new GlobalState();
        }
        return GlobalState._instance;
    }
}

export const globalState = GlobalState.getInstance();