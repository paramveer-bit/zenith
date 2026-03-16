import { Request, Response } from "express";
import ApiError from "../helpers/ApiError";
import PrismaClient from "../prismaClient/index";
import RedisClient from "../Redis/redis.client";
import axios from "axios";
import asyncHandler from "../helpers/asynchandeler";

interface CacheableResponse {
    status: number;
    headers: any;
    body: any;
    message: string;
}



const request_forwarding = asyncHandler(async (req: Request, res: Response) => {
    console.log("Request received from client");
    const user_code = req.user_code;
    const request = req.request;
    // console.log(requ.body)

    if (!user_code) {
        throw (new ApiError(400, "Invalid request: User code missing"));
    }

    if (!request || !request.forwardUrl) {
        throw (new ApiError(400, "Invalid request configuration"));
    }
    console.log(req.headers)
    // --- FIX 1: Sanitize headers before forwarding ---
    const targetUrl = new URL(request.forwardUrl);
    const forwardedHeaders = { ...req.headers };
    // Remove headers that should not be forwarded
    // These headers are specific to the client-proxy connection and should not be forwarded.
    // Setting the correct Host is the most critical part.
    delete forwardedHeaders.host;
    delete forwardedHeaders.origin;
    delete forwardedHeaders.referer;
    delete forwardedHeaders.connection;
    delete forwardedHeaders['content-length']; // <-- CRITICAL FIX


    const options = {
        method: req.method,
        url: request.forwardUrl,
        headers: {
            ...forwardedHeaders,
            'Host': targetUrl.hostname, // Set the Host header to the target's hostname
            'Origin': targetUrl.origin, // Set the Origin header to the target's origin
            'Cookie': req.headers.cookie || "",
        },
        data: req.body,
        params: req.query,
        // This will allow axios to handle any status code below 500 as a success
        validateStatus: (status: number) => status < 500,
    }
    console.log(options);
    console.log("--------------------------")
    try {
        const result = await axios(options);
        console.log("Response received from upstream server");
        //save data in cache if caching is enabled
        if (request.caching && req.method === "GET") {
            console.log("Caching enabled for this request");
            const cache_response = {
                status: result.status,
                headers: result.headers,
                body: result.data
            }
            const key = `cache:${request.ownerId}:${req.url}:${user_code}`
            RedisClient.setex(key, request.cacheTime, JSON.stringify(cache_response));
        }

        //save request log
        await PrismaClient.requestLog.create({
            data: {
                requestId: request.id,
                requestUrl: req.originalUrl,
                forwardUrl: request.forwardUrl,
                response: result.data,
                comment: "Request forwarded to the server. And response is saved in the database",
                statusCode: result.status,
                duration: 0,
                userId: user_code.toString(),
                type: req.method,
                browser: req.device?.browser,
                os: req.device?.os,
                ip: req.customIp || req.ip
            }
        });
        console.log("Request forwarded successfully=====");
        res.set(result.headers);

        // --- FIX 2: Rewrite 'Set-Cookie' header's domain ---
        const originalSetCookie = result.headers['set-cookie'];
        if (originalSetCookie) {
            const proxyDomain = req.hostname; // e.g., 'back.paramveer.in'
            const targetDomain = new URL(request.forwardUrl).hostname; // e.g., 'back.fitnearby.com'

            // 'set-cookie' can be a string or an array of strings
            const modifiedCookies = (Array.isArray(originalSetCookie) ? originalSetCookie : [originalSetCookie])
                .map(cookieString =>
                    cookieString.replace(new RegExp(`domain=${targetDomain}`, 'i'), `domain=${proxyDomain}`)
                );

            res.setHeader('Set-Cookie', modifiedCookies);
        }
        console.log("Set-Cookie header modified to match proxy domain");
        //send response to client
        // Forward any additional headers if needed (e.g., location for redirects)
        // Most important are status, headers, cookies, and body, which are already handled.
        // console.log(res)
        return res.status(result.status).send(result.data);



    } catch (err) {
        // Handle errors from the upstream server
        if (axios.isAxiosError(err) && err.response) {
            const { status, data, headers } = err.response;

            // Log the upstream error
            await PrismaClient.requestLog.create({
                data: {
                    requestId: request.id,
                    requestUrl: req.originalUrl,
                    forwardUrl: request.forwardUrl,
                    response: JSON.stringify(data),
                    comment: "Upstream server returned an error",
                    statusCode: status,
                    duration: 0,
                    userId: user_code.toString(),
                    type: req.method,
                    browser: req.device?.browser,
                    os: req.device?.os,
                    ip: req.customIp || req.ip,
                },
            });

            // Forward the error response (status, headers, body)
            return res.status(status).set(headers).send(data);
        }

        // Otherwise it’s an internal/network error
        console.error("Error forwarding request:", err);
        await PrismaClient.requestLog.create({
            data: {
                requestId: request.id,
                requestUrl: req.originalUrl,
                forwardUrl: request.forwardUrl,
                response: "NIL",
                comment: "Internal error during request forwarding",
                statusCode: 500,
                duration: 0,
                userId: user_code.toString(),
                type: req.method,
                browser: req.device?.browser,
                os: req.device?.os,
                ip: req.customIp || req.ip,
            },
        });
        throw new ApiError(500, "Internal Server Error While processing request by axios");
    }
})

export default request_forwarding;
