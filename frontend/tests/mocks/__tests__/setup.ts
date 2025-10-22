/**
 * MSW Mock 測試 Setup
 *
 * 為 MSW mocks 測試提供必要的 polyfills
 */

import { fetch, Headers, Request, Response } from 'undici'

// 為 Node.js 環境提供 fetch API
global.fetch = fetch as any
global.Headers = Headers as any
global.Request = Request as any
global.Response = Response as any
