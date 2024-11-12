

// components/SlidableSheet.js
import { EventTypes } from '../core/events.js';
import Component from '../core/Component.js';
import { globalState } from '../core/state.js';

export default class SlidablePanes extends Component {
    static get observedAttributes() {
        return [
            'active-index',
            'width',         // Host element width (e.g., "800px", "100%", "auto")
            'height',        // Host element height
            'wrapper-width',
            'wrapper-height',
            'pane-width',    // Individual pane width
            'pane-height',   // Individual pane height
            'padding'       // Padding inside panes
        ];
    }

    constructor() {
        super();
        this.state = {
            activeIndex: globalState.activeIndex,
            isDragging: false,
            isPointerDown: false,
            startX: null,
            startY: null,
            currentX: null,
            // sheet positions relative to its initial state in the DOM.
            sheetLastPosition: null,
            sheetNewPosition: null,
            dragStartTime: null,
            totalPanes: 3, // Default value
            width: '100%',
            height: '100%',
            wrapperWidth: '100%',
            wrapperHeight: '100%',
            paneWidth: '100%',
            paneHeight: '100%',
            padding: '0px',
            spaceBetweenPanes: 0,
            computedPaneWidth: 0,   // Actual pixel width of panes
            initialOffset: 0,       // Initial offset to center panes
        };
        // Create observer to watch for slot changes
        this._slotObserver = new MutationObserver(this._handleSlotChanges);

    }

    get _container() {
        return this._shadow.querySelector('.wrapper');
    }

    _handleSlotChanges = (mutations) => {
        const newTotalPanes = this._countSlottedPanes();
        if (newTotalPanes !== this.state.totalPanes) {
            this.setState({ totalPanes: newTotalPanes });
        }
    };

    _countSlottedPanes() {
        // Count elements with slot attributes matching our pattern
        return this.querySelectorAll('[slot^="pane-"]').length;
    }

    _startObserving() {
        // Observe both direct children additions/removals and attribute changes
        this._slotObserver.observe(this, {
            childList: true,
            attributes: true,
            attributeFilter: ['slot'],
            subtree: false
        });
    }

    connectedCallback() {


        super.connectedCallback();

        // Start observing for changes
        this._startObserving();

        // use requestAnimationFrame to ensure the element is in the DOM before calculating layout
        requestAnimationFrame(() => {
            this._calculateLayout();
        });
    }

    disconnectedCallback() {
        if (this._container) {
            this._container.removeEventListener('pointerdown', this._handlePointerDown);
            this._container.removeEventListener('pointermove', this._handlePointerMove);
            this._container.removeEventListener('pointerup', this._handlePointerUp);
            this._container.removeEventListener('pointercancel', this._handlePointerUp);
        }
    }

    _processAttributes() {
        super._processAttributes();

        const newState = {
            width: this.props.width || this.state.width,
            height: this.props.height || this.state.height,
            wrapperWidth: this.props['wrapper-width'] || this.state.wrapperWidth,
            wrapperHeight: this.props['wrapper-height'] || this.state.wrapperHeight,
            paneWidth: this.props['pane-width'] || this.state.paneWidth,
            paneHeight: this.props['pane-height'] || this.state.paneHeight,
            padding: this.props.padding || this.state.padding
        };

        // Use setState to ensure proper layout recalculation
        this.setState(newState, false);
    }


    setState(newState, rerender = true) {
        const layoutProperties = [
            'totalPanes', 'width', 'height', 'wrapperWidth', 'wrapperHeight', 'paneWidth', 'paneHeight', 'padding'
        ];

        const needsLayoutRecalculation = layoutProperties.some(prop => prop in newState);

        if (needsLayoutRecalculation) {
            // First update state and render
            super.setState(newState, rerender);
            // Then calculate layout after browser has processed the render
            requestAnimationFrame(() => {
                this._calculateLayout();
            });
            return;
        }

        super.setState(newState, rerender);
        if ('activeIndex' in newState) {
            this.goToPane(newState.activeIndex);
        }
    }


