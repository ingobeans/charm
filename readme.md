# Charm

![Screenshot](https://cdn.hackclub.com/01a0a5bd-318d-7584-81af-416924a6b3d5/paste-1789487036010.png)

charm is a WIP Hack Club reviewer tool i'm working on !

it's similar to Introspect but designed to be very easy for any YSWS to implement. 

a key difference is also that it uses Hackatime tokens rather than user IDs, meaning it can analyze Hackatime heartbeats directly, allowing for more information :3


## Currently Implemented Features

* Plot Hackatime hours and commit counts
* Hour breakdown (i.e. ai-coding rates, timelapses, etc)
* Commit type breakdown (i.e. web uploads)
* General author and repository information
* Session system to create sharable encrypted links to data (used so YSWSs can create sessions for projects and share the links with reviewers)
* Self Auth for testing (Button to log in with Hackatime OAuth to use your own hackatime token)


## API

GET `/create_session?s=<DATA>`

used to create a session. should be sent from your backend.

the `s` query parameter should be a JSON object containing the following fields:
* `token` (required): string - Hackatime Token
* `start` (required): date string - Start date to fetch information from (YYYY-MM-DD)
* `end`: date string - End date to fetch information from (YYYY-MM-DD)
* `repo`: url string - URL of GitHub repository. 
* `projects`: string[] - list of string names of Hackatime projects to view

returns a JSON object containing a link to the reviewer page for this session. valid forever.