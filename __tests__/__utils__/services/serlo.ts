/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { rest } from 'msw'

import { Url, Instance } from '../../../src/utils'
import { getUuid } from './database'
import { RestResolver, createUrlRegex } from './utils'

export function givenSerlo(resolver: RestResolver) {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: Object.values(Instance) }), resolver)
  )
}

export function defaultSerloServer(): RestResolver {
  return (req, res, ctx) => {
    const url = new Url(req.url.href)

    if (url.pathname.startsWith('/auth/') || url.pathname === '/user/register')
      return res(ctx.body(''))

    let content

    if (url.pathname === '/spenden' && url.subdomain === 'de') {
      content = 'Spenden'
    } else if (url.pathname === '/') {
      content =
        url.subdomain === 'de' ? 'Startseite' : 'The Open Learning Platform'
    } else if (url.pathname === '/search') {
      content = url.searchParams.get('q') ?? ''
    } else if (url.pathname === '/license/detail/1') {
      content = ''
    } else {
      const uuid = getUuid(url.subdomain, url.pathname)

      if (uuid == null) return res(ctx.status(404))

      content = uuid.content ?? ''
    }

    return res(
      ctx.set('x-powered-by', 'PHP'),
      ctx.body('<html class="fuelux"\n' + content)
    )
  }
}
