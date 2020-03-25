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
import { RESTDataSource } from 'apollo-datasource-rest'

import { getBasicAuthHeaders } from '../../utils'
import { Instance } from '../schema/instance'

export class SerloDataSource extends RESTDataSource {
  public async getAlias(alias: { path: string; instance: Instance }) {
    return this.get(`/api/alias${alias.path}`, alias.instance)
  }

  public async getLicense(id: number) {
    return this.get(`/api/license/${id}`)
  }

  public async getUuid(id: number) {
    return this.get(`/api/uuid/${id}`)
  }

  protected async get(path: string, instance: Instance = Instance.De) {
    if (process.env.NODE_ENV === 'test') {
      return super.get(`http://localhost:9009/${path}`)
    }

    const cacheKey = `${instance}.serlo.org${path}`
    const cache = await API_KV.get(cacheKey)

    if (cache) return JSON.parse(cache)

    const data = await super.get(
      `https://${instance}.${DOMAIN}/${path}`,
      undefined,
      {
        headers: getBasicAuthHeaders(),
      }
    )

    await API_KV.put(cacheKey, JSON.stringify(data))
    return data
  }
}
