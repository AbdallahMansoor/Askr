// DOM expects a string for event names, so we can't just use a symbol/enum for event names.
export const EventTypes = {
    SCREEN_SLIDE: 'screen:slide',
    NAV_ITEM_SELECTED: 'nav:item:selected',
};

// the consumer app should have a central controller that picks up the emitted events (by using document.addEventListener) from different components and calls the setState method of the other components that should react to a given event.
