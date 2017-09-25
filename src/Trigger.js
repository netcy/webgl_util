var Trigger = wg.Trigger = function () {
  this._listeners = {};
};
Object.assign(Trigger.prototype, {
  on: function (type, listener, thisArg) {
    if (!type || !listener) {
      return this;
    }
    var self = this,
      listeners = self._listeners,
      bundles = listeners[type],
      bundle = {
        listener: listener,
        thisArg: thisArg
      },
      _listener = listener._listener || listener;
    if (!bundles) {
      listeners[type] = bundle;
    } else if (Array.isArray(bundles)) {
      if (!bundles.some(function (item) {
          return (item.listener._listener || item.listener) === _listener;
        })) {
        bundles.push(bundle);
      }
    } else {
      if ((bundles.listener._listener || bundles.listener) !== _listener) {
        listeners[type] = [bundles, bundle];
      }
    }
    return self;
  },
  once: function (type, listener, thisArg) {
    if (!type || !listener) {
      return this;
    }
    var self = this,
      newListener = function (event) {
        listener.call(thisArg, event);
        self.off(type, listener);
      };
    newListener._listener = listener;
    self.on(type, newListener, thisArg);
    return self;
  },
  off: function (type, listener) {
    var self = this,
      listeners = self._listeners,
      bundles = listeners[type],
      i, bundle;
    if (Array.isArray(bundles)) {
      bundles.some(function (bundle, i) {
        if ((bundle.listener._listener || bundle.listener) === listener) {
          bundles.splice(i, 1);
          return true;
        }
        return false;
      });
    } else if (bundles && ((bundles.listener._listener || bundles.listener) === listener)) {
      delete listeners[type];
    }
    return self;
  },
  fire: function (event) {
    var self = this,
      listeners = self._listeners,
      strictBundles = listeners[event.type],
      allBundles = listeners['all'],
      bundles;
    if (Array.isArray(strictBundles)) {
      if (allBundles) {
        bundles = strictBundles.concat(allBundles);
      } else {
        // Important, bundles will be changed if there is a once listener
        bundles = strictBundles.slice();
      }
    } else if (strictBundles) {
      if (allBundles) {
        bundles = [].concat(strictBundles, allBundles);
      } else {
        bundles = strictBundles;
      }
    } else {
      bundles = Array.isArray(allBundles) ? allBundles.slice() : allBundles;
    }
    if (Array.isArray(bundles)) {
      bundles.forEach(function (bundle) {
        bundle.listener.call(bundle.thisArg, event);
      });
    } else if (bundles) {
      bundles.listener.call(bundles.thisArg, event);
    }
    return self;
  },
  count: function (type) {
    var bundles = this._listeners[type];
    if (bundles) {
      return Array.isArray(bundles) ? bundles.length : 1;
    } else {
      return 0;
    }
  }
});
