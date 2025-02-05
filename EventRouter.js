// To ensure high decoupling, I have designed a two layer routing system. The first layer (EventRouter) maps certain user interactions (i.e events) to routes. The second layer (Router) receives the route request, find the appropriate handler (from the ones registered in the main.js script) and calls it.

import { EventTypes } from 'web_lib/core/events.js';
import { globalState } from './state.js';

export class EventRouter {
    constructor(router) {
        this.router = router;
        this._setupEventListeners();
    }

    _setupEventListeners() {
        document.addEventListener(EventTypes.ELEMENT_SLIDE, e => {
            if (e.target.id === 'main-slider') {
                const screen = globalState.MAIN_SCREENS[e.detail.index];
                if (screen) {
                    this.router.handleRoute(screen.path);
                }
            }
        });

        document.addEventListener(EventTypes.NAV_ITEM_SELECTED, e => {
            const screen = globalState.MAIN_SCREENS[e.detail.index];
            if (screen) {
                // No need to pass index anymore
                this.router.handleRoute(screen.path);
            }
        });

    }
}