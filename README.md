# finally-normal-tests

minimal static interactive test platform built with html, css and vanilla javascript

- site: https://porugalsaskotom.github.io/finally-normal-tests/
- repository: https://github.com/porugalsaskotom/finally-normal-tests

## project structure

- `index.html` - page shell
- `style.css` - layout, colors, responsive styles and image presentation
- `app.js` - test loading, catalog, test flow, navigation and scoring
- `tests/index.json` - manifest listing test json files
- `tests/test_slug/test.json` - one test definition
- `tests/test_slug/media/images/` - test images
- `tests/test_slug/media/images/common/` - shared test images
- `tests/test_slug/files/` - optional downloadable or supporting files

## test folder architecture

each test must live in its own portable folder

```text
tests/
  index.json
  test_slug/
    test.json
    media/
      images/
        common/
          uploaded_file_1.jpg
          uploaded_file_2.png
```

- folder names and asset filenames use lowercase english `snake_case`
- use a stable unique slug, for example `testovyi_test`
- `test.json` stores metadata, publication state, questions, answers, scoring and relative asset paths
- `media/images/common/` is the general upload area for any shared test images
- keep original uploaded filenames; do not rename files just to assign a role
- `media/images/questions/` stores question-specific images
- `media/images/results/` stores result-specific images
- `test.json` references the exact selected filename and relative path for each role
- the same file may be assigned to multiple roles when requested
- create `media/images/questions/` and `media/images/results/` only when needed
- all asset paths in json are relative to the test folder
- do not embed image data or base64 in json
- moving a test folder must move all assets with it

## test manifest and loading

github pages is static and cannot automatically enumerate folders. therefore `tests/index.json` is the explicit catalog manifest

example:

```json
{
  "tests": [
    "testovyi_test/test.json"
  ]
}
```

add each new test json path to this manifest. the app fetches each listed json file and shows only tests where `published` is exactly `true`

## test json format

```json
{
  "id": "testovyi_test",
  "published": true,
  "title": "тестовый тест",
  "description": "это тестовый тест для тестового теста",
  "duration": "1 минута",
  "assets": {
    "cover": "media/images/common/original_cover_file.jpg",
    "background": "media/images/common/original_background_file.png"
  },
  "questions": [],
  "scoring": {
    "type": "sum",
    "results": []
  }
}
```

- `assets.cover` is optional and points to the catalog cover and quiz panel image
- `assets.background` is optional and points to the page background while the test is open
- paths may use any original filename and supported image extension
- leave a role as `null` until an image is assigned
- when the owner uploads images, identify files by their exact names and update only the relevant json paths
- missing or unassigned image files do not prevent the test from working
- use unique stable ids for tests, questions, answers and results

## publication

- `published: true` - visible in the catalog
- `published: false` - hidden from the catalog
- missing or non-true values are hidden
- this is catalog filtering only, not access control; all public repository files can be inspected

## scoring

### sum

each answer has a numeric `score`. the app adds selected scores and chooses the result whose `min` and `max` range contains the total. ranges must cover all possible totals without gaps

### categories

each answer has a `scores` array with `category` and `points`. define matching categories in `scoring.results`. the app totals points by category and displays the category with the highest score

## visual and writing style

all user-facing website text must follow these rules:

- lowercase letters only
- no periods at the end of paragraphs or standalone ui text
- do not use em dashes or en dashes; use a regular hyphen `-`
- keep copy concise and calm
- code identifiers, file paths, json keys and technical syntax keep conventional casing when required

## ai and contributor rules

- read this file before changing project architecture or adding tests
- keep the app static unless the owner explicitly approves a backend
- do not add frameworks, build tools, dependencies or services without approval
- keep test content separate from rendering logic
- every test belongs in its own folder and is registered in `tests/index.json`
- use `media/images/common/` as the general image drop folder; preserve original filenames
- when the owner says which uploaded image has which role, map its exact path in `test.json`
- preserve the current json schema and scoring behavior
- keep new tests unpublished until reviewed
- never claim a planned feature is implemented
- never add secrets, api keys, personal data or confidential content
- after code changes, verify catalog display, answer selection, back navigation, result rendering and retaking a test

## deployment

update files in `main`; github pages deploys automatically from the repository root. hard refresh if cached files remain visible

## current limitations

- results are not stored or sent to the site owner
- there are no accounts, admin panel or analytics
- tests and images are public
- image files are not committed until uploaded by the owner
