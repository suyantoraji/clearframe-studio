var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _client, _currentQuery, _currentQueryInitialState, _currentResult, _currentResultState, _currentResultOptions, _currentThenable, _selectError, _selectFn, _selectResult, _lastQueryWithDefinedData, _staleTimeoutId, _refetchIntervalId, _currentRefetchInterval, _trackedProps, _QueryObserver_instances, executeFetch_fn, updateStaleTimeout_fn, computeRefetchInterval_fn, updateRefetchInterval_fn, updateTimers_fn, clearStaleTimeout_fn, clearRefetchInterval_fn, updateQuery_fn, notify_fn, _a, _client2, _currentResult2, _currentMutation, _mutateOptions, _MutationObserver_instances, updateResult_fn, notify_fn2, _b;
import { s as Subscribable, t as pendingThenable, v as resolveEnabled, w as shallowEqualObjects, x as resolveStaleTime, y as noop, z as environmentManager, A as isValidTimeout, D as timeUntilStale, E as timeoutManager, G as focusManager, I as fetchState, J as replaceData, K as notifyManager, M as hashKey, N as getDefaultState, r as reactExports, O as shouldThrowError, q as useQueryClient, g as useInternetIdentity, P as createActorWithConfig, Q as ExternalBlob, V as Variant, T as Text, U as Null, W as Record, X as Vec, Y as Nat, Z as Opt, _ as Bool, $ as Float64, a0 as Int, a1 as Service, a2 as Func, a3 as Principal, a4 as Nat8, H as HttpAgent, a5 as Actor } from "./index-Cu6O4N7x.js";
var QueryObserver = (_a = class extends Subscribable {
  constructor(client, options) {
    super();
    __privateAdd(this, _QueryObserver_instances);
    __privateAdd(this, _client);
    __privateAdd(this, _currentQuery);
    __privateAdd(this, _currentQueryInitialState);
    __privateAdd(this, _currentResult);
    __privateAdd(this, _currentResultState);
    __privateAdd(this, _currentResultOptions);
    __privateAdd(this, _currentThenable);
    __privateAdd(this, _selectError);
    __privateAdd(this, _selectFn);
    __privateAdd(this, _selectResult);
    // This property keeps track of the last query with defined data.
    // It will be used to pass the previous data and query to the placeholder function between renders.
    __privateAdd(this, _lastQueryWithDefinedData);
    __privateAdd(this, _staleTimeoutId);
    __privateAdd(this, _refetchIntervalId);
    __privateAdd(this, _currentRefetchInterval);
    __privateAdd(this, _trackedProps, /* @__PURE__ */ new Set());
    this.options = options;
    __privateSet(this, _client, client);
    __privateSet(this, _selectError, null);
    __privateSet(this, _currentThenable, pendingThenable());
    this.bindMethods();
    this.setOptions(options);
  }
  bindMethods() {
    this.refetch = this.refetch.bind(this);
  }
  onSubscribe() {
    if (this.listeners.size === 1) {
      __privateGet(this, _currentQuery).addObserver(this);
      if (shouldFetchOnMount(__privateGet(this, _currentQuery), this.options)) {
        __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this);
      } else {
        this.updateResult();
      }
      __privateMethod(this, _QueryObserver_instances, updateTimers_fn).call(this);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      this.destroy();
    }
  }
  shouldFetchOnReconnect() {
    return shouldFetchOn(
      __privateGet(this, _currentQuery),
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return shouldFetchOn(
      __privateGet(this, _currentQuery),
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set();
    __privateMethod(this, _QueryObserver_instances, clearStaleTimeout_fn).call(this);
    __privateMethod(this, _QueryObserver_instances, clearRefetchInterval_fn).call(this);
    __privateGet(this, _currentQuery).removeObserver(this);
  }
  setOptions(options) {
    const prevOptions = this.options;
    const prevQuery = __privateGet(this, _currentQuery);
    this.options = __privateGet(this, _client).defaultQueryOptions(options);
    if (this.options.enabled !== void 0 && typeof this.options.enabled !== "boolean" && typeof this.options.enabled !== "function" && typeof resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) !== "boolean") {
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    }
    __privateMethod(this, _QueryObserver_instances, updateQuery_fn).call(this);
    __privateGet(this, _currentQuery).setOptions(this.options);
    if (prevOptions._defaulted && !shallowEqualObjects(this.options, prevOptions)) {
      __privateGet(this, _client).getQueryCache().notify({
        type: "observerOptionsUpdated",
        query: __privateGet(this, _currentQuery),
        observer: this
      });
    }
    const mounted = this.hasListeners();
    if (mounted && shouldFetchOptionally(
      __privateGet(this, _currentQuery),
      prevQuery,
      this.options,
      prevOptions
    )) {
      __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this);
    }
    this.updateResult();
    if (mounted && (__privateGet(this, _currentQuery) !== prevQuery || resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) !== resolveEnabled(prevOptions.enabled, __privateGet(this, _currentQuery)) || resolveStaleTime(this.options.staleTime, __privateGet(this, _currentQuery)) !== resolveStaleTime(prevOptions.staleTime, __privateGet(this, _currentQuery)))) {
      __privateMethod(this, _QueryObserver_instances, updateStaleTimeout_fn).call(this);
    }
    const nextRefetchInterval = __privateMethod(this, _QueryObserver_instances, computeRefetchInterval_fn).call(this);
    if (mounted && (__privateGet(this, _currentQuery) !== prevQuery || resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) !== resolveEnabled(prevOptions.enabled, __privateGet(this, _currentQuery)) || nextRefetchInterval !== __privateGet(this, _currentRefetchInterval))) {
      __privateMethod(this, _QueryObserver_instances, updateRefetchInterval_fn).call(this, nextRefetchInterval);
    }
  }
  getOptimisticResult(options) {
    const query = __privateGet(this, _client).getQueryCache().build(__privateGet(this, _client), options);
    const result = this.createResult(query, options);
    if (shouldAssignObserverCurrentProperties(this, result)) {
      __privateSet(this, _currentResult, result);
      __privateSet(this, _currentResultOptions, this.options);
      __privateSet(this, _currentResultState, __privateGet(this, _currentQuery).state);
    }
    return result;
  }
  getCurrentResult() {
    return __privateGet(this, _currentResult);
  }
  trackResult(result, onPropTracked) {
    return new Proxy(result, {
      get: (target, key) => {
        this.trackProp(key);
        onPropTracked == null ? void 0 : onPropTracked(key);
        if (key === "promise") {
          this.trackProp("data");
          if (!this.options.experimental_prefetchInRender && __privateGet(this, _currentThenable).status === "pending") {
            __privateGet(this, _currentThenable).reject(
              new Error(
                "experimental_prefetchInRender feature flag is not enabled"
              )
            );
          }
        }
        return Reflect.get(target, key);
      }
    });
  }
  trackProp(key) {
    __privateGet(this, _trackedProps).add(key);
  }
  getCurrentQuery() {
    return __privateGet(this, _currentQuery);
  }
  refetch({ ...options } = {}) {
    return this.fetch({
      ...options
    });
  }
  fetchOptimistic(options) {
    const defaultedOptions = __privateGet(this, _client).defaultQueryOptions(options);
    const query = __privateGet(this, _client).getQueryCache().build(__privateGet(this, _client), defaultedOptions);
    return query.fetch().then(() => this.createResult(query, defaultedOptions));
  }
  fetch(fetchOptions) {
    return __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this, {
      ...fetchOptions,
      cancelRefetch: fetchOptions.cancelRefetch ?? true
    }).then(() => {
      this.updateResult();
      return __privateGet(this, _currentResult);
    });
  }
  createResult(query, options) {
    var _a2;
    const prevQuery = __privateGet(this, _currentQuery);
    const prevOptions = this.options;
    const prevResult = __privateGet(this, _currentResult);
    const prevResultState = __privateGet(this, _currentResultState);
    const prevResultOptions = __privateGet(this, _currentResultOptions);
    const queryChange = query !== prevQuery;
    const queryInitialState = queryChange ? query.state : __privateGet(this, _currentQueryInitialState);
    const { state } = query;
    let newState = { ...state };
    let isPlaceholderData = false;
    let data;
    if (options._optimisticResults) {
      const mounted = this.hasListeners();
      const fetchOnMount = !mounted && shouldFetchOnMount(query, options);
      const fetchOptionally = mounted && shouldFetchOptionally(query, prevQuery, options, prevOptions);
      if (fetchOnMount || fetchOptionally) {
        newState = {
          ...newState,
          ...fetchState(state.data, query.options)
        };
      }
      if (options._optimisticResults === "isRestoring") {
        newState.fetchStatus = "idle";
      }
    }
    let { error, errorUpdatedAt, status } = newState;
    data = newState.data;
    let skipSelect = false;
    if (options.placeholderData !== void 0 && data === void 0 && status === "pending") {
      let placeholderData;
      if ((prevResult == null ? void 0 : prevResult.isPlaceholderData) && options.placeholderData === (prevResultOptions == null ? void 0 : prevResultOptions.placeholderData)) {
        placeholderData = prevResult.data;
        skipSelect = true;
      } else {
        placeholderData = typeof options.placeholderData === "function" ? options.placeholderData(
          (_a2 = __privateGet(this, _lastQueryWithDefinedData)) == null ? void 0 : _a2.state.data,
          __privateGet(this, _lastQueryWithDefinedData)
        ) : options.placeholderData;
      }
      if (placeholderData !== void 0) {
        status = "success";
        data = replaceData(
          prevResult == null ? void 0 : prevResult.data,
          placeholderData,
          options
        );
        isPlaceholderData = true;
      }
    }
    if (options.select && data !== void 0 && !skipSelect) {
      if (prevResult && data === (prevResultState == null ? void 0 : prevResultState.data) && options.select === __privateGet(this, _selectFn)) {
        data = __privateGet(this, _selectResult);
      } else {
        try {
          __privateSet(this, _selectFn, options.select);
          data = options.select(data);
          data = replaceData(prevResult == null ? void 0 : prevResult.data, data, options);
          __privateSet(this, _selectResult, data);
          __privateSet(this, _selectError, null);
        } catch (selectError) {
          __privateSet(this, _selectError, selectError);
        }
      }
    }
    if (__privateGet(this, _selectError)) {
      error = __privateGet(this, _selectError);
      data = __privateGet(this, _selectResult);
      errorUpdatedAt = Date.now();
      status = "error";
    }
    const isFetching = newState.fetchStatus === "fetching";
    const isPending = status === "pending";
    const isError = status === "error";
    const isLoading = isPending && isFetching;
    const hasData = data !== void 0;
    const result = {
      status,
      fetchStatus: newState.fetchStatus,
      isPending,
      isSuccess: status === "success",
      isError,
      isInitialLoading: isLoading,
      isLoading,
      data,
      dataUpdatedAt: newState.dataUpdatedAt,
      error,
      errorUpdatedAt,
      failureCount: newState.fetchFailureCount,
      failureReason: newState.fetchFailureReason,
      errorUpdateCount: newState.errorUpdateCount,
      isFetched: query.isFetched(),
      isFetchedAfterMount: newState.dataUpdateCount > queryInitialState.dataUpdateCount || newState.errorUpdateCount > queryInitialState.errorUpdateCount,
      isFetching,
      isRefetching: isFetching && !isPending,
      isLoadingError: isError && !hasData,
      isPaused: newState.fetchStatus === "paused",
      isPlaceholderData,
      isRefetchError: isError && hasData,
      isStale: isStale(query, options),
      refetch: this.refetch,
      promise: __privateGet(this, _currentThenable),
      isEnabled: resolveEnabled(options.enabled, query) !== false
    };
    const nextResult = result;
    if (this.options.experimental_prefetchInRender) {
      const hasResultData = nextResult.data !== void 0;
      const isErrorWithoutData = nextResult.status === "error" && !hasResultData;
      const finalizeThenableIfPossible = (thenable) => {
        if (isErrorWithoutData) {
          thenable.reject(nextResult.error);
        } else if (hasResultData) {
          thenable.resolve(nextResult.data);
        }
      };
      const recreateThenable = () => {
        const pending = __privateSet(this, _currentThenable, nextResult.promise = pendingThenable());
        finalizeThenableIfPossible(pending);
      };
      const prevThenable = __privateGet(this, _currentThenable);
      switch (prevThenable.status) {
        case "pending":
          if (query.queryHash === prevQuery.queryHash) {
            finalizeThenableIfPossible(prevThenable);
          }
          break;
        case "fulfilled":
          if (isErrorWithoutData || nextResult.data !== prevThenable.value) {
            recreateThenable();
          }
          break;
        case "rejected":
          if (!isErrorWithoutData || nextResult.error !== prevThenable.reason) {
            recreateThenable();
          }
          break;
      }
    }
    return nextResult;
  }
  updateResult() {
    const prevResult = __privateGet(this, _currentResult);
    const nextResult = this.createResult(__privateGet(this, _currentQuery), this.options);
    __privateSet(this, _currentResultState, __privateGet(this, _currentQuery).state);
    __privateSet(this, _currentResultOptions, this.options);
    if (__privateGet(this, _currentResultState).data !== void 0) {
      __privateSet(this, _lastQueryWithDefinedData, __privateGet(this, _currentQuery));
    }
    if (shallowEqualObjects(nextResult, prevResult)) {
      return;
    }
    __privateSet(this, _currentResult, nextResult);
    const shouldNotifyListeners = () => {
      if (!prevResult) {
        return true;
      }
      const { notifyOnChangeProps } = this.options;
      const notifyOnChangePropsValue = typeof notifyOnChangeProps === "function" ? notifyOnChangeProps() : notifyOnChangeProps;
      if (notifyOnChangePropsValue === "all" || !notifyOnChangePropsValue && !__privateGet(this, _trackedProps).size) {
        return true;
      }
      const includedProps = new Set(
        notifyOnChangePropsValue ?? __privateGet(this, _trackedProps)
      );
      if (this.options.throwOnError) {
        includedProps.add("error");
      }
      return Object.keys(__privateGet(this, _currentResult)).some((key) => {
        const typedKey = key;
        const changed = __privateGet(this, _currentResult)[typedKey] !== prevResult[typedKey];
        return changed && includedProps.has(typedKey);
      });
    };
    __privateMethod(this, _QueryObserver_instances, notify_fn).call(this, { listeners: shouldNotifyListeners() });
  }
  onQueryUpdate() {
    this.updateResult();
    if (this.hasListeners()) {
      __privateMethod(this, _QueryObserver_instances, updateTimers_fn).call(this);
    }
  }
}, _client = new WeakMap(), _currentQuery = new WeakMap(), _currentQueryInitialState = new WeakMap(), _currentResult = new WeakMap(), _currentResultState = new WeakMap(), _currentResultOptions = new WeakMap(), _currentThenable = new WeakMap(), _selectError = new WeakMap(), _selectFn = new WeakMap(), _selectResult = new WeakMap(), _lastQueryWithDefinedData = new WeakMap(), _staleTimeoutId = new WeakMap(), _refetchIntervalId = new WeakMap(), _currentRefetchInterval = new WeakMap(), _trackedProps = new WeakMap(), _QueryObserver_instances = new WeakSet(), executeFetch_fn = function(fetchOptions) {
  __privateMethod(this, _QueryObserver_instances, updateQuery_fn).call(this);
  let promise = __privateGet(this, _currentQuery).fetch(
    this.options,
    fetchOptions
  );
  if (!(fetchOptions == null ? void 0 : fetchOptions.throwOnError)) {
    promise = promise.catch(noop);
  }
  return promise;
}, updateStaleTimeout_fn = function() {
  __privateMethod(this, _QueryObserver_instances, clearStaleTimeout_fn).call(this);
  const staleTime = resolveStaleTime(
    this.options.staleTime,
    __privateGet(this, _currentQuery)
  );
  if (environmentManager.isServer() || __privateGet(this, _currentResult).isStale || !isValidTimeout(staleTime)) {
    return;
  }
  const time = timeUntilStale(__privateGet(this, _currentResult).dataUpdatedAt, staleTime);
  const timeout = time + 1;
  __privateSet(this, _staleTimeoutId, timeoutManager.setTimeout(() => {
    if (!__privateGet(this, _currentResult).isStale) {
      this.updateResult();
    }
  }, timeout));
}, computeRefetchInterval_fn = function() {
  return (typeof this.options.refetchInterval === "function" ? this.options.refetchInterval(__privateGet(this, _currentQuery)) : this.options.refetchInterval) ?? false;
}, updateRefetchInterval_fn = function(nextInterval) {
  __privateMethod(this, _QueryObserver_instances, clearRefetchInterval_fn).call(this);
  __privateSet(this, _currentRefetchInterval, nextInterval);
  if (environmentManager.isServer() || resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) === false || !isValidTimeout(__privateGet(this, _currentRefetchInterval)) || __privateGet(this, _currentRefetchInterval) === 0) {
    return;
  }
  __privateSet(this, _refetchIntervalId, timeoutManager.setInterval(() => {
    if (this.options.refetchIntervalInBackground || focusManager.isFocused()) {
      __privateMethod(this, _QueryObserver_instances, executeFetch_fn).call(this);
    }
  }, __privateGet(this, _currentRefetchInterval)));
}, updateTimers_fn = function() {
  __privateMethod(this, _QueryObserver_instances, updateStaleTimeout_fn).call(this);
  __privateMethod(this, _QueryObserver_instances, updateRefetchInterval_fn).call(this, __privateMethod(this, _QueryObserver_instances, computeRefetchInterval_fn).call(this));
}, clearStaleTimeout_fn = function() {
  if (__privateGet(this, _staleTimeoutId)) {
    timeoutManager.clearTimeout(__privateGet(this, _staleTimeoutId));
    __privateSet(this, _staleTimeoutId, void 0);
  }
}, clearRefetchInterval_fn = function() {
  if (__privateGet(this, _refetchIntervalId)) {
    timeoutManager.clearInterval(__privateGet(this, _refetchIntervalId));
    __privateSet(this, _refetchIntervalId, void 0);
  }
}, updateQuery_fn = function() {
  const query = __privateGet(this, _client).getQueryCache().build(__privateGet(this, _client), this.options);
  if (query === __privateGet(this, _currentQuery)) {
    return;
  }
  const prevQuery = __privateGet(this, _currentQuery);
  __privateSet(this, _currentQuery, query);
  __privateSet(this, _currentQueryInitialState, query.state);
  if (this.hasListeners()) {
    prevQuery == null ? void 0 : prevQuery.removeObserver(this);
    query.addObserver(this);
  }
}, notify_fn = function(notifyOptions) {
  notifyManager.batch(() => {
    if (notifyOptions.listeners) {
      this.listeners.forEach((listener) => {
        listener(__privateGet(this, _currentResult));
      });
    }
    __privateGet(this, _client).getQueryCache().notify({
      query: __privateGet(this, _currentQuery),
      type: "observerResultsUpdated"
    });
  });
}, _a);
function shouldLoadOnMount(query, options) {
  return resolveEnabled(options.enabled, query) !== false && query.state.data === void 0 && !(query.state.status === "error" && options.retryOnMount === false);
}
function shouldFetchOnMount(query, options) {
  return shouldLoadOnMount(query, options) || query.state.data !== void 0 && shouldFetchOn(query, options, options.refetchOnMount);
}
function shouldFetchOn(query, options, field) {
  if (resolveEnabled(options.enabled, query) !== false && resolveStaleTime(options.staleTime, query) !== "static") {
    const value = typeof field === "function" ? field(query) : field;
    return value === "always" || value !== false && isStale(query, options);
  }
  return false;
}
function shouldFetchOptionally(query, prevQuery, options, prevOptions) {
  return (query !== prevQuery || resolveEnabled(prevOptions.enabled, query) === false) && (!options.suspense || query.state.status !== "error") && isStale(query, options);
}
function isStale(query, options) {
  return resolveEnabled(options.enabled, query) !== false && query.isStaleByTime(resolveStaleTime(options.staleTime, query));
}
function shouldAssignObserverCurrentProperties(observer, optimisticResult) {
  if (!shallowEqualObjects(observer.getCurrentResult(), optimisticResult)) {
    return true;
  }
  return false;
}
var MutationObserver = (_b = class extends Subscribable {
  constructor(client, options) {
    super();
    __privateAdd(this, _MutationObserver_instances);
    __privateAdd(this, _client2);
    __privateAdd(this, _currentResult2);
    __privateAdd(this, _currentMutation);
    __privateAdd(this, _mutateOptions);
    __privateSet(this, _client2, client);
    this.setOptions(options);
    this.bindMethods();
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this);
    this.reset = this.reset.bind(this);
  }
  setOptions(options) {
    var _a2;
    const prevOptions = this.options;
    this.options = __privateGet(this, _client2).defaultMutationOptions(options);
    if (!shallowEqualObjects(this.options, prevOptions)) {
      __privateGet(this, _client2).getMutationCache().notify({
        type: "observerOptionsUpdated",
        mutation: __privateGet(this, _currentMutation),
        observer: this
      });
    }
    if ((prevOptions == null ? void 0 : prevOptions.mutationKey) && this.options.mutationKey && hashKey(prevOptions.mutationKey) !== hashKey(this.options.mutationKey)) {
      this.reset();
    } else if (((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state.status) === "pending") {
      __privateGet(this, _currentMutation).setOptions(this.options);
    }
  }
  onUnsubscribe() {
    var _a2;
    if (!this.hasListeners()) {
      (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    }
  }
  onMutationUpdate(action) {
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    __privateMethod(this, _MutationObserver_instances, notify_fn2).call(this, action);
  }
  getCurrentResult() {
    return __privateGet(this, _currentResult2);
  }
  reset() {
    var _a2;
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, void 0);
    __privateMethod(this, _MutationObserver_instances, updateResult_fn).call(this);
    __privateMethod(this, _MutationObserver_instances, notify_fn2).call(this);
  }
  mutate(variables, options) {
    var _a2;
    __privateSet(this, _mutateOptions, options);
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, __privateGet(this, _client2).getMutationCache().build(__privateGet(this, _client2), this.options));
    __privateGet(this, _currentMutation).addObserver(this);
    return __privateGet(this, _currentMutation).execute(variables);
  }
}, _client2 = new WeakMap(), _currentResult2 = new WeakMap(), _currentMutation = new WeakMap(), _mutateOptions = new WeakMap(), _MutationObserver_instances = new WeakSet(), updateResult_fn = function() {
  var _a2;
  const state = ((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state) ?? getDefaultState();
  __privateSet(this, _currentResult2, {
    ...state,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isIdle: state.status === "idle",
    mutate: this.mutate,
    reset: this.reset
  });
}, notify_fn2 = function(action) {
  notifyManager.batch(() => {
    var _a2, _b2, _c, _d, _e, _f, _g, _h;
    if (__privateGet(this, _mutateOptions) && this.hasListeners()) {
      const variables = __privateGet(this, _currentResult2).variables;
      const onMutateResult = __privateGet(this, _currentResult2).context;
      const context = {
        client: __privateGet(this, _client2),
        meta: this.options.meta,
        mutationKey: this.options.mutationKey
      };
      if ((action == null ? void 0 : action.type) === "success") {
        try {
          (_b2 = (_a2 = __privateGet(this, _mutateOptions)).onSuccess) == null ? void 0 : _b2.call(
            _a2,
            action.data,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
        try {
          (_d = (_c = __privateGet(this, _mutateOptions)).onSettled) == null ? void 0 : _d.call(
            _c,
            action.data,
            null,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
      } else if ((action == null ? void 0 : action.type) === "error") {
        try {
          (_f = (_e = __privateGet(this, _mutateOptions)).onError) == null ? void 0 : _f.call(
            _e,
            action.error,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
        try {
          (_h = (_g = __privateGet(this, _mutateOptions)).onSettled) == null ? void 0 : _h.call(
            _g,
            void 0,
            action.error,
            variables,
            onMutateResult,
            context
          );
        } catch (e) {
          void Promise.reject(e);
        }
      }
    }
    this.listeners.forEach((listener) => {
      listener(__privateGet(this, _currentResult2));
    });
  });
}, _b);
var IsRestoringContext = reactExports.createContext(false);
var useIsRestoring = () => reactExports.useContext(IsRestoringContext);
IsRestoringContext.Provider;
function createValue() {
  let isReset = false;
  return {
    clearReset: () => {
      isReset = false;
    },
    reset: () => {
      isReset = true;
    },
    isReset: () => {
      return isReset;
    }
  };
}
var QueryErrorResetBoundaryContext = reactExports.createContext(createValue());
var useQueryErrorResetBoundary = () => reactExports.useContext(QueryErrorResetBoundaryContext);
var ensurePreventErrorBoundaryRetry = (options, errorResetBoundary, query) => {
  const throwOnError = (query == null ? void 0 : query.state.error) && typeof options.throwOnError === "function" ? shouldThrowError(options.throwOnError, [query.state.error, query]) : options.throwOnError;
  if (options.suspense || options.experimental_prefetchInRender || throwOnError) {
    if (!errorResetBoundary.isReset()) {
      options.retryOnMount = false;
    }
  }
};
var useClearResetErrorBoundary = (errorResetBoundary) => {
  reactExports.useEffect(() => {
    errorResetBoundary.clearReset();
  }, [errorResetBoundary]);
};
var getHasError = ({
  result,
  errorResetBoundary,
  throwOnError,
  query,
  suspense
}) => {
  return result.isError && !errorResetBoundary.isReset() && !result.isFetching && query && (suspense && result.data === void 0 || shouldThrowError(throwOnError, [result.error, query]));
};
var ensureSuspenseTimers = (defaultedOptions) => {
  if (defaultedOptions.suspense) {
    const MIN_SUSPENSE_TIME_MS = 1e3;
    const clamp = (value) => value === "static" ? value : Math.max(value ?? MIN_SUSPENSE_TIME_MS, MIN_SUSPENSE_TIME_MS);
    const originalStaleTime = defaultedOptions.staleTime;
    defaultedOptions.staleTime = typeof originalStaleTime === "function" ? (...args) => clamp(originalStaleTime(...args)) : clamp(originalStaleTime);
    if (typeof defaultedOptions.gcTime === "number") {
      defaultedOptions.gcTime = Math.max(
        defaultedOptions.gcTime,
        MIN_SUSPENSE_TIME_MS
      );
    }
  }
};
var willFetch = (result, isRestoring) => result.isLoading && result.isFetching && !isRestoring;
var shouldSuspend = (defaultedOptions, result) => (defaultedOptions == null ? void 0 : defaultedOptions.suspense) && result.isPending;
var fetchOptimistic = (defaultedOptions, observer, errorResetBoundary) => observer.fetchOptimistic(defaultedOptions).catch(() => {
  errorResetBoundary.clearReset();
});
function useBaseQuery(options, Observer, queryClient) {
  var _a2, _b2, _c, _d;
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const client = useQueryClient();
  const defaultedOptions = client.defaultQueryOptions(options);
  (_b2 = (_a2 = client.getDefaultOptions().queries) == null ? void 0 : _a2._experimental_beforeQuery) == null ? void 0 : _b2.call(
    _a2,
    defaultedOptions
  );
  const query = client.getQueryCache().get(defaultedOptions.queryHash);
  defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
  ensureSuspenseTimers(defaultedOptions);
  ensurePreventErrorBoundaryRetry(defaultedOptions, errorResetBoundary, query);
  useClearResetErrorBoundary(errorResetBoundary);
  const isNewCacheEntry = !client.getQueryCache().get(defaultedOptions.queryHash);
  const [observer] = reactExports.useState(
    () => new Observer(
      client,
      defaultedOptions
    )
  );
  const result = observer.getOptimisticResult(defaultedOptions);
  const shouldSubscribe = !isRestoring && options.subscribed !== false;
  reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => {
        const unsubscribe = shouldSubscribe ? observer.subscribe(notifyManager.batchCalls(onStoreChange)) : noop;
        observer.updateResult();
        return unsubscribe;
      },
      [observer, shouldSubscribe]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  reactExports.useEffect(() => {
    observer.setOptions(defaultedOptions);
  }, [defaultedOptions, observer]);
  if (shouldSuspend(defaultedOptions, result)) {
    throw fetchOptimistic(defaultedOptions, observer, errorResetBoundary);
  }
  if (getHasError({
    result,
    errorResetBoundary,
    throwOnError: defaultedOptions.throwOnError,
    query,
    suspense: defaultedOptions.suspense
  })) {
    throw result.error;
  }
  (_d = (_c = client.getDefaultOptions().queries) == null ? void 0 : _c._experimental_afterQuery) == null ? void 0 : _d.call(
    _c,
    defaultedOptions,
    result
  );
  if (defaultedOptions.experimental_prefetchInRender && !environmentManager.isServer() && willFetch(result, isRestoring)) {
    const promise = isNewCacheEntry ? (
      // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
      fetchOptimistic(defaultedOptions, observer, errorResetBoundary)
    ) : (
      // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
      query == null ? void 0 : query.promise
    );
    promise == null ? void 0 : promise.catch(noop).finally(() => {
      observer.updateResult();
    });
  }
  return !defaultedOptions.notifyOnChangeProps ? observer.trackResult(result) : result;
}
function useQuery(options, queryClient) {
  return useBaseQuery(options, QueryObserver);
}
function useMutation(options, queryClient) {
  const client = useQueryClient();
  const [observer] = reactExports.useState(
    () => new MutationObserver(
      client,
      options
    )
  );
  reactExports.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  const mutate = reactExports.useCallback(
    (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(noop);
    },
    [observer]
  );
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) {
    throw result.error;
  }
  return { ...result, mutate, mutateAsync: result.mutate };
}
const ACTOR_QUERY_KEY = "actor";
function useActor(createActor2, options) {
  const { identity, isAuthenticated } = useInternetIdentity();
  const queryClient = useQueryClient();
  const mockModules = options == null ? void 0 : options.mockModules;
  const actorQuery = useQuery({
    queryKey: [ACTOR_QUERY_KEY, identity == null ? void 0 : identity.getPrincipal().toString()],
    queryFn: async () => {
      if (!isAuthenticated) {
        return await createActorWithConfig(createActor2, { mockModules });
      }
      const actor = await createActorWithConfig(createActor2, {
        agentOptions: { identity },
        mockModules
      });
      return actor;
    },
    // Only refetch when identity changes
    staleTime: Number.POSITIVE_INFINITY,
    // This will cause the actor to be recreated when the identity changes
    enabled: true
  });
  reactExports.useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
    }
  }, [actorQuery.data, queryClient]);
  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching
  };
}
const NANOS_PER_MS = 1000000n;
function timestampToDate(timestamp) {
  const date = new Date(Number(timestamp / NANOS_PER_MS));
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1e3));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => value.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
function formatTimecode(durationMs, fps = 30) {
  const totalMs = Math.max(0, Number(durationMs));
  const totalSeconds = Math.floor(totalMs / 1e3);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor(totalMs % 1e3 / 1e3 * fps);
  const pad = (value) => value.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}
