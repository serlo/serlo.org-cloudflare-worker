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
import { either as E, option as O } from 'fp-ts'
import * as t from 'io-ts'

import { Url } from './utils'

export async function embed(request: Request): Promise<Response | null> {
  // example url: embed.serlo.org/thumbnail?url=...
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'embed') return null

  const urlParam = url.searchParams.get('url')

  if (!urlParam) return getPlaceholder()

  try {
    const videoUrl = new Url(urlParam)

    switch (videoUrl.domain) {
      case 'youtube-nocookie.com':
        return await getYoutubeThumbnail(videoUrl)
      case 'vimeo.com':
        return await getVimeoThumbnail(videoUrl)
      case 'geogebra.org':
        return await getGeogebraThumbnail(videoUrl)
      case 'wikimedia.org':
        return await getWikimediaThumbnail(videoUrl)
    }
  } catch (e) {
    //Invalid URL
  }

  return getPlaceholder()
}

async function getYoutubeThumbnail(url: URL) {
  // example url: https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&html5

  const videoId = url.pathname.replace('/embed/', '')

  if (!/[a-zA-Z0-9_-]{11}/.test(videoId)) {
    return getPlaceholder()
  }

  const baseUrl = `https://i.ytimg.com/vi/${videoId}`

  const bigImgRes = await fetch(`${baseUrl}/sddefault.jpg`)
  if (isImageResponse(bigImgRes)) return bigImgRes

  const fallbackImgRes = await fetch(`${baseUrl}/hqdefault.jpg`)
  if (isImageResponse(fallbackImgRes)) return fallbackImgRes

  return getPlaceholder()
}

const VimeoApiResponse = t.type({
  type: t.literal('video'),
  thumbnail_url: t.string,
})

async function getVimeoThumbnail(url: URL) {
  const videoId = url.pathname.replace('/video/', '')

  if (!/[0-9]+/.test(videoId)) return getPlaceholder()

  const apiResponse = await fetch(
    'https://vimeo.com/api/oembed.json?url=' +
      encodeURIComponent(`https://vimeo.com/${videoId}`)
  )

  if (apiResponse.status !== 200) return getPlaceholder()

  try {
    const data = VimeoApiResponse.decode(await apiResponse.json())

    if (E.isLeft(data)) return getPlaceholder()

    const url = data.right.thumbnail_url.replace(/_[0-9|x]+/, '')

    const imageResponse = await fetch(url)

    if (!isImageResponse(imageResponse)) return getPlaceholder()

    return imageResponse
  } catch (e) {
    // error in parsing the api response or in parsing the thumbnail url
    return getPlaceholder()
  }
}

const GeogebraApiResponse = t.type({
  responses: t.type({
    response: t.type({ item: t.type({ previewUrl: t.string }) }),
  }),
})

async function getGeogebraThumbnail(url: URL) {
  //example url https://www.geogebra.org/material/iframe/id/100

  const appletId = url.pathname.replace('/material/iframe/id/', '')

  if (!/[0-9]+/.test(appletId)) return getPlaceholder()

  const apiResponse = await fetch('https://www.geogebra.org/api/json.php', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        '-api': '1.0.0',
        task: {
          '-type': 'fetch',
          fields: { field: [{ '-name': 'preview_url' }] },
          filters: { field: [{ '-name': 'id', '#text': appletId }] },
          limit: { '-num': '1' },
        },
      },
    }),
  })

  if (apiResponse.status !== 200) return getPlaceholder()

  try {
    const data = O.fromEither(
      GeogebraApiResponse.decode(await apiResponse.json())
    )

    if (O.isNone(data)) return getPlaceholder()

    const thumbnailUrl = data.value.responses.response.item.previewUrl

    const imgRes = await fetch(thumbnailUrl)
    if (isImageResponse(imgRes)) return imgRes
  } catch (e) {
    // JSON cannot be parsed or preview url cannot be parsed
  }

  return getPlaceholder()
}

async function getWikimediaThumbnail(url: URL) {
  const filenameWithPath = url.pathname.replace('/wikipedia/commons/', '') // e.g. '1/15/filename.webm'
  const filename = filenameWithPath.substring(
    filenameWithPath.lastIndexOf('/') + 1
  )
  const previewImageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filenameWithPath}/800px--${filename}.jpg`

  // note: this adds manual caching settings,
  // since wikimedia does not return a max - age setting that cf can adopt
  const imgRes = await fetch(previewImageUrl, {
    cf: { cacheTtl: 24 * 60 * 60, cacheEveything: true }, // TODO: disable `cacheEverything` when blocked image is working again
  } as unknown as RequestInit)
  if (isImageResponse(imgRes)) return imgRes

  return getPlaceholder()
}

function getPlaceholder() {
  const placeholderB64 =
    'iVBORw0KGgoAAAANSUhEUgAAAwAAAAGwAQMAAAAkGpCRAAAAA1BMVEXv9/t0VvapAAAAP0lEQVR42u3BMQEAAADCIPuntsUuYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQOqOwAAHrgHqAAAAAAElFTkSuQmCC'
  const buffer = Buffer.from(placeholderB64, 'base64')
  return new Response(buffer, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': Buffer.byteLength(buffer).toString(),
    },
  })
}

function isImageResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type') ?? ''
  return res.status === 200 && contentType.startsWith('image/')
}
