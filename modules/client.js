import got from "got";

const client = got.extend({
    prefixUrl: "https://aurion.junia.com/",
    followRedirect: false,
    headers: {
        Connection: "keep-alive",
        accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.5",
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
        Referer: "https://aurion.junia.com/",
    },
});

export default client;
