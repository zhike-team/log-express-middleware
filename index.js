
const uuidv4 = require('uuid/v4')

module.exports = logger

function logger (opts) {
  let reqId
  let defaultOptions = {
    handler: null,
    requestHeaders: [],
    responseHeaders: [],
    responseBodyWhiteList:[],
    responseBodyBlackList:[]
  }

  // 初始化配置
  if (typeof opts === 'object') {
    defaultOptions = Object.assign(defaultOptions, opts)
  }

  return async function (req, res, next) {
    // options请求不打印日志
    if (req.method === 'OPTIONS') {
      next()
    }

    // 初始化响应id
    if (typeof opts === 'object' && opts.reqId) {
      reqId = req[opts.reqId]
    } else if (req.reqId) {
      reqId = req.reqId
    } else {
      reqId = uuidv4()
    }
    req._reqId = reqId

    const startTime = new Date()

    console.log(`--------> req[${req._reqId}]`)
    console.log(req.method, req.originalUrl)

    // 打印requestHeaders
    const headers = req.headers
    const requestHeaders = defaultOptions.requestHeaders
    if (Array.isArray(requestHeaders) && requestHeaders.length > 0) {
      requestHeaders.forEach(item => {
        if (headers[item.toLowerCase()]) {
          console.log(`${item}: ${headers[item]}`)
        }
      })
    }

    // 打印requestBody的配置
    if (req.body && Object.keys(req.body).length) {
      const _log = {}
      _log.requestBody = Object.assign({}, req.body)

      if (defaultOptions.handler) {
        defaultOptions.handler(req, res, _log)
      }

      if (_log.requestBody) {
        console.log(JSON.stringify(requestBody))
      }
    }

    // request 结束符
    console.log(`-------- req[${req._reqId}]`)

    const oldEnd = res.end
    const oldWrite = res.write
    const chunks = []
    res.write = function(chunk){
      chunks.push(chunk)
      oldWrite.apply(res, arguments)
    }
    res.end = function(chunk){
      if(chunk) {
        chunks.push(chunk)
      }
      logResponse()
      oldEnd.apply(res, arguments)
    }


    function logResponse(){
      // 打印responseHeaders
      const responseHeaders = defaultOptions.responseHeaders
      if (Array.isArray(responseHeaders) && responseHeaders.length > 0) {
        console.log(`======== resp headers[${req._reqId}]`)
        responseHeaders.forEach(item => {
          const currentHeader = res.get(item.toLowerCase())
          if (currentHeader) {
            console.log(`${item}: ${currentHeader}`)
          }
        })
      }

      // 打印responseBody配置
      if (chunks.length>0) {
        const responseBodyWhiteList = defaultOptions.responseBodyWhiteList
        const responseBodyBlackList = defaultOptions.responseBodyBlackList
        
        let logBody
        if (Buffer.isBuffer(chunks[0])) {
          logBody = Buffer.concat(chunks).toString('utf8')
        } else {
          logBody = chunks.join("")
        }

        // 用户可以在业务代码中添加该标志来应对 正则匹配后的剔除情况
        if (req.useResponseBodyOption !== false) {
          if (Array.isArray(responseBodyWhiteList) && responseBodyWhiteList.length>0) {
            for (let path of responseBodyWhiteList) {
              if (path === req.path || (path instanceof RegExp && path.test(req.path))) {
                console.log(`======== resp body[${req._reqId}]`)
                console.log(logBody)
              } 
            }
          } else if (Array.isArray(responseBodyBlackList) && responseBodyBlackList.length>0) {
            for (let path of responseBodyBlackList) {
              if (path !== req.path && (path instanceof RegExp && !path.test(req.path))) {
                console.log(`======== resp body[${req._reqId}]`)
                console.log(logBody)
              } 
            }
          }
        }
      }

      // response 结束符
      // 打印完整url及响应时间
      const endTime = new Date()
      console.log(`<======== resp[${req._reqId}] ${res.statusCode} ${endTime - startTime} ms`)
    }

    next()
  }

}
