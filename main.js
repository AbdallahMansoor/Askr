// the controller that listens to the events (by using document.addEventListener) and calls the setState method of the other components that should react to a given event.

import { EventTypes } from 'web_lib/core/events.js';
import { globalState } from 'web_lib/core/state.js';

document.addEventListener(EventTypes.SCREEN_SLIDE, (e) => {
    console.log('Main.js received SCREEN_SLIDE event:', e.detail.index);
    globalState.activeIndex = e.detail.index;
    const navBar = document.querySelector('nav-bar');
    navBar.setState({ activeIndex: e.detail.index });
});


document.addEventListener(EventTypes.NAV_ITEM_SELECTED, (e) => {
    console.log('Main.js received NAV_ITEM_SELECTED event:', e.detail.index);
    const slidableSheet = document.querySelector('slidable-sheet');
    slidableSheet.setState({ activeIndex: e.detail.index }, false); // Add rerender: false flag
});;