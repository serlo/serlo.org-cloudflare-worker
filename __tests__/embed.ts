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
import { rest } from 'msw'

import {
  hasInternalServerError,
  RestResolver,
  returnsMalformedJson,
  returnsJson,
  mockHttpGet,
  returnsText,
  currentTestEnvironment,
  localTestEnvironment,
  expectImageResponseWithError,
  expectImageReponse,
} from './__utils__'

describe('embed.serlo.org/thumbnail?url=...', () => {
  beforeEach(() => {
    mockHttpGet('https://malware.com/*', returnsText('bad'))
    mockHttpGet('http://malware.com/*', returnsText('bad'))
  })

  describe('Youtube', () => {
    const videos = {
      highQuality: {
        id: 'Wtvyw4NjJWc',
        contentLength: 17270,
        format: 'sddefault.jpg',
      },
      lowQuality: {
        id: 'KtV2wlp9Ts4',
        contentLength: 11464,
        format: 'hqdefault.jpg',
      },
    }

    beforeEach(() => {
      givenYoutube(defaultYoutubeServer())
    })

    test('returns sddefault.jpg thumbnail when it exists', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videos.highQuality.id}?autoplay=1&html5=1`
      )
      expectImageResponseWithError({
        response,
        expectedContentLength: videos.highQuality.contentLength,
        expectedImageType: 'image/jpeg',
      })
    })

    test('returns hqdefault.jpg thumbnail when sddefault.jpg does not exist', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videos.lowQuality.id}?autoplay=1&html5=1`
      )
      expectImageResponseWithError({
        response,
        expectedContentLength: videos.lowQuality.contentLength,
        expectedImageType: 'image/jpeg',
      })
    })

    describe('returns placeholder', () => {
      test('when no image is available', async () => {
        const response = await requestThumbnail(
          `https://www.youtube-nocookie.com/embed/AaaAaaAaaAa?autoplay=1&html5=1`
        )
        expectIsPlaceholderResponse(response)
      })

      test('when video id is malformed', async () => {
        const response = await requestThumbnail(
          `https://www.youtube-nocookie.com/embed/foo:pass@malware.com`
        )
        expectIsPlaceholderResponse(response)
      })

      test('when youtube does not return an image', async () => {
        givenYoutube(returnsText('Hello'))

        const response = await requestThumbnail(
          `https://www.youtube-nocookie.com/embed/${videos.highQuality.id}?autoplay=1&html5=1`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })
    })

    function givenYoutube(resolver: RestResolver) {
      global.server.use(
        rest.get('https://i.ytimg.com/vi/:videoId/:format', resolver)
      )
    }

    function defaultYoutubeServer(): RestResolver {
      return (req, res, ctx) => {
        const { videoId, format } = req.params

        for (const spec of Object.values(videos)) {
          if (videoId === spec.id && format === spec.format) {
            return res(
              ctx.set('content-type', 'image/jpeg'),
              ctx.set('content-length', spec.contentLength.toString())
            )
          }
        }

        return res(ctx.status(404))
      }
    }
  })

  describe('Vimeo', () => {
    const video = {
      id: '117611037',
      contentLength: 60215,
      thumbnailUrl: 'https://i.vimeocdn.com/video/505834070.jpg',
    }
    beforeEach(() => {
      givenVimeoApi(defaultVimeoApi())
      givenVimeoCdn(defaultVimeoCdn())
    })

    test('returns thumbnail of vimeo video', async () => {
      const response = await requestThumbnail(
        `https://player.vimeo.com/video/${video.id}?autoplay=1`
      )
      expectImageResponseWithError({
        response,
        expectedImageType: 'image/jpeg',
        expectedContentLength: video.contentLength,
      })
    })

    describe('returns placeholder', () => {
      test('when video does not exist', async () => {
        const response = await requestThumbnail(
          `https://player.vimeo.com/video/999999999?autoplay=1`
        )
        expectIsPlaceholderResponse(response)
      })

      test('when video id is malformed', async () => {
        const response = await requestThumbnail(
          `https://player.vimeo.com/video/foo:password@malware.com`
        )
        expectIsPlaceholderResponse(response)
      })

      test('when request to vimeo api fails', async () => {
        givenVimeoApi(hasInternalServerError())

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when vimeo api returns malformed json', async () => {
        givenVimeoApi(returnsMalformedJson())

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      describe('when vimeo api returns a malformed response', () => {
        test.each([
          42,
          { type: 'video' },
          { thumbnail_url: video.thumbnailUrl },
        ])('%p', async (data) => {
          givenVimeoApi(returnsJson(data))

          const response = await requestThumbnail(
            `https://player.vimeo.com/video/${video.id}?autoplay=1`,
            localTestEnvironment()
          )
          expectIsPlaceholderResponse(response)
        })
      })

      test('when vimeo api returns a malformed thumbnail_url', async () => {
        givenVimeoApi(returnsJson({ type: 'video', thumbnail_url: '42' }))

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when vimeo cdn doesn not return an image', async () => {
        givenVimeoCdn(returnsText('Hello'))

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when vimeo cdn does not responed with 200', async () => {
        givenVimeoCdn(hasInternalServerError())

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment()
        )
        expect(expectIsPlaceholderResponse(response))
      })
    })

    function givenVimeoCdn(resolver: RestResolver) {
      global.server.use(
        rest.get<never, any, { thumbnailFilename: string }>(
          'https://i.vimeocdn.com/video/:thumbnailFilename',
          resolver
        )
      )
    }

    function defaultVimeoCdn(): RestResolver {
      return (req, res, ctx) => {
        if (req.url.href === video.thumbnailUrl) {
          return res(
            ctx.set('content-type', 'image/jpeg'),
            ctx.set('content-length', video.contentLength.toString())
          )
        }
        return res(ctx.status(404))
      }
    }

    function givenVimeoApi(resolver: RestResolver) {
      global.server.use(rest.get('https://vimeo.com/api/oembed.json', resolver))
    }

    function defaultVimeoApi(): RestResolver {
      return (req, res, ctx) => {
        const videoId =
          req.url.searchParams?.get('url')?.replace('https://vimeo.com/', '') ??
          ''

        if (videoId === video.id) {
          return res(
            ctx.json({ type: 'video', thumbnail_url: video.thumbnailUrl })
          )
        }
        return res(ctx.status(403))
      }
    }
  })

  describe('Wikimedia', () => {
    const video = {
      embedUrl:
        'https://upload.wikimedia.org/wikipedia/commons/1/15/Inerter_vibration_isolation_experiment.webm',
      contentLength: 54373,
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Inerter_vibration_isolation_experiment.webm/800px--Inerter_vibration_isolation_experiment.webm.jpg',
    }

    beforeEach(() => {
      givenWikimedia(defaultWikimediaServer())
    })

    test('returns thumbnail', async () => {
      const response = await requestThumbnail(video.embedUrl)
      expectImageResponseWithError({
        response,
        expectedImageType: 'image/jpeg',
        expectedContentLength: video.contentLength,
      })
    })

    test('returns placeholder when video/thumbnail does not exist', async () => {
      const response = await requestThumbnail(
        'https://upload.wikimedia.org/wikipedia/commons/2/55/must_see.webm'
      )
      expectIsPlaceholderResponse(response)
    })

    test('returns placeholder when wikimedia does not return an image', async () => {
      givenWikimedia(returnsText('Hello'))

      const response = await requestThumbnail(
        video.embedUrl,
        localTestEnvironment()
      )
      expectIsPlaceholderResponse(response)
    })

    function givenWikimedia(resolver: RestResolver) {
      global.server.use(
        rest.get(
          'https://upload.wikimedia.org/wikipedia/commons/thumb/*',
          resolver
        )
      )
    }

    function defaultWikimediaServer(): RestResolver {
      return (req, res, ctx) => {
        return req.url.toString() === video.thumbnailUrl
          ? res(
              ctx.set('content-type', 'image/jpeg'),
              ctx.set('content-length', video.contentLength.toString())
            )
          : res(ctx.status(404))
      }
    }
  })

  describe('Geogebra', () => {
    const applet = {
      id: '100',
      contentLength: 10336,
      thumbnailUrl:
        'https://cdn.geogebra.org/resource/q9gNCVsS/lIoGcSJdoALG1cTd/material-q9gNCVsS.png',
    }
    beforeEach(() => {
      givenGeogebraApi(defaultGeogebraApi())
      givenGeogebraFile(defaultGeogebraFile())
    })

    test('returns thumbnail of geogebra applet', async () => {
      const response = await requestThumbnail(
        `https://www.geogebra.org/material/iframe/id/${applet.id}`
      )
      expectImageResponseWithError({
        response,
        expectedContentLength: applet.contentLength,
        expectedImageType: 'image/png',
      })
    })

    describe('returns placeholder', () => {
      test('when geogebra id contains non digit characters', async () => {
        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/abc%@`
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra file does not exist', async () => {
        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/001`
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra api returns with a non 200 respond', async () => {
        givenGeogebraApi(hasInternalServerError())

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra api returns malformed json', async () => {
        givenGeogebraApi(returnsMalformedJson())

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra api returns unknwon json response', async () => {
        givenGeogebraApi(returnsJson({ type: 'video' }))

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra api returns malformed preview url', async () => {
        givenGeogebraApi(returnsPreviewUrl('bad'))

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra cdn does not respond with an image', async () => {
        givenGeogebraFile(returnsText('Some text'))

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })

      test('when geogebra file does not exists', async () => {
        givenGeogebraFile(hasInternalServerError())

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment()
        )
        expectIsPlaceholderResponse(response)
      })
    })

    function givenGeogebraApi(resolver: RestResolver) {
      global.server.use(
        rest.post('https://www.geogebra.org/api/json.php', resolver)
      )
    }

    function defaultGeogebraApi(): RestResolver<any> {
      return (req, res, ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const appletId = req.body?.request?.task?.filters?.field?.[0]?.[
          '#text'
        ] as string

        if (appletId == applet.id)
          return res(
            ctx.json({
              responses: {
                response: { item: { previewUrl: applet.thumbnailUrl } },
              },
            })
          )

        return res(ctx.status(404))
      }
    }

    function returnsPreviewUrl(previewUrl: string) {
      return returnsJson({ responses: { response: { item: { previewUrl } } } })
    }

    function givenGeogebraFile(resolver: RestResolver) {
      global.server.use(rest.get(applet.thumbnailUrl, resolver))
    }

    function defaultGeogebraFile(): RestResolver {
      return (_req, res, ctx) => {
        return res(
          ctx.set('content-type', 'image/png'),
          ctx.set('content-length', applet.contentLength.toString())
        )
      }
    }
  })

  describe('returns placeholder', () => {
    test('when url parameter is empty', async () => {
      const response = await requestThumbnail('')
      expect(expectIsPlaceholderResponse(response))
    })

    test('when url is invalid', async () => {
      const response = await requestThumbnail('42')
      expect(expectIsPlaceholderResponse(response))
    })

    test('when url is unsupported', async () => {
      const response = await requestThumbnail(
        'https://www.twitch.tv/videos/824398155'
      )
      expect(expectIsPlaceholderResponse(response))
    })

    test('when path is not thumbnail', async () => {
      const response = await currentTestEnvironment().fetch({
        subdomain: 'embed',
        pathname: '/foo',
      })
      expect(expectIsPlaceholderResponse(response))
    })

    test('when url parameter is missing', async () => {
      const response = await currentTestEnvironment().fetch({
        subdomain: 'embed',
        pathname: '/thumbnail',
      })
      expect(expectIsPlaceholderResponse(response))
    })
  })
})

function expectIsPlaceholderResponse(response: Response) {
  expectImageReponse({
    response,
    expectedImageType: 'image/png',
    expectedContentLength: 135,
  })
}

async function requestThumbnail(
  url: string,
  env = currentTestEnvironment()
): Promise<Response> {
  return await env.fetch({
    subdomain: 'embed',
    pathname: '/thumbnail?url=' + encodeURIComponent(url),
  })
}
