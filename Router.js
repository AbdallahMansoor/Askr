import { globalState } from './state.js';
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;

        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname, e.state || {}, true);
        });
    }

    handleRoute(to, transitionData = {}, skipPushState = false) {
        if (to === this.currentRoute) return;

        const from = this.currentRoute;
        const result = this._findHandler(to);
        if (!result) return;

        const { routeHandler, params } = result;

        if (!skipPushState && window.location.pathname !== to) {
            history.pushState(transitionData, '', to);
        }

        // routeHandler is the anonymous callback function passed during the registration of the route in main.js.
        routeHandler({
            to,
            from,
            params,
            data: transitionData
        });

        this.currentRoute = to;
    }


    _findHandler(path) {
        // loop for every registered route (e.g., '/') and its handler. (as registered in main.js)
        for (const [pattern, routeHandler] of this.routes) {
            // Convert route pattern to regex
            // e.g., '/article/:id' becomes /^\/article\/([^\/]+)$/
            const regexPattern = pattern
                .replace(/:[^/]+/g, '([^/]+)')  // convert :param to capture group (e.g., :mainscreen -> ([^/]+))
                .replace(/\//g, '\\/');   // escape forward slashes

            const regex = new RegExp(`^${regexPattern}$`);
            // The matching is reliable because the static parts of the route serve as anchors(signatures) for a given route.
            const match = path.match(regex);

            if (match) {
                const paramNames = (pattern.match(/:[^/]+/g) || [])
                    .map(param => param.slice(1));

                const params = {};
                paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });

                return {
                    routeHandler,
                    params
                };
            }
        }
        return null;
    }

    registerRouteHandler(path, handler) {
        this.routes.set(path, handler);
    }
}