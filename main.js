import { EventTypes } from 'web_lib/core/events.js';
import { Transitions } from 'web_lib/core/transitions.js';
import { globalState } from './state.js';
import { EventRouter } from './EventRouter.js';
import { Navigator } from './Navigator.js';



const navigator = new Navigator();
const eventRouter = new EventRouter(navigator);

navigator.registerRoute('/:mainscreens', ({ to, params, data }) => {
    // Get index from the path itself
    const index = globalState._getIndexFromPaths(to, globalState.MAIN_SCREENS);
    globalState.activeIndex = index;
    if (index === null) return;

    const navBar = document.querySelector('nav-bar');
    const elementsSlider = document.querySelector('elements-slider');

    navBar.setState({ activeIndex: index });
    elementsSlider.setState({ activeIndex: index }, false);
});
