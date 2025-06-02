import http from 'node:http'
import fs from 'node:fs'
import repoDir from './repoDir.cjs'

const httpServer = http.createServer()
const writeHead = (res, statusCode, headersOrUndefined) => {
	res.writeHead(statusCode, {'Cache-Control': 'no-store', ...headersOrUndefined})
}
const RelativeUriAsUrl = (value) => {
	return new URL(value, 'https://developer.mozilla.org')
}
const httpServeFile = (fileReadStream, res) => {
	fileReadStream.pipe(res)
	res.on('close', () => {
		if (fileReadStream.readable) {
			fileReadStream.destroy()
		}
	})
}
const ReadFdOrNull = (file) => {
	return new Promise((resolve, reject) => {
		fs.open(file, (errorOrFalsyValue, fdIfNotErrorOrFalsyValue) => {
			if (errorOrFalsyValue) {
				if (errorOrFalsyValue.code === 'ENOENT') {
					resolve(null)
				}
				else {
					reject(errorOrFalsyValue)
				}
			}
			else {
				resolve(fdIfNotErrorOrFalsyValue)
			}
		})
	})
}
let assert = (b) => {
	if (!b) {
		throw new Error('an assertion failed')
	}
}
httpServer.on('request', async (req, res) => {
	const url = RelativeUriAsUrl(req.url)
	const pathname = url.pathname
	const searchParams = url.searchParams
	if (pathname === '/') {
		if (req.method === 'GET') {
			writeHead(res, 200, {'Content-Type': 'text/html; charset=utf-8'})
			httpServeFile(fs.createReadStream(FsPath.join(repoDir, 'docs', 'index.html')), res)
		}
		else {
			writeHead(res, 405, {'Allow': 'GET'})
			res.end()
		}
	}
	else {
		let matchOrNull=pathname.match(/^\/starry\/([a-zA-Z0-9-_]+)(\.[a-z]+)$/)
		if (matchOrNull===null) {
			writeHead(res,500)
			res.end()
		}else {
			let [,name,ext]=matchOrNull
			let contentTypeOrNull=(() => {
				if (ext==='.js') {
					return 'text/javascript'
				}
				if (ext==='.css') {
					return 'text/css; charset=utf-8'
				}
				return null
			})()
			if (contentTypeOrNull===null) {
				writeHead(res,500)
				res.end()				
			}else {				
				const fdOrNull = await ReadFdOrNull(FsPath.join(repoDir, 'docs',name+ext))
				if (fdOrNull===null) {
					writeHead(res,500)
					res.end()									
				}else {
					writeHead(res, 200, {'Content-Type': contentTypeOrNull})
					httpServeFile(fs.createReadStream(null, {fd: fdOrNull}), res)
				}
			}
		}
	}
})
httpServer.listen(29749)
