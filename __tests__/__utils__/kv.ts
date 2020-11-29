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

type KV_NAMES = 'MAINTENANCE_KV' | 'PACKAGES_KV' | 'PATH_INFO_KV'

export function mockKV(name: KV_NAMES, values: Record<string, string>) {
  global[name] = {
    async get(key: string): Promise<string | null> {
      return Promise.resolve(values[key] ?? null)
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async put(key: string, value: string, _?: { expirationTtl: number }) {
      values[key] = value
    },
  }
}