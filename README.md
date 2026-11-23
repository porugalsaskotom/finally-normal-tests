# finally-normal-tests

minimal static interactive test platform built with html, css and vanilla javascript

- site: https://porugalsaskotom.github.io/finally-normal-tests/
- repository: https://github.com/porugalsaskotom/finally-normal-tests

## project structure

current root files:

- `index.html` - page shell and resource links
- `style.css` - layout, colors and responsive styles
- `app.js` - catalog, test flow, navigation and scoring
- `tests.js` - current test data source
- `README.md` - project rules and instructions

## target test architecture

new tests should use one self-contained folder per test. use this structure as the target architecture when implementing the migration from `tests.js`:

```text
tests/
  test_slug/
    test.json
    images/
      cover.webp
      background.webp
      questions/
        question_01.webp
      results/
        result_slug.webp
    media/
      audio/
      video/
      other/
    files/
      attachments/
```

rules:

- folder names and asset filenames use english `snake_case` with lowercase letters, digits and underscores
- use a stable unique folder slug, for example `how_you_approach_tasks`
- `test.json` stores test metadata, publication state, questions, answers, scoring, result content and relative asset paths
- `images/` stores visual assets for this test only
- `images/questions/` stores question-specific images
- `images/results/` stores result-specific images
- `media/` stores optional audio, video and other media; create subfolders only when needed
- `files/` stores optional downloadable or supporting files; create it only when needed
- all asset paths in json are relative to the test folder
- do not put image data or base64 blobs inside json
- do not create empty optional folders unless useful
- tests must remain portable: moving one test folder should move all of its content

example `test.json`:

```json
{
  "id": "how_you_approach_tasks",
  "published": true,
  "title": "как вы подходите к задачам",
  "description": "короткий тест о подходе к решению задач",
  "duration": "3-5 минут",
  "assets": {
    "cover": "images/cover.webp",
    "background": "images/background.webp"
  },
  "questions": [
    {
      "id": "question_01",
      "text": "вы столкнулись с неожиданной задачей",
      "image": "images/questions/question_01.webp",
      "answers": [
        {
          "id": "answer_01",
          "text": "сначала изучу ситуацию",
          "score": 1
        }
      ]
    }
  ],
  "scoring": {
    "type": "sum",
    "results": [
      {
        "id": "result_slug",
        "min": 1,
        "max": 5,
        "title": "спокойный аналитик",
        "description": "описание результата",
        "image": "images/results/result_slug.webp"
      }
    ]
  }
}
```

the example describes the target data format, not the currently deployed runtime format

## visual and writing style

all user-facing website text must follow these rules:

- use lowercase letters only
- do not use uppercase letters in titles, buttons, labels, questions, results or messages
- do not put periods at the end of paragraphs or standalone ui text
- do not use em dashes or en dashes
- use a regular hyphen `-` when a dash is needed
- keep copy concise and calm
- apply these rules to all new and edited user-facing text
- code identifiers, file paths, json keys and technical syntax are not ui copy and must keep valid conventional casing when required

## current test data and publication

the deployed app currently reads the `window.TESTS` array from `tests.js`

each current test object has a `published` field:

- `published: true` - visible in the public catalog
- `published: false` - hidden from the catalog
- missing or non-true values are also hidden

this is catalog filtering only, not access control. the repository and its javascript are public, so hidden test content can still be inspected

do not migrate the runtime to per-test json files until the app loader and catalog discovery are updated together. when implementing the migration, preserve existing test behavior and scoring

## scoring

the current app supports two scoring modes

### sum

each answer has a numeric `score`. the app adds selected scores and chooses the result whose `min` and `max` range contains the total. result ranges must cover all possible totals without gaps

### categories

each answer has a `scores` array:

```js
{
  text: "answer text",
  scores: [
    { category: "analyst", points: 2 },
    { category: "practitioner", points: 1 }
  ]
}
```

define matching categories in `scoring.results`. the app totals points by category and displays the category with the highest score. category names must match exactly

## adding and publishing tests

current workflow:

1. add a test object to `tests.js`
2. give it a unique id using lowercase english `snake_case`
3. set `published: false` while preparing it
4. complete its title, description, duration, questions and scoring
5. set `published: true` when it is ready

target workflow after the json migration:

1. create `tests/test_slug/`
2. add `test.json`
3. add optional assets to that test folder
4. reference assets with relative paths in `test.json`
5. set `published: false` until ready
6. publish by setting `published: true`

## editing the design

edit `style.css`. main css variables are near the top:

- `--bg` - page background
- `--surface` - card background
- `--text` - primary text
- `--muted` - secondary text
- `--line` - borders
- `--accent` - green accent
- `--accent-soft` - soft green

## deployment

1. update files in the `main` branch
2. github pages deploys changes automatically
3. check the public site after deployment
4. use a hard refresh if the browser shows cached files

github pages source: `main` branch, root folder

## ai and contributor rules

- read this file before changing project architecture or adding tests
- keep the app static unless the owner explicitly approves a backend
- do not add frameworks, build tools, dependencies or services without approval
- keep test content separate from rendering logic
- follow the target per-test folder architecture for new architecture work
- remember that the current runtime still uses `tests.js` until migration is explicitly implemented
- preserve existing test ids unless a migration requires a deliberate change
- keep new tests unpublished until reviewed
- never claim that a planned architecture is already implemented
- never add secrets, api keys, private personal data or confidential test content
- after code changes, verify catalog display, answer selection, back navigation, result rendering and retaking a test

## current limitations

- results are not stored or sent to the site owner
- there are no accounts, admin panel or analytics
- publication is manually controlled
- hidden tests are still present in public source files
- per-test json loading is a target architecture and is not yet implemented
