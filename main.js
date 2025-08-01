import { EventTypes } from 'web_lib/core/events.js';
import { Transitions } from 'web_lib/core/transitions.js';
import { globalState } from './state.js';
import { EventRouter } from './EventRouter.js';
import { Router } from './Router.js';



const router = new Router();
const eventRouter = new EventRouter(router);

router.registerRouteHandler('/:mainscreen', ({ to, from, params, data }) => {
    // todo:
    // we need to check the "from" to see if we are coming from a child screen and handle transitions accordingly
    // get index from the path
    const index = globalState._getIndexFromPaths(to, globalState.MAIN_SCREENS);
    if (index === null) {
        const defaultScreen = globalState.MAIN_SCREENS.find(s => s.default)?.path;
        router.handleRoute(defaultScreen, {}, true);
        return;
    }

    globalState.activeIndex = index;

    const navBar = document.querySelector('nav-bar');
    const elementsSlider = document.querySelector('elements-slider');

    navBar.setState({ activeIndex: index });
    elementsSlider.setState({ activeIndex: index }, false);
});


router.registerRouteHandler('/home/question/:id', ({ to, from, params, data }) => {
    // Go to the question screen.
    // This should be work for internal and external/deep links navigation 
    // To accommodate for external links, the question screen should have navigation buttons to route back to the main screen.
});


// It all starts here. The server should always return the index.html file and the router will take care of the rest based on the URL.
// On initial load, validate current route
const initialRoute = window.location.pathname;
if (!router._findHandler(initialRoute)) {
    const defaultScreen = globalState.MAIN_SCREENS.find(s => s.default)?.path;
    // Replace invalid URL with default (doesn't add to history)
    history.replaceState({}, '', defaultScreen);
    router.handleRoute(defaultScreen, {}, true);
} else {
    // Valid initial route, just execute its handler
    router.handleRoute(initialRoute, {}, true);
}
