// components/SlidableSheet.js
import { EventTypes } from '../core/events.js';
import Component from '../core/Component.js';
import { globalState } from '../core/state.js';

export default class SlidableSheet extends Component {
    static get observedAttributes() {
        return ['active-index', 'total-screens'];
    }

    constructor() {
        super();
        this.state = {
            activeIndex: globalState.activeIndex,
            isDragging: false,
            startX: 0,
            currentX: 0,
            startTranslateX: 0,
            currentTranslateX: -globalState.activeIndex * window.innerWidth,
            totalScreens: 3 // Default value
        };
        this._animationTimeout = null; 
        this._touchStartTime = 0;

    }

    _processAttributes() {
        super._processAttributes();
        
        if (this.props['total-screens']) {
            this.state.totalScreens = parseInt(this.props['total-screens']) || 3;
        }
    }

    setState(newState, rerender = true) {
        super.setState(newState, rerender);
        if ('activeIndex' in newState) {
            this.animateToIndex(newState.activeIndex);
        }
    }

    animateToIndex(targetIndex, animate = true) {
        if (targetIndex < 0 || targetIndex >= this.state.totalScreens) return;

        const container = this._shadow.querySelector('.screen-wrapper');
        if (!container) return;

        // Clear any pending timeout
        if (this._animationTimeout) {
            clearTimeout(this._animationTimeout);
            this._animationTimeout = null;
        }


        // Update state
        this.state.activeIndex = targetIndex;
        this.state.currentTranslateX = -targetIndex * window.innerWidth;

        // Apply animation
        container.style.transition = animate ? 'transform 0.3s ease-out' : 'none';
        container.style.transform = `translateX(${this.state.currentTranslateX}px)`;

        //  Clear animation after transition ends
        if (animate) {
            container.addEventListener('transitionend', function onEnd() {
                container.style.transition = 'none';
                container.removeEventListener('transitionend', onEnd);
            }, { once: true }); // once: true automatically removes listener
        }
    }

    _attachEventListeners() {
        const container = this._shadow.querySelector('.screen-wrapper');
        if (!container) return;

        const handleTouchStart = (e) => {
            if (e.touches.length > 1) return; // Ignore multi-touch

            this.state.isDragging = true;
            this.state.startX = e.touches[0].clientX;
            this.state.startTranslateX = this.state.currentTranslateX;

            // Remove transition during drag
            container.style.transition = 'none';
            // record touch start time
            this._touchStartTime = Date.now();
        };

        const handleTouchMove = (e) => {
            if (!this.state.isDragging) return;

            this.state.currentX = e.touches[0].clientX;
            const deltaX = this.state.currentX - this.state.startX;

            // Calculate new translate position with resistance at edges
            let newTranslateX = this.state.startTranslateX + deltaX;

            // Add resistance at bounds
            const maxTranslate = 0;
            const minTranslate = -(this.state.totalScreens - 1) * window.innerWidth;

            if (newTranslateX > maxTranslate) {
                newTranslateX = maxTranslate + (newTranslateX - maxTranslate) * 0.2;
            } else if (newTranslateX < minTranslate) {
                newTranslateX = minTranslate + (newTranslateX - minTranslate) * 0.2;
            }

            this.state.currentTranslateX = newTranslateX;
            container.style.transform = `translateX(${newTranslateX}px)`;
        };

        const handleTouchEnd = () => {
            if (!this.state.isDragging) return;

            this.state.isDragging = false;

            const deltaX = this.state.currentX - this.state.startX;
            const threshold = window.innerWidth * 0.3; // threshold % of screen width
            const velocity = Math.abs(deltaX) / (Date.now() - this._touchStartTime);



            let newIndex = this.state.activeIndex;

            // slide if either threshold or velocity is high enough
            if (Math.abs(deltaX) > threshold || velocity > 0.5) { // 0.5 pixels per ms
                if (deltaX > 0 && newIndex > 0) {
                    newIndex--;
                } else if (deltaX < 0 && newIndex < this.state.totalScreens - 1) {
                    newIndex++;
                }
            }

            // Animate to final position and emit event if index changed
            if (newIndex !== this.state.activeIndex) {
                this.emitSlideEvent(newIndex);
            }

            this.animateToIndex(newIndex);
        };

        // Add event listeners
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);
    }

    emitSlideEvent(index) {
        globalState.activeIndex = index;
        const event = new CustomEvent(EventTypes.SCREEN_SLIDE, {
            detail: { index },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    render() {
        this._createStyles(`
            :host {
                display: block;
                width: 100%;
                height: 100%;
                position: fixed;
                top: 0;
                left: 0;
                overflow: hidden;
                touch-action: pan-y pinch-zoom;
            }
            
            .screen-wrapper {
                display: flex;
                width: 100%;
                height: 100%;
                transform: translateX(${this.state.currentTranslateX}px);
                will-change: transform;
            }
            
            .screen {
                min-width: 100%;
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                flex-shrink: 0;
            }
            
            /* Prevent screen content selection during drag */
            .dragging {
                user-select: none;
                -webkit-user-select: none;
            }
            
            /* Hide scrollbar for WebKit browsers */
            .screen::-webkit-scrollbar {
                display: none;
            }
        `);

        // Create screens based on total count
        const screens = Array(this.state.totalScreens).fill(0).map((_, index) => `
            <div class="screen">
                <slot name="screen-${index}"></slot>
            </div>
        `).join('');

        this._shadow.innerHTML = `
            <div class="screen-wrapper">
                ${screens}
            </div>
        `;
    }
}

customElements.define('slidable-sheet', SlidableSheet);