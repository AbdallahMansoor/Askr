// core/events.js
// DOM expects a string for event names, so we can't just use a symbol/enum for event names.
export const EventTypes = {
    ELEMENT_SLIDE: 'element-slide',
    NAV_ITEM_SELECTED: 'nav:item:selected',
    CARD_CLICK: 'card:click',
};
