
const uuidv4 = require('uuid/v4')

module.exports = logger

logger.originalLogger = console.log 

function logger (opts) {
  let reqId
  let defaultOptions = {
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

    const startTime = new Date()

    console.log = logger.originalLogger.bind(console, `${reqId}: `)

    logger.originalLogger(`--------> req[${reqId}]`)
    logger.originalLogger(req.method, req.originalUrl)

    // 打印requestHeaders
    const headers = req.headers
    const requestHeaders = defaultOptions.requestHeaders
    if (Array.isArray(requestHeaders) && requestHeaders.length > 0) {
      requestHeaders.forEach(item => {
        if (headers[item.toLowerCase()]) {
          logger.originalLogger(`${item}: ${headers[item]}`)
        }
      })
    }

    // 打印requestBody的配置
    if (req.body && Object.keys(req.body).length) {
      logger.originalLogger(JSON.stringify(req.body))
    }

    // request 结束符
    logger.originalLogger(`-------- req[${reqId}]`)

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
        logger.originalLogger(`======== resp headers[${reqId}]`)
        responseHeaders.forEach(item => {
          const currentHeader = res.get(item.toLowerCase())
          if (currentHeader) {
            logger.originalLogger(`${item}: ${currentHeader}`)
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
                logger.originalLogger(`======== resp body[${reqId}]`)
                logger.originalLogger(logBody)
              } 
            }
          } else if (Array.isArray(responseBodyBlackList) && responseBodyBlackList.length>0) {
            for (let path of responseBodyBlackList) {
              if (path !== req.path && (path instanceof RegExp && !path.test(req.path))) {
                logger.originalLogger(`======== resp body[${reqId}]`)
                logger.originalLogger(logBody)
              } 
            }
          }
        }
      }

      // response 结束符
      // 打印完整url及响应时间
      const endTime = new Date()
      logger.originalLogger(`<======== resp[${reqId}] ${res.statusCode} ${endTime - startTime} ms`)
    }

    next()
  }

}
