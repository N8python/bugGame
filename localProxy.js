const localProxy = new Proxy(localStorage, {
    get(_, prop) {
        prop = "__bo_" + prop;
        return localStorage[prop] ? JSON.parse(localStorage[prop]) : undefined;
    },
    set(_, prop, val) {
        prop = "__bo_" + prop;
        localStorage[prop] = JSON.stringify(val);
        return true;
    },
    deleteProperty(_, prop) {
        delete localStorage[prop];
    }
});
export default localProxy;