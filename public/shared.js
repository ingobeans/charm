validateUrl = function (url) {
    if (!url)
        return "Missing Url";

    let urlObj = URL.parse(url);
    if (!urlObj)
        return "Couldn't parse Url";

    if (!["http:", "https:"].includes(urlObj.protocol))
        return "Bad Url protocol. Must be http/https";

    if (!["github.com", "codeberg.org"].includes(urlObj.host))
        return "Bad host. Must be github.com or codeberg.org";

    let path = urlObj.pathname.split("/");
    if (path.length < 3)
        return "Bad repo path";

    let owner = path[1];
    let name = path[2];
    return { owner: owner, name: name, host: urlObj.host };
}