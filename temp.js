// core/Component.js
export default class Component extends HTMLElement {
    constructor() {
        super();
        this.state = {};
        this._shadow = this.attachShadow({ mode: 'open' });
    }

    // Lifecycle methods
    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        this._removeEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        // Convert kebab-case to camelCase 
        const camelCase = name.replace(/-([a-z])/g, g => g[1].toUpperCase());
        this.setState({ [camelCase]: newValue });
    }

    setState(newState, rerender = true) {
        const potentialNewState = { ...this.state, ...newState };
        const stateChanged = JSON.stringify(potentialNewState) !== JSON.stringify(this.state);
        if (!stateChanged) return;

        this.state = potentialNewState;

        if (rerender) this.render();

    }

    // Abstract methods to be implemented by child classes
    render() {
        this._createDOM();
        // use requestAnimationFrame to ensure elements are laid out before calculating or setting up layout
        requestAnimationFrame(() => {
            this._setupLayout();
            this._attachEventListeners();
        });
    }

    _createDOM() {
        // Override in child components if needed
    }

    _setupLayout() {
        // Override in child components if needed
    }

    _attachEventListeners() {
        // Override in child components if needed
    }

    _removeEventListeners() {
        // Override in child components if needed
    }

    // Utility methods
    _createStyles(styles, target = 'shadow') {
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(styles);
        if (target === 'shadow') {
            this._shadow.adoptedStyleSheets = [styleSheet];
        } else {
            // in case we need to style any elements within slotted and avoid the limitations of ::slotted() selector.
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
        }
    }
}



/* To achieve the pattern where the active element is centered (within the the slider parent) and the adjacent elements are partially visible on the sides, these are the equations that correlate the different variables:
assuming that we are using the same length unit(vw, px, etc), h is the width of the slider parent/host, t is the total width of the slider, e is the width of one element, n is the number of elements, s is the space between elements, p is the portion of x that will be visible on either one of the adjacent elements, and i is the initial offset of the slider: h=(1+2p)e+2s, t=e*n+s*(n-1), i=e*p+s. we usually start by deciding the s and p values, then we can proceed from there.
*/

// components/SlidableSheet.js
import { EventTypes } from '../core/events.js';
import Component from '../core/Component.js';
import { globalState } from '../core/state.js';

export default class ElementsSlider extends Component {
    // browser will automatically check observedAttributes when attributeChangedCallback is fired
    static get observedAttributes() {
        return [
            'active-index'
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
            sliderLastPosition: null,
            sliderNewPosition: null,
            dragStartTime: null,
            totalElements: null,
            computedElementWidth: 0,
            spaceBetweenElements: 0,
            initialOffset: 0,
        };

    }


    setState(newState, rerender = true) {


        // Check if activeIndex is being updated
        if ('activeIndex' in newState && newState.activeIndex !== this.state.activeIndex) {
            super.setState(newState, rerender);
            // Animate to new index first
            this.goToElement(newState.activeIndex);
            return;
        }

        super.setState(newState, rerender);
    }


    _setupLayout() {
        const elements = this.children;
        if (elements.length === 0) return;

        // Update total elements count if needed
        if (this.state.totalElements !== elements.length) {
            this.setState({ totalElements: elements.length }, false);
        }
        const sliderWidth = this.offsetWidth;
        const computedElementWidth = elements[0].offsetWidth;
        const totalElementsWidth = elements.length * computedElementWidth;
        const extraSpace = Math.max(0, sliderWidth - totalElementsWidth);
        const spaceBetweenElements = extraSpace / (elements.length - 1);
        // p is the portion of x that will be visible on either one of the adjacent elements.

        const initialOffset = extraSpace > 0 ? computedElementWidth * 0.25 + spaceBetweenElements : 0;

        this.setState({
            computedElementWidth,
            spaceBetweenElements,
            initialOffset
        }, false);

        // set the initial offset of the slider using relative positioning to make the future translation independent of the initial offset
        this.style.left = `${initialOffset}px`;


        // Position each element
        Array.from(elements).forEach((element, index) => {
            // negating the result because the _calculateTranslationForIndex was made to calculate the translation for the slider, not the internal elements.
            const xPosition = -this._calculateTranslationForIndex(index);
            element.style.position = 'absolute';
            element.style.left = `${xPosition}px`;
        });

        // translate the slider to the active index
        this.goToElement(this.state.activeIndex, false);


    }

