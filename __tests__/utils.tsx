/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import {
  sanitizeHtml,
  markdownToHtml,
  ALL_LANGUAGE_CODES,
  isLanguageCode,
  PreactResponse,
  JsonResponse,
  NotFoundResponse
} from '../src/utils'

import { h } from 'preact'
import { Template } from '../src/ui'

test('ALL_LANGUAGE_CODES', () => {
  expect(ALL_LANGUAGE_CODES.length).toBeGreaterThan(0)
})

describe('isLanguageCode()', () => {
  expect(isLanguageCode('de')).toBe(true)
  expect(isLanguageCode('fr')).toBe(true)

  expect(isLanguageCode('serlo')).toBe(false)
  expect(isLanguageCode('EN_EN')).toBe(false)
  expect(isLanguageCode('')).toBe(false)
})

describe('sanitizeHtml()', () => {
  test.each([
    ['<p>Hello</p>\n\n<script>42;</script>\n', '<p>Hello</p>'],
    [
      '<h1 id="test":>Hello</h1><iframe src="https://google.de/" />',
      '<h1>Hello</h1>'
    ],
    ['console.log(42)\n   ', 'console.log(42)']
  ])('HTML-Code %p', (html, sanitizedHtml) => {
    expect(sanitizeHtml(html)).toBe(sanitizedHtml)
  })
})

describe('markdownToHtml()', () => {
  test.each([
    ['# Hello', '<h1>Hello</h1>'],
    ['* 1\n* 2', '<ul>\n<li>1</li>\n<li>2</li>\n</ul>'],
    ['', '']
  ])('Markdown: %p', (markdown, html) => {
    expect(markdownToHtml(markdown)).toBe(html)
  })
})

test('PreactResponse', async () => {
  const hello = new PreactResponse((<h1>Hello</h1>))

  hasOkStatus(hello)
  contentTypeIsHtml(hello)
  await containsText(hello, ['<h1>Hello</h1>'])

  const template = (
    <Template title="not modified" lang="en">
      <p>Not Modified</p>
    </Template>
  )

  const notModified = new PreactResponse(template, {
    status: 304,
    headers: { 'Content-Type': 'test' }
  })

  expect(notModified.status).toBe(304)
  expect(notModified.headers.get('Content-Type')).toBe('test')
  await containsText(notModified, [
    '<p>Not Modified</p>',
    '<title>Serlo - not modified</title>'
  ])
})

test('JsonResponse', async () => {
  const response = new JsonResponse({ foo: [1, 2, 3] })

  isJsonResponse(response, { foo: [1, 2, 3] })
})

test('NotFoundResponse', async () => {
  await isNotFoundResponse(new NotFoundResponse())
})

export async function containsText(response: Response, texts: string[]) {
  expect(response).not.toBeNull()

  const responseText = await response.text()
  texts.forEach(text =>
    expect(responseText).toEqual(expect.stringContaining(text))
  )
}

export function contentTypeIsHtml(response: Response): void {
  expect(response.headers.get('Content-Type')).toBe('text/html;charset=utf-8')
}

export function hasOkStatus(response: Response): void {
  expect(response).not.toBeNull()
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
}

export async function isNotFoundResponse(response: Response): Promise<void> {
  expect(response).not.toBeNull()
  expect(response.status).toBe(404)
  expect(response.statusText).toBe('Not Found')
  expect(await response.text()).toEqual(
    expect.stringContaining('Page not found')
  )
}

export async function isJsonResponse(response: Response, targetJson: any) {
  hasOkStatus(response)
  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(JSON.parse(await response.text())).toEqual(targetJson)
}