// components/NavBar.js
import { EventTypes } from '../core/events.js';
import Component from '../core/Component.js';
import { globalState } from '../core/state.js';

export default class NavBar extends Component {
    // browser will automatically check observedAttributes when attributeChangedCallback is fired
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

    _removeEventListeners() {
        this._shadow.removeEventListener('click', this._handleClick);
    }

    _createDOM() {
        this._shadow.innerHTML = `
            <style>
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
                    height: 32px;
                    transition: color 0.2s ease;
                    color: #8E8E93;
                }

                .nav-item.active .nav-icon {
                    color: #007AFF;
                }
            </style>

            <div class="nav-container">
                ${(() => {
                // Parse items from state when needed
                let items = [];
                try {
                    items = this.state.items ? JSON.parse(this.state.items) : [];
                } catch (e) {
                    console.error('Invalid items JSON in NavBar:', e);
                }
                return items.map((item, index) => `
                    <div class="nav-item ${index === this.state.activeIndex ? 'active' : ''}" data-index="${index}">
                        <svg class="nav-icon" viewBox="${item.viewBox || '0 0 24 24'}" fill="currentColor">
                            <path d="${item.icon}"/>
                        </svg>
                    </div>
                `).join('')
            })()}
            </div>
        `;
    }
}

customElements.define('nav-bar', NavBar);