    _calculateTranslationForIndex(index) {
        if (index < 0 || index >= this.state.totalElements) return null;
        // there is a minus sign because we are always gonna move towards the negative x-axis (the left) relative to slider initial position.
        return -index * (this.state.computedElementWidth + this.state.spaceBetweenElements);


    }



    goToElement(targetIndex, animate = true) {

        // Calculate target position
        const targetPosition = this._calculateTranslationForIndex(targetIndex);
        if (targetPosition === null) return;

        // Calculate animation duration based on distance
        const distance = Math.abs(targetPosition - this.state.sliderNewPosition);
        const duration = animate ? Math.min(Math.max(distance / 2500, 0.2), 0.3) : 0;

        // Update state
        this.setState({
            sliderNewPosition: targetPosition,
            activeIndex: targetIndex
        }, false);

        // Set up transition
        this.style.transition = animate ? `transform ${duration}s ease-out` : 'none';
        this.style.transform = `translateX(${targetPosition}px)`;



        //  To prevent animation during dragging. to follow the user's finger instantly.
        if (animate) {
            this.addEventListener('transitionend', () => {
                this.style.transition = 'none';
            }, { once: true });
        }

        // Emit event
        this.emitSlideEvent(targetIndex);
    }


    nextElement(animate = true) {
        this.goToElement(this.state.activeIndex + 1, animate);
    }

    previousElement(animate = true) {
        this.goToElement(this.state.activeIndex - 1, animate);
    }

    _handlePointerDown = (e) => {
        // Capture the pointer to ensure all events go to this element
        e.target.setPointerCapture(e.pointerId);

        this.setState({
            isPointerDown: true,
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            sliderLastPosition: this.state.sliderNewPosition,
            dragStartTime: Date.now()
        }, false); // Don't rerender as we're just storing values
    };

