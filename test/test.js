const assert = require('assert')
const request = require('supertest')
const Express = require('express')
var bodyParser = require('body-parser');
const logger = require('../index')
const sinon = require('sinon')

const app = new Express()

app.use(bodyParser.json())

const server = app.listen()

async function passed(req, res, next) {
	console.log('this is a test')
	const body = {b: 'passed'}
	res.status(200).send(body)
}

async function passed3(req, res, next) {
	console.log('this is a test')
  const body = {
		reqId: req.jjgo,
		b: 'passed'
	}
	res.status(200).send(body)
}

const customReqid = async function(req, res, next){
	req.jjgo = 'aaaaaaaaaaaa-bbbbbbbbbbbbbb'
	next()
} 

const logMiddleware = logger()

const logMiddleware1 = logger({
	requestHeaders: ['content-type'],
	responseBodyWhiteList: [/player/]
})

const logMiddleware2 = logger({
	requestHeaders: ['content-type'],
	responseHeaders: ['content-type'],
	responseBodyWhiteList: ['/player2']
})

const logMiddleware3 = logger({
	reqId:'jjgo',
	requestHeaders: ['content-type'],
	responseHeaders: ['content-type'],
	responseBodyWhiteList: ['/player3']
})

app.get('/player', logMiddleware, passed)
app.post('/player', logMiddleware, passed)
app.post('/player1', logMiddleware1, passed)
app.post('/player2', logMiddleware2, passed)
app.post('/player3', customReqid, logMiddleware3, passed3)

let log
describe('测试配置', function () {
	beforeEach(function () {
		log = sinon.spy(logger, 'originalLogger')
	})

	afterEach(function () {
		log.restore()
	})

  it('GET请求player只打印request', async function () {
    await request(server)
			.get('/player')
			.set('content-type', 'application/json')
			.set('host', 'localhost')
			.set('Accept', 'application/json')
			.expect(200)
			.then((data)=>{
				assert.ok(log.getCall(1).args[0] === 'GET')
				assert.ok(log.getCall(1).args[1] === '/player')
			})
  })
  it('player只打印request', async function () {
    await request(server)
			.post('/player')
			.set('content-type', 'application/json')
			.set('host', 'localhost')
			.set('Accept', 'application/json')
      .send({"name":"john"})
			.expect(200)
			.then((data)=>{
				assert.ok(log.getCall(1).args[0] === 'POST')
				assert.ok(log.getCall(1).args[1] === '/player')
				console.log('resssss', typeof log.getCall(2).args[0], log.getCall(2).args[0])
				const requestBody = JSON.parse(log.getCall(2).args[0]) 
				assert.ok(requestBody['name'] === 'john')
			})
  })
  it('play1打印requestHeaders中的content-type', async function () {
    await request(server)
			.post('/player1')
			.set('content-type', 'application/json')
      .send({"name":"john"})
			.expect(200)
			.then((data)=>{
				const requestHeaders = log.getCall(2).args[0] 
				assert.ok(requestHeaders === 'content-type: application/json')
			})
  })
  it('/player2打印所有', async function () {
    await request(server)
      .post('/player2')
      .send({"name":"john"})
      .set('content-type', 'application/json')
			.expect(200)
			.then((data)=>{
				assert.ok(log.getCall(7).args[0] === 'content-type: application/json; charset=utf-8')
				assert.ok(log.getCall(9).args[0] === JSON.stringify({b:'passed'}))
			})
	})
  it('/player3 reqId使用业务自定义字段', async function () {
    await request(server)
      .post('/player3')
      .send({"name":"john"})
      .set('content-type', 'application/json')
			.expect(200)
			.then((data)=>{
				const responseBody = JSON.parse(data.text)
				assert.ok(responseBody.reqId === 'aaaaaaaaaaaa-bbbbbbbbbbbbbb')
			})
	})
})
