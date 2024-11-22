import { globalState } from './state.js';
export class Navigator {
    constructor() {
        this.routes = new Map();
        this.currentRoute = window.location.pathname;

        // On initial load, validate current route
        if (!this._findHandler(this.currentRoute)) {
            const defaultScreen = globalState.MAIN_SCREENS.find(s => s.default)?.path;
            // Replace invalid URL with default (doesn't add to history)
            history.replaceState({}, '', defaultScreen);
            this.navigate(defaultScreen, {}, true);
        } else {
            // Valid initial route, just execute its handler
            this.navigate(this.currentRoute, {}, true);
        }

        window.addEventListener('popstate', (e) => {
            this.navigate(window.location.pathname, e.state || {}, true);
        });
    }

    navigate(to, transitionData = {}, skipPushState = false) {
        const from = this.currentRoute;
        const result = this._findHandler(to);
        if (!result) return;

        const { routeHandler, params } = result;

        if (!skipPushState) {
            history.pushState(transitionData, '', to);
        }

        routeHandler({
            to,
            from,
            params,
            data: transitionData
        });

        this.currentRoute = to;
    }


    _findHandler(path) {
        for (const [pattern, routeHandler] of this.routes) {
            // Convert route pattern to regex
            // e.g., '/article/:id' becomes /^\/article\/([^\/]+)$/
            const regexPattern = pattern
                .replace(/:[^/]+/g, '([^/]+)')      // convert :param to capture group
                .replace(/\//g, '\\/');     // escape forward slashes

            const regex = new RegExp(`^${regexPattern}$`);
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

    registerRoute(path, handler) {
        this.routes.set(path, handler);
    }
}