    _handlePointerMove = (e) => {
        if (!this.state.isPointerDown) return;
        const deltaX = e.clientX - this.state.startX;
        const deltaY = e.clientY - this.state.startY;

        // If not dragging yet, determine the intended direction
        if (!this.state.isDragging) {
            // Only start dragging if horizontal movement is greater, to ensures we don't interfere with vertical scrolling. also, we need to move at least 5px to start dragging.
            if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY)) {
                this.setState({ isDragging: true }, false);
                this.classList.add('dragging');
                this.style.transition = 'none';
            }
            return;
        }

        const dragDeltaX = e.clientX - this.state.startX;
        let newTranslateX = this.state.sliderLastPosition + dragDeltaX;

        // Apply bounds resistance
        const firstElementPosition = 0;
        const lastElementPosition = this._calculateTranslationForIndex(this.state.totalElements - 1);


        if (newTranslateX > firstElementPosition) {
            // only move 0.2 of the user's drag beyond the bounds
            newTranslateX = firstElementPosition + (newTranslateX - firstElementPosition) * 0.2;
        } else if (newTranslateX < lastElementPosition) {
            newTranslateX = lastElementPosition + (newTranslateX - lastElementPosition) * 0.2;
        }

        this.setState({
            currentX: e.clientX,
            sliderNewPosition: newTranslateX
        }, false);

        // Update transform immediately for smooth dragging
        this.style.transform = `translateX(${newTranslateX}px)`;
    };

    _handlePointerUp = (e) => {

        if (e.pointerId) {
            e.target.releasePointerCapture(e.pointerId);
        }

        // If we weren't dragging, just reset pointer state
        if (!this.state.isDragging) {
            this.setState({ isPointerDown: false }, false);
            return;
        }

        this.classList.remove('dragging');
        this.setState({
            isPointerDown: false,
            isDragging: false
        }, false);


        const deltaX = this.state.currentX - this.state.startX;
        const velocity = Math.abs(deltaX) / (Date.now() - this.state.dragStartTime);
        // slide if the user moved more than a quarter of the element width or the velocity is high enough
        const shouldSlide = Math.abs(deltaX) > (this.state.computedElementWidth * 0.25) || velocity > 0.3;

        if (shouldSlide) {
            const newIndex = deltaX > 0
                ? Math.max(0, this.state.activeIndex - 1)
                : Math.min(this.state.totalElements - 1, this.state.activeIndex + 1);

            this.goToElement(newIndex, true);
        } else {
            // Snap back to current element if movement wasn't enough
            this.goToElement(this.state.activeIndex, true);
        }
    }

    _attachEventListeners() {
        // Add event listeners (using platform-agnostic pointer events)
        this.addEventListener('pointerdown', this._handlePointerDown);
        this.addEventListener('pointermove', this._handlePointerMove);
        this.addEventListener('pointerup', this._handlePointerUp);
        this.addEventListener('pointercancel', this._handlePointerUp);
    }

    _removeEventListeners() {
        this.removeEventListener('pointerdown', this._handlePointerDown);
        this.removeEventListener('pointermove', this._handlePointerMove);
        this.removeEventListener('pointerup', this._handlePointerUp);
        this.removeEventListener('pointercancel', this._handlePointerUp);
    }

    emitSlideEvent(index) {
        globalState.activeIndex = index;
        this.dispatchEvent(new CustomEvent(EventTypes.ELEMENT_SLIDE, {
            detail: { index },
            bubbles: true,
            composed: true
        }));
    }


    _createDOM() {

        this._shadow.innerHTML = `
            <style>
                /* add overflow hidden to the parent of the slider to hide the scroll bar */
                :host {
                    display: block;    /* Allows component to follow normal flow */
                    position: relative; /* Reference for inner absolutely positioned elements */
                    overflow: hidden;  /* Contain sliding elements */
                    box-sizing: border-box;
                    touch-action: pan-y;
                    cursor: grab;
                    will-change: transform;
                }

                ::slotted(*) {
                    box-sizing: border-box;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    /* inherit is not working for some reason, had to use the same value */
                    touch-action: pan-y;
                    user-select: none;
                    -webkit-user-select: none;
                }

                :host(.dragging) {
                    cursor: grabbing;
                    user-select: none;
                    -webkit-user-select: none;
                }
                
            </style>

            <slot></slot>
        `;


    }
}

customElements.define('elements-slider', ElementsSlider);
// components/NavBar.js
// components/NavBar.js
import { EventTypes } from '../core/events.js';
import Component from '../core/Component.js';
import { globalState } from '../core/state.js';

export default class NavBar extends Component {
    static get observedAttributes() {
        return ['items', 'active-index'];
    }

    constructor() {
        super();
        this.state = {
            // Initialize with global state
            activeIndex: globalState.activeIndex
        };
        // Bind methods
        this._handleClick = this._handleClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();

    }

    _processAttributes() {
        super._processAttributes();
        // Parse items from JSON string if provided
        if (this.props.items) {
            try {
                this.props.items = JSON.parse(this.props.items);

            } catch (e) {
                console.error('Invalid items JSON in NavBar:', e);
                this.props.items = [];
            }
        }
        // Parse active index
        if (this.props['active-index']) {
            this.state.activeIndex = parseInt(this.props['active-index']) || 0;
        }
    }

