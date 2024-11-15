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
            'active-index',
            'visible-portion'
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
            visiblePortion: 0.25
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
        
        const initialOffset = extraSpace > 0 ? computedElementWidth * this.state.visiblePortion + spaceBetweenElements : 0;
        
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

    _shouldHandleInteraction(element) {
        // ensure we are not clicking within a nested slider
        if (element.closest('elements-slider') !== this) {
            return false;
        }

        // Check if any parent (up to this slider) is scrollable horizontally
        let current = element;
        while (current && current !== this) {
            const style = window.getComputedStyle(current);
            const canScroll = ['auto', 'scroll'].includes(style.overflowX) ||
                ['auto', 'scroll'].includes(style.overflow);

            if (canScroll && current.scrollWidth > current.clientWidth) {
                return false;
            }
            current = current.parentElement;
        }

        return true;
    }


    _handlePointerDown = (e) => {
        
        if (!this._shouldHandleInteraction(e.target)) {
            return;
        }
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