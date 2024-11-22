import { EventTypes } from 'web_lib/core/events.js';
import { globalState } from './state.js';

export class EventRouter {
    constructor(navigator) {
        this.navigator = navigator;
        this._setupEventListeners();
    }

    _setupEventListeners() {
        document.addEventListener(EventTypes.ELEMENT_SLIDE, e => {
            if (e.target.id === 'main-slider') {
                const screen = globalState.MAIN_SCREENS[e.detail.index];
                if (screen) {
                    this.navigator.navigate(screen.path);
                }
            }
        });

        document.addEventListener(EventTypes.NAV_ITEM_SELECTED, e => {
            const screen = globalState.MAIN_SCREENS[e.detail.index];
            if (screen) {
                // No need to pass index anymore
                this.navigator.navigate(screen.path);
            }
        });

    }
}