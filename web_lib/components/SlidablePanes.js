//- the initial offset can be changed to any value or zero directly in the code.I defaulted it to be: quarter pane + one space, so that starting from the second pane it will be centered and the quarter of the adjacent panes will be visible on both sides. (assuming that the host width is: one and a half pane + two spaces)
// --------------------------------------------------------------------



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
