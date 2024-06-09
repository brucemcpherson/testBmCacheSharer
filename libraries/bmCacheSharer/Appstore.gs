/**
 * this the state management central for this app
 */
const StorePack = (() => {

  const LOG = false;

  let memory = null;

  return {
    get memory() {
      if (!memory) {
        memory = Exports.newMemory({
          log: LOG,
        });
      }

      return memory;
    },
  };
})();

/**
 * this the state management central for this app
 * since it uses server, html service and cardservice
 * all state management and communication between them is handled here
 */
const AppStore = {
  checkName(name) {
    if (!name) {
      throw 'you must provide a name for your refresher definition'
    }
    return name
  },
  get memory() {
    return Exports.StorePack.memory;
  },
  get keyer() {
    return Exports.Utils.digester
  },
  makeKey({ version = 'v1', name, prefix, payload = '' }) {
    return prefix + this.keyer({
      version: version,
      name: this.checkName(name),
      payload
    })
  },
  getCacherKey({ version, name }) {
    return this.makeKey({ prefix: 'cp-', name, version })
  },
  getRefresherKey({ version, name } = {}) {
    return this.makeKey({ prefix: 'rp-', name, version })
  },
  getValueKey({ version, name, payload } = {}) {
    return this.makeKey({ prefix: 'vp-', name, version, payload })
  },

  getCacher({ name, version }) {
    return this.memory.get(this.getCacherKey({ version, name }))
  },
  getExpires({ name, version, expiry }) {
    if (!expiry) {
      const { fob } = this.getFob({ name, version })
      expiry = fob.expiry
    }
    return expiry && (new Date().getTime() + expiry * 1000)
  },
  /**
   * how to refresh config data
   * @param {string} name for your refresher
   * @param {function} func the refesher function
   * @param {object} p options
   * @param {string} [name] name to identify the refresher
   * @param {string} [communityKey] key to partition cache data into groups
   * @param {string} [version] version of refresher function
   * @param {number} [expiry] expiry how long (secs) data is valid for
   * @param {CacheService} [cacheService] use your own cacheservice
   * @param {string} [libraryCacheServiceName='Script'] which library cache to use
   * @returns string - the ID of the refresher
   */
  setRefresher(name, func, {
    communityKey,
    version,
    expiry,
    cacheService,
    libraryCacheServiceName = "Script"
  } = {}) {

    // default max cche time for apps script cache service
    const maxExpiry = 21600

    // using the parents own service or the library cache?
    if (!cacheService) {
      // Document doesnt make a lot of sense, but for completeness ...  
      const names = ["Script", "User", "Document"]
      if (names.indexOf(libraryCacheServiceName) === -1) {
        throw 'libraryCacheServiceName must be one of ' + names.join(",")
      }
      cacheService = CacheService[`get${libraryCacheServiceName}Cache`]()
    }

    if (!communityKey) {
      console.log(
        `...no community key provided - your cached data could be accessible by other groups`
      )
      console.log(
        '... add one to your refresher with setRefresher(name,func,{communityKey:"yourKey",...})'
      )
    }
    // finally get a crushing cacheservice to use
    const cacher = Exports.newCacher({
      cachePoint: cacheService,
      expiry: Math.min (maxExpiry, expiry || maxExpiry),
      prefix: communityKey || '-'
    })

    this.memory.set(this.getCacherKey({ version, name }), cacher)

    // now store the function
    const k = this.getRefresherKey({ name, version })
    this.memory.set(k, {
      func,
      expiry
    })

    return k
  },

  isLive(t) {
    return t && t > new Date().getTime()
  },

  expiredCheck(valueKey) {
    const v = this.memory.get(valueKey)
    const expired = v && v.expires && !this.isLive(v.expires)
    // if its expired lets delete it from memory
    if (expired) {
      this.memory.delete(valueKey)
      return null
    }
    return v && v.value
  },

  /**
   * gets a value from cache 
   * if its not there, it'll do a refresh using the args supplied
   * if it is in cache args are ignored
   */
  getValue(name, { version, refreshOnMissing = true, payload } = {}, ...args) {

    const valueKey = this.getValueKey({ name, version, payload })
    // first check memory
    let v = this.expiredCheck(valueKey)

    // it wasn't in memory - maybe its in cache
    if (Utils.isNull(v)) {
      const cacher = this.getCacher({ name, version })
      v = cacher.get(valueKey)

      // if it was in cache,put it in memory for next time
      if (!Utils.isNU(v)) {

        this.memory.set(valueKey, {
          value: v,
          expires: this.getExpires({ name, version })
        }) 
      } 

    } else if (args.length) {
      console.log(
        `...warning - value was found in cache - refresh arguments ignored for ${name}-${version}`
      )
    }

    // if it was in neither then refresh
    return Utils.isNU(v) && refreshOnMissing ? this.refresh(name, { version, payload }, ...args) : v

  },
  getFob({ name, version, throwOnError = true }) {

    const refresherKey = this.getRefresherKey({ name, version })
    const fob = this.memory.get(refresherKey)
    if (!fob && throwOnError) {
      throw `use setRefresher to supply a function which can refresh data for ${name} version ${version}`
    }
    return {
      fob
    }
  },
  /**
   * refreshes cache an returns the value returned by the function in setRefresher
   */
  refresh(name, { version, expiry, payload } = {}, ...args) {
    const { fob } = this.getFob({ name, version })
    const valueKey = this.getValueKey({ name, version, payload })
    const { func } = fob
    const expires = this.getExpires({ name, version, expiry })
    const value = func.apply(null, [{ name, version, payload }].concat(args))
    this.memory.set(valueKey, {
      value,
      expires
    })
    // also write to cache

    const cacher = this.getCacher({ name, version })
    cacher.set(valueKey, value, {
      expiry
    })
    return value
  }
};
