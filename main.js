// the controller that listens to the events (by using document.addEventListener) and calls the setState method of the other components that should react to a given event.

import { EventTypes } from 'web_lib/core/events.js';
import { globalState } from 'web_lib/core/state.js';

document.addEventListener(EventTypes.ELEMENT_SLIDE, (e) => {
    // Check the id of the element that dispatched the event
    const sourceId = e.target.id;
    switch (sourceId) {
        case 'main-slider':
            globalState.activeIndex = e.detail.index;
            const navBar = document.querySelector('nav-bar');
            navBar.setState({ activeIndex: e.detail.index });
            break;
    }

});


document.addEventListener(EventTypes.NAV_ITEM_SELECTED, (e) => {
    const elementsSlider = document.querySelector('elements-slider');
    elementsSlider.setState({ activeIndex: e.detail.index }, false);
});;