function formatRelativeTime(timestamp) {
  const date = timestampToDate(timestamp);
  if (!date) return "unknown";
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1e3);
  if (diffSeconds < 45) return "just now";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} mo ago`;
  return `${Math.round(diffMonths / 12)} yr ago`;
}
function formatDateTime(timestamp) {
  const date = timestampToDate(timestamp);
  if (!date) return "unknown";
  return date.toLocaleString(void 0, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}
async function fileToExternalBlob(file, onProgress) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
  return onProgress ? blob.withUploadProgress(onProgress) : blob;
}
function fileRefToUrl(fileRef) {
  return ExternalBlob.fromURL(fileRef).getDirectURL();
}
async function downloadFileRef(fileRef, filename) {
  const bytes = await ExternalBlob.fromURL(fileRef).getBytes();
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
async function deleteStoredFile(fileRef) {
  if (!fileRef) return;
  let response;
  try {
    response = await fetch(fileRef, { method: "DELETE" });
  } catch (error) {
    throw new Error(
      `Could not reach storage to delete a file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (response.ok || [404, 405, 501].includes(response.status)) return;
  throw new Error(
    `Storage refused to delete a file (${response.status} ${response.statusText}).`
  );
}
const Error$1 = Variant({
  "FrontendOriginsNotConfigured": Null,
  "MixedSsoSources": Record({
    "otherKeys": Vec(Text),
    "ssoKeys": Vec(Text)
  }),
  "Stale": Record({ "ageNs": Nat }),
  "MalformedCandid": Null,
  "AmbiguousAttribute": Record({
    "field": Text,
    "sources": Vec(Text)
  }),
  "NoAttributes": Null,
  "UnknownNonce": Null,
  "UntrustedSsoSource": Record({ "domain": Text }),
  "MissingField": Text,
  "FrontendOriginMismatch": Record({
    "got": Text,
    "expected": Vec(Text)
  })
});
const Result_5 = Variant({ "ok": Null, "err": Error$1 });
const UserRole = Variant({
  "admin": Null,
  "user": Null,
  "guest": Null
});
const FileRef = Text;
const ProjectId = Nat;
const Timestamp = Nat;
const ProjectView = Record({
  "id": ProjectId,
  "sourceFilename": Text,
  "thumbnail": Opt(FileRef),
  "name": Text,
  "createdAt": Timestamp,
  "sourceFile": FileRef,
  "updatedAt": Timestamp,
  "durationMs": Nat
});
const ProjectError = Variant({
  "notAuthorized": Null,
  "notFound": Null,
  "invalidName": Null
});
const Result_1 = Variant({
  "ok": ProjectView,
  "err": ProjectError
});
const DeletedFiles = Record({ "files": Vec(FileRef) });
const Result_4 = Variant({
  "ok": DeletedFiles,
  "err": ProjectError
});
const RenderId = Nat;
const Result_3 = Variant({ "ok": Null, "err": ProjectError });
const Value = Variant({
  "int": Int,
  "nat": Nat,
  "float": Float64,
  "bool": Bool,
  "null": Null,
  "text": Text
});
const Cell = Record({ "value": Value, "name": Text });
const Result__1 = Record({
  "hasMore": Bool,
  "rows": Vec(Vec(Cell))
});
const RenderView = Record({
  "id": RenderId,
  "createdAt": Timestamp,
  "resolution": Text,
  "settingsSummary": Text,
  "projectId": ProjectId,
  "outputFile": FileRef,
  "format": Text
});
const Result_2 = Variant({
  "ok": Vec(RenderView),
  "err": ProjectError
});
const Result = Variant({ "ok": RenderView, "err": ProjectError });
Service({
  "_initialize_access_control": Func([], [], []),
  "_internet_identity_sign_in_finish": Func([], [Result_5], []),
  "_internet_identity_sign_in_start": Func([], [Vec(Nat8)], []),
  "assignCallerUserRole": Func([Principal, UserRole], [], []),
  "createProject": Func(
    [Text, Text, Nat, Opt(FileRef), FileRef],
    [Result_1],
    []
  ),
  "deleteProject": Func([ProjectId], [Result_4], []),
  "deleteRender": Func([RenderId], [Result_3], []),
  "execute": Func([Text], [Result__1], ["query"]),
  "getApiDoc": Func([], [Text], ["query"]),
  "getCallerUserRole": Func([], [UserRole], ["query"]),
  "getProject": Func([ProjectId], [Result_1], ["query"]),
  "isCallerAdmin": Func([], [Bool], ["query"]),
  "listProjects": Func([], [Vec(ProjectView)], ["query"]),
  "listRenders": Func([ProjectId], [Result_2], ["query"]),
  "renameProject": Func([ProjectId, Text], [Result_1], []),
  "saveRender": Func(
    [ProjectId, FileRef, Text, Text, Text],
    [Result],
    []
  ),
  "schema": Func([], [Text], ["query"])
});
const idlFactory = ({ IDL }) => {
  const Error2 = IDL.Variant({
    "FrontendOriginsNotConfigured": IDL.Null,
    "MixedSsoSources": IDL.Record({
      "otherKeys": IDL.Vec(IDL.Text),
      "ssoKeys": IDL.Vec(IDL.Text)
    }),
    "Stale": IDL.Record({ "ageNs": IDL.Nat }),
    "MalformedCandid": IDL.Null,
    "AmbiguousAttribute": IDL.Record({
      "field": IDL.Text,
      "sources": IDL.Vec(IDL.Text)
    }),
    "NoAttributes": IDL.Null,
    "UnknownNonce": IDL.Null,
    "UntrustedSsoSource": IDL.Record({ "domain": IDL.Text }),
    "MissingField": IDL.Text,
    "FrontendOriginMismatch": IDL.Record({
      "got": IDL.Text,
      "expected": IDL.Vec(IDL.Text)
    })
  });
  const Result_52 = IDL.Variant({ "ok": IDL.Null, "err": Error2 });
  const UserRole2 = IDL.Variant({
    "admin": IDL.Null,
    "user": IDL.Null,
    "guest": IDL.Null
  });
  const FileRef2 = IDL.Text;
  const ProjectId2 = IDL.Nat;
  const Timestamp2 = IDL.Nat;
  const ProjectView2 = IDL.Record({
    "id": ProjectId2,
    "sourceFilename": IDL.Text,
    "thumbnail": IDL.Opt(FileRef2),
    "name": IDL.Text,
    "createdAt": Timestamp2,
    "sourceFile": FileRef2,
    "updatedAt": Timestamp2,
    "durationMs": IDL.Nat
  });
  const ProjectError2 = IDL.Variant({
    "notAuthorized": IDL.Null,
    "notFound": IDL.Null,
    "invalidName": IDL.Null
  });
  const Result_12 = IDL.Variant({ "ok": ProjectView2, "err": ProjectError2 });
  const DeletedFiles2 = IDL.Record({ "files": IDL.Vec(FileRef2) });
  const Result_42 = IDL.Variant({ "ok": DeletedFiles2, "err": ProjectError2 });
  const RenderId2 = IDL.Nat;
  const Result_32 = IDL.Variant({ "ok": IDL.Null, "err": ProjectError2 });
  const Value2 = IDL.Variant({
    "int": IDL.Int,
    "nat": IDL.Nat,
    "float": IDL.Float64,
    "bool": IDL.Bool,
    "null": IDL.Null,
    "text": IDL.Text
  });
  const Cell2 = IDL.Record({ "value": Value2, "name": IDL.Text });
  const Result__12 = IDL.Record({
    "hasMore": IDL.Bool,
    "rows": IDL.Vec(IDL.Vec(Cell2))
  });
  const RenderView2 = IDL.Record({
    "id": RenderId2,
    "createdAt": Timestamp2,
    "resolution": IDL.Text,
    "settingsSummary": IDL.Text,
    "projectId": ProjectId2,
    "outputFile": FileRef2,
    "format": IDL.Text
  });
  const Result_22 = IDL.Variant({
    "ok": IDL.Vec(RenderView2),
    "err": ProjectError2
  });
  const Result2 = IDL.Variant({ "ok": RenderView2, "err": ProjectError2 });
  return IDL.Service({
    "_initialize_access_control": IDL.Func([], [], []),
    "_internet_identity_sign_in_finish": IDL.Func([], [Result_52], []),
    "_internet_identity_sign_in_start": IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    "assignCallerUserRole": IDL.Func([IDL.Principal, UserRole2], [], []),
    "createProject": IDL.Func(
      [IDL.Text, IDL.Text, IDL.Nat, IDL.Opt(FileRef2), FileRef2],
      [Result_12],
      []
    ),
    "deleteProject": IDL.Func([ProjectId2], [Result_42], []),
    "deleteRender": IDL.Func([RenderId2], [Result_32], []),
    "execute": IDL.Func([IDL.Text], [Result__12], ["query"]),
    "getApiDoc": IDL.Func([], [IDL.Text], ["query"]),
    "getCallerUserRole": IDL.Func([], [UserRole2], ["query"]),
    "getProject": IDL.Func([ProjectId2], [Result_12], ["query"]),
    "isCallerAdmin": IDL.Func([], [IDL.Bool], ["query"]),
    "listProjects": IDL.Func([], [IDL.Vec(ProjectView2)], ["query"]),
    "listRenders": IDL.Func([ProjectId2], [Result_22], ["query"]),
    "renameProject": IDL.Func([ProjectId2, IDL.Text], [Result_12], []),
    "saveRender": IDL.Func(
      [ProjectId2, FileRef2, IDL.Text, IDL.Text, IDL.Text],
      [Result2],
      []
    ),
    "schema": IDL.Func([], [IDL.Text], ["query"])
  });
};
function candid_some(value) {
  return [
    value
  ];
}
function candid_none() {
  return [];
}
function record_opt_to_undefined(arg) {
  return arg == null ? void 0 : arg;
}
class Backend {
  constructor(actor, _uploadFile, _downloadFile, processError) {
    this.actor = actor;
    this._uploadFile = _uploadFile;
    this._downloadFile = _downloadFile;
    this.processError = processError;
  }
  async _initialize_access_control() {
    if (this.processError) {
      try {
        const result = await this.actor._initialize_access_control();
        return result;
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor._initialize_access_control();
      return result;
    }
  }
  async _internet_identity_sign_in_finish() {
    if (this.processError) {
      try {
        const result = await this.actor._internet_identity_sign_in_finish();
        return from_candid_Result_5_n1(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor._internet_identity_sign_in_finish();
      return from_candid_Result_5_n1(this._uploadFile, this._downloadFile, result);
    }
  }
  async _internet_identity_sign_in_start() {
    if (this.processError) {
      try {
        const result = await this.actor._internet_identity_sign_in_start();
        return result;
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor._internet_identity_sign_in_start();
      return result;
    }
  }
  async assignCallerUserRole(arg0, arg1) {
    if (this.processError) {
      try {
        const result = await this.actor.assignCallerUserRole(arg0, to_candid_UserRole_n5(this._uploadFile, this._downloadFile, arg1));
        return result;
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.assignCallerUserRole(arg0, to_candid_UserRole_n5(this._uploadFile, this._downloadFile, arg1));
      return result;
    }
  }
  async createProject(arg0, arg1, arg2, arg3, arg4) {
    if (this.processError) {
      try {
        const result = await this.actor.createProject(arg0, arg1, arg2, to_candid_opt_n6(this._uploadFile, this._downloadFile, arg3), arg4);
        return from_candid_Result_1_n7(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.createProject(arg0, arg1, arg2, to_candid_opt_n6(this._uploadFile, this._downloadFile, arg3), arg4);
      return from_candid_Result_1_n7(this._uploadFile, this._downloadFile, result);
    }
  }
  async deleteProject(arg0) {
    if (this.processError) {
      try {
        const result = await this.actor.deleteProject(arg0);
        return from_candid_Result_4_n13(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.deleteProject(arg0);
      return from_candid_Result_4_n13(this._uploadFile, this._downloadFile, result);
    }
  }
  async deleteRender(arg0) {
    if (this.processError) {
      try {
        const result = await this.actor.deleteRender(arg0);
        return from_candid_Result_3_n15(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.deleteRender(arg0);
      return from_candid_Result_3_n15(this._uploadFile, this._downloadFile, result);
    }
  }
  async execute(arg0) {
    if (this.processError) {
      try {
        const result = await this.actor.execute(arg0);
        return from_candid_Result__1_n17(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.execute(arg0);
      return from_candid_Result__1_n17(this._uploadFile, this._downloadFile, result);
    }
  }
  async getApiDoc() {
    if (this.processError) {
      try {
        const result = await this.actor.getApiDoc();
        return result;
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.getApiDoc();
      return result;
    }
  }
  async getCallerUserRole() {
    if (this.processError) {
      try {
        const result = await this.actor.getCallerUserRole();
        return from_candid_UserRole_n25(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.getCallerUserRole();
      return from_candid_UserRole_n25(this._uploadFile, this._downloadFile, result);
    }
  }
  async getProject(arg0) {
    if (this.processError) {
      try {
        const result = await this.actor.getProject(arg0);
        return from_candid_Result_1_n7(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.getProject(arg0);
      return from_candid_Result_1_n7(this._uploadFile, this._downloadFile, result);
    }
  }
  async isCallerAdmin() {
    if (this.processError) {
      try {
        const result = await this.actor.isCallerAdmin();
        return result;
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.isCallerAdmin();
      return result;
    }
  }
  async listProjects() {
    if (this.processError) {
      try {
        const result = await this.actor.listProjects();
        return from_candid_vec_n26(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.listProjects();
      return from_candid_vec_n26(this._uploadFile, this._downloadFile, result);
    }
  }
  async listRenders(arg0) {
    if (this.processError) {
      try {
        const result = await this.actor.listRenders(arg0);
        return from_candid_Result_2_n27(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.listRenders(arg0);
      return from_candid_Result_2_n27(this._uploadFile, this._downloadFile, result);
    }
  }
  async renameProject(arg0, arg1) {
    if (this.processError) {
      try {
        const result = await this.actor.renameProject(arg0, arg1);
        return from_candid_Result_1_n7(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.renameProject(arg0, arg1);
      return from_candid_Result_1_n7(this._uploadFile, this._downloadFile, result);
    }
  }
  async saveRender(arg0, arg1, arg2, arg3, arg4) {
    if (this.processError) {
      try {
        const result = await this.actor.saveRender(arg0, arg1, arg2, arg3, arg4);
        return from_candid_Result_n29(this._uploadFile, this._downloadFile, result);
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.saveRender(arg0, arg1, arg2, arg3, arg4);
      return from_candid_Result_n29(this._uploadFile, this._downloadFile, result);
    }
  }
  async schema() {
    if (this.processError) {
      try {
        const result = await this.actor.schema();
        return result;
      } catch (e) {
        this.processError(e);
        throw new Error("unreachable");
      }
    } else {
      const result = await this.actor.schema();
      return result;
    }
  }
}
function from_candid_Cell_n21(_uploadFile, _downloadFile, value) {
  return from_candid_record_n22(_uploadFile, _downloadFile, value);
}
function from_candid_Error_n3(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n4(_uploadFile, _downloadFile, value);
}
function from_candid_ProjectError_n12(_uploadFile, _downloadFile, value) {
  return "notAuthorized" in value ? "notAuthorized" : "notFound" in value ? "notFound" : "invalidName" in value ? "invalidName" : value;
}
function from_candid_ProjectView_n9(_uploadFile, _downloadFile, value) {
  return from_candid_record_n10(_uploadFile, _downloadFile, value);
}
function from_candid_Result_1_n7(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n8(_uploadFile, _downloadFile, value);
}
function from_candid_Result_2_n27(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n28(_uploadFile, _downloadFile, value);
}
function from_candid_Result_3_n15(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n16(_uploadFile, _downloadFile, value);
}
function from_candid_Result_4_n13(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n14(_uploadFile, _downloadFile, value);
}
function from_candid_Result_5_n1(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n2(_uploadFile, _downloadFile, value);
}
function from_candid_Result__1_n17(_uploadFile, _downloadFile, value) {
  return from_candid_record_n18(_uploadFile, _downloadFile, value);
}
function from_candid_Result_n29(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n30(_uploadFile, _downloadFile, value);
}
function from_candid_UserRole_n25(_uploadFile, _downloadFile, value) {
  return "admin" in value ? "admin" : "user" in value ? "user" : "guest" in value ? "guest" : value;
}
function from_candid_Value_n23(_uploadFile, _downloadFile, value) {
  return from_candid_variant_n24(_uploadFile, _downloadFile, value);
}
function from_candid_opt_n11(_uploadFile, _downloadFile, value) {
  return value.length === 0 ? null : value[0];
}
function from_candid_record_n10(_uploadFile, _downloadFile, value) {
  return {
    id: value.id,
    sourceFilename: value.sourceFilename,
    thumbnail: record_opt_to_undefined(from_candid_opt_n11(_uploadFile, _downloadFile, value.thumbnail)),
    name: value.name,
    createdAt: value.createdAt,
    sourceFile: value.sourceFile,
    updatedAt: value.updatedAt,
    durationMs: value.durationMs
  };
}
function from_candid_record_n18(_uploadFile, _downloadFile, value) {
  return {
    hasMore: value.hasMore,
    rows: from_candid_vec_n19(_uploadFile, _downloadFile, value.rows)
  };
}
function from_candid_record_n22(_uploadFile, _downloadFile, value) {
  return {
    value: from_candid_Value_n23(_uploadFile, _downloadFile, value.value),
    name: value.name
  };
}
function from_candid_variant_n14(_uploadFile, _downloadFile, value) {
  return "ok" in value ? {
    __kind__: "ok",
    ok: value.ok
  } : "err" in value ? {
    __kind__: "err",
    err: from_candid_ProjectError_n12(_uploadFile, _downloadFile, value.err)
  } : value;
}
function from_candid_variant_n16(_uploadFile, _downloadFile, value) {
  return "ok" in value ? {
    __kind__: "ok",
    ok: value.ok
  } : "err" in value ? {
    __kind__: "err",
    err: from_candid_ProjectError_n12(_uploadFile, _downloadFile, value.err)
  } : value;
}
function from_candid_variant_n2(_uploadFile, _downloadFile, value) {
  return "ok" in value ? {
    __kind__: "ok",
    ok: value.ok
  } : "err" in value ? {
    __kind__: "err",
    err: from_candid_Error_n3(_uploadFile, _downloadFile, value.err)
  } : value;
}
function from_candid_variant_n24(_uploadFile, _downloadFile, value) {
  return "int" in value ? {
    __kind__: "int",
    int: value.int
  } : "nat" in value ? {
    __kind__: "nat",
    nat: value.nat
  } : "float" in value ? {
    __kind__: "float",
    float: value.float
  } : "bool" in value ? {
    __kind__: "bool",
    bool: value.bool
  } : "null" in value ? {
    __kind__: "null",
    null: value.null
  } : "text" in value ? {
    __kind__: "text",
    text: value.text
  } : value;
}
function from_candid_variant_n28(_uploadFile, _downloadFile, value) {
  return "ok" in value ? {
    __kind__: "ok",
    ok: value.ok
  } : "err" in value ? {
    __kind__: "err",
    err: from_candid_ProjectError_n12(_uploadFile, _downloadFile, value.err)
  } : value;
}
function from_candid_variant_n30(_uploadFile, _downloadFile, value) {
  return "ok" in value ? {
    __kind__: "ok",
    ok: value.ok
  } : "err" in value ? {
    __kind__: "err",
    err: from_candid_ProjectError_n12(_uploadFile, _downloadFile, value.err)
  } : value;
}
function from_candid_variant_n4(_uploadFile, _downloadFile, value) {
  return "FrontendOriginsNotConfigured" in value ? {
    __kind__: "FrontendOriginsNotConfigured",
    FrontendOriginsNotConfigured: value.FrontendOriginsNotConfigured
  } : "MixedSsoSources" in value ? {
    __kind__: "MixedSsoSources",
    MixedSsoSources: value.MixedSsoSources
  } : "Stale" in value ? {
    __kind__: "Stale",
    Stale: value.Stale
  } : "MalformedCandid" in value ? {
    __kind__: "MalformedCandid",
    MalformedCandid: value.MalformedCandid
  } : "AmbiguousAttribute" in value ? {
    __kind__: "AmbiguousAttribute",
    AmbiguousAttribute: value.AmbiguousAttribute
  } : "NoAttributes" in value ? {
    __kind__: "NoAttributes",
    NoAttributes: value.NoAttributes
  } : "UnknownNonce" in value ? {
    __kind__: "UnknownNonce",
    UnknownNonce: value.UnknownNonce
  } : "UntrustedSsoSource" in value ? {
    __kind__: "UntrustedSsoSource",
    UntrustedSsoSource: value.UntrustedSsoSource
  } : "MissingField" in value ? {
    __kind__: "MissingField",
    MissingField: value.MissingField
  } : "FrontendOriginMismatch" in value ? {
    __kind__: "FrontendOriginMismatch",
    FrontendOriginMismatch: value.FrontendOriginMismatch
  } : value;
}
function from_candid_variant_n8(_uploadFile, _downloadFile, value) {
  return "ok" in value ? {
    __kind__: "ok",
    ok: from_candid_ProjectView_n9(_uploadFile, _downloadFile, value.ok)
  } : "err" in value ? {
    __kind__: "err",
    err: from_candid_ProjectError_n12(_uploadFile, _downloadFile, value.err)
  } : value;
}
function from_candid_vec_n19(_uploadFile, _downloadFile, value) {
  return value.map((x) => from_candid_vec_n20(_uploadFile, _downloadFile, x));
}
function from_candid_vec_n20(_uploadFile, _downloadFile, value) {
  return value.map((x) => from_candid_Cell_n21(_uploadFile, _downloadFile, x));
}
function from_candid_vec_n26(_uploadFile, _downloadFile, value) {
  return value.map((x) => from_candid_ProjectView_n9(_uploadFile, _downloadFile, x));
}
function to_candid_UserRole_n5(_uploadFile, _downloadFile, value) {
  return value == "admin" ? {
    admin: null
  } : value == "user" ? {
    user: null
  } : value == "guest" ? {
    guest: null
  } : value;
}
function to_candid_opt_n6(_uploadFile, _downloadFile, value) {
  return value === null ? candid_none() : candid_some(value);
}
function createActor(canisterId, _uploadFile, _downloadFile, options = {}) {
  const agent = options.agent || HttpAgent.createSync({
    ...options.agentOptions
  });
  if (options.agent && options.agentOptions) {
    console.warn("Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.");
  }
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions
  });
  return new Backend(actor, _uploadFile, _downloadFile, options.processError);
}
function useBackendActor() {
  return useActor(createActor);
}
function unwrapResult(result) {
  if (result.__kind__ === "ok") return result.ok;
  throw new Error(String(result.err));
}
function toProjectSummary(project) {
  return {
    id: project.id,
    name: project.name,
    sourceFilename: project.sourceFilename,
    durationMs: project.durationMs,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
    thumbnail: project.thumbnail
  };
}
function toRenderRecord(render) {
  return {
    id: render.id,
    projectId: render.projectId,
    format: render.format,
    resolution: render.resolution,
    settingsSummary: render.settingsSummary,
    outputFile: render.outputFile,
    createdAt: render.createdAt
  };
}
export {
  formatDuration as a,
  formatRelativeTime as b,
  fileToExternalBlob as c,
  formatBytes as d,
  formatTimecode as e,
  fileRefToUrl as f,
  useQuery as g,
  formatDateTime as h,
  downloadFileRef as i,
  useMutation as j,
  unwrapResult as k,
  deleteStoredFile as l,
  toRenderRecord as m,
  toProjectSummary as t,
  useBackendActor as u
};