    _handleClick(e) {
        const item = e.target.closest('.nav-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            // Update state
            globalState.activeIndex = index;
            this.setState({ activeIndex: index });
            // Emit event for other components
            const event = new CustomEvent(EventTypes.NAV_ITEM_SELECTED, {
                detail: { index },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
    }

    _attachEventListeners() {
        this._shadow.addEventListener('click', this._handleClick);
    }

    disconnectedCallback() {
        this._shadow.removeEventListener('click', this._handleClick);
    }

    render() {
        let items = this.props.items || [];
        const { activeIndex } = this.state;

        this._createStyles(`
            :host {
                display: block;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(250, 250, 250, 0.95);
                -webkit-backdrop-filter: blur(10px);
                backdrop-filter: blur(10px);
                border-top: 0.5px solid rgba(0, 0, 0, 0.2);
                padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }

            .nav-container {
                display: flex;
                justify-content: space-around;
                align-items: center;
                height: 55px;
                max-width: 500px;
                margin: 0 auto;
            }

            .nav-item {
                flex: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }

            .nav-icon {
                width: 32px;
                height: 32ppx;
                transition: color 0.2s ease;
                color: #8E8E93;
            }

            .nav-item.active .nav-icon {
                color: #007AFF;
            }
        `);


        // we can optionally pass other viewBox values in case of using SVGs with different viewBox values (e.g., using google fonts icons that uses viewBox: "0 -960 960 960")
        this._shadow.innerHTML = `
            <div class="nav-container">
                ${items.map((item, index) => `
                    <div class="nav-item ${index === activeIndex ? 'active' : ''}" data-index="${index}">
                        <svg class="nav-icon" viewBox="${item.viewBox || '0 0 24 24'}" fill="currentColor">
                            <path d="${item.icon}"/>
                        </svg>
                    </div>
                `).join('')}
            </div>
        `;
        // Attach event listeners after rendering
        this._attachEventListeners();
    }
}

customElements.define('nav-bar', NavBar);

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
                            width: 100%;
                            line-height: 1.6;
                            -webkit-font-smoothing: antialiased;
                            overflow-x: hidden;
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


                            /* add different nice background colors to each page */
                            .page:nth-child(1) {
                                background - color: #f1c40f;
        }

                            .page:nth-child(2) {
                                background - color: #e74c3c;
        }

                            .page:nth-child(3) {
                                background - color: #3498db;
        }

                            /* select custom element direct children */
                            elements-slider {
                                width: 198vw;
                            height: 100vh;
            >div{
                                width: 66vw;
                            height: 100vh;
            }
        }
                        </style>
                        <script type="module">
        // import 'web_lib/components/NavBar.js';
                            import 'web_lib/components/ElementsSlider.js';
                        </script>
                    </head>

                    <body>
                        <elements-slider>
                            <!-- here goes the three pages with simple content -->
                            <div class="page">
                                <h1>Page 1</h1>
                                <p>Content of page 1</p>
                            </div>
                            <div class="page">
                                <h1>Page 2</h1>
                                <p>Content of page 2</p>
                            </div>
                            <div class="page">
                                <h1>Page 3</h1>
                                <p>Content of page 3</p>
                            </div>
                        </elements-slider>

                        <!-- <nav-bar items='[
        {"icon": "M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"},
        {"icon": "M153.3-189.06v-376.49q0-17.99 7.92-34.03 7.92-16.04 22.26-26.56l250.94-188.32q19.92-15.25 45.47-15.25 25.55 0 45.69 15.25l250.94 188.32q14.34 10.52 22.34 26.56t8 34.03v376.49q0 31.49-22.22 53.62-22.21 22.14-53.7 22.14H599.47q-16 0-26.94-10.94-10.94-10.94-10.94-26.94v-212.54q0-16-10.93-26.94-10.94-10.93-26.94-10.93h-87.44q-16 0-26.94 10.93-10.93 10.94-10.93 26.94v212.54q0 16-10.94 26.94-10.94 10.94-26.94 10.94H229.06q-31.49 0-53.62-22.14-22.14-22.13-22.14-53.62Z", "viewBox": "0 -960 960 960"},
        {"icon": "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"}
        ]'></nav-bar> -->

                        <script type="module">
                            import './main.js'
                        </script>
                    </body>

                </html>