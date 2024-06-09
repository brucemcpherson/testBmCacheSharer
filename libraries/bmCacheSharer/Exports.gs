var Exports = {

  getCommunityKey (...args) {
    return this.Utils.getCommunityKey(...args)
  },

  get Memory (){
    return Memory
  },

  /**
   * Memory instance with validation
   * @param {...*} args
   * @return {Memory} a proxied instance of Memory with property checking enabled
   */
  newMemory(...args) {
    return this.guard ( new this.Memory(...args))
  },
  /**
   * AppStore object proxy
   * @return {AppStore}
   */
  get AppStore () {
    return this.guard (AppStore)
  },

  /**
   * StorePack namespace
   * @return {StorePack} 
   */
  get StorePack() {
    return StorePack
  },

  /**
   * Utils namespace
   * @return {Utils} 
   */
  get Utils() {
    return this.guard(Utils)
  },

  get CachePointLib () {
    return bmCachePoint
  },

  newCacher (...args) {
    return this.guard (new this.CachePointLib.Cacher(...args))
  },

  // used to trap access to unknown properties
  guard(target) {
    return new Proxy(target, this.validateProperties)
  },


  /**
   * for validating attempts to access non existent properties
   */
  get validateProperties() {
    return {
      get(target, prop, receiver) {
        // typeof and console use the inspect prop
        if (
          typeof prop !== 'symbol' &&
          prop !== 'inspect' &&
          !Reflect.has(target, prop)
        ) throw `guard detected attempt to get non-existent property ${prop}`

        return Reflect.get(target, prop, receiver)
      },

      set(target, prop, value, receiver) {
        if (!Reflect.has(target, prop)) throw `guard attempt to set non-existent property ${prop}`
        return Reflect.set(target, prop, value, receiver)
      }
    }
  }

}





