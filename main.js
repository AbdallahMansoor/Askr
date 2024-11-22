import { EventTypes } from 'web_lib/core/events.js';
import { Transitions } from 'web_lib/core/transitions.js';
import { globalState } from './state.js';
import { EventRouter } from './EventRouter.js';
import { Navigator } from './Navigator.js';



const navigator = new Navigator();
const eventRouter = new EventRouter(navigator);

navigator.registerRouteHandler('/:mainscreens', ({ to, params, data }) => {
    // get index from the path
    const index = globalState._getIndexFromPaths(to, globalState.MAIN_SCREENS);
    if (index === null) {
        const defaultScreen = globalState.MAIN_SCREENS.find(s => s.default)?.path;
        navigator.navigate(defaultScreen, {}, true);
        return;
    }

    globalState.activeIndex = index;

    const navBar = document.querySelector('nav-bar');
    const elementsSlider = document.querySelector('elements-slider');

    navBar.setState({ activeIndex: index });
    elementsSlider.setState({ activeIndex: index }, false);
});

// On initial load, validate current route
const initialRoute = window.location.pathname;
if (!navigator._findHandler(initialRoute)) {
    const defaultScreen = globalState.MAIN_SCREENS.find(s => s.default)?.path;
    // Replace invalid URL with default (doesn't add to history)
    history.replaceState({}, '', defaultScreen);
    navigator.navigate(defaultScreen, {}, true);
} else {
    // Valid initial route, just execute its handler
    navigator.navigate(initialRoute, {}, true);
}
