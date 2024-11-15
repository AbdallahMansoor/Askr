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