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
        const potentialNewState = { ...this.state, ...newState };
        const stateChanged = JSON.stringify(potentialNewState) !== JSON.stringify(this.state);
        if (!stateChanged) return;

        this.state = potentialNewState;

        if (rerender) this.render();

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