    _calculateLayout() {
        if (!this._container) return;

        const paneElements = this._container.querySelectorAll('.pane');
        const wrapperWidth = this._container.offsetWidth;
        const computedPaneWidth = paneElements[0].offsetWidth;
        const totalPanesWidth = this.state.totalPanes * computedPaneWidth;

        // Calculate extra space and spacing between panes
        const extraSpace = Math.max(0, wrapperWidth - totalPanesWidth);
        const spaceBetweenPanes = extraSpace / (this.state.totalPanes - 1);
        // initial  offset by quarter pane + one space to center the panes if there is extra space
        const initialOffset = extraSpace > 0 ? computedPaneWidth / 4 + spaceBetweenPanes : 0;


        // Position each pane absolutely
        paneElements.forEach((pane, index) => {
            // negating the result of _calculateTranslationForIndex to move the panes to the right
            const xPosition = initialOffset - this._calculateTranslationForIndex(index);
            pane.style.transform = `translateX(${xPosition}px)`;
            pane.style.position = 'absolute';
            pane.style.left = '0';
        });

        // Store calculated values for later use
        this.state.computedPaneWidth = computedPaneWidth;
        this.state.spaceBetweenPanes = spaceBetweenPanes;
        this.state.initialOffset = initialOffset;

        // Calculate and set wrapper position based on active index
        this.state.sheetNewPosition = this._calculateTranslationForIndex(this.state.activeIndex);
        this._container.style.transform = `translateX(${this.state.sheetNewPosition}px)`;
    }

    _calculateTranslationForIndex(index) {
        if (index < 0 || index >= this.state.totalPanes) return null;
        return -(index * (this.state.computedPaneWidth + this.state.spaceBetweenPanes));
    }

    goToPane(targetIndex, animate = true) {

        // Calculate target position using pane width and spacing
        const targetPosition = this._calculateTranslationForIndex(targetIndex);
        if (targetPosition === null) return;

        // Calculate animation duration based on distance
        const distance = Math.abs(targetPosition - this.state.sheetNewPosition);
        const duration = animate ? Math.min(Math.max(distance / 2500, 0.2), 0.3) : 0;

        // Apply animation
        this._container.style.transition = animate ? `transform ${duration}s ease-out` : 'none';
        this._container.style.transform = `translateX(${targetPosition}px)`;

        // Update state
        this.state.sheetNewPosition = targetPosition;
        this.state.activeIndex = targetIndex;

        //  To prevent animation during dragging. to follow the user's finger instantly.
        if (animate) {
            this._container.addEventListener('transitionend', () => {
                this._container.style.transition = 'none';
            }, { once: true });
        }

        // Emit event
        this.emitSlideEvent(targetIndex);
    }

    nextPane(animate = true) {
        this.goToPane(this.state.activeIndex + 1, animate);
    }

    previousPane(animate = true) {
        this.goToPane(this.state.activeIndex - 1, animate);
    }

    _handlePointerDown = (e) => {
        this.state.isPointerDown = true;
        // return the first touch x,y positions relative to the viewport
        this.state.startX = e.clientX;
        this.state.startY = e.clientY;
        this.state.currentX = e.clientX;
        this.state.sheetLastPosition = this.state.sheetNewPosition;
        e.target.setPointerCapture(e.pointerId);
        // store the time when the drag started to calculate the velocity
        this.state.dragStartTime = Date.now();
    };

