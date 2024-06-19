


const t = () => {
  // unit tester
  const unit = new bmUnitTester.Unit({ showErrorsOnly: true })
  // share library

  const sharer = Exports.Sharer

  // for partitioning data
  // these community keys should be used by scripts that access the same data
  // communityA will not be able to find communityB data in cache
  // but all scripts in the same community group will be able to share cached data
  const communityA = Exports.LibExports.getCommunityKey('bm-group-a')
  const communityB = Exports.LibExports.getCommunityKey('bm-group-b')

  unit.section(() => {

    // refresh function for ipgeo 
    const mockIpGeo = ({ name, version, payload }) => {
      // handle no payload if one is mandatory
      if(!payload) return null

      return {
        info: payload,
        name,
        version,
        payload
      } 
    }

    const name = 'mock-ip-geox'
    sharer.setRefresher(name, mockIpGeo)
    const payload = {
      ip: "161.185.160.93"
    }
    unit.is(payload, sharer.getValue(name, { payload }).payload)
    unit.is(payload.ip, sharer.getValue(name, { payload }).info.ip)

    // do a refresh but with a smal refresh time
    const expiry = 2
    sharer.setRefresher(name, mockIpGeo, {expiry})
    
    unit.is (payload.ip, sharer.refresh (name, {payload}).info.ip, {
      description: 'replace with a short expiry'
    })

    Utilities.sleep((expiry + 1) * 1000)
    unit.is(null, sharer.getValue(name, { payload, refreshOnMissing: false }), {
      description: 'should expired'
    })
    unit.is(payload.ip, sharer.getValue(name, { payload }).info.ip, {
      description: 'should refresh automatically'
    })

    unit.is(null, sharer.getValue(name), {
      decription: 'should return nothing without a payload'
    })

  }, {
    description: 'payload mock'
  })
  
  unit.section(() => {

    // refresh function for ipgeo 
    const ipGeo = ({ name, version, payload }) => {
      // handle no payload if one is mandatory
      if(!payload) return null
      console.log ('hitting the api')
      const { ip } = payload
      const url = `https://ipinfo.io/${ip}/geo`
      const response = UrlFetchApp.fetch(url)
      const text = response.getContentText()
      return {
        info: JSON.parse(text),
        name,
        version,
        payload
      }
    }

    const name = 'ip-geo'
    sharer.setRefresher(name, ipGeo)
    const payload = {
      ip: "161.185.160.93"
    }
    unit.is(payload, sharer.getValue(name, { payload }).payload)
    unit.is(payload.ip, sharer.getValue(name, { payload }).info.ip)


    unit.is(null, sharer.getValue(name), {
      decription: 'should return nothing without a payload'
    })

  }, {
    description: 'payload real'
  })



  unit.section(() => {

    // some test data
    const message = 'hello world'

    // refresher
    const helloWorld = ({ name }) => {
      return { message, name }
    }

    // simple refreshers for each community
    // refreshers are called when data is not found in cache
    sharer.setRefresher('a', helloWorld, { communityKey: communityA })
    sharer.setRefresher('b', helloWorld, { communityKey: communityB })
    const expectA = { message, name: 'a' }
    const expectB = { message, name: 'b' }

    // this may or may not come from cache depending on whether its expired
    // by default it will run the refresher if not there
    unit.is(expectA, sharer.getValue('a'))
    unit.is(expectB, sharer.getValue('b'))

    // it's definitely in cache now
    const valueA = sharer.getValue('a', { refreshOnMissing: false })
    const valueB = sharer.getValue('b', { refreshOnMissing: false })
    unit.is(expectA, valueA)
    unit.is(expectB, valueB)

    // refresh with new expiry time
    const expiry = 5
    sharer.setRefresher('a', helloWorld, { expiry, communityKey: communityA })
    unit.is(expectA, sharer.refresh('a'), {
      description: 'was in cache after refresh'
    })

    // wait a bit and it should go away
    Utilities.sleep((expiry + 1) * 1000)
    unit.is(null, sharer.getValue('a', { refreshOnMissing: false }), {
      description: 'value should expire'
    })
    unit.is(expectB, sharer.getValue('b', { refreshOnMissing: false }), {
      description: 'community B still in cache'
    })

  }, {
    description: 'sharer works for multiple communities and expiries',
    skip: false
  })



  unit.section(() => {
    const ssid = '1zArP5mi86dIKP4Robc7MLc1TabBl9VV34nwBOTirMeE'
    const peopleSheet = 'people'
    const companySheet = 'companies'

    // this will be the referesher function
    const getCompanyValues = ({ name, version }) => {
      const ss = SpreadsheetApp.openById(ssid)
      const people = ss.getSheetByName(peopleSheet)
      const companies = ss.getSheetByName(companySheet)

      return {
        name,
        version,
        ssid,
        people: {
          sheetName: peopleSheet,
          values: people.getDataRange().getValues(),
          sheetId: people.getSheetId()
        },
        companies: {
          sheetName: companySheet,
          values: companies.getDataRange().getValues(),
          sheetId: people.getSheetId()
        }
      }
    }

    sharer.setRefresher('sheet-test', getCompanyValues, {
      communityKey: communityA
    })

    const testResult = (result, description = '') => {
      unit.is('sheet-test', result.name, { description })
      unit.is(ssid, result.ssid, { description })
      unit.is(peopleSheet, result.people.sheetName, { description })
      unit.is(companySheet, result.companies.sheetName, { description })
      unit.is(true, Array.isArray(result.people.values), { description })
      unit.is(true, Array.isArray(result.companies.values), { description })
      unit.is("number", typeof result.people.sheetId)
      unit.is("number", typeof result.companies.sheetId)
      return result
    }
    // this will refresh if necessary
    const result = testResult(sharer.getValue('sheet-test'))

    // refresh with new expiry time
    const expiry = 5
    sharer.setRefresher('sheet-test', getCompanyValues, { expiry, communityKey: communityA })
    unit.is(result, sharer.refresh('sheet-test'), {
      description: 'refreshed checked with previous values and expire set'
    })
    unit.is(result, sharer.getValue('sheet-test', { refreshOnMissing: false }), {
      description: 'value should exist before expiry'
    })
    // wait a bit and it should go away
    Utilities.sleep((expiry + 1) * 1000)
    unit.is(null, sharer.getValue('sheet-test', { refreshOnMissing: false }), {
      description: 'value should expire'
    })

    unit.is(result, sharer.refresh('sheet-test'), {
      description: 'refreshed checked with previous values'
    })

    unit.is(result, sharer.getValue('sheet-test', { refreshOnMissing: false }), {
      description: 'found it in cache'
    })

    // now let's try with a fiddler
    const getCompanyData = ({ name, version }) => {
      const peopleFiddler = Exports.newPreFiddler({
        sheetName: peopleSheet,
        id: ssid
      })
      const companyFiddler = Exports.newPreFiddler({
        sheetName: companySheet,
        id: ssid
      })
      return {
        name,
        version,
        ssid,
        people: {
          sheetName: peopleSheet,
          data: peopleFiddler.getData(),
          values: peopleFiddler.getValues()
        },
        companies: {
          sheetName: companySheet,
          data: companyFiddler.getData(),
          values: companyFiddler.getValues()
        }
      }
    }

    sharer.setRefresher('fiddler-test', getCompanyData, {
      communityKey: communityA
    })

    const fiddle = sharer.getValue('fiddler-test')
    unit.is(result.people.values, fiddle.people.values)
    unit.is(result.companies.values, fiddle.companies.values)

    // the data is in json format
    unit.is(true, Array.isArray(fiddle.people.data))
    unit.is(true, Array.isArray(fiddle.companies.data))

    // just check a field I know to be there in the test data
    const knownField = 'role'
    unit.is(true, Reflect.has(fiddle.people.data[0], knownField), {
      description: `found known field ${knownField}`
    })


  }, {
    description: 'cache values from sheets',
    skip: false
  })

  unit.section(() => {
    // some test data

    const english = 'hello world'
    // some test data
    const french = 'bonjour le monde'

    const expectV1 = { message: english, name: 'hello', version: 'V1' }
    const expectV2 = { message: french, name: 'hello', version: 'V2' }

    // refresher
    const helloWorldV1 = ({ name, version }) => {
      return { message: english, name, version }
    }

    // refresher
    const helloWorldV2 = ({ name, version }) => {
      return { message: french, name, version }
    }

    sharer.setRefresher('hello', helloWorldV1, { communityKey: communityA, version: 'V1' })
    sharer.setRefresher('hello', helloWorldV2, { communityKey: communityA, version: 'V2' })

    // this may or may not come from cache depending on whether its expired
    // by default it will run the refresher if not there
    unit.is(expectV1, sharer.getValue('hello', { version: 'V1' }))
    unit.is(expectV2, sharer.getValue('hello', { version: 'V2' }))


  }, { description: 'versioning' , skip: false})

  unit.report()
}