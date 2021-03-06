/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { givenUuid, currentTestEnvironment } from './__utils__'

describe('api calls', () => {
  test('get a signature', async () => {
    const env = currentTestEnvironment()

    givenUuid({
      id: 23591,
      __typename: 'Page',
      alias: '/23591/math',
    })

    const query = `
      query($alias: AliasInput) {
        uuid(alias: $alias) {
          __typename
          id
          ... on Page {
            alias
          }
        }
      }
    `
    const response = await env.fetch(
      { subdomain: 'api', pathname: '/graphql' },
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { alias: { instance: 'de', path: '/23591' } },
        }),
      }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { uuid: { __typename: 'Page', alias: '/23591/math', id: 23591 } },
    })
  })
})