    _handlePointerMove = (e) => {

        if (!this.state.isPointerDown) return;
        const deltaX = e.clientX - this.state.startX;
        const deltaY = e.clientY - this.state.startY;

        // If not dragging yet, determine the intended direction
        if (!this.state.isDragging) {
            // Only start dragging if horizontal movement is greater, to ensures we don't interfere with vertical scrolling. also, we need to move at least 5px to start dragging.
            if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY)) {
                this.state.isDragging = true;
                this._container.classList.add('dragging');
                this._container.style.transition = 'none';
            }
            return;
        }

        this.state.currentX = e.clientX;
        const dragDeltaX = this.state.currentX - this.state.startX;
        let newTranslateX = this.state.sheetLastPosition + dragDeltaX;

        // Add resistance at bounds
        const firstPanePosition = 0;
        const lastPanePosition = this._calculateTranslationForIndex(this.state.totalPanes - 1);


        if (newTranslateX > firstPanePosition) {
            // only move 0.2 of the user's drag beyond the bounds
            newTranslateX = firstPanePosition + (newTranslateX - firstPanePosition) * 0.2;
        } else if (newTranslateX < lastPanePosition) {
            newTranslateX = lastPanePosition + (newTranslateX - lastPanePosition) * 0.2;
        }

        this.state.sheetNewPosition = newTranslateX;
        this._container.style.transform = `translateX(${newTranslateX}px)`;
    };

    _handlePointerUp = (e) => {
        this.state.isPointerDown = false;
        // If we weren't dragging, no need for cleanup or calculations
        if (!this.state.isDragging) return;
        this.state.isDragging = false;

        if (e.pointerId) {
            e.target.releasePointerCapture(e.pointerId);
        }

        this._container.classList.remove('dragging');

        const deltaX = this.state.currentX - this.state.startX;
        const velocity = Math.abs(deltaX) / (Date.now() - this.state.dragStartTime);

        let newIndex = this.state.activeIndex;

        // slide if either threshold or velocity is high enough
        if (Math.abs(deltaX) > (this.state.computedPaneWidth * 0.25) || velocity > 0.3) {
            if (deltaX > 0 && newIndex > 0) {
                newIndex--;
            } else if (deltaX < 0 && newIndex < this.state.totalPanes - 1) {
                newIndex++;
            }
        }

        // Animate to the new index
        this.goToPane(newIndex, true);
    }

    _attachEventListeners() {
        if (!this._container) return;

        // Add event listeners (using platform-agnostic pointer events)
        this._container.addEventListener('pointerdown', this._handlePointerDown);
        this._container.addEventListener('pointermove', this._handlePointerMove);
        this._container.addEventListener('pointerup', this._handlePointerUp);
        this._container.addEventListener('pointercancel', this._handlePointerUp);
    }

    emitSlideEvent(index) {
        globalState.activeIndex = index;
        const event = new CustomEvent(EventTypes.PANE_SLIDE, {
            detail: { index },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }


    render() {
        this._createStyles(`
            :host {
                /* host width equation for optimal use should be: paneWidth + (wrapperWidth - totalPanesWidth) / totalPanes, assuming same unit used for width */

                display: block;    /* Allows component to follow normal flow */
                position: relative; /* Reference for inner absolutely positioned elements */
                overflow: hidden;  /* Contain sliding panes */
                box-sizing: border-box;
                user-select: none;
                -webkit-user-select: none;
                width: ${this.state.width};
                height: ${this.state.height};
                
            }

            *, *::before, *::after {
                box-sizing: inherit;
            }

            .wrapper {
                /* for testing setting width bigger */
                position: relative;
                width: ${this.state.wrapperWidth};
                height: ${this.state.wrapperHeight};
                will-change: transform;
                cursor: grab;
                touch-action: pan-y;
                
                
            }
                
            .wrapper.dragging {
                cursor: grabbing;
            }
            
            .pane {
                position: absolute;
                left: 0;
                width: ${this.state.paneWidth};
                min-width: ${this.state.paneWidth};
                height: ${this.state.paneHeight};
                padding: ${this.state.padding};
                overflow-y: auto;     /* Enables vertical scrolling within pane */
                overflow-x: hidden;   /* Prevents horizontal scrolling within pane */
                -webkit-overflow-scrolling: touch;
                /* prevent the browser from handling scrolling/panning x gestures, to avoid firing pointercancel events */
                touch-action: pan-y;
                
            }
            
            /* Prevent pane content selection during drag */
            .dragging {
                user-select: none;
                -webkit-user-select: none;
            }
            
            /* Hide scrollbar for WebKit browsers */
            .pane::-webkit-scrollbar {
                display: none;
            }

            /* select first pane and add background color for testing */
            .pane:nth-child(1) {
                background-color: hsla(0, 70%, 85%, 0.5);
                color: rgba(0, 0, 0, 0.7);
            }
            .pane:nth-child(2) {
                background-color: hsla(120, 70%, 85%, 0.5);
                color: rgba(0, 0, 0, 0.7);
            }
            .pane:nth-child(3) {
                background-color: hsla(240, 70%, 85%, 0.5);
                color: rgba(0, 0, 0, 0.7);
            }

        `);


        // DOM elements with 'slot' attributes are projected into Shadow DOM corresponding slots rather than being automatically rendered by the browser.
        const panes = Array(this.state.totalPanes).fill(0).map((_, index) => `
            <div class="pane">
                <slot name="pane-${index}"></slot>
            </div>
        `).join('');

        this._shadow.innerHTML = `
            <div class="wrapper">
                ${panes}
            </div>
        `;
        // Attach event listeners after rendering
        this._attachEventListeners();

    }
}

customElements.define('slidable-panes', SlidablePanes);

// core/Component.js
export default class Component extends HTMLElement {
    constructor() {
        super();
        this.state = {};
        this.props = {};
        this._shadow = this.attachShadow({ mode: 'open' });
    }

    // Lifecycle methods
    connectedCallback() {
        this._processAttributes();
        this.render();
        this._attachEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            // calling this._processAttributes() because sometimes the attributeChangedCallback is called before connectedCallback which results in rendering without processing the attributes, especially for the first load.
            this._processAttributes();
            this.render();
        }
    }

    // State management
    setState(newState, rerender = true) {
        this.state = { ...this.state, ...newState };
        if (rerender) {
            this.render();
        }
    }

    // Process attributes into props
    _processAttributes() {
        const attributes = this.getAttributeNames();
        attributes.forEach(attr => {
            const value = this.getAttribute(attr);
            this.props[attr] = value;
        });
    }

    // Abstract methods to be implemented by child classes
    render() {
        throw new Error('Render method must be implemented');
    }

    _attachEventListeners() {
        // Override in child components if needed
    }

    // Utility methods
    _createStyles(styles) {
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(styles);
        this._shadow.adoptedStyleSheets = [styleSheet];
    }
}

