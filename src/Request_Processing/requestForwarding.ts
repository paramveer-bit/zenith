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


    const options = {
        method: req.method,
        url: request.forwardUrl,
        header: {
            ...req.headers,
        },
        data: req.body,
        params: req.query
    }
    console.log(options);
    console.log("--------------------------")
    try {
        const result = await axios(options);

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

        //send response to client
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
