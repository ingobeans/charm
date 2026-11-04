# Charm

<img height=457 src="https://github.com/user-attachments/assets/93bed48b-428b-426e-bd81-fc1ab475296c" />

charm is a WIP Hack Club reviewer tool i'm working on !

inspired by Introspect but tracks more data and made to be easy for any YSWS to implement. 

a key difference is that it uses Hackatime tokens rather than user IDs, meaning it can analyze Hackatime heartbeats directly, allowing for more information :3


## Currently Implemented Features

* Plot Hackatime hours and commit counts
* Selectable timeline
* Hour breakdown (i.e. ai-coding rates, timelapses, etc)
* Commit type breakdown (i.e. web uploads)
* Programming language pie chart
* Support for most git hosts (GitHub/Codeberg/Forgejo/Gitea/etc)
* Lists tracked lapses and their hour contribution
* Shows each file edited, sorted by hour contribution, and whether they exist in the repo (if so with link)
* General author and repository information
* Session system to create sharable encrypted links to data (used so YSWSs can create sessions for projects and share the links with reviewers)
* Self Auth for testing (Button to log in with Hackatime OAuth to use your own hackatime token)

## How to use

in a real application, you'd have a YSWS that uses charm's API to generate sessions (i.e. a hyperlink that loads all the information automatically, like the hackatime token, project names, github repo etc).

if you just want to test it out, you can click the "Self Auth" button by the hackatime token field, to use your own hackatime token. you can then fill out the fields manually and see the result. 

## API

GET `/create_session?s=<DATA>`

used to create a session. should be sent from your backend.

the `s` query parameter should be a JSON object containing the following fields:
* `token` (required): string - Hackatime Token
* `start` (required): date string - Start date to fetch information from (YYYY-MM-DD)
* `end`: date string - End date to fetch information from (YYYY-MM-DD)
* `repo`: url string - URL of repository. 
* `projects`: string[] - list of string names of Hackatime projects to view

returns a JSON object containing a link to the reviewer page for this session. valid forever.

<hr>

GET `/get_lapses?token=<TOKEN>&start=<START>&projects=<HACKATIME PROJECTS>&end=<OPTIONAL END>`

helpful API if you just want to get a list of lapse URLs from hackatime data.
kinda slow since it needs to parse a ton of heartbeats.

query params:
* `token` (required) - Hackatime Token
* `start` (required) - Start date to fetch information from (YYYY-MM-DD)
* `projects` - comma separated list of names of Hackatime projects to view
* `end` - End date to fetch information from (YYYY-MM-DD)

returns JSON object containing all lapse IDs with their respective URLs
