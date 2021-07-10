
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.38.3 */

    const { Error: Error_1, Object: Object_1, console: console_1$1 } = globals;

    // (251:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$l(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		const newState = { ...history.state };
    		delete newState["__svelte_spa_router_scrollX"];
    		delete newState["__svelte_spa_router_scrollY"];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute("href");

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == "/") {
    		// Add # to the href attribute
    		href = "#" + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != "#/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	node.setAttribute("href", href);

    	node.addEventListener("click", event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute("href"));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == "string") {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument - strings must start with / or *");
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == "string") {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || "/";
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener("popstate", popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == "object" && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener("popstate", popStateChanged);
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("popStateChanged" in $$props) popStateChanged = $$props.popStateChanged;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$l.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Home.svelte generated by Svelte v3.38.3 */

    const file$g = "src/components/Home.svelte";

    function create_fragment$k(ctx) {
    	let t0;
    	let blockquote0;
    	let p0;
    	let t2;
    	let h1;
    	let t4;
    	let h2;
    	let t6;
    	let p1;
    	let t8;
    	let div0;
    	let p2;
    	let t10;
    	let ul;
    	let li0;
    	let a0;
    	let t12;
    	let li1;
    	let a1;
    	let t14;
    	let li2;
    	let a2;
    	let t16;
    	let div1;
    	let blockquote1;
    	let p3;
    	let t18;
    	let p4;
    	let t20;
    	let p5;
    	let strong;
    	let t21;
    	let a3;
    	let t23;
    	let footer;

    	const block = {
    		c: function create() {
    			t0 = space();
    			blockquote0 = element("blockquote");
    			p0 = element("p");
    			p0.textContent = "ABE Services is the developer and provider of the:";
    			t2 = space();
    			h1 = element("h1");
    			h1.textContent = "CDMS";
    			t4 = space();
    			h2 = element("h2");
    			h2.textContent = "Compliance Data Management System";
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "for the building,construction and related industries";
    			t8 = space();
    			div0 = element("div");
    			p2 = element("p");
    			p2.textContent = "The CDMS enables the checking\n            of work on site using hand held devices (i.e. Palm Pilots) and the efficient\n            management of the compliance data via an Internet connection to a remote computer\n            database.";
    			t10 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "More about the CDMS and how it works";
    			t12 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "More about the CDMS for Contractors and Subcontractors";
    			t14 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "More about the CDMS for Clients, Superintendents and others engaging and\n                monitoring contractors.";
    			t16 = space();
    			div1 = element("div");
    			blockquote1 = element("blockquote");
    			p3 = element("p");
    			p3.textContent = "The CDMS will commence commercial operations later this year - Details will be in \"News\"";
    			t18 = space();
    			p4 = element("p");
    			p4.textContent = "Meanwhile trial user licences are available for the iphone app.";
    			t20 = space();
    			p5 = element("p");
    			strong = element("strong");
    			t21 = text("Please contact John and Mike for details, email ");
    			a3 = element("a");
    			a3.textContent = "abeservices@outlook.com";
    			t23 = space();
    			footer = element("footer");
    			document.title = "ABE Services";
    			add_location(p0, file$g, 9, 4, 180);
    			attr_dev(h1, "align", "center");
    			attr_dev(h1, "class", "svelte-1uhjzxq");
    			add_location(h1, file$g, 10, 4, 243);
    			attr_dev(h2, "align", "center");
    			add_location(h2, file$g, 11, 4, 276);
    			attr_dev(p1, "align", "center");
    			add_location(p1, file$g, 12, 4, 338);
    			attr_dev(p2, "align", "center");
    			add_location(p2, file$g, 15, 8, 432);
    			attr_dev(a0, "href", "#/how");
    			add_location(a0, file$g, 20, 16, 718);
    			add_location(li0, file$g, 20, 12, 714);
    			attr_dev(a1, "href", "#/contractors");
    			add_location(a1, file$g, 21, 16, 796);
    			add_location(li1, file$g, 21, 12, 792);
    			attr_dev(a2, "href", "#/clients");
    			add_location(a2, file$g, 22, 16, 900);
    			add_location(li2, file$g, 22, 12, 896);
    			add_location(ul, file$g, 19, 8, 697);
    			add_location(div0, file$g, 14, 4, 418);
    			add_location(blockquote0, file$g, 8, 0, 163);
    			add_location(p3, file$g, 34, 8, 1378);
    			add_location(p4, file$g, 35, 8, 1492);
    			attr_dev(a3, "href", "mailto:abeservices@outlook.com");
    			add_location(a3, file$g, 36, 67, 1630);
    			add_location(strong, file$g, 36, 11, 1574);
    			add_location(p5, file$g, 36, 8, 1571);
    			add_location(blockquote1, file$g, 33, 4, 1357);
    			attr_dev(div1, "align", "center");
    			add_location(div1, file$g, 32, 0, 1332);
    			add_location(footer, file$g, 41, 0, 1747);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, blockquote0, anchor);
    			append_dev(blockquote0, p0);
    			append_dev(blockquote0, t2);
    			append_dev(blockquote0, h1);
    			append_dev(blockquote0, t4);
    			append_dev(blockquote0, h2);
    			append_dev(blockquote0, t6);
    			append_dev(blockquote0, p1);
    			append_dev(blockquote0, t8);
    			append_dev(blockquote0, div0);
    			append_dev(div0, p2);
    			append_dev(div0, t10);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t12);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t14);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, blockquote1);
    			append_dev(blockquote1, p3);
    			append_dev(blockquote1, t18);
    			append_dev(blockquote1, p4);
    			append_dev(blockquote1, t20);
    			append_dev(blockquote1, p5);
    			append_dev(p5, strong);
    			append_dev(strong, t21);
    			append_dev(strong, a3);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, footer, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(blockquote0);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/cdms/body/Clients.svelte generated by Svelte v3.38.3 */

    function create_fragment$j(ctx) {
    	const block = {
    		c: function create() {
    			document.title = "ABE Services - How It Works";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Clients", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Clients> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Clients extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clients",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/cdms/body/Contractors.svelte generated by Svelte v3.38.3 */

    function create_fragment$i(ctx) {
    	const block = {
    		c: function create() {
    			document.title = "ABE Services - Contractors";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Contractors", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contractors> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contractors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contractors",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/cdms/body/HowItWorks.svelte generated by Svelte v3.38.3 */

    function create_fragment$h(ctx) {
    	const block = {
    		c: function create() {
    			document.title = "ABE Services - How It Works";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("HowItWorks", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HowItWorks> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class HowItWorks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HowItWorks",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/cdms/footer/AboutUs.svelte generated by Svelte v3.38.3 */

    const file$f = "src/cdms/footer/AboutUs.svelte";

    function create_fragment$g(ctx) {
    	let t0;
    	let blockquote;
    	let h2;
    	let t2;
    	let p0;
    	let strong0;
    	let t4;
    	let strong1;
    	let t6;
    	let t7;
    	let h3;
    	let t9;
    	let ul;
    	let li0;
    	let t11;
    	let li1;
    	let t13;
    	let li2;
    	let t15;
    	let li3;
    	let t17;
    	let p1;
    	let t18;
    	let br;
    	let t19;
    	let t20;
    	let p2;
    	let t21;
    	let a;
    	let t23;
    	let strong2;
    	let t25;
    	let strong3;
    	let t27;

    	const block = {
    		c: function create() {
    			t0 = space();
    			blockquote = element("blockquote");
    			h2 = element("h2");
    			h2.textContent = "About ABE Services";
    			t2 = space();
    			p0 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "ABE Services";
    			t4 = text(" is  a privately owned Canberra based company formed in 2002 to develop\n        and provide  a Compliance Data Management Service (");
    			strong1 = element("strong");
    			strong1.textContent = "CDMS";
    			t6 = text(") for building,\n        construction and  related industries. ABE Services sees the CDMS\n        as the way putting  into practice the sound management principles of Quality\n        Assurance (QA) without the pain and paperwork it typically seems to involve\n        in the building and construction industry.");
    			t7 = space();
    			h3 = element("h3");
    			h3.textContent = "ABE Services Pty Ltd's Directors:";
    			t9 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "John Anderson BE, MEngSc, FIEAust, CPEng";
    			t11 = space();
    			li1 = element("li");
    			li1.textContent = "Rob Beasley BSc, Dip Comp Sc";
    			t13 = space();
    			li2 = element("li");
    			li2.textContent = "Mike Evans MA, FQSA, FIEAust, CPEng";
    			t15 = space();
    			li3 = element("li");
    			li3.textContent = "Richard Hancock BSc";
    			t17 = space();
    			p1 = element("p");
    			t18 = text("Mike and John have each worked in the building and construction industry for over thirty years and\n        also have expertise in the area of Quality Management, being registered Senior\n        Quality Auditors and members of the select working group that wrote the Standards\n        Australia publication “HB90.3 – The Construction Industry Guide\n        to ISO 9001:2000”.");
    			br = element("br");
    			t19 = text("\n        Rob and Richard are software architects and programmers with particular experience\n        in major databases and IT security.");
    			t20 = space();
    			p2 = element("p");
    			t21 = text("Contact us via ");
    			a = element("a");
    			a.textContent = "abeservices@outlook.com";
    			t23 = text(" if you would like more information about ");
    			strong2 = element("strong");
    			strong2.textContent = "ABE Services";
    			t25 = text("  or the  ");
    			strong3 = element("strong");
    			strong3.textContent = "CDMS";
    			t27 = text(".");
    			document.title = "ABE Services - About Us";
    			add_location(h2, file$f, 5, 4, 90);
    			add_location(strong0, file$f, 7, 7, 126);
    			add_location(strong1, file$f, 8, 59, 286);
    			add_location(p0, file$f, 7, 4, 123);
    			add_location(h3, file$f, 14, 4, 629);
    			add_location(li0, file$f, 16, 8, 689);
    			add_location(li1, file$f, 17, 8, 747);
    			add_location(li2, file$f, 18, 8, 793);
    			add_location(li3, file$f, 19, 8, 846);
    			add_location(ul, file$f, 15, 4, 676);
    			add_location(br, file$f, 26, 32, 1285);
    			add_location(p1, file$f, 22, 4, 890);
    			attr_dev(a, "href", "mailto:abeservices@outlook.com");
    			add_location(a, file$f, 29, 22, 1451);
    			add_location(strong2, file$f, 29, 132, 1561);
    			add_location(strong3, file$f, 29, 171, 1600);
    			add_location(p2, file$f, 29, 4, 1433);
    			add_location(blockquote, file$f, 4, 0, 73);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, h2);
    			append_dev(blockquote, t2);
    			append_dev(blockquote, p0);
    			append_dev(p0, strong0);
    			append_dev(p0, t4);
    			append_dev(p0, strong1);
    			append_dev(p0, t6);
    			append_dev(blockquote, t7);
    			append_dev(blockquote, h3);
    			append_dev(blockquote, t9);
    			append_dev(blockquote, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t11);
    			append_dev(ul, li1);
    			append_dev(ul, t13);
    			append_dev(ul, li2);
    			append_dev(ul, t15);
    			append_dev(ul, li3);
    			append_dev(blockquote, t17);
    			append_dev(blockquote, p1);
    			append_dev(p1, t18);
    			append_dev(p1, br);
    			append_dev(p1, t19);
    			append_dev(blockquote, t20);
    			append_dev(blockquote, p2);
    			append_dev(p2, t21);
    			append_dev(p2, a);
    			append_dev(p2, t23);
    			append_dev(p2, strong2);
    			append_dev(p2, t25);
    			append_dev(p2, strong3);
    			append_dev(p2, t27);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AboutUs", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AboutUs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class AboutUs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AboutUs",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/cdms/footer/Acknowledgements.svelte generated by Svelte v3.38.3 */

    const file$e = "src/cdms/footer/Acknowledgements.svelte";

    function create_fragment$f(ctx) {
    	let t0;
    	let blockquote;
    	let h2;
    	let t2;
    	let p;
    	let t4;
    	let ul;
    	let li0;
    	let t5;
    	let em0;
    	let strong0;
    	let t7;
    	let t8;
    	let li1;
    	let t9;
    	let em1;
    	let strong1;
    	let t11;
    	let t12;
    	let li2;
    	let t13;
    	let em2;
    	let strong2;
    	let t15;

    	const block = {
    		c: function create() {
    			t0 = space();
    			blockquote = element("blockquote");
    			h2 = element("h2");
    			h2.textContent = "Acknowledgements";
    			t2 = space();
    			p = element("p");
    			p.textContent = "ABE Services gratefully acknowledges the following:";
    			t4 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t5 = text("The assistance of the ");
    			em0 = element("em");
    			strong0 = element("strong");
    			strong0.textContent = "ACT Territory Government ";
    			t7 = text("in supporting the\r\n            commercialisation undertaken as part of the development of the CDMS;");
    			t8 = space();
    			li1 = element("li");
    			t9 = text("The encouragement and support of the ");
    			em1 = element("em");
    			strong1 = element("strong");
    			strong1.textContent = "Master Builders Association of the ACT";
    			t11 = text(";");
    			t12 = space();
    			li2 = element("li");
    			t13 = text("The ");
    			em2 = element("em");
    			strong2 = element("strong");
    			strong2.textContent = "Contractors";
    			t15 = text(" in the ACT who have assisted by participation in the trials of the\r\n            CDMS.");
    			document.title = "ABE Services - Acknowledgements";
    			add_location(h2, file$e, 5, 4, 103);
    			add_location(p, file$e, 7, 4, 136);
    			add_location(strong0, file$e, 11, 38, 260);
    			add_location(em0, file$e, 11, 34, 256);
    			add_location(li0, file$e, 10, 8, 216);
    			add_location(strong1, file$e, 15, 53, 490);
    			add_location(em1, file$e, 15, 49, 486);
    			add_location(li1, file$e, 14, 8, 431);
    			add_location(strong2, file$e, 18, 20, 602);
    			add_location(em2, file$e, 18, 16, 598);
    			add_location(li2, file$e, 17, 8, 576);
    			add_location(ul, file$e, 9, 4, 202);
    			add_location(blockquote, file$e, 4, 0, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, h2);
    			append_dev(blockquote, t2);
    			append_dev(blockquote, p);
    			append_dev(blockquote, t4);
    			append_dev(blockquote, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t5);
    			append_dev(li0, em0);
    			append_dev(em0, strong0);
    			append_dev(li0, t7);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, t9);
    			append_dev(li1, em1);
    			append_dev(em1, strong1);
    			append_dev(li1, t11);
    			append_dev(ul, t12);
    			append_dev(ul, li2);
    			append_dev(li2, t13);
    			append_dev(li2, em2);
    			append_dev(em2, strong2);
    			append_dev(li2, t15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Acknowledgements", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Acknowledgements> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Acknowledgements extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Acknowledgements",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/cdms/footer/Charges.svelte generated by Svelte v3.38.3 */

    const file$d = "src/cdms/footer/Charges.svelte";

    function create_fragment$e(ctx) {
    	let t0;
    	let blockquote;
    	let h2;
    	let t2;
    	let p0;
    	let t4;
    	let table0;
    	let tr0;
    	let td0;
    	let p1;
    	let t5;
    	let a;
    	let t7;
    	let p2;
    	let t9;
    	let table1;
    	let tr1;
    	let td1;
    	let t11;
    	let td2;
    	let t13;
    	let tr2;
    	let td3;
    	let t15;
    	let td4;
    	let t17;
    	let tr3;
    	let td5;
    	let t19;
    	let td6;
    	let t21;
    	let tr4;
    	let td7;
    	let t23;
    	let td8;
    	let t25;
    	let p3;
    	let t27;
    	let p4;
    	let t29;
    	let p5;
    	let t31;
    	let p6;

    	const block = {
    		c: function create() {
    			t0 = space();
    			blockquote = element("blockquote");
    			h2 = element("h2");
    			h2.textContent = "Charges";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "(Last\r\n        Updated 14/10/04)";
    			t4 = space();
    			table0 = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			p1 = element("p");
    			t5 = text("The\r\n                rates below are the normal charges.  In recognition of\r\n                the tremendous support from the Master Builders Association of the\r\n                ACT (MBA of ACT) a special rate providing a very significant saving\r\n                is currently available for members of the MBA of ACT.  MBA of\r\n                ACT members can contact ABE Services for further details at ");
    			a = element("a");
    			a.textContent = "abeservices@outlook.com";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "The charge (inclusive of GST) to a business entity for the CDMS ITP Service is on a monthly basis\r\n        as follows:";
    			t9 = space();
    			table1 = element("table");
    			tr1 = element("tr");
    			td1 = element("td");
    			td1.textContent = "One\r\n                registered Checker in month";
    			t11 = space();
    			td2 = element("td");
    			td2.textContent = "$200";
    			t13 = space();
    			tr2 = element("tr");
    			td3 = element("td");
    			td3.textContent = "Between two and five registered Checkers in month";
    			t15 = space();
    			td4 = element("td");
    			td4.textContent = "$200 for first Checker plus $150 for each subsequent Checker";
    			t17 = space();
    			tr3 = element("tr");
    			td5 = element("td");
    			td5.textContent = "Between six and ten registered Checkers in month ";
    			t19 = space();
    			td6 = element("td");
    			td6.textContent = "$800 for the first five Checkers then $125 a Checker";
    			t21 = space();
    			tr4 = element("tr");
    			td7 = element("td");
    			td7.textContent = "More than ten registered Checkers in month";
    			t23 = space();
    			td8 = element("td");
    			td8.textContent = "$1,425 for the first ten Checkers, then $100 a Checker.";
    			t25 = space();
    			p3 = element("p");
    			p3.textContent = "A registered Checker is\r\n        someone registered to use the CDMS on a personal digital assistant (PDA) such\r\n        as a Palm Pilot. There is no charge for employees of the business entity who\r\n        are not registered Checkers using the CDMS provided that, other than Guest\r\n        Checkers, they are not involved in recording compliance information. There\r\n        is no charge for Guest Checkers provided use by Guest Checkers, is only minor/occasional.";
    			t27 = space();
    			p4 = element("p");
    			p4.textContent = "Registered Checkers who\r\n        are not an employee (permanent, casual or contract) of the business entity\r\n        will be treated for charging purposes as belonging to a separate business\r\n        entity.";
    			t29 = space();
    			p5 = element("p");
    			p5.textContent = "For the purposes of the\r\n        above schedule, a month is a calendar month commencing with the first day\r\n        of the month and ending with the last day of the month.";
    			t31 = space();
    			p6 = element("p");
    			p6.textContent = "A 15% reduction applies\r\n        to the above rates when the service is purchased and paid for 12 months in\r\n        advance, i.e. for Advance Purchase Accounts. Advance Purchase Accounts may\r\n        be varied to increase the number of Checkers. In such cases payment for the\r\n        variation for the remaining period is to be paid in advance and the reduced\r\n        rate will apply. A reduction of the number of Checkers, either as originally\r\n        subscribed or as varied, does not entitle the purchaser to any refund.";
    			document.title = "ABE Services - Charges";
    			add_location(h2, file$d, 5, 4, 94);
    			attr_dev(p0, "align", "center");
    			add_location(p0, file$d, 6, 4, 116);
    			attr_dev(a, "href", "mailto:abeservices@outlook.com");
    			add_location(a, file$d, 15, 76, 695);
    			attr_dev(p1, "align", "center");
    			add_location(p1, file$d, 10, 16, 266);
    			add_location(td0, file$d, 10, 12, 262);
    			add_location(tr0, file$d, 9, 8, 244);
    			attr_dev(table0, "width", "684");
    			attr_dev(table0, "height", "100");
    			attr_dev(table0, "border", "1");
    			attr_dev(table0, "align", "center");
    			add_location(table0, file$d, 8, 4, 176);
    			add_location(p2, file$d, 18, 4, 807);
    			attr_dev(td1, "width", "380");
    			add_location(td1, file$d, 23, 12, 1010);
    			attr_dev(td2, "width", "378");
    			add_location(td2, file$d, 25, 12, 1093);
    			add_location(tr1, file$d, 22, 8, 992);
    			attr_dev(td3, "valign", "top");
    			add_location(td3, file$d, 28, 12, 1161);
    			add_location(td4, file$d, 29, 12, 1246);
    			add_location(tr2, file$d, 27, 8, 1143);
    			add_location(td5, file$d, 32, 12, 1358);
    			add_location(td6, file$d, 33, 12, 1435);
    			add_location(tr3, file$d, 31, 8, 1340);
    			add_location(td7, file$d, 36, 12, 1539);
    			add_location(td8, file$d, 37, 12, 1604);
    			add_location(tr4, file$d, 35, 8, 1521);
    			attr_dev(table1, "width", "768");
    			attr_dev(table1, "height", "96");
    			attr_dev(table1, "border", "0");
    			add_location(table1, file$d, 21, 4, 940);
    			add_location(p3, file$d, 41, 4, 1705);
    			add_location(p4, file$d, 47, 4, 2181);
    			add_location(p5, file$d, 51, 4, 2401);
    			add_location(p6, file$d, 54, 4, 2585);
    			add_location(blockquote, file$d, 4, 0, 76);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, h2);
    			append_dev(blockquote, t2);
    			append_dev(blockquote, p0);
    			append_dev(blockquote, t4);
    			append_dev(blockquote, table0);
    			append_dev(table0, tr0);
    			append_dev(tr0, td0);
    			append_dev(td0, p1);
    			append_dev(p1, t5);
    			append_dev(p1, a);
    			append_dev(blockquote, t7);
    			append_dev(blockquote, p2);
    			append_dev(blockquote, t9);
    			append_dev(blockquote, table1);
    			append_dev(table1, tr1);
    			append_dev(tr1, td1);
    			append_dev(tr1, t11);
    			append_dev(tr1, td2);
    			append_dev(table1, t13);
    			append_dev(table1, tr2);
    			append_dev(tr2, td3);
    			append_dev(tr2, t15);
    			append_dev(tr2, td4);
    			append_dev(table1, t17);
    			append_dev(table1, tr3);
    			append_dev(tr3, td5);
    			append_dev(tr3, t19);
    			append_dev(tr3, td6);
    			append_dev(table1, t21);
    			append_dev(table1, tr4);
    			append_dev(tr4, td7);
    			append_dev(tr4, t23);
    			append_dev(tr4, td8);
    			append_dev(blockquote, t25);
    			append_dev(blockquote, p3);
    			append_dev(blockquote, t27);
    			append_dev(blockquote, p4);
    			append_dev(blockquote, t29);
    			append_dev(blockquote, p5);
    			append_dev(blockquote, t31);
    			append_dev(blockquote, p6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Charges", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Charges> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Charges extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Charges",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/cdms/footer/Privacy.svelte generated by Svelte v3.38.3 */

    const file$c = "src/cdms/footer/Privacy.svelte";

    function create_fragment$d(ctx) {
    	let t0;
    	let p0;
    	let strong;
    	let t2;
    	let h2;
    	let t4;
    	let p1;
    	let t6;
    	let blockquote;
    	let p2;
    	let t8;
    	let p3;
    	let t10;
    	let p4;
    	let t12;
    	let h40;
    	let t14;
    	let p5;
    	let t16;
    	let p6;
    	let t18;
    	let p7;
    	let t20;
    	let p8;
    	let t22;
    	let p9;
    	let t24;
    	let h41;
    	let t26;
    	let p10;
    	let t28;
    	let ul1;
    	let li0;
    	let t30;
    	let li1;
    	let t32;
    	let li2;
    	let t34;
    	let li3;
    	let t36;
    	let li7;
    	let t37;
    	let ul0;
    	let li4;
    	let t39;
    	let li5;
    	let t41;
    	let li6;
    	let t43;
    	let p11;
    	let t45;
    	let h42;
    	let t47;
    	let p12;
    	let t49;
    	let h43;
    	let t51;
    	let p13;
    	let t53;
    	let h44;
    	let t55;
    	let p14;
    	let t57;
    	let h45;
    	let t59;
    	let p15;
    	let t61;
    	let h46;
    	let t63;
    	let p16;
    	let t65;
    	let h47;
    	let t67;
    	let p17;
    	let t68;
    	let a0;
    	let t70;
    	let t71;
    	let h48;
    	let t73;
    	let p18;
    	let t75;
    	let h49;
    	let t77;
    	let p19;
    	let t78;
    	let a1;
    	let t80;
    	let t81;
    	let p20;

    	const block = {
    		c: function create() {
    			t0 = space();
    			p0 = element("p");
    			strong = element("strong");
    			strong.textContent = "ABE Services";
    			t2 = space();
    			h2 = element("h2");
    			h2.textContent = "Privacy Statement";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "(Last Updated 20/5/04)";
    			t6 = space();
    			blockquote = element("blockquote");
    			p2 = element("p");
    			p2.textContent = "ABE Services is committed to protecting your privacy. You can visit most pages on the ABE\r\n        Services Pty Ltd web site without giving ABE Services any information about yourself.";
    			t8 = space();
    			p3 = element("p");
    			p3.textContent = "For you, as a customer, for the Compliance Data Management Service (CDMS) we do need some information,\r\n        in particular your contact details, to provide the services that you request,\r\n        and this privacy statement explains our data collection and use in these situations.\r\n        This privacy statement applies to the ABE Services website www.abeservices.com.au\r\n        and all its built in CDMS.";
    			t10 = space();
    			p4 = element("p");
    			p4.textContent = "You, as the Customer,\r\n        or your nominee(s), may input personal information of other people into the\r\n        CDMS, e.g. names of your employees who are to use the CDMS or your clients’\r\n        representatives you authorize to have view access to your CDMS data. Such\r\n        access and related information is at your discretion and ABE Services Pty\r\n        Ltd accepts no responsibility in regard to the privacy or other implications\r\n        of such information and access.";
    			t12 = space();
    			h40 = element("h4");
    			h40.textContent = "Collection of Personal Information";
    			t14 = space();
    			p5 = element("p");
    			p5.textContent = "ABE Services will\r\n        ask you (the customer) when it needs information that personally identifies\r\n        you (personal information) or allows ABE Services to contact you.\r\n        Generally, this information is requested when you are registering for CDMS\r\n        or ordering e-mail newsletters.";
    			t16 = space();
    			p6 = element("p");
    			p6.textContent = "Personal information collected by ABE Services often is limited to contact details except for payment.";
    			t18 = space();
    			p7 = element("p");
    			p7.textContent = "In the main, CDMS will\r\n        ask personal information of you (the Customer). As a customer of the CDMS\r\n        you may establish additional users of the service created. ABE Services Pty\r\n        Ltd will not ask for personal information of these users; however those details\r\n        (mostly email addresses) will be stored in the CDMS databases.";
    			t20 = space();
    			p8 = element("p");
    			p8.textContent = "When registering as a\r\n        customer for the CDMS you may be required to pay for a service via a third\r\n        party e-commerce provider and in that case, you will be required to enter\r\n        personal information necessary for billing, such as: name, address, telephone\r\n        number, and credit card number.";
    			t22 = space();
    			p9 = element("p");
    			p9.textContent = "ABE Services does NOT keep or store any details of your credit card.";
    			t24 = space();
    			h41 = element("h4");
    			h41.textContent = "Use of your Personal Information";
    			t26 = space();
    			p10 = element("p");
    			p10.textContent = "ABE Services may use your personal information for the following purposes:";
    			t28 = space();
    			ul1 = element("ul");
    			li0 = element("li");
    			li0.textContent = "To ensure our site and services are relevant to your needs;";
    			t30 = space();
    			li1 = element("li");
    			li1.textContent = "To deliver the CDMS, and perhaps newsletters;";
    			t32 = space();
    			li2 = element("li");
    			li2.textContent = "To help ABE Services, through the CDMS, create and publish solutions most relevant to you;";
    			t34 = space();
    			li3 = element("li");
    			li3.textContent = "To alert you to product\r\n            and services upgrades, special offers, updated information and other new\r\n            services from ABE Services, if you so request;";
    			t36 = space();
    			li7 = element("li");
    			t37 = text("To allow you access\r\n            to limited-entry areas of ABE Services web site or CDMS as appropriate.ABE\r\n            Services Pty Ltd may disclose your personal information if required to do\r\n            so by law or if in the good-faith believe that such action is necessary\r\n            to:\r\n            ");
    			ul0 = element("ul");
    			li4 = element("li");
    			li4.textContent = "conform to the edicts of the law or comply with legal process served on ABE Services";
    			t39 = space();
    			li5 = element("li");
    			li5.textContent = "protect and defend the rights or property of ABE Services, or";
    			t41 = space();
    			li6 = element("li");
    			li6.textContent = "act in urgent circumstances to protect the personal safety of ABE Services employees, users\r\n                    of ABE Services products or services, or members of the public.";
    			t43 = space();
    			p11 = element("p");
    			p11.textContent = "Your information may be stored and processed in Australia or any other country in which ABE Services host its\r\n        Online Services and web sites and by accepting ABE Services Terms and Conditions and Privacy\r\n        Policy, you consent to any such transfer of information outside of\r\n        your country.";
    			t45 = space();
    			h42 = element("h4");
    			h42.textContent = "Control of your Personal Information";
    			t47 = space();
    			p12 = element("p");
    			p12.textContent = "When you register, or\r\n        otherwise give us personal information, ABE Services will not share\r\n        that information with third parties without your permission, other than for\r\n        the limited exceptions already listed. ABE Services may send out periodic\r\n        e-mails informing you of technical service or security issues related to the\r\n        CDMS. You will not be able to choose to unsubscribe to these mailings, as\r\n        they are considered an essential part of the service you have chosen.";
    			t49 = space();
    			h43 = element("h4");
    			h43.textContent = "Access to your Personal Information";
    			t51 = space();
    			p13 = element("p");
    			p13.textContent = "We will provide you with\r\n        the means to ensure that your personal information is correct and current.\r\n        At any time you can review and edit your personal information by contacting\r\n        ABE Services on abeservices@outlook.com.";
    			t53 = space();
    			h44 = element("h4");
    			h44.textContent = "Security of your Personal Information";
    			t55 = space();
    			p14 = element("p");
    			p14.textContent = "ABE Services is\r\n        committed to protecting the security of your personal information. We use\r\n        a variety of security technologies and procedures to help protect your personal\r\n        information from unauthorized access, use or disclosure. For example, we store\r\n        the personal information you provide in computer servers supplied by tier\r\n        1 ISP, with limited access and located in controlled facilities. When ABE\r\n        Services Pty Ltd transmit sensitive information (such as a credit card number)\r\n        over the internet, we protect it through the use of encryption, such as the\r\n        Secure Socket Layer (SSL) protocol. Further more, all CDMS services are entirely\r\n        SSL enabled.";
    			t57 = space();
    			h45 = element("h4");
    			h45.textContent = "Protection of Children's Personal Information";
    			t59 = space();
    			p15 = element("p");
    			p15.textContent = "ABE Service’s web\r\n        site and its CDMS are general audience sites and do not knowingly collect\r\n        any personal information from children.";
    			t61 = space();
    			h46 = element("h4");
    			h46.textContent = "Use of Cookies";
    			t63 = space();
    			p16 = element("p");
    			p16.textContent = "We use cookies within the secure area of our internet sites to ensure accurate information is provided\r\n        to you while you conduct transactions online. A 'cookie' is a small data file\r\n        that contains information in relation to your visit to a website. As soon\r\n        as you exit the secure area of our internet sites the cookie that has been\r\n        created is deleted. No information is stored on our cookies from one visit\r\n        to the next.";
    			t65 = space();
    			h47 = element("h4");
    			h47.textContent = "Enforcement of this Privacy Statement";
    			t67 = space();
    			p17 = element("p");
    			t68 = text("If you have questions regarding this statement, you should first contact ABE Services by\r\n        e-mail on ");
    			a0 = element("a");
    			a0.textContent = "abeservices@outlook.com";
    			t70 = text(".");
    			t71 = space();
    			h48 = element("h4");
    			h48.textContent = "Changes to this Statement";
    			t73 = space();
    			p18 = element("p");
    			p18.textContent = "ABE Services will occasionally update this privacy statement. When ABE Services does\r\n        so, ABE Services will also revise the \"last updated\" date\r\n        at the top of the privacy statement. For material changes to this statement,\r\n        ABE Services will notify you by placing prominent notice on its Web\r\n        site.";
    			t75 = space();
    			h49 = element("h4");
    			h49.textContent = "Contact Information";
    			t77 = space();
    			p19 = element("p");
    			t78 = text("ABE Services welcomes your comments regarding this privacy statement; please contact\r\n        ABE Services by e-mail on ");
    			a1 = element("a");
    			a1.textContent = "abeservices@outlook.com";
    			t80 = text(".");
    			t81 = space();
    			p20 = element("p");
    			p20.textContent = " ";
    			document.title = "ABE Services - Privacy";
    			add_location(strong, file$c, 4, 18, 94);
    			attr_dev(p0, "align", "center");
    			add_location(p0, file$c, 4, 0, 76);
    			attr_dev(h2, "align", "center");
    			add_location(h2, file$c, 6, 0, 131);
    			attr_dev(p1, "align", "center");
    			add_location(p1, file$c, 8, 0, 176);
    			add_location(p2, file$c, 11, 4, 242);
    			add_location(p3, file$c, 13, 4, 439);
    			add_location(p4, file$c, 18, 4, 862);
    			add_location(h40, file$c, 25, 4, 1365);
    			add_location(p5, file$c, 26, 4, 1415);
    			add_location(p6, file$c, 31, 4, 1730);
    			add_location(p7, file$c, 33, 4, 1851);
    			add_location(p8, file$c, 38, 4, 2216);
    			add_location(p9, file$c, 43, 4, 2545);
    			add_location(h41, file$c, 44, 4, 2626);
    			add_location(p10, file$c, 45, 4, 2673);
    			add_location(li0, file$c, 47, 8, 2774);
    			add_location(li1, file$c, 48, 8, 2852);
    			add_location(li2, file$c, 49, 8, 2916);
    			add_location(li3, file$c, 50, 8, 3025);
    			add_location(li4, file$c, 60, 16, 3559);
    			add_location(li5, file$c, 61, 16, 3670);
    			add_location(li6, file$c, 62, 16, 3758);
    			add_location(ul0, file$c, 59, 12, 3537);
    			add_location(li7, file$c, 54, 8, 3223);
    			add_location(ul1, file$c, 46, 4, 2760);
    			add_location(p11, file$c, 68, 4, 4012);
    			add_location(h42, file$c, 72, 4, 4335);
    			add_location(p12, file$c, 73, 4, 4386);
    			add_location(h43, file$c, 80, 4, 4913);
    			add_location(p13, file$c, 81, 4, 4963);
    			add_location(h44, file$c, 85, 4, 5219);
    			add_location(p14, file$c, 86, 4, 5271);
    			add_location(h45, file$c, 96, 4, 6010);
    			add_location(p15, file$c, 97, 4, 6070);
    			add_location(h46, file$c, 100, 4, 6238);
    			add_location(p16, file$c, 101, 4, 6267);
    			add_location(h47, file$c, 107, 4, 6742);
    			attr_dev(a0, "href", "mailto:abeservices@outlook.com");
    			add_location(a0, file$c, 109, 18, 6905);
    			add_location(p17, file$c, 108, 4, 6794);
    			add_location(h48, file$c, 110, 4, 6984);
    			add_location(p18, file$c, 111, 4, 7024);
    			add_location(h49, file$c, 116, 4, 7376);
    			attr_dev(a1, "href", "mailto:abeservices@outlook.com");
    			add_location(a1, file$c, 118, 34, 7533);
    			add_location(p19, file$c, 117, 4, 7410);
    			add_location(p20, file$c, 119, 4, 7612);
    			add_location(blockquote, file$c, 10, 0, 224);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, strong);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, p2);
    			append_dev(blockquote, t8);
    			append_dev(blockquote, p3);
    			append_dev(blockquote, t10);
    			append_dev(blockquote, p4);
    			append_dev(blockquote, t12);
    			append_dev(blockquote, h40);
    			append_dev(blockquote, t14);
    			append_dev(blockquote, p5);
    			append_dev(blockquote, t16);
    			append_dev(blockquote, p6);
    			append_dev(blockquote, t18);
    			append_dev(blockquote, p7);
    			append_dev(blockquote, t20);
    			append_dev(blockquote, p8);
    			append_dev(blockquote, t22);
    			append_dev(blockquote, p9);
    			append_dev(blockquote, t24);
    			append_dev(blockquote, h41);
    			append_dev(blockquote, t26);
    			append_dev(blockquote, p10);
    			append_dev(blockquote, t28);
    			append_dev(blockquote, ul1);
    			append_dev(ul1, li0);
    			append_dev(ul1, t30);
    			append_dev(ul1, li1);
    			append_dev(ul1, t32);
    			append_dev(ul1, li2);
    			append_dev(ul1, t34);
    			append_dev(ul1, li3);
    			append_dev(ul1, t36);
    			append_dev(ul1, li7);
    			append_dev(li7, t37);
    			append_dev(li7, ul0);
    			append_dev(ul0, li4);
    			append_dev(ul0, t39);
    			append_dev(ul0, li5);
    			append_dev(ul0, t41);
    			append_dev(ul0, li6);
    			append_dev(blockquote, t43);
    			append_dev(blockquote, p11);
    			append_dev(blockquote, t45);
    			append_dev(blockquote, h42);
    			append_dev(blockquote, t47);
    			append_dev(blockquote, p12);
    			append_dev(blockquote, t49);
    			append_dev(blockquote, h43);
    			append_dev(blockquote, t51);
    			append_dev(blockquote, p13);
    			append_dev(blockquote, t53);
    			append_dev(blockquote, h44);
    			append_dev(blockquote, t55);
    			append_dev(blockquote, p14);
    			append_dev(blockquote, t57);
    			append_dev(blockquote, h45);
    			append_dev(blockquote, t59);
    			append_dev(blockquote, p15);
    			append_dev(blockquote, t61);
    			append_dev(blockquote, h46);
    			append_dev(blockquote, t63);
    			append_dev(blockquote, p16);
    			append_dev(blockquote, t65);
    			append_dev(blockquote, h47);
    			append_dev(blockquote, t67);
    			append_dev(blockquote, p17);
    			append_dev(p17, t68);
    			append_dev(p17, a0);
    			append_dev(p17, t70);
    			append_dev(blockquote, t71);
    			append_dev(blockquote, h48);
    			append_dev(blockquote, t73);
    			append_dev(blockquote, p18);
    			append_dev(blockquote, t75);
    			append_dev(blockquote, h49);
    			append_dev(blockquote, t77);
    			append_dev(blockquote, p19);
    			append_dev(p19, t78);
    			append_dev(p19, a1);
    			append_dev(p19, t80);
    			append_dev(blockquote, t81);
    			append_dev(blockquote, p20);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Privacy", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Privacy> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Privacy extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Privacy",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/cdms/footer/Terms.svelte generated by Svelte v3.38.3 */

    function create_fragment$c(ctx) {
    	const block = {
    		c: function create() {
    			document.title = "ABE Services - Terms";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Terms", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Terms> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Terms extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Terms",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/cdms/navbar/ContactUs.svelte generated by Svelte v3.38.3 */

    const file$b = "src/cdms/navbar/ContactUs.svelte";

    function create_fragment$b(ctx) {
    	let t0;
    	let blockquote;
    	let h2;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t5;
    	let br0;
    	let t6;
    	let t7;
    	let p2;
    	let t8;
    	let a;
    	let br1;
    	let t10;
    	let br2;
    	let t11;
    	let br3;
    	let t12;

    	const block = {
    		c: function create() {
    			t0 = space();
    			blockquote = element("blockquote");
    			h2 = element("h2");
    			h2.textContent = "Support / Contact Us";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "ABE Services provides a free telephone and email technical support service to its CDMS customers.\n        Please note, though, that this support relates to the use of the CDMS and does not extend to consultancy advice\n        on the content of inspection and test\n        plans and the like.\n        Should you require such Quality Assurance Consultancy advice please refer to the Links screen on this web\n        site.";
    			t4 = space();
    			p1 = element("p");
    			t5 = text("Technical support hours are normal\n        ACT business hours. We aim to reply to all enquiries within one working day.");
    			br0 = element("br");
    			t6 = text("\n        Our contact details are:");
    			t7 = space();
    			p2 = element("p");
    			t8 = text("Email: ");
    			a = element("a");
    			a.textContent = "abeservices@outlook.com";
    			br1 = element("br");
    			t10 = text("\n        Telephone: (02) 6161 5128 ");
    			br2 = element("br");
    			t11 = text("\n        Fax: (02) 6254 7889");
    			br3 = element("br");
    			t12 = text("\n        Postal Address: ABE Services, PO Box 4325, Hawker, ACT 2614, Australia");
    			document.title = "ABE Services - Contact Us";
    			add_location(h2, file$b, 5, 4, 107);
    			add_location(p0, file$b, 6, 4, 142);
    			add_location(br0, file$b, 13, 84, 695);
    			add_location(p1, file$b, 12, 4, 573);
    			attr_dev(a, "href", "mailto:abeservices@outlook.com");
    			add_location(a, file$b, 15, 14, 751);
    			add_location(br1, file$b, 15, 82, 819);
    			add_location(br2, file$b, 16, 34, 858);
    			add_location(br3, file$b, 17, 27, 890);
    			add_location(p2, file$b, 15, 4, 741);
    			attr_dev(blockquote, "align", "center");
    			add_location(blockquote, file$b, 4, 0, 75);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, h2);
    			append_dev(blockquote, t2);
    			append_dev(blockquote, p0);
    			append_dev(blockquote, t4);
    			append_dev(blockquote, p1);
    			append_dev(p1, t5);
    			append_dev(p1, br0);
    			append_dev(p1, t6);
    			append_dev(blockquote, t7);
    			append_dev(blockquote, p2);
    			append_dev(p2, t8);
    			append_dev(p2, a);
    			append_dev(p2, br1);
    			append_dev(p2, t10);
    			append_dev(p2, br2);
    			append_dev(p2, t11);
    			append_dev(p2, br3);
    			append_dev(p2, t12);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ContactUs", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ContactUs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ContactUs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactUs",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/cdms/navbar/Links.svelte generated by Svelte v3.38.3 */

    const file$a = "src/cdms/navbar/Links.svelte";

    function create_fragment$a(ctx) {
    	let t0;
    	let h2;
    	let t2;
    	let blockquote;
    	let table;
    	let tr0;
    	let td0;
    	let t4;
    	let td1;
    	let a0;
    	let t6;
    	let tr1;
    	let td2;
    	let t8;
    	let td3;
    	let a1;
    	let t10;
    	let tr2;
    	let td4;
    	let t12;
    	let td5;
    	let t14;
    	let tr3;
    	let td6;
    	let t16;
    	let td7;
    	let t18;
    	let tr4;
    	let td8;
    	let strong;
    	let t20;
    	let td9;
    	let t22;
    	let tr5;
    	let td10;
    	let t24;
    	let td11;
    	let t26;
    	let tr6;
    	let td12;
    	let t28;
    	let td13;
    	let a2;
    	let t30;
    	let tr7;
    	let td14;
    	let t32;
    	let td15;
    	let a3;

    	const block = {
    		c: function create() {
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Links";
    			t2 = space();
    			blockquote = element("blockquote");
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Australian Standards:";
    			t4 = space();
    			td1 = element("td");
    			a0 = element("a");
    			a0.textContent = "www.standards.com.au";
    			t6 = space();
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "Master Builders Association of the ACT:";
    			t8 = space();
    			td3 = element("td");
    			a1 = element("a");
    			a1.textContent = "www.mba.org.au";
    			t10 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = " ";
    			t12 = space();
    			td5 = element("td");
    			td5.textContent = " ";
    			t14 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = " ";
    			t16 = space();
    			td7 = element("td");
    			td7.textContent = " ";
    			t18 = space();
    			tr4 = element("tr");
    			td8 = element("td");
    			strong = element("strong");
    			strong.textContent = "Quality Management consultancy services:";
    			t20 = space();
    			td9 = element("td");
    			td9.textContent = " ";
    			t22 = space();
    			tr5 = element("tr");
    			td10 = element("td");
    			td10.textContent = " ";
    			t24 = space();
    			td11 = element("td");
    			td11.textContent = " ";
    			t26 = space();
    			tr6 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Assurance Management Services Pty Ltd:";
    			t28 = space();
    			td13 = element("td");
    			a2 = element("a");
    			a2.textContent = "www.amspl.com.au";
    			t30 = space();
    			tr7 = element("tr");
    			td14 = element("td");
    			td14.textContent = "SAI Global:";
    			t32 = space();
    			td15 = element("td");
    			a3 = element("a");
    			a3.textContent = "www.saiglobal.com.au";
    			document.title = "ABE Services - Links";
    			attr_dev(h2, "align", "center");
    			add_location(h2, file$a, 5, 0, 76);
    			attr_dev(td0, "width", "58%");
    			add_location(td0, file$a, 10, 12, 232);
    			attr_dev(a0, "href", "http://www.standards.com.au");
    			add_location(a0, file$a, 11, 28, 304);
    			attr_dev(td1, "width", "42%");
    			add_location(td1, file$a, 11, 12, 288);
    			add_location(tr0, file$a, 9, 8, 214);
    			add_location(td2, file$a, 14, 12, 414);
    			attr_dev(a1, "href", "http://www.mba.org.au");
    			add_location(a1, file$a, 15, 16, 480);
    			add_location(td3, file$a, 15, 12, 476);
    			add_location(tr1, file$a, 13, 8, 396);
    			add_location(td4, file$a, 18, 12, 578);
    			add_location(td5, file$a, 19, 12, 607);
    			add_location(tr2, file$a, 17, 8, 560);
    			add_location(td6, file$a, 22, 12, 665);
    			add_location(td7, file$a, 23, 12, 694);
    			add_location(tr3, file$a, 21, 8, 647);
    			add_location(strong, file$a, 26, 16, 756);
    			add_location(td8, file$a, 26, 12, 752);
    			add_location(td9, file$a, 27, 12, 832);
    			add_location(tr4, file$a, 25, 8, 734);
    			add_location(td10, file$a, 30, 12, 890);
    			add_location(td11, file$a, 31, 12, 919);
    			add_location(tr5, file$a, 29, 8, 872);
    			add_location(td12, file$a, 34, 12, 977);
    			attr_dev(a2, "href", "http://www.amspl.com.au");
    			add_location(a2, file$a, 35, 16, 1042);
    			add_location(td13, file$a, 35, 12, 1038);
    			add_location(tr6, file$a, 33, 8, 959);
    			add_location(td14, file$a, 38, 12, 1144);
    			attr_dev(a3, "href", "http://www.saiglobal.com.au");
    			add_location(a3, file$a, 39, 16, 1182);
    			add_location(td15, file$a, 39, 12, 1178);
    			add_location(tr7, file$a, 37, 8, 1126);
    			attr_dev(table, "width", "61%");
    			attr_dev(table, "border", "0");
    			attr_dev(table, "align", "center");
    			attr_dev(table, "cellpadding", "1");
    			attr_dev(table, "cellspacing", "1");
    			add_location(table, file$a, 8, 4, 127);
    			add_location(blockquote, file$a, 7, 0, 109);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, table);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t4);
    			append_dev(tr0, td1);
    			append_dev(td1, a0);
    			append_dev(table, t6);
    			append_dev(table, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, t8);
    			append_dev(tr1, td3);
    			append_dev(td3, a1);
    			append_dev(table, t10);
    			append_dev(table, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t12);
    			append_dev(tr2, td5);
    			append_dev(table, t14);
    			append_dev(table, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, t16);
    			append_dev(tr3, td7);
    			append_dev(table, t18);
    			append_dev(table, tr4);
    			append_dev(tr4, td8);
    			append_dev(td8, strong);
    			append_dev(tr4, t20);
    			append_dev(tr4, td9);
    			append_dev(table, t22);
    			append_dev(table, tr5);
    			append_dev(tr5, td10);
    			append_dev(tr5, t24);
    			append_dev(tr5, td11);
    			append_dev(table, t26);
    			append_dev(table, tr6);
    			append_dev(tr6, td12);
    			append_dev(tr6, t28);
    			append_dev(tr6, td13);
    			append_dev(td13, a2);
    			append_dev(table, t30);
    			append_dev(table, tr7);
    			append_dev(tr7, td14);
    			append_dev(tr7, t32);
    			append_dev(tr7, td15);
    			append_dev(td15, a3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Links", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Links> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Links extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Links",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/cdms/navbar/Login.svelte generated by Svelte v3.38.3 */

    const file$9 = "src/cdms/navbar/Login.svelte";

    function create_fragment$9(ctx) {
    	let t0;
    	let h2;

    	const block = {
    		c: function create() {
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Login Screen";
    			document.title = "ABE Services - Login";
    			attr_dev(h2, "align", "center");
    			add_location(h2, file$9, 4, 0, 74);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h2, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Login", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/cdms/navbar/News.svelte generated by Svelte v3.38.3 */

    const file$8 = "src/cdms/navbar/News.svelte";

    function create_fragment$8(ctx) {
    	let t0;
    	let blockquote;
    	let div;
    	let t2;
    	let h20;
    	let t4;
    	let p0;
    	let t6;
    	let p1;
    	let t8;
    	let h21;
    	let t10;
    	let p2;
    	let t11;
    	let a0;
    	let t13;
    	let t14;
    	let h22;
    	let strong;
    	let t16;
    	let p3;
    	let t17;
    	let a1;

    	const block = {
    		c: function create() {
    			t0 = space();
    			blockquote = element("blockquote");
    			div = element("div");
    			div.textContent = "(Last updated 1/5/05)";
    			t2 = space();
    			h20 = element("h2");
    			h20.textContent = "CDMS Starts Commercial Operations";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "Following trials in 2004, the first customer, Urban Contractors Pty Ltd, signed up for the CDMS in December.";
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "The CDMS is now being used on several projects in the ACT, including four by Urban Contractors Pty Ltd.";
    			t8 = space();
    			h21 = element("h2");
    			h21.textContent = "CDMS Features in Canberra \"Innovation and Beyond\" Forum";
    			t10 = space();
    			p2 = element("p");
    			t11 = text("The CDMS featured as one of the case study presentations at the Business ACT sponsored forum \"Innovation\r\n        and Beyond\" held at the Museum of Australia on 10 March 2005. Download\r\n        a ");
    			a0 = element("a");
    			a0.textContent = "PDF";
    			t13 = text(" copy of the\r\n        InnovationForum.ppt PowerPoint presentation.");
    			t14 = space();
    			h22 = element("h2");
    			strong = element("strong");
    			strong.textContent = "CDMS Features in ACT Engineering Excellence Awards";
    			t16 = space();
    			p3 = element("p");
    			t17 = text("In September 2005 the Canberra Division of Engineers Australia conducted the\r\n        ACT Engineering Excellence Awards. The CDMS featured in the submission of NJ\r\n        Construction Pty Ltd, which achieved a Highly Commended Award. NJ Construction\r\n        used the CDMS to monitor the construction of the Murrarie 110kV transmission\r\n        line through environmentally sensitive mangrove swamps. Helicopters were used\r\n        to lay draw wires and then state of the art stringing machinery was used to\r\n        complete the stringing of the transmission line. Further details can be found\r\n        at ");
    			a1 = element("a");
    			a1.textContent = "http://www.ieaust.org.au/about_us/divisions/canberra/index.html";
    			document.title = "ABE Services - News";
    			attr_dev(div, "align", "center");
    			add_location(div, file$8, 5, 4, 91);
    			add_location(h20, file$8, 6, 4, 144);
    			add_location(p0, file$8, 7, 4, 192);
    			add_location(p1, file$8, 8, 4, 313);
    			add_location(h21, file$8, 9, 4, 429);
    			attr_dev(a0, "href", "<%=request.getContextPath()%>/downloads/InnovationForum.ppt");
    			attr_dev(a0, "tppabs", "<%=request.getContextPath()%>/downloads/InnovationForum.ppt");
    			add_location(a0, file$8, 12, 10, 719);
    			add_location(p2, file$8, 10, 4, 510);
    			add_location(strong, file$8, 15, 8, 959);
    			add_location(h22, file$8, 15, 4, 955);
    			attr_dev(a1, "href", "http://www.ieaust.org.au/about_us/divisions/canberra/index.html ");
    			add_location(a1, file$8, 23, 11, 1648);
    			add_location(p3, file$8, 16, 4, 1037);
    			add_location(blockquote, file$8, 4, 0, 73);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, div);
    			append_dev(blockquote, t2);
    			append_dev(blockquote, h20);
    			append_dev(blockquote, t4);
    			append_dev(blockquote, p0);
    			append_dev(blockquote, t6);
    			append_dev(blockquote, p1);
    			append_dev(blockquote, t8);
    			append_dev(blockquote, h21);
    			append_dev(blockquote, t10);
    			append_dev(blockquote, p2);
    			append_dev(p2, t11);
    			append_dev(p2, a0);
    			append_dev(p2, t13);
    			append_dev(blockquote, t14);
    			append_dev(blockquote, h22);
    			append_dev(h22, strong);
    			append_dev(blockquote, t16);
    			append_dev(blockquote, p3);
    			append_dev(p3, t17);
    			append_dev(p3, a1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(blockquote);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("News", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<News> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class News extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "News",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/cdms/navbar/Service.svelte generated by Svelte v3.38.3 */

    const file$7 = "src/cdms/navbar/Service.svelte";

    function create_fragment$7(ctx) {
    	let t0;
    	let h2;
    	let t2;
    	let blockquote1;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let ul;
    	let li0;
    	let t8;
    	let li1;
    	let t10;
    	let li2;
    	let t12;
    	let li3;
    	let t14;
    	let li4;
    	let t16;
    	let p2;
    	let t18;
    	let p3;
    	let t20;
    	let p4;
    	let a0;
    	let strong;
    	let em0;
    	let t22;
    	let t23;
    	let div;
    	let blockquote0;
    	let em1;
    	let t24;
    	let a1;
    	let u;

    	const block = {
    		c: function create() {
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "CDMS Service";
    			t2 = space();
    			blockquote1 = element("blockquote");
    			p0 = element("p");
    			p0.textContent = "The CDMS offered by ABE Services is a Compliance Data Management Service utilising\r\n        portable digital assistants (PDA's), the internet and a main computer database,\r\n        to provide on-the-job compliance information and capture and collate construction\r\n        data related to product or service compliance.";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "The scope of the CDMS ITP Service provides for planning and recording of compliance\r\n        through Inspection and Test Plans, ITP's. It includes the following functionalities:";
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Creation of ITP's on the CDMS, including by copying and customizing;";
    			t8 = space();
    			li1 = element("li");
    			li1.textContent = "Downloading of ITP's to Palm PDA's;";
    			t10 = space();
    			li2 = element("li");
    			li2.textContent = "Recording of compliance on Palm PDA's;";
    			t12 = space();
    			li3 = element("li");
    			li3.textContent = "Uploading of recorded compliance from Palm PDA's; and";
    			t14 = space();
    			li4 = element("li");
    			li4.textContent = "Viewing and printing reports from the CDMS.";
    			t16 = space();
    			p2 = element("p");
    			p2.textContent = "The CDMS\r\n        ITP Service is intended for use by contractors, subcontractors and others\r\n        planning and recording the checking of work.";
    			t18 = space();
    			p3 = element("p");
    			p3.textContent = "The CDMS ITP Service is also a valuable aid to contractors' and subcontractors'\r\n        customers as it enables them to see records of checks undertaken, including\r\n        when and by whom. There is no additional charge to those purchasing the\r\n        CDMS ITP Service for providing their customers with on line access to view\r\n        reports of checks, etc. Such access is of course, only granted with the\r\n        permission of the party purchasing the CDMS ITP Service.";
    			t20 = space();
    			p4 = element("p");
    			a0 = element("a");
    			strong = element("strong");
    			em0 = element("em");
    			em0.textContent = "TO PURCHASE THE CDMS ITP SERVICE CONTACT ABE Services";
    			t22 = text("\r\n         ");
    			t23 = space();
    			div = element("div");
    			blockquote0 = element("blockquote");
    			em1 = element("em");
    			t24 = text("Please note the CDMS is currently mainly available in the ACT region.\r\n            It is expected the CDMS will be available across Australia in 2006\r\n            - Details will be in the ");
    			a1 = element("a");
    			u = element("u");
    			u.textContent = "News";
    			document.title = "ABE Services - Service";
    			attr_dev(h2, "align", "center");
    			add_location(h2, file$7, 4, 0, 76);
    			attr_dev(p0, "align", "left");
    			add_location(p0, file$7, 7, 4, 134);
    			attr_dev(p1, "align", "left");
    			add_location(p1, file$7, 11, 4, 478);
    			add_location(li0, file$7, 15, 8, 697);
    			add_location(li1, file$7, 16, 8, 784);
    			add_location(li2, file$7, 17, 8, 838);
    			add_location(li3, file$7, 18, 8, 895);
    			add_location(li4, file$7, 19, 8, 967);
    			add_location(ul, file$7, 14, 4, 683);
    			attr_dev(p2, "align", "left");
    			add_location(p2, file$7, 22, 4, 1038);
    			attr_dev(p3, "align", "left");
    			add_location(p3, file$7, 25, 4, 1209);
    			add_location(em0, file$7, 32, 36, 1767);
    			add_location(strong, file$7, 32, 28, 1759);
    			attr_dev(a0, "href", "#/contact");
    			add_location(a0, file$7, 32, 8, 1739);
    			attr_dev(p4, "align", "center");
    			add_location(p4, file$7, 31, 4, 1711);
    			add_location(u, file$7, 38, 54, 2122);
    			attr_dev(a1, "href", "#/news");
    			add_location(a1, file$7, 38, 37, 2105);
    			add_location(em1, file$7, 36, 20, 1913);
    			add_location(blockquote0, file$7, 36, 8, 1901);
    			attr_dev(div, "align", "center");
    			add_location(div, file$7, 35, 4, 1871);
    			add_location(blockquote1, file$7, 6, 0, 116);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, blockquote1, anchor);
    			append_dev(blockquote1, p0);
    			append_dev(blockquote1, t4);
    			append_dev(blockquote1, p1);
    			append_dev(blockquote1, t6);
    			append_dev(blockquote1, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(ul, t10);
    			append_dev(ul, li2);
    			append_dev(ul, t12);
    			append_dev(ul, li3);
    			append_dev(ul, t14);
    			append_dev(ul, li4);
    			append_dev(blockquote1, t16);
    			append_dev(blockquote1, p2);
    			append_dev(blockquote1, t18);
    			append_dev(blockquote1, p3);
    			append_dev(blockquote1, t20);
    			append_dev(blockquote1, p4);
    			append_dev(p4, a0);
    			append_dev(a0, strong);
    			append_dev(strong, em0);
    			append_dev(p4, t22);
    			append_dev(blockquote1, t23);
    			append_dev(blockquote1, div);
    			append_dev(div, blockquote0);
    			append_dev(blockquote0, em1);
    			append_dev(em1, t24);
    			append_dev(em1, a1);
    			append_dev(a1, u);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(blockquote1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Service", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Service> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Service extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Service",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    function collapse (node, params) {

        const defaultParams = {
            open: true,
            duration: 0.2,
            easing: 'ease'
        };

        params = Object.assign(defaultParams, params);

        const noop = () => {};
        let transitionEndResolve = noop;
        let transitionEndReject = noop;

        const listener = node.addEventListener('transitionend', () => {
            transitionEndResolve();
            transitionEndResolve = noop;
            transitionEndReject = noop;
        });

        // convenience functions
        async function asyncTransitionEnd () {
            return new Promise((resolve, reject) => {
                transitionEndResolve = resolve;
                transitionEndReject = reject;
            })
        }

        async function nextFrame () {
            return new Promise(requestAnimationFrame)
        }

        function transition () {
            return `height ${params.duration}s ${params.easing}`
        }

        // set initial styles
        node.style.overflow = 'hidden';
        node.style.transition = transition();
        node.style.height = params.open ? 'auto' : '0px';

        async function enter () {

            // height is already in pixels
            // start the transition
            node.style.height = node.scrollHeight + 'px';

            // wait for transition to end,
            // then switch back to height auto
            try {
                await asyncTransitionEnd();
                node.style.height = 'auto';
            } catch(err) {
                // interrupted by a leave transition
            }

        }

        async function leave () {

            if (node.style.height === 'auto') {

                // temporarily turn transitions off
                node.style.transition = 'none';
                await nextFrame();

                // set height to pixels, and turn transition back on
                node.style.height = node.scrollHeight + 'px';
                node.style.transition = transition();
                await nextFrame();

                // start the transition
                node.style.height = '0px';

            }
            else {

                // we are interrupting an enter transition
                transitionEndReject();
                node.style.height = '0px';

            }

        }

        function update (newParams) {
            params = Object.assign(params, newParams);
            params.open ? enter() : leave();
        }

        function destroy () {
            node.removeEventListener('transitionend', listener);
        }

        return { update, destroy }

    }

    /* node_modules/svelte-collapsible/src/CollapsibleCard.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file$6 = "node_modules/svelte-collapsible/src/CollapsibleCard.svelte";
    const get_body_slot_changes = dirty => ({});
    const get_body_slot_context = ctx => ({});
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    function create_fragment$6(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let collapse_action;
    	let current;
    	let mounted;
    	let dispose;
    	const header_slot_template = /*#slots*/ ctx[5].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[4], get_header_slot_context);
    	const body_slot_template = /*#slots*/ ctx[5].body;
    	const body_slot = create_slot(body_slot_template, ctx, /*$$scope*/ ctx[4], get_body_slot_context);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if (header_slot) header_slot.c();
    			t = space();
    			div1 = element("div");
    			if (body_slot) body_slot.c();
    			attr_dev(div0, "class", "card-header svelte-yon7im");
    			add_location(div0, file$6, 31, 4, 489);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$6, 35, 4, 585);
    			attr_dev(div2, "class", "card");
    			toggle_class(div2, "open", /*open*/ ctx[0]);
    			add_location(div2, file$6, 29, 0, 454);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			if (header_slot) {
    				header_slot.m(div0, null);
    			}

    			append_dev(div2, t);
    			append_dev(div2, div1);

    			if (body_slot) {
    				body_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleToggle*/ ctx[3], false, false, false),
    					action_destroyer(collapse_action = collapse.call(null, div1, {
    						open: /*open*/ ctx[0],
    						duration: /*duration*/ ctx[1],
    						easing: /*easing*/ ctx[2]
    					}))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(header_slot, header_slot_template, ctx, /*$$scope*/ ctx[4], !current ? -1 : dirty, get_header_slot_changes, get_header_slot_context);
    				}
    			}

    			if (body_slot) {
    				if (body_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(body_slot, body_slot_template, ctx, /*$$scope*/ ctx[4], !current ? -1 : dirty, get_body_slot_changes, get_body_slot_context);
    				}
    			}

    			if (collapse_action && is_function(collapse_action.update) && dirty & /*open, duration, easing*/ 7) collapse_action.update.call(null, {
    				open: /*open*/ ctx[0],
    				duration: /*duration*/ ctx[1],
    				easing: /*easing*/ ctx[2]
    			});

    			if (dirty & /*open*/ 1) {
    				toggle_class(div2, "open", /*open*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(body_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			transition_out(body_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (header_slot) header_slot.d(detaching);
    			if (body_slot) body_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CollapsibleCard", slots, ['header','body']);
    	let { open = true } = $$props;
    	let { duration = 0.5 } = $$props;
    	let { easing = "ease" } = $$props;
    	const dispatch = createEventDispatcher();

    	function handleToggle() {
    		$$invalidate(0, open = !open);

    		if (open) {
    			dispatch("open");
    		} else {
    			dispatch("close");
    		}
    	}

    	console.log({ open });
    	const writable_props = ["open", "duration", "easing"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<CollapsibleCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("duration" in $$props) $$invalidate(1, duration = $$props.duration);
    		if ("easing" in $$props) $$invalidate(2, easing = $$props.easing);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		collapse,
    		open,
    		duration,
    		easing,
    		dispatch,
    		handleToggle
    	});

    	$$self.$inject_state = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("duration" in $$props) $$invalidate(1, duration = $$props.duration);
    		if ("easing" in $$props) $$invalidate(2, easing = $$props.easing);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [open, duration, easing, handleToggle, $$scope, slots];
    }

    class CollapsibleCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { open: 0, duration: 1, easing: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CollapsibleCard",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get open() {
    		throw new Error("<CollapsibleCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set open(value) {
    		throw new Error("<CollapsibleCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get duration() {
    		throw new Error("<CollapsibleCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duration(value) {
    		throw new Error("<CollapsibleCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get easing() {
    		throw new Error("<CollapsibleCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set easing(value) {
    		throw new Error("<CollapsibleCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CollapsibleCards.svelte generated by Svelte v3.38.3 */
    const file$5 = "src/components/CollapsibleCards.svelte";

    // (8:8) 
    function create_header_slot_2(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Header 1";
    			attr_dev(h2, "slot", "header");
    			attr_dev(h2, "class", "header svelte-7n4s74");
    			add_location(h2, file$5, 7, 8, 135);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot_2.name,
    		type: "slot",
    		source: "(8:8) ",
    		ctx
    	});

    	return block;
    }

    // (9:8) 
    function create_body_slot_2(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let p;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			p = element("p");
    			p.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro quia aperiam consequatur voluptas nihil beatae qui nisi? Commodi incidunt, architecto, est id fugit vitae placeat fugiat veritatis ea minus voluptatibus?";
    			if (img.src !== (img_src_value = "/static/images/studio/20190531/20190531_144609.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "First card");
    			attr_dev(img, "class", "svelte-7n4s74");
    			add_location(img, file$5, 9, 12, 235);
    			attr_dev(p, "class", "svelte-7n4s74");
    			add_location(p, file$5, 11, 16, 365);
    			attr_dev(div0, "class", "text svelte-7n4s74");
    			add_location(div0, file$5, 10, 12, 329);
    			attr_dev(div1, "slot", "body");
    			attr_dev(div1, "class", "body svelte-7n4s74");
    			add_location(div1, file$5, 8, 8, 191);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_body_slot_2.name,
    		type: "slot",
    		source: "(9:8) ",
    		ctx
    	});

    	return block;
    }

    // (18:8) 
    function create_header_slot_1(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Header 2";
    			attr_dev(h2, "slot", "header");
    			attr_dev(h2, "class", "header svelte-7n4s74");
    			add_location(h2, file$5, 17, 8, 686);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot_1.name,
    		type: "slot",
    		source: "(18:8) ",
    		ctx
    	});

    	return block;
    }

    // (19:8) 
    function create_body_slot_1(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let p0;
    	let t2;
    	let p1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro quia aperiam consequatur voluptas nihil beatae qui nisi? Commodi incidunt, architecto, est id fugit vitae placeat fugiat veritatis ea minus voluptatibus?";
    			t2 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro quia aperiam consequatur voluptas nihil beatae qui nisi? Commodi incidunt, architecto, est id fugit vitae placeat fugiat veritatis ea minus voluptatibus?";
    			if (img.src !== (img_src_value = "/static/images/studio/20190531/20190531_144629.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Second card");
    			attr_dev(img, "class", "svelte-7n4s74");
    			add_location(img, file$5, 19, 12, 786);
    			attr_dev(p0, "class", "svelte-7n4s74");
    			add_location(p0, file$5, 21, 16, 917);
    			attr_dev(p1, "class", "svelte-7n4s74");
    			add_location(p1, file$5, 22, 16, 1161);
    			attr_dev(div0, "class", "text svelte-7n4s74");
    			add_location(div0, file$5, 20, 12, 881);
    			attr_dev(div1, "slot", "body");
    			attr_dev(div1, "class", "body svelte-7n4s74");
    			add_location(div1, file$5, 18, 8, 742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t2);
    			append_dev(div0, p1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_body_slot_1.name,
    		type: "slot",
    		source: "(19:8) ",
    		ctx
    	});

    	return block;
    }

    // (29:8) 
    function create_header_slot(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Header 3";
    			attr_dev(h2, "slot", "header");
    			attr_dev(h2, "class", "header svelte-7n4s74");
    			add_location(h2, file$5, 28, 8, 1482);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot.name,
    		type: "slot",
    		source: "(29:8) ",
    		ctx
    	});

    	return block;
    }

    // (30:8) 
    function create_body_slot(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let p0;
    	let t2;
    	let p1;
    	let t4;
    	let p2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro quia aperiam consequatur voluptas nihil beatae qui nisi? Commodi incidunt, architecto, est id fugit vitae placeat fugiat veritatis ea minus voluptatibus?";
    			t2 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro quia aperiam consequatur voluptas nihil beatae qui nisi? Commodi incidunt, architecto, est id fugit vitae placeat fugiat veritatis ea minus voluptatibus?";
    			t4 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro quia aperiam consequatur voluptas nihil beatae qui nisi? Commodi incidunt, architecto, est id fugit vitae placeat fugiat veritatis ea minus voluptatibus?";
    			if (img.src !== (img_src_value = "/static/images/studio/20190531/20190531_144706.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Third card");
    			attr_dev(img, "class", "svelte-7n4s74");
    			add_location(img, file$5, 30, 12, 1582);
    			attr_dev(p0, "class", "svelte-7n4s74");
    			add_location(p0, file$5, 32, 16, 1712);
    			attr_dev(p1, "class", "svelte-7n4s74");
    			add_location(p1, file$5, 33, 16, 1956);
    			attr_dev(p2, "class", "svelte-7n4s74");
    			add_location(p2, file$5, 34, 16, 2200);
    			attr_dev(div0, "class", "text svelte-7n4s74");
    			add_location(div0, file$5, 31, 12, 1676);
    			attr_dev(div1, "slot", "body");
    			attr_dev(div1, "class", "body svelte-7n4s74");
    			add_location(div1, file$5, 29, 8, 1538);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t2);
    			append_dev(div0, p1);
    			append_dev(div0, t4);
    			append_dev(div0, p2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_body_slot.name,
    		type: "slot",
    		source: "(30:8) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let collapsiblecard0;
    	let t0;
    	let collapsiblecard1;
    	let t1;
    	let collapsiblecard2;
    	let current;

    	collapsiblecard0 = new CollapsibleCard({
    			props: {
    				$$slots: {
    					body: [create_body_slot_2],
    					header: [create_header_slot_2]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	collapsiblecard1 = new CollapsibleCard({
    			props: {
    				$$slots: {
    					body: [create_body_slot_1],
    					header: [create_header_slot_1]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	collapsiblecard2 = new CollapsibleCard({
    			props: {
    				$$slots: {
    					body: [create_body_slot],
    					header: [create_header_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(collapsiblecard0.$$.fragment);
    			t0 = space();
    			create_component(collapsiblecard1.$$.fragment);
    			t1 = space();
    			create_component(collapsiblecard2.$$.fragment);
    			attr_dev(div, "class", "cards svelte-7n4s74");
    			add_location(div, file$5, 4, 0, 81);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(collapsiblecard0, div, null);
    			append_dev(div, t0);
    			mount_component(collapsiblecard1, div, null);
    			append_dev(div, t1);
    			mount_component(collapsiblecard2, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const collapsiblecard0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				collapsiblecard0_changes.$$scope = { dirty, ctx };
    			}

    			collapsiblecard0.$set(collapsiblecard0_changes);
    			const collapsiblecard1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				collapsiblecard1_changes.$$scope = { dirty, ctx };
    			}

    			collapsiblecard1.$set(collapsiblecard1_changes);
    			const collapsiblecard2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				collapsiblecard2_changes.$$scope = { dirty, ctx };
    			}

    			collapsiblecard2.$set(collapsiblecard2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(collapsiblecard0.$$.fragment, local);
    			transition_in(collapsiblecard1.$$.fragment, local);
    			transition_in(collapsiblecard2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(collapsiblecard0.$$.fragment, local);
    			transition_out(collapsiblecard1.$$.fragment, local);
    			transition_out(collapsiblecard2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(collapsiblecard0);
    			destroy_component(collapsiblecard1);
    			destroy_component(collapsiblecard2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CollapsibleCards", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CollapsibleCards> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ CollapsibleCard });
    	return [];
    }

    class CollapsibleCards extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CollapsibleCards",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Images.svelte generated by Svelte v3.38.3 */

    const file$4 = "src/components/Images.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (49:0) {:catch error}
    function create_catch_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "An error occurred!";
    			add_location(p, file$4, 49, 4, 1216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(49:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (34:0) {:then data}
    function create_then_block(ctx) {
    	let div;
    	let each_value = /*data*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wrapper svelte-sx09rv");
    			add_location(div, file$4, 34, 4, 830);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*photos*/ 1) {
    				each_value = /*data*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(34:0) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (36:8) {#each data as photo}
    function create_each_block$2(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let p;
    	let t1_value = /*photo*/ ctx[2].title + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			if (img.src !== (img_src_value = /*photo*/ ctx[2].url)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*photo*/ ctx[2].title);
    			add_location(img, file$4, 38, 20, 954);
    			add_location(div0, file$4, 37, 16, 928);
    			add_location(p, file$4, 41, 20, 1061);
    			add_location(div1, file$4, 40, 16, 1035);
    			attr_dev(div2, "class", "box svelte-sx09rv");
    			add_location(div2, file$4, 36, 12, 894);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div2, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(36:8) {#each data as photo}",
    		ctx
    	});

    	return block;
    }

    // (32:15)      <p>...waiting</p> {:then data}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...waiting";
    			add_location(p, file$4, 32, 4, 795);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(32:15)      <p>...waiting</p> {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let await_block_anchor;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 1,
    		error: 5
    	};

    	handle_promise(/*photos*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Images", slots, []);

    	const photos = (async () => {
    		const response = await fetch("http://brogo.net.au/checklist/api/gallery");
    		return await response.json();
    	})();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Images> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ photos });
    	return [photos];
    }

    class Images extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Images",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/StaticImages.svelte generated by Svelte v3.38.3 */

    const file$3 = "src/components/StaticImages.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (86:2) {#each photos as photo}
    function create_each_block$1(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let p;
    	let t1_value = /*photo*/ ctx[1].text + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			if (img.src !== (img_src_value = /*photo*/ ctx[1].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*photo*/ ctx[1].text);
    			add_location(img, file$3, 88, 8, 2426);
    			add_location(div0, file$3, 87, 6, 2412);
    			add_location(p, file$3, 91, 8, 2502);
    			add_location(div1, file$3, 90, 6, 2488);
    			attr_dev(div2, "class", "box svelte-1d9blce");
    			add_location(div2, file$3, 86, 4, 2388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div2, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(86:2) {#each photos as photo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let each_value = /*photos*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wrapper svelte-1d9blce");
    			add_location(div, file$3, 84, 0, 2336);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*photos*/ 1) {
    				each_value = /*photos*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("StaticImages", slots, []);

    	const photos = [
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1486942873/action1Image.png",
    			text: "action1Image.png",
    			id: 0
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1506423474/kettle.png",
    			text: "kettle.png",
    			id: 1
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1507436690/trisl.png",
    			text: "trisl.png",
    			id: 2
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1509837209/tomatoes.png",
    			text: "tomatoes.png",
    			id: 3
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1514277955/Brogo%20King%20Parrot.png",
    			text: "Brogo King Parrot.png",
    			id: 4
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1564462303/solving%20problem.png",
    			text: "solving problem.png",
    			id: 5
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1597699451/issue%201.png",
    			text: "issue 201.png",
    			id: 6
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1606189965/specs%20used%20to%20check%20holes%20in%20walls.png",
    			text: "specs used to check holes in walls",
    			id: 7
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1613263753/harbour%20entrance.png",
    			text: "harbour entrance.png",
    			id: 8
    		},
    		{
    			image: "//s3-ap-southeast-2.amazonaws.com/images.brogo.net.au/1613263900/Pinnacles.png",
    			text: "Pinnacles.png",
    			id: 9
    		}
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<StaticImages> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ photos });
    	return [photos];
    }

    class StaticImages extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StaticImages",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/NotFound.svelte generated by Svelte v3.38.3 */

    const file$2 = "src/components/NotFound.svelte";

    function create_fragment$2(ctx) {
    	let t0;
    	let h1;
    	let t2;
    	let p;

    	const block = {
    		c: function create() {
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Not Found";
    			t2 = space();
    			p = element("p");
    			p.textContent = "This route doesn't exist.";
    			document.title = "Page Not Found";
    			attr_dev(h1, "class", "svelte-qbro6m");
    			add_location(h1, file$2, 4, 0, 64);
    			add_location(p, file$2, 5, 0, 83);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    // Route dictionary
    var routes = {
        '/': Home,
        '/clients': Clients,
        '/contractors': Contractors,
        '/how': HowItWorks,
        '/about': AboutUs,
        '/acknowledgements': Acknowledgements,
        '/charges': Charges,
        '/privacy': Privacy,
        '/terms': Terms,
        '/contact': ContactUs,
        '/links': Links,
        '/login': Login,
        '/news': News,
        '/service': Service,
        '/images': Images,
        '/static-images': StaticImages,
        '/cards': CollapsibleCards,
        // Catch-all route, must be last
        '*': NotFound
    };

    /* src/components/Navbar.svelte generated by Svelte v3.38.3 */
    const file$1 = "src/components/Navbar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (62:12) {#each navItems as item}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t0_value = /*item*/ ctx[5].label + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "href", /*item*/ ctx[5].href);
    			attr_dev(a, "class", "svelte-opf6vj");
    			add_location(a, file$1, 63, 20, 2140);
    			attr_dev(li, "class", "svelte-opf6vj");
    			add_location(li, file$1, 62, 16, 2115);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(62:12) {#each navItems as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let div2;
    	let div1;
    	let div0;
    	let div1_class_value;
    	let t;
    	let ul;
    	let ul_class_value;
    	let mounted;
    	let dispose;
    	let each_value = /*navItems*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "middle-line svelte-opf6vj");
    			add_location(div0, file$1, 58, 12, 1946);
    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(`mobile-icon${/*showMobileMenu*/ ctx[0] ? " active" : ""}`) + " svelte-opf6vj"));
    			add_location(div1, file$1, 57, 8, 1839);
    			attr_dev(ul, "class", ul_class_value = "" + (null_to_empty(`navbar-list${/*showMobileMenu*/ ctx[0] ? " mobile" : ""}`) + " svelte-opf6vj"));
    			add_location(ul, file$1, 60, 8, 2001);
    			attr_dev(div2, "class", "inner svelte-opf6vj");
    			add_location(div2, file$1, 56, 4, 1811);
    			attr_dev(nav, "class", "svelte-opf6vj");
    			add_location(nav, file$1, 55, 0, 1801);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div2, t);
    			append_dev(div2, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*handleMobileIconClick*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showMobileMenu*/ 1 && div1_class_value !== (div1_class_value = "" + (null_to_empty(`mobile-icon${/*showMobileMenu*/ ctx[0] ? " active" : ""}`) + " svelte-opf6vj"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (dirty & /*navItems*/ 2) {
    				each_value = /*navItems*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*showMobileMenu*/ 1 && ul_class_value !== (ul_class_value = "" + (null_to_empty(`navbar-list${/*showMobileMenu*/ ctx[0] ? " mobile" : ""}`) + " svelte-opf6vj"))) {
    				attr_dev(ul, "class", ul_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", slots, []);
    	let showMobileMenu = false;

    	// List of navigation items
    	const navItems = [
    		{ label: "Home", href: "#" },
    		{ label: "About Us", href: "#/about" },
    		{
    			label: "Acknowledgements",
    			href: "#/acknowledgements"
    		},
    		{ label: "Charges", href: "#/charges" },
    		{ label: "Privacy", href: "#/privacy" },
    		{ label: "Terms", href: "#/terms" },
    		{ label: "Contact Us", href: "#/contact" },
    		{ label: "Links", href: "#/links" },
    		{ label: "Login", href: "#/login" },
    		{ label: "News", href: "#/news" },
    		{ label: "Service", href: "#/service" },
    		{ label: "Cards", href: "#/cards" },
    		{
    			label: "Static Images",
    			href: "#/static-images"
    		},
    		{ label: "Images", href: "#/images" }
    	];

    	// Mobile menu click event handler
    	const handleMobileIconClick = () => $$invalidate(0, showMobileMenu = !showMobileMenu);

    	// CLose mobile menu when menu item selected
    	const closeMobileMenu = () => $$invalidate(0, showMobileMenu = false);

    	// Media match query handler
    	const mediaQueryHandler = e => {
    		// Reset mobile state
    		if (!e.matches) {
    			$$invalidate(0, showMobileMenu = false);
    		}
    	};

    	// Attach media query listener on mount hook
    	onMount(() => {
    		const mediaListener = window.matchMedia("(max-width: 767px)");
    		mediaListener.addListener(mediaQueryHandler);
    		let menuItems = document.querySelectorAll(".navbar-list li a");
    		let i = 0;

    		for (i = 0; i < menuItems.length; i++) {
    			menuItems[i].addEventListener("click", closeMobileMenu, false);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		showMobileMenu,
    		navItems,
    		handleMobileIconClick,
    		closeMobileMenu,
    		mediaQueryHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ("showMobileMenu" in $$props) $$invalidate(0, showMobileMenu = $$props.showMobileMenu);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [showMobileMenu, navItems, handleMobileIconClick];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let navbar;
    	let t0;
    	let div0;
    	let router;
    	let t1;
    	let div3;
    	let div2;
    	let p0;
    	let t3;
    	let br0;
    	let t4;
    	let br1;
    	let t5;
    	let br2;
    	let t6;
    	let div1;
    	let p1;
    	let t8;
    	let br3;
    	let t9;
    	let br4;
    	let t10;
    	let br5;
    	let t11;
    	let br6;
    	let t12;
    	let br7;
    	let t13;
    	let br8;
    	let t14;
    	let br9;
    	let t15;
    	let br10;
    	let t16;
    	let br11;
    	let t17;
    	let br12;
    	let t18;
    	let br13;
    	let t19;
    	let br14;
    	let t20;
    	let br15;
    	let t21;
    	let br16;
    	let t22;
    	let br17;
    	let t23;
    	let br18;
    	let t24;
    	let br19;
    	let t25;
    	let br20;
    	let t26;
    	let br21;
    	let t27;
    	let br22;
    	let t28;
    	let br23;
    	let t29;
    	let br24;
    	let t30;
    	let br25;
    	let t31;
    	let footer;
    	let p2;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(router.$$.fragment);
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "add or remove \"fixed-hf\" to have fixed header and footer and scrollable main section";
    			t3 = text("\n    a");
    			br0 = element("br");
    			t4 = text("\n    b");
    			br1 = element("br");
    			t5 = text("\n    c");
    			br2 = element("br");
    			t6 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "change none/block to test shorter content";
    			t8 = text("\n    d");
    			br3 = element("br");
    			t9 = text("\n    e");
    			br4 = element("br");
    			t10 = text("\n    f");
    			br5 = element("br");
    			t11 = text("\n    g");
    			br6 = element("br");
    			t12 = text("\n    h");
    			br7 = element("br");
    			t13 = text("\n    i");
    			br8 = element("br");
    			t14 = text("\n    j");
    			br9 = element("br");
    			t15 = text("\n    k");
    			br10 = element("br");
    			t16 = text("\n    l");
    			br11 = element("br");
    			t17 = text("\n    m");
    			br12 = element("br");
    			t18 = text("\n    n");
    			br13 = element("br");
    			t19 = text("\n    o");
    			br14 = element("br");
    			t20 = text("\n    p");
    			br15 = element("br");
    			t21 = text("\n    q");
    			br16 = element("br");
    			t22 = text("\n    r");
    			br17 = element("br");
    			t23 = text("\n    s");
    			br18 = element("br");
    			t24 = text("\n    t");
    			br19 = element("br");
    			t25 = text("\n    u");
    			br20 = element("br");
    			t26 = text("\n    v");
    			br21 = element("br");
    			t27 = text("\n    w");
    			br22 = element("br");
    			t28 = text("\n    x");
    			br23 = element("br");
    			t29 = text("\n    y");
    			br24 = element("br");
    			t30 = text("\n    z");
    			br25 = element("br");
    			t31 = space();
    			footer = element("footer");
    			p2 = element("p");
    			p2.textContent = "I am the footer !!!";
    			add_location(div0, file, 9, 0, 161);
    			add_location(p0, file, 15, 4, 261);
    			add_location(br0, file, 16, 5, 358);
    			add_location(br1, file, 17, 5, 369);
    			add_location(br2, file, 18, 5, 380);
    			add_location(p1, file, 20, 6, 424);
    			add_location(br3, file, 21, 5, 478);
    			add_location(br4, file, 22, 5, 489);
    			add_location(br5, file, 23, 5, 500);
    			add_location(br6, file, 24, 5, 511);
    			add_location(br7, file, 25, 5, 522);
    			add_location(br8, file, 26, 5, 533);
    			add_location(br9, file, 27, 5, 544);
    			add_location(br10, file, 28, 5, 555);
    			add_location(br11, file, 29, 5, 566);
    			add_location(br12, file, 30, 5, 577);
    			add_location(br13, file, 31, 5, 588);
    			add_location(br14, file, 32, 5, 599);
    			add_location(br15, file, 33, 5, 610);
    			add_location(br16, file, 34, 5, 621);
    			add_location(br17, file, 35, 5, 632);
    			add_location(br18, file, 36, 5, 643);
    			add_location(br19, file, 37, 5, 654);
    			add_location(br20, file, 38, 5, 665);
    			add_location(br21, file, 39, 5, 676);
    			add_location(br22, file, 40, 5, 687);
    			add_location(br23, file, 41, 5, 698);
    			add_location(br24, file, 42, 5, 709);
    			add_location(br25, file, 43, 5, 720);
    			set_style(div1, "display", "block");
    			add_location(div1, file, 19, 4, 390);
    			attr_dev(div2, "class", "main");
    			add_location(div2, file, 14, 4, 238);
    			add_location(p2, file, 48, 4, 762);
    			add_location(footer, file, 47, 2, 749);
    			attr_dev(div3, "class", "f-container fixed-hf");
    			add_location(div3, file, 13, 0, 199);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(router, div0, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t3);
    			append_dev(div2, br0);
    			append_dev(div2, t4);
    			append_dev(div2, br1);
    			append_dev(div2, t5);
    			append_dev(div2, br2);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(div1, t8);
    			append_dev(div1, br3);
    			append_dev(div1, t9);
    			append_dev(div1, br4);
    			append_dev(div1, t10);
    			append_dev(div1, br5);
    			append_dev(div1, t11);
    			append_dev(div1, br6);
    			append_dev(div1, t12);
    			append_dev(div1, br7);
    			append_dev(div1, t13);
    			append_dev(div1, br8);
    			append_dev(div1, t14);
    			append_dev(div1, br9);
    			append_dev(div1, t15);
    			append_dev(div1, br10);
    			append_dev(div1, t16);
    			append_dev(div1, br11);
    			append_dev(div1, t17);
    			append_dev(div1, br12);
    			append_dev(div1, t18);
    			append_dev(div1, br13);
    			append_dev(div1, t19);
    			append_dev(div1, br14);
    			append_dev(div1, t20);
    			append_dev(div1, br15);
    			append_dev(div1, t21);
    			append_dev(div1, br16);
    			append_dev(div1, t22);
    			append_dev(div1, br17);
    			append_dev(div1, t23);
    			append_dev(div1, br18);
    			append_dev(div1, t24);
    			append_dev(div1, br19);
    			append_dev(div1, t25);
    			append_dev(div1, br20);
    			append_dev(div1, t26);
    			append_dev(div1, br21);
    			append_dev(div1, t27);
    			append_dev(div1, br22);
    			append_dev(div1, t28);
    			append_dev(div1, br23);
    			append_dev(div1, t29);
    			append_dev(div1, br24);
    			append_dev(div1, t30);
    			append_dev(div1, br25);
    			append_dev(div3, t31);
    			append_dev(div3, footer);
    			append_dev(footer, p2);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			destroy_component(router);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router, routes, Navbar });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
