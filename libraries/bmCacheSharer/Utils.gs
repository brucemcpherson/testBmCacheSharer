const Utils = (() => {

  const isNull = (value) => value === null
  const isNU = (value) => isNull(value) || isUndefined(value)
  const isUndefined = (value) => typeof value === typeof undefined

  /**
   * create a key from arbitrary args
   * @param {...*} var_args
   * return {byte[]}
   */
  const digesterB = (...args) => {
    // conver args to an array and digest them
    const t = args.map(function (d) {
      if (typeof d === typeof undefined) throw new Error('digester key component cant be undefined')
      return (Object(d) === d) ? JSON.stringify(d) : d.toString();
    }).join("-")
    const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, t, Utilities.Charset.UTF_8)
    return b
  }

  /**
   * create a key from arbitrary args
   * @param {...*} var_args
   * return {string}
   */
  const digester = (...args) => {
    return Utilities.base64EncodeWebSafe(digesterB(...args))
  }

  /**
   * create a community key
   * @param {string} [prefix='community']
   * @return {string} a unique key
   */
  const getCommunityKey =  (prefix='community') => [prefix,Utilities.getUuid()].join(":")


  return {
    getCommunityKey,
    isNull,
    isNU,
    isUndefined,
    digester
  }
})()