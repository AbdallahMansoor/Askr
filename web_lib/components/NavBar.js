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