# Serlo Cloudflare Worker

This repository contains the source code for the cloudflare worker of Serlo ([https://serlo.org/](https://serlo.org)).

## Development

### Helpful commands

- `yarn test` – run all tests
- `yarn lint` – run linter against the codebase
- `yarn check:all` – run all checks (tests and lints)

### Running tests

You can run tests with `yarn test`. We use [jest](https://jestjs.io/) and thus all [jest command line options](https://jestjs.io/docs/en/cli) can be used.

It is also possible to run tests against other environments (the default environment is testing against the local source code):

- `yarn test:staging` – Test against `serlo-staging.dev`
- `yarn test:production` – Test against `serlo.org`

### Write tests

At [`__test__/__utils__`](./__tests__/__utils__) there are utility functions for writing tests:

- [`fetch-helper.ts`](./__tests__/__utils__/fetch-helper.ts):
  - `fetchSerlo()` - does an request at the current testing environment. For example when `TEST_ENVIRONMENT=staging` it makes a request at `*.serlo-staging.dev`. Use this function whenever possible. By setting `{ environment: TestEnvironment.Locally }` you can always test against the local environment.
- [`epxect-helper.ts`](./__tests__/__utils__/expect-helper.ts): Various assertation helper you can use.

### Run automatically all checks before pushing

You can use [git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) to automatically check your codebase before you push. In order to archieve this run the following commands in the root directory:

```sh
echo 'yarn check:all --no-uncommitted-changes' > .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

You can use the flag `--no-verify` like in `git push --no-verify` to bypass the checks while pushing.

## Static pages

Our cloudflare worker also serves some static pages (mostly our legal documents like the imprint or our privacy statement).
The legal documents and other static pages are stored in the repository [https://github.com/serlo/serlo.org-legal](https://github.com/serlo/serlo.org-legal).
Which version is shown can be configured in the file [`src/static-pages/config.ts`](./src/static-pages/config.ts).

There the url is specified for each static page type and each language version under which the content of the static page can be accessed.
For revised static pages a list of revisions is specified which is ordered in a way that the current revision is the first one.

The content can also be formated in the Markdown format.
In this case the url / file must end with the extension `.md`.
Without this file extension it is assumed that the returned file contains the page's body in HTML format.

The content of the static pages are automatically sanatized (e.g. potentially malicious JavaScript content is automatically removed).
In case you need a link which deactivates Google Analytics use the string `JS-GOOGLE-ANALYTICS-DEACTIVATE` as the `href` attribute:

```html
<a href="JS-GOOGLE-ANALYTICS-DEACTIVATE">
  Click here to deactivate Google Analytics
</a>
```

To include an iframe where the user can opt out from Matomo use the string `MATOMO-OPT-OUT-FORM`:

```markdown
Use the following form to opt out from Matomo:

MATOMO-OPT-OUT-FORM
```

## Frontend Proxy

The cloudflare worker also provides an A-B-testing for the new frontend.
The following variables define the behavior:

- `FRONTEND_ALLOWED_TYPES`: List of resource types given by the Serlo API which can be redirected to the new frontend.
- `FRONTEND_DOMAIN`: The domain of the new frontend.
- `FRONTEND_PROBABILITY_MOBILE`: Probability that users with mobile devices are redirected to frontend (0-1).
- `FRONTEND_PROBABILITY_DESKTOP`: Probability that users on desktop systems are redirected to frontend (0-1).
- `FRONTEND_PROBABILITY_AUTHENTICATED`: Probability that authenticated users are redirected to frontend (0-1). Only works if `REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND` is `false`.

With the cookie `frontendDomain` you can override the variable of `FRONTEND_DOMAIN`.

## Preview Images

Via `embed.serlo.org/thumbnail?url=${videoUrl|appletUrl}` you can request thumbnail images for supported providers (YouTube, Vimeo, Wikimedia Commons and Geogebra).