// main.js
// the controller that listens to the events (by using document.addEventListener) and calls the setState method of the other components that should react to a given event.

import { EventTypes } from 'web_lib/core/events.js';
import { globalState } from 'web_lib/core/state.js';

document.addEventListener(EventTypes.PANE_SLIDE, (e) => {
    // Check the id of the element that dispatched the event
    const sourceId = e.target.id;
    switch (sourceId) {
        case 'main-screens':
            globalState.activeIndex = e.detail.index;
            const navBar = document.querySelector('nav-bar');
            navBar.setState({ activeIndex: e.detail.index });
            break;
    }

});


document.addEventListener(EventTypes.NAV_ITEM_SELECTED, (e) => {
    const slidablePanes = document.querySelector('slidable-panes');
    slidablePanes.setState({ activeIndex: e.detail.index }, false);
});;

// index.html
< !DOCTYPE html >
    <html lang="en">

        <head>
            <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="ie=edge">
                        <title>Document</title>
                        <style cssReset>
                            *,
                            *::before,
                            *::after {
                                margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                            -webkit-tap-highlight-color: transparent;
        }

                            html,
                            body {
                                height: 100%;
                            line-height: 1.6;
                            -webkit-font-smoothing: antialiased;
        }

                            img,
                            picture,
                            video,
                            canvas,
                            svg {
                                display: block;
                            max-width: 100%;
        }

                            input,
                            button,
                            textarea,
                            select {
                                font: inherit;
        }

                            p,
                            h1,
                            h2,
                            h3,
                            h4,
                            h5,
                            h6 {
                                overflow - wrap: break-word;
        }

        /* center the slidable panes in the middle of the screen */
        /* #main-screens {
                                margin: auto;
                            position: relative;
                            top: 25%;
            
        } */
                            /* add background color to the body and the slidable panes */

                            body {
                                background - color: #f0f0f0;
        }

                            #main-screens {
                                background - color: #fff;
        }
                        </style>
                        <script type="module">
                            import 'web_lib/components/NavBar.js';
                            import 'web_lib/components/SlidablePanes.js';
                        </script>
                    </head>

                    <body>
                        <slidable-panes id="main-screens" total-panes="3" width="36vw" height="30vh" wrapper-width="66vw" pane-width="20vw"
                            pane-height="30vh">
                            <div slot="pane-0">
                                <h1>Pane 1 Content</h1>
                            </div>
                            <div slot="pane-1">
                                <h1>Pane 2 Content</h1>
                            </div>
                            <div slot="pane-2">
                                <h1>Pane 3 Content</h1>
                            </div>
                        </slidable-panes>

                        <!-- I've used claude opus to generate these SVGs. we set the active index to 1 in the global state -->
                        <nav-bar items='[
    {"icon": "M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"},
    {"icon": "M153.3-189.06v-376.49q0-17.99 7.92-34.03 7.92-16.04 22.26-26.56l250.94-188.32q19.92-15.25 45.47-15.25 25.55 0 45.69 15.25l250.94 188.32q14.34 10.52 22.34 26.56t8 34.03v376.49q0 31.49-22.22 53.62-22.21 22.14-53.7 22.14H599.47q-16 0-26.94-10.94-10.94-10.94-10.94-26.94v-212.54q0-16-10.93-26.94-10.94-10.93-26.94-10.93h-87.44q-16 0-26.94 10.93-10.93 10.94-10.93 26.94v212.54q0 16-10.94 26.94-10.94 10.94-26.94 10.94H229.06q-31.49 0-53.62-22.14-22.14-22.13-22.14-53.62Z", "viewBox": "0 -960 960 960"},
    {"icon": "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"}
    ]'></nav-bar>

                        <script type="module">
                            import './main.js'
                        </script>
                    </body>

